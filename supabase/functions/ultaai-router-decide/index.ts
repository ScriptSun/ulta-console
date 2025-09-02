import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AICostTracker } from '../_shared/ai-cost-tracker.ts';
import { getRouterSystemPrompt } from '../_shared/system-prompt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client for loading system settings
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Function to get system temperature setting
async function getSystemTemperature(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_models')
      .single();

    if (error) {
      console.warn('Failed to load system temperature, using default:', error);
      return 0.7; // Default fallback
    }

    const aiSettings = data?.setting_value;
    if (aiSettings && typeof aiSettings === 'object' && aiSettings.temperature !== undefined) {
      return aiSettings.temperature;
    }

    return 0.7; // Default fallback
  } catch (error) {
    console.warn('Error loading system temperature:', error);
    return 0.7; // Default fallback
  }
}

interface RequestBody {
  agent_id: string;
  user_request: string;
  tenant_id?: string;
  run_id?: string;
  conversation_id?: string;
}

serve(async (req) => {
  console.log('🚀 Function called with method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasSupabaseKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasOpenAIKey: !!Deno.env.get('OPENAI_API_KEY')
    });

    const { agent_id, user_request, tenant_id, run_id, conversation_id }: RequestBody = await req.json();

    if (!agent_id || !user_request) {
      console.error('❌ Missing required parameters:', { agent_id: !!agent_id, user_request: !!user_request });
      return new Response(JSON.stringify({ error: 'Missing agent_id or user_request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize cost tracker
    const costTracker = new AICostTracker();

    console.log(`🎯 Processing router decision for agent_id: ${agent_id}, user_request: ${user_request}`);

    // 1. Call ultaai-router-payload
    console.log('📞 Calling ultaai-router-payload...');
    const payloadResponse = await supabase.functions.invoke('ultaai-router-payload', {
      body: { agent_id, user_request }
    });

    console.log('📊 Payload response:', { 
      hasData: !!payloadResponse.data, 
      hasError: !!payloadResponse.error,
      errorMessage: payloadResponse.error?.message 
    });

    if (payloadResponse.error) {
      console.error('❌ Error calling router payload:', payloadResponse.error);
      return new Response(JSON.stringify({ error: 'Failed to get router payload', details: payloadResponse.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = payloadResponse.data;
    console.log('✅ Got payload with', payload.candidates?.length || 0, 'candidates');
    
    // 2. Transform payload to match new prompt format
    const transformedPayload = {
      user_request: payload.user_request,
      heartbeat: payload.heartbeat,
      batches: payload.candidates, // Rename candidates to batches for the new prompt
      command_policies: payload.command_policies || [],
      policy_notes: payload.policy_notes || {}
    };
    
    console.log('🔄 Transformed payload for OpenAI:', JSON.stringify(transformedPayload, null, 2));

    // 3. Call GPT with dual-mode system prompt
    console.log('🤖 Calling OpenAI GPT...');
    
// Helper function to safely parse JSON responses
function tryParseJSON(s: string) {
  try { 
    return JSON.parse(s); 
  } catch { 
    return null; 
  }
}

// Validate draft action against command policies
function validateDraftAction(draft: any, policies: any[]) {
  console.log('🔍 Validating draft action against policies:', { 
    draftTask: draft.task, 
    policyCount: policies.length 
  });
  
  if (!draft.suggested) {
    console.log('⚠️ No suggested commands in draft');
    return { ok: true };
  }
  
  const commands: string[] = [];
  
  // Extract commands based on suggestion type
  if (draft.suggested.kind === "command") {
    commands.push(draft.suggested.command);
  } else if (draft.suggested.kind === "batch_script" && draft.suggested.commands) {
    commands.push(...draft.suggested.commands);
  }
  
  console.log('📋 Commands to validate:', commands);
  
  let hasConfirmRule = false;
  
  // Check each command against each policy
  for (const command of commands) {
    for (const policy of policies) {
      if (!policy.active) continue;
      
      let matches = false;
      
      // Check if command matches policy pattern
      if (policy.match_type === "regex") {
        try {
          const regex = new RegExp(policy.match_value, 'i');
          matches = regex.test(command);
        } catch (e) {
          console.warn('Invalid regex in policy:', policy.match_value);
          continue;
        }
      } else if (policy.match_type === "exact") {
        matches = command.toLowerCase().includes(policy.match_value.toLowerCase());
      }
      
      if (matches) {
        console.log(`🎯 Policy match found: ${policy.policy_name} (${policy.mode}) for command: ${command}`);
        
        if (policy.mode === "forbid") {
          return {
            ok: false,
            reason: `Command "${command}" is forbidden by policy: ${policy.policy_name}`,
          };
        } else if (policy.mode === "confirm") {
          hasConfirmRule = true;
          // Add confirmation note to draft
          if (!draft.notes) draft.notes = [];
          draft.notes.push(`Requires confirmation: ${policy.confirm_message || policy.policy_name}`);
        }
      }
    }
  }
  
  // Ensure unconfirmed status if confirm rule matched
  if (hasConfirmRule) {
    draft.status = "unconfirmed";
    console.log('✋ Confirm rule matched, keeping status as unconfirmed');
  }
  
  return { ok: true };
}
    
    try {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (!openaiApiKey) {
        throw new Error("OPENAI_API_KEY environment variable is required but not set");
      }

      // Get the published system prompt from database
      const systemPrompt = await getRouterSystemPrompt();
      console.log('📝 Using system prompt from database (length:', systemPrompt.length, 'chars)');
      const systemTemperature = await getSystemTemperature();
      console.log(`🌡️ Using system temperature: ${systemTemperature}`);

      const requestBody: any = {
        model: "gpt-4o-mini",
        temperature: systemTemperature,
        response_format: { type: "json_object" }, // Always use JSON mode for dual-mode responses
        messages: [
          { role: "system", content: systemPrompt + "\n\nPlease respond with valid JSON format." },
          { role: "user", content: JSON.stringify(transformedPayload) }
        ]
      };

      console.log('🔧 OpenAI request config:', {
        model: requestBody.model,
        hasResponseFormat: !!requestBody.response_format
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 OpenAI Response Status:', response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ OpenAI API error:', response.status, errorBody);
        throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
      }

      const completion = await response.json();
      
      console.log('✅ OpenAI Response:', {
        model: completion.model,
        usage: completion.usage,
        finish_reason: completion.choices[0]?.finish_reason
      });

      // Log AI usage if tenant_id is provided
      if (tenant_id && completion.usage) {
        await costTracker.logUsage(
          tenant_id,
          agent_id,
          'gpt-4o-mini',
          completion.usage.prompt_tokens || 0,
          completion.usage.completion_tokens || 0,
          'router_decision',
          { user_request_length: user_request.length }
        );
      }

      const raw = completion.choices[0]?.message?.content ?? "";
      console.log('📝 OpenAI Content:', raw);
      
      if (!raw) {
        throw new Error("No content received from OpenAI");
      }

      // Parse response - handle chat, action, and ai_draft_action modes
      const obj = tryParseJSON(raw);
      
      if (obj && obj.mode === "action") {
        console.log('🎯 Action mode response:', obj);
        
        // Store action decision in agents table
        const { error: updateError } = await supabase
          .from('agents')
          .update({ last_decision_json: obj })
          .eq('id', agent_id);

        if (updateError) {
          console.error('⚠️ Error updating agent with decision:', updateError);
        }

        console.log(`✅ Action decision completed for agent ${agent_id}`);
        
        // Return the action JSON as is
        return new Response(JSON.stringify(obj), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (obj && obj.mode === "ai_draft_action") {
        console.log('🚀 AI Draft Action mode response:', obj);
        
        // Validate draft action against policies
        const validationResult = validateDraftAction(obj, transformedPayload.command_policies || []);
        console.log('🛡️ Policy validation result:', validationResult);
        
        if (!validationResult.ok) {
          // Convert to not_supported action if policy rejected
          const rejectedAction = {
            mode: "action",
            task: "not_supported", 
            status: "rejected",
            reason: validationResult.reason || "Blocked by policy",
            summary: "Please try a different approach."
          };
          
          console.log('❌ Draft action rejected by policy, converting to not_supported');
          
          // Store rejected decision in agents table
          const { error: updateError } = await supabase
            .from('agents')
            .update({ last_decision_json: rejectedAction })
            .eq('id', agent_id);

          if (updateError) {
            console.error('⚠️ Error updating agent with rejected decision:', updateError);
          }
          
          return new Response(JSON.stringify(rejectedAction), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Policy validation passed, store ai_draft_action decision
        const { error: updateError } = await supabase
          .from('agents')
          .update({ last_decision_json: obj })
          .eq('id', agent_id);

        if (updateError) {
          console.error('⚠️ Error updating agent with ai_draft_action decision:', updateError);
        }

        console.log(`✅ AI Draft Action decision completed for agent ${agent_id}`);
        
        // Persist router event for ai_draft_action decisions
        if (run_id) {
          try {
            // Create a sanitized payload (exclude any secret fields)
            const sanitizedPayload = {
              ...obj,
              // Remove any potentially sensitive data if needed
              // For now, we'll keep the full payload as it shouldn't contain secrets
            };
            
            const { error: eventError } = await supabase
              .from('router_events')
              .insert({
                run_id: run_id,
                event_type: 'selected',
                payload: sanitizedPayload,
                agent_id: agent_id,
                conversation_id: conversation_id
              });
            
            if (eventError) {
              console.error('❌ Error persisting router event:', eventError);
              // Don't fail the request, just log the error
            } else {
              console.log('✅ Persisted router event for ai_draft_action with run_id:', run_id);
            }
          } catch (error) {
            console.error('❌ Error persisting router event:', error);
          }
        } else {
          console.log('⚠️ No run_id provided, skipping router event persistence');
        }
        
        // Return the ai_draft_action JSON as is
        return new Response(JSON.stringify(obj), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (obj && obj.text) {
        // Handle structured chat response with text field
        console.log('💬 Structured chat mode response');
        return new Response(JSON.stringify({ 
          mode: "chat", 
          text: obj.text 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Handle plain text chat response or fallback
        console.log('💬 Plain text chat mode response');
        const chatText = obj && typeof obj === 'string' ? obj : (raw.trim() || "Hello, how can I help you?");
        
        return new Response(JSON.stringify({ 
          mode: "chat", 
          text: chatText 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (gptError) {
      console.error('❌ OpenAI API error:', gptError);
      return new Response(JSON.stringify({ 
        error: 'Failed to process with AI', 
        details: gptError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('💥 Error processing router decision:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});