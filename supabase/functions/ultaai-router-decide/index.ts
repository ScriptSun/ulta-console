import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  agent_id: string;
  user_request: string;
}

// Dual-mode assistant prompt
const ULTA_DUAL_MODE_ASSISTANT = `You are UltaAI, a server management assistant. You have access to predefined batch scripts and should use them when users request server operations.

IMPORTANT BEHAVIOR:
- For greetings ("Hi", "Hello") - respond naturally and briefly
- For server operations ("install wordpress", "restart nginx") - find matching batch script and return structured response
- DON'T automatically mention server stats unless specifically asked
- DON'T give generic advice - use the actual batch candidates provided

You receive:
- user_request: what the user wants
- heartbeat: current server data (only reference when needed for decisions)
- candidates: available batch scripts with their input requirements
- command_policies: execution rules
- policy_notes: operational constraints

Response modes:

1) CHAT MODE (for greetings/questions): Return plain text only
   Example: "Hi! How can I help you manage your server?"

2) ACTION MODE (for server operations): Return JSON only
{
  "mode": "action",
  "task": "<batch_key_from_candidates>",
  "status": "confirmed|unconfirmed|rejected",
  "risk": "<from_candidate_risk>",
  "batch_id": "<uuid_from_candidates>",
  "params": {},
  "missing_inputs": ["field1", "field2"],
  "human": "Please provide: domain name, admin email"
}

CRITICAL RULES:
- When user asks "install wordpress" - find WordPress batch from candidates array
- If batch found but missing required inputs, set status="unconfirmed" and list missing_inputs
- If batch found with all inputs, set status="confirmed" 
- Only mention server metrics if they affect the operation (like insufficient RAM)
- Don't give generic server health reports unless asked

Use the actual batch scripts provided in candidates - don't improvise!`;

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

    const { agent_id, user_request }: RequestBody = await req.json();

    if (!agent_id || !user_request) {
      console.error('❌ Missing required parameters:', { agent_id: !!agent_id, user_request: !!user_request });
      return new Response(JSON.stringify({ error: 'Missing agent_id or user_request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    
    // DEBUG: Log the full payload being sent to OpenAI
    console.log('🔍 FULL PAYLOAD BEING SENT TO OPENAI:', JSON.stringify(payload, null, 2));

    // 2. Call GPT with dual-mode system prompt
    console.log('🤖 Calling OpenAI GPT...');
    
    // Helper function to safely parse JSON responses
    function tryParseJSON(s: string) {
      try { 
        return JSON.parse(s); 
      } catch { 
        return null; 
      }
    }
    
    try {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (!openaiApiKey) {
        throw new Error("OPENAI_API_KEY environment variable is required but not set");
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          // No response_format constraint - let model choose text or JSON based on prompt
          messages: [
            { role: "system", content: ULTA_DUAL_MODE_ASSISTANT },
            { role: "user", content: JSON.stringify(payload) }
          ]
        })
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

      const raw = completion.choices[0]?.message?.content ?? "";
      console.log('📝 OpenAI Content:', raw);
      
      if (!raw) {
        throw new Error("No content received from OpenAI");
      }

      // Try to parse as JSON - if successful and has mode=action, it's an action
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
      } else {
        console.log('💬 Chat mode response');
        
        // Chat flow: return plain text wrapped in chat mode response
        return new Response(JSON.stringify({ 
          mode: "chat", 
          text: raw.trim() || "Hello, how can I help you?" 
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