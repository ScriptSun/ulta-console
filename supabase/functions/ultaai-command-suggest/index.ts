import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

import { getCommandSuggestionSystemPrompt } from '../_shared/system-prompt-db.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// OpenAI API key
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface RequestBody {
  user_message: string;
  agent_os?: string;
  tenant_id?: string;
  agent_id?: string;
}

interface SuggestionResponse {
  type: 'command' | 'batch_script';
  title: string;
  description: string;
  commands?: string[];
  batch_script?: {
    name: string;
    description: string;
    commands: string[];
    risk_level: 'low' | 'medium' | 'high';
    inputs?: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
      default?: string;
    }>;
    prerequisites?: string[];
    safety_checks?: string[];
  };
  explanation: string;
  requires_confirmation: boolean;
  policy_notes?: string;
}

const COMMAND_SUGGESTION_PROMPT = `You are UltaAI, a server management assistant. The user requested a command or action that is not directly available in our system.

Based on the user's request, suggest ONE comprehensive solution:

1. For simple operations: Suggest direct command alternatives that are safe and commonly used
2. For complex operations: Create a complete batch script specification with all necessary details

IMPORTANT: Always prioritize creating batch scripts for complex operations that involve multiple steps or system changes.

For batch scripts, provide:
- Complete command sequences that accomplish the user's goal
- Proper error handling and safety checks
- Required inputs with validation
- Accurate risk assessment
- Pre-requisite checks and dependencies

Respond with JSON only in this exact format:
{
  "type": "command" | "batch_script",
  "title": "Short descriptive title",
  "description": "What this will accomplish",
  "commands": ["cmd1", "cmd2"], // only for type: "command"
  "batch_script": { // only for type: "batch_script"
    "name": "script_name",
    "description": "Detailed description of what the script does",
    "commands": [
      "#!/bin/bash",
      "set -e",
      "echo 'Starting task...'",
      "# Add safety checks here",
      "command1",
      "command2",
      "echo 'Task completed successfully'"
    ],
    "risk_level": "low" | "medium" | "high",
    "inputs": [
      {
        "name": "input_name",
        "type": "string" | "number" | "boolean",
        "description": "What this input is for",
        "required": true | false,
        "default": "default_value" // optional
      }
    ],
    "prerequisites": ["prerequisite1", "prerequisite2"], // optional
    "safety_checks": ["check1", "check2"] // optional
  },
  "explanation": "Detailed explanation of why this suggestion will help accomplish their goal and what it will do",
  "requires_confirmation": true,
  "policy_notes": "Any security considerations or policy implications"
}

Consider the OS: {agent_os}
User request: {user_message}`;

async function callOpenAI(userMessage: string, agentOs: string = 'linux', customSystemPrompt?: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Use provided system prompt or get from file
  const systemPrompt = customSystemPrompt || await getCommandSuggestionSystemPrompt();
  
  const finalSystemPrompt = systemPrompt
    .replace('{agent_os}', agentOs)
    .replace('{user_message}', userMessage);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: finalSystemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error('Failed to parse AI response as JSON');
  }
}

async function checkCommandPolicy(commands: string[], tenantId?: string): Promise<{
  overall_status: 'allowed' | 'confirmation' | 'forbidden';
  policy_issues: string[];
  requires_confirmation: boolean;
}> {
  if (!tenantId) {
    return {
      overall_status: 'allowed',
      policy_issues: [],
      requires_confirmation: true // Default require confirmation
    };
  }

  try {
    // Get active command policies for tenant
    const { data: policies, error } = await supabase
      .from('command_policies')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('mode'); // Prioritize 'forbid' over 'confirm' over 'auto'

    if (error) {
      console.error('Error fetching command policies:', error);
      return {
        overall_status: 'allowed',
        policy_issues: [],
        requires_confirmation: true
      };
    }

    let overallStatus: 'allowed' | 'confirmation' | 'forbidden' = 'allowed';
    const policyIssues: string[] = [];
    let requiresConfirmation = false;

    // Check each command against policies
    for (const command of commands) {
      const cleanCommand = command.trim();
      if (!cleanCommand || cleanCommand.startsWith('#') || cleanCommand.startsWith('echo')) {
        continue; // Skip comments and echo statements
      }

      for (const policy of policies || []) {
        let matches = false;

        // Check different match types
        switch (policy.match_type) {
          case 'exact':
            matches = cleanCommand === policy.match_value;
            break;
          case 'regex':
            try {
              const regex = new RegExp(policy.match_value);
              matches = regex.test(cleanCommand);
            } catch (e) {
              console.error('Invalid regex pattern:', policy.match_value);
            }
            break;
          case 'wildcard':
            const wildcardPattern = policy.match_value
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.');
            const wildcardRegex = new RegExp(`^${wildcardPattern}$`);
            matches = wildcardRegex.test(cleanCommand);
            break;
        }

        if (matches) {
          if (policy.mode === 'forbid') {
            overallStatus = 'forbidden';
            policyIssues.push(`Command "${cleanCommand}" is forbidden by policy "${policy.policy_name}"`);
          } else if (policy.mode === 'confirm') {
            if (overallStatus !== 'forbidden') {
              overallStatus = 'confirmation';
              requiresConfirmation = true;
            }
            policyIssues.push(`Command "${cleanCommand}" requires confirmation due to policy "${policy.policy_name}"`);
          }
          break; // First matching policy wins
        }
      }
    }

    return {
      overall_status: overallStatus,
      policy_issues: policyIssues,
      requires_confirmation: requiresConfirmation || overallStatus === 'confirmation'
    };
  } catch (error) {
    console.error('Error checking command policy:', error);
    return {
      overall_status: 'allowed',
      policy_issues: [],
      requires_confirmation: true
    };
  }
}

async function getAISuggestionsMode(): Promise<'off' | 'show' | 'execute'> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_suggestions_mode')
      .single();

    if (error || !data) {
      return 'off'; // Default to off if no setting found
    }

    return data.setting_value as 'off' | 'show' | 'execute';
  } catch (error) {
    console.error('Error fetching AI suggestions mode:', error);
    return 'off';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { user_message, agent_os = 'linux', tenant_id, agent_id } = body;

    if (!user_message) {
      return new Response(JSON.stringify({ error: 'user_message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if AI suggestions are enabled
    const suggestionsMode = await getAISuggestionsMode();
    
    if (suggestionsMode === 'off') {
      return new Response(JSON.stringify({ 
        error: 'AI suggestions are disabled',
        mode: 'off'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating command suggestion for:', user_message);

    // Generate AI suggestion using file-based prompt
    const suggestion = await callOpenAI(
      user_message,
      agent_os
    );

    // Extract commands for policy checking
    let commandsToCheck: string[] = [];
    if (suggestion.type === 'command' && suggestion.commands) {
      commandsToCheck = suggestion.commands;
    } else if (suggestion.type === 'batch_script' && suggestion.batch_script?.commands) {
      commandsToCheck = suggestion.batch_script.commands;
    }

    // Check commands against policies
    const policyCheck = await checkCommandPolicy(commandsToCheck, tenant_id);
    
    // Add policy information to the response
    const response = {
      ...suggestion,
      suggestions_mode: suggestionsMode,
      policy_status: policyCheck.overall_status,
      policy_issues: policyCheck.policy_issues,
      requires_confirmation: policyCheck.requires_confirmation || suggestion.requires_confirmation
    };

    // If commands are forbidden, modify the response
    if (policyCheck.overall_status === 'forbidden') {
      response.explanation = `${response.explanation}\n\n⚠️ POLICY WARNING: Some commands in this suggestion are forbidden by your security policies: ${policyCheck.policy_issues.join(', ')}`;
      response.suggestions_mode = 'show'; // Force to show-only mode
    } else if (policyCheck.overall_status === 'confirmation') {
      response.explanation = `${response.explanation}\n\n⚠️ POLICY NOTE: Some commands require confirmation: ${policyCheck.policy_issues.join(', ')}`;
    }

    console.log('Generated suggestion successfully:', response.type, 'Policy status:', policyCheck.overall_status);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in command suggestion function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});