import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

// OpenAI API key
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface RouterMessage {
  type: string;
  rid: string;
  ts: number;
  data: any;
}

interface RouterRequest {
  agent_id: string;
  user_request: string;
}

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let rid = crypto.randomUUID();

  const sendMessage = (type: string, data: any = {}) => {
    const message: RouterMessage = {
      type,
      rid,
      ts: Date.now(),
      data
    };
    
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  };

  socket.onopen = () => {
    console.log('WebSocket connection opened');
  };

  socket.onmessage = async (event) => {
    try {
      const request: RouterRequest = JSON.parse(event.data);
      rid = crypto.randomUUID(); // Generate new rid for this request
      
      console.log('Router request received:', request);
      
      // Send router.start immediately
      sendMessage('router.start', { 
        agent_id: request.agent_id,
        user_request: request.user_request 
      });

      // Step 1: Retrieve lightweight batch candidates
      let candidates = [];
      let candidateCount = 0;
      try {
        // Get agent OS for filtering
        const { data: agent } = await supabase
          .from('agents')
          .select('heartbeat')
          .eq('id', request.agent_id)
          .single();

        const agentOS = agent?.heartbeat?.os || null;

        const retrieveResponse = await supabase.functions.invoke('batches-retrieve', {
          body: {
            q: request.user_request,
            os: agentOS,
            limit: 12
          }
        });

        if (retrieveResponse.error) {
          throw new Error(`Retrieve error: ${retrieveResponse.error.message}`);
        }

        const retrieveData = retrieveResponse.data;
        candidates = retrieveData?.candidates || [];
        candidateCount = candidates.length;

        // Send router.retrieved after getting candidates
        sendMessage('router.retrieved', { 
          candidate_count: candidateCount,
          candidate_ids: candidates.map((c: any) => c.id),
          candidates: candidates
        });

      } catch (error) {
        console.error('Error retrieving candidates:', error);
        sendMessage('router.error', { 
          error: 'Failed to retrieve batch candidates',
          details: error.message 
        });
        socket.close();
        return;
      }

      // Step 2: Stream OpenAI decision making
      try {
        if (!openAIApiKey) {
          throw new Error('OpenAI API key not configured');
        }

        // Get system prompt and prepare OpenAI request
        const { data: systemPromptData } = await supabase
          .from('system_prompts')
          .select('content')
          .eq('name', 'router_system_prompt')
          .eq('published', true)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        const systemPrompt = systemPromptData?.content || `You are UltaAI, a conversational hosting assistant.

When a user requests to install WordPress, you should:
1. Provide a brief, friendly conversational response
2. Return a JSON decision with the WordPress installer details

For WordPress installation requests, respond with JSON in this exact format:
{
  "mode": "action",
  "task": "install_wordpress", 
  "summary": "I'll help you install WordPress on your server!",
  "status": "unconfirmed",
  "batch_id": "wordpress_installer_batch_id",
  "missing_params": ["domain", "admin_username", "admin_password", "admin_email"],
  "risk": "medium",
  "message": "I'll help you install WordPress! Please provide the following details:",
  "requires_inputs": true
}

Input payload:
{
  "user_request": "<string>",
  "candidates": [ { "id": "<uuid>", "key": "<slug>", "name": "<title>", "description": "<one sentence>", "risk": "<low|medium|high>" } ]
}

Rules:
- For WordPress installation: Always use mode "action" with the above JSON structure
- For other requests: Use mode "chat" with a helpful text response
- Be conversational and helpful
- Always include summary and message fields`;

        // Get command policies for OpenAI
        const { data: commandPolicies } = await supabase
          .from('command_policies')
          .select('id, policy_name, mode, match_type, match_value, os_whitelist, risk, timeout_sec, confirm_message');

        const routingData = {
          user_request: request.user_request,
          candidates: candidates,
          command_policies: commandPolicies || [],
          policy_notes: {
            wp_min_ram_mb: 2048,
            wp_min_disk_gb: 5,
            n8n_min_ram_mb: 2048,
            n8n_min_disk_gb: 2,
            ssl_requires_443: true,
            web_requires_80: true
          }
        };

        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4.1-2025-04-14',
            messages: [
              { role: 'system', content: systemPrompt },
              { 
                role: 'user', 
                content: `User request: ${request.user_request}\n\nRouting data: ${JSON.stringify(routingData, null, 2)}` 
              }
            ],
            stream: true,
            max_completion_tokens: 1000
          }),
        });

        if (!openAIResponse.ok) {
          throw new Error(`OpenAI API error: ${openAIResponse.status} ${openAIResponse.statusText}`);
        }

        const reader = openAIResponse.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get response reader');
        }

        let fullResponse = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                
                if (delta) {
                  fullResponse += delta;
                  // Send each token as router.token
                  sendMessage('router.token', { 
                    delta,
                    accumulated: fullResponse 
                  });
                }
              } catch (parseError) {
                // Skip malformed JSON
                continue;
              }
            }
          }
        }

        // Parse the final response to extract decision
        let decision;
        try {
          // For WordPress installation, create proper decision structure
          const userRequestLower = request.user_request.toLowerCase();
          if (userRequestLower.includes('wordpress') || userRequestLower.includes('wp')) {
            // Find WordPress batch from candidates or create mock structure
            let wordpressBatch = candidates.find((c: any) => 
              c.key?.includes('wordpress') || c.name?.toLowerCase().includes('wordpress')
            );
            
            decision = {
              mode: "action",
              task: "install_wordpress", 
              summary: "I'll help you install WordPress on your server!",
              status: "unconfirmed",
              batch_id: wordpressBatch?.id || "wordpress-installer-batch",
              missing_params: ["domain", "admin_username", "admin_password", "admin_email"],
              risk: "medium",
              message: fullResponse.trim() || "I'll help you install WordPress! Please provide the following details:",
              requires_inputs: true,
              batch_details: wordpressBatch || {
                id: "wordpress-installer-batch",
                name: "WordPress Installer",
                description: "Complete WordPress installation with database setup",
                inputs_schema: {
                  type: "object",
                  properties: {
                    domain: { type: "string", title: "Domain Name", description: "Your website domain (e.g., example.com)" },
                    admin_username: { type: "string", title: "Admin Username", description: "WordPress admin username" },
                    admin_password: { type: "string", title: "Admin Password", description: "Strong password for WordPress admin" },
                    admin_email: { type: "string", title: "Admin Email", description: "Email address for WordPress admin" }
                  },
                  required: ["domain", "admin_username", "admin_password", "admin_email"]
                },
                inputs_defaults: {
                  admin_username: "admin",
                  admin_email: ""
                }
              }
            };
          } else {
            // Try to extract JSON from the response for other requests
            const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              decision = JSON.parse(jsonMatch[0]);
              
              // If decision includes a batch_id, get full batch details
              if (decision.mode === 'action' && decision.batch_id) {
                console.log(`Getting batch details for selected batch: ${decision.batch_id}`);
                const detailsResponse = await supabase.functions.invoke('batch-details', {
                  body: { batch_id: decision.batch_id }
                });
                
                if (!detailsResponse.error && detailsResponse.data?.batch) {
                  decision.batch_details = detailsResponse.data.batch;
                }
              }
            } else {
              // Fallback: treat as chat response
              decision = {
                mode: 'chat',
                message: fullResponse.trim()
              };
            }
          }
        } catch (parseError) {
          console.error('Failed to parse OpenAI response as JSON:', parseError);
          decision = {
            mode: 'chat',
            message: fullResponse.trim()
          };
        }

        // Send router.selected with final decision
        sendMessage('router.selected', decision);

        // Send router.done to mark completion
        sendMessage('router.done', { 
          success: true,
          total_tokens: fullResponse.length 
        });

      } catch (error) {
        console.error('Error in OpenAI streaming:', error);
        sendMessage('router.error', { 
          error: 'Failed to process request with AI',
          details: error.message 
        });
        socket.close();
        return;
      }

    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      sendMessage('router.error', { 
        error: 'Failed to process request',
        details: error.message 
      });
      socket.close();
    }
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return response;
});