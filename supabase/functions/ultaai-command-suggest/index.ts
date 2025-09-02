import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

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
    }>;
  };
  explanation: string;
}

const COMMAND_SUGGESTION_PROMPT = `You are UltaAI, a server management assistant. The user requested a command or action that is not directly available in our system.

Based on the user's request, suggest ONE of the following:

1. A direct command alternative that could accomplish their goal
2. A complete batch script that would need to be created and executed

For commands, suggest safe, commonly used alternatives.
For batch scripts, provide a complete specification including inputs, commands, and risk assessment.

Respond with JSON only in this exact format:
{
  "type": "command" | "batch_script",
  "title": "Short descriptive title",
  "description": "What this will accomplish",
  "commands": ["cmd1", "cmd2"] // only for type: "command"
  "batch_script": { // only for type: "batch_script"
    "name": "script_name",
    "description": "Detailed description of what the script does",
    "commands": ["command1", "command2", "command3"],
    "risk_level": "low" | "medium" | "high",
    "inputs": [
      {
        "name": "input_name",
        "type": "string" | "number" | "boolean",
        "description": "What this input is for",
        "required": true | false
      }
    ]
  },
  "explanation": "Brief explanation of why this suggestion will help accomplish their goal"
}

Consider the OS: {agent_os}
User request: {user_message}`;

async function callOpenAI(prompt: string, userMessage: string, agentOs: string = 'linux') {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const systemPrompt = prompt
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
        { role: 'system', content: systemPrompt },
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

    // Generate AI suggestion
    const suggestion = await callOpenAI(
      COMMAND_SUGGESTION_PROMPT,
      user_message,
      agent_os
    );

    // Add the current suggestions mode to the response
    const response = {
      ...suggestion,
      suggestions_mode: suggestionsMode
    };

    console.log('Generated suggestion successfully:', response.type);

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