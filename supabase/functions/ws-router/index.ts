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

      // Step 2: Stream decision making using ultaai-router-decide
      try {
        console.log('📞 Calling ultaai-router-decide for streaming decision...');
        
        // Call the router-decide function directly
        const routerResponse = await supabase.functions.invoke('ultaai-router-decide', {
          body: {
            agent_id: request.agent_id,
            user_request: request.user_request
          }
        });

        if (routerResponse.error) {
          throw new Error(`Router decide error: ${routerResponse.error.message}`);
        }

        const decision = routerResponse.data;
        console.log('🎯 Decision received from router-decide:', decision);

        // Emit streaming tokens for consistency (optional for non-streaming responses)
        if (decision.mode === 'ai_draft_action') {
          // Send some streaming tokens to indicate AI is working on draft
          const draftMessage = `Analyzing request and creating safe command plan...`;
          for (let i = 0; i < draftMessage.length; i += 10) {
            const chunk = draftMessage.slice(i, i + 10);
            sendMessage('router.token', { 
              delta: chunk,
              accumulated: draftMessage.slice(0, i + chunk.length)
            });
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } else if (decision.mode === 'chat') {
          // Stream chat response
          const chatText = decision.text || '';
          for (let i = 0; i < chatText.length; i += 8) {
            const chunk = chatText.slice(i, i + 8);
            sendMessage('router.token', { 
              delta: chunk,
              accumulated: chatText.slice(0, i + chunk.length)
            });
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        }

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

        // Send router.selected with final decision (supports all modes: chat, action, ai_draft_action)
        console.log('📤 Final decision being sent:', JSON.stringify(decision, null, 2));
        sendMessage('router.selected', decision);

        // Send router.done to mark completion
        sendMessage('router.done', { 
          success: true,
          mode: decision.mode
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