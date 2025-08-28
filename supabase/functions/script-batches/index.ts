import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateScript(source: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Size check (256 KB)
  const sizeBytes = new TextEncoder().encode(source).length;
  if (sizeBytes > 256 * 1024) {
    errors.push(`Script size (${Math.round(sizeBytes / 1024)} KB) exceeds maximum limit of 256 KB`);
  }

  // Check shebang
  const lines = source.split('\n');
  const firstLine = lines[0]?.trim();
  if (!firstLine?.startsWith('#!/bin/bash') && !firstLine?.startsWith('#!/usr/bin/env bash')) {
    errors.push('First line must be #!/bin/bash or #!/usr/bin/env bash');
  }

  // Forbidden patterns
  const forbiddenPatterns = [
    /rm\s+-rf\s+\/(?:\s|$)/g,
    /mkfs/g,
    /dd\s+.*\/dev\//g,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      errors.push(`Forbidden command pattern detected: ${pattern.source}`);
    }
  }

  // Warning patterns
  const warningPatterns = [
    /\*(?!\s*\))/g,
    /`[^`]*`/g,
    /\$\([^)]*\)/g,
  ];

  for (const pattern of warningPatterns) {
    if (pattern.test(source)) {
      warnings.push(`Potentially unsafe pattern detected: ${pattern.source}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function calculateSHA256(content: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hash = crypto.subtle.digest('SHA-256', data);
  return hash.then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }) as any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;

    // Handle dependency validation before batch execution
    if (action === 'validate_dependencies') {
      const { batch_id } = body;
      
      const { data: validation, error: validationError } = await supabaseClient.rpc('validate_batch_dependencies', {
        _batch_id: batch_id
      });

      if (validationError) {
        console.error('Error validating dependencies:', validationError);
        return new Response(
          JSON.stringify({ error: 'Failed to validate dependencies' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ validation: validation[0] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'save_draft' || action === 'create_version' || action === 'activate_version') {
      const {
        batch_id,
        name,
        os_targets,
        risk,
        max_timeout_sec,
        auto_version,
        source,
        notes,
        sha256: clientSha256
      } = body;

      // Validate the script
      const validation = validateScript(source);
      if (!validation.isValid) {
        return new Response(
          JSON.stringify({ 
            error: 'Script validation failed',
            validation_errors: validation.errors 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate server-side SHA256
      const serverSha256 = await calculateSHA256(source);
      if (serverSha256 !== clientSha256) {
        return new Response(
          JSON.stringify({ error: 'SHA256 mismatch - content may have been corrupted' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sizeBytes = new TextEncoder().encode(source).length;

      // Get user's customer IDs
      const { data: customerIds } = await supabaseClient.rpc('get_user_customer_ids');
      if (!customerIds || customerIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No customer access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customerId = customerIds[0];

      let batchId = batch_id;

      // Create or update batch if needed
      if (!batchId) {
        const { data: batchData, error: batchError } = await supabaseClient
          .from('script_batches')
          .insert({
            customer_id: customerId,
            name,
            os_targets,
            risk,
            max_timeout_sec,
            auto_version,
            created_by: user.id,
            updated_by: user.id
          })
          .select('id')
          .single();

        if (batchError) {
          console.error('Error creating batch:', batchError);
          return new Response(
            JSON.stringify({ error: 'Failed to create batch' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        batchId = batchData.id;

        // Log the creation
        await supabaseClient
          .from('audit_logs')
          .insert({
            customer_id: customerId,
            actor: user.email || user.id,
            action: 'batch_create',
            target: `script_batch:${name}`,
            meta: {
              batch_id: batchId,
              user_id: user.id
            }
          });
      } else {
        // Update existing batch
        await supabaseClient
          .from('script_batches')
          .update({
            name,
            os_targets,
            risk,
            max_timeout_sec,
            auto_version,
            updated_by: user.id
          })
          .eq('id', batchId);
      }

      if (action === 'save_draft') {
        return new Response(
          JSON.stringify({ 
            success: true,
            batch_id: batchId,
            message: 'Draft saved successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get next version number
      const { data: nextVersionData } = await supabaseClient.rpc('get_next_batch_version', {
        _batch_id: batchId
      });

      const nextVersion = nextVersionData || 1;

      // Create version
      const versionStatus = (action === 'activate_version') ? 'active' : 'draft';
      
      const { data: versionData, error: versionError } = await supabaseClient
        .from('script_batch_versions')
        .insert({
          batch_id: batchId,
          version: nextVersion,
          sha256: serverSha256,
          size_bytes: sizeBytes,
          source,
          notes,
          status: versionStatus,
          created_by: user.id
        })
        .select('*')
        .single();

      if (versionError) {
        console.error('Error creating version:', versionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create version' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'activate_version') {
        // Use the database function to activate
        const { data: activateResult } = await supabaseClient.rpc('activate_batch_version', {
          _batch_id: batchId,
          _version: nextVersion,
          _user_id: user.id
        });

        if (!activateResult) {
          return new Response(
            JSON.stringify({ error: 'Failed to activate version' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Log version creation
      await supabaseClient
        .from('audit_logs')
        .insert({
          customer_id: customerId,
          actor: user.email || user.id,
          action: action === 'activate_version' ? 'batch_version_activate' : 'batch_version_create',
          target: `script_batch:${name}`,
          meta: {
            batch_id: batchId,
            version: nextVersion,
            sha256: serverSha256,
            user_id: user.id
          }
        });

      return new Response(
        JSON.stringify({
          success: true,
          batch_id: batchId,
          version: nextVersion,
          sha256: serverSha256,
          message: action === 'activate_version' ? 'Version activated successfully' : 'Version created successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'activate') {
      const { batch_id, version } = body;
      
      const { data: activateResult } = await supabaseClient.rpc('activate_batch_version', {
        _batch_id: batch_id,
        _version: version,
        _user_id: user.id
      });

      if (!activateResult) {
        return new Response(
          JSON.stringify({ error: 'Failed to activate version' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Version activated successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'duplicate') {
      const { batch_id } = body;

      // Get the original batch and its active version
      const { data: originalBatch, error: batchError } = await supabaseClient
        .from('script_batches')
        .select(`
          *,
          script_batch_versions!inner (
            source,
            notes
          )
        `)
        .eq('id', batch_id)
        .eq('script_batch_versions.status', 'active')
        .single();

      if (batchError || !originalBatch) {
        return new Response(
          JSON.stringify({ error: 'Original batch not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const activeVersion = originalBatch.script_batch_versions[0];
      const newName = `${originalBatch.name} (Copy)`;

      // Create new batch
      const { data: newBatch, error: newBatchError } = await supabaseClient
        .from('script_batches')
        .insert({
          customer_id: originalBatch.customer_id,
          name: newName,
          os_targets: originalBatch.os_targets,
          risk: originalBatch.risk,
          max_timeout_sec: originalBatch.max_timeout_sec,
          auto_version: originalBatch.auto_version,
          created_by: user.id,
          updated_by: user.id
        })
        .select('id')
        .single();

      if (newBatchError) {
        return new Response(
          JSON.stringify({ error: 'Failed to duplicate batch' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create version 1 for the new batch
      const serverSha256 = await calculateSHA256(activeVersion.source);
      const sizeBytes = new TextEncoder().encode(activeVersion.source).length;

      await supabaseClient
        .from('script_batch_versions')
        .insert({
          batch_id: newBatch.id,
          version: 1,
          sha256: serverSha256,
          size_bytes: sizeBytes,
          source: activeVersion.source,
          notes: activeVersion.notes,
          status: 'draft',
          created_by: user.id
        });

      // Log the duplication
      await supabaseClient
        .from('audit_logs')
        .insert({
          customer_id: originalBatch.customer_id,
          actor: user.email || user.id,
          action: 'batch_duplicate',
          target: `script_batch:${newName}`,
          meta: {
            original_batch_id: batch_id,
            new_batch_id: newBatch.id,
            user_id: user.id
          }
        });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Batch duplicated successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in script-batches function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});