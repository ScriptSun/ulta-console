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
  run_id?: string;
}

// Intelligent token batching for improved streaming performance
async function streamTokensBatched(text: string, sendMessage: Function) {
  if (!text || text.length === 0) return;
  
  console.log(`🚀 Starting batched streaming for ${text.length} characters`);
  
  let buffer = '';
  let accumulated = '';
  let wordBuffer = '';
  let lastSentTime = Date.now();
  const MIN_BATCH_SIZE = 50;
  const MAX_BATCH_SIZE = 150; 
  const WORD_BOUNDARY_DELAY = 80; // Reduced delay
  const DEBOUNCE_DELAY = 60; // Debounce rapid sends
  
  const sendBatch = async () => {
    if (buffer.length === 0) return;
    
    const now = Date.now();
    const timeSinceLastSend = now - lastSentTime;
    
    // Debounce rapid sends
    if (timeSinceLastSend < DEBOUNCE_DELAY) {
      await new Promise(resolve => setTimeout(resolve, DEBOUNCE_DELAY - timeSinceLastSend));
    }
    
    console.log(`📦 Sending batch: "${buffer}" (${buffer.length} chars)`);
    
    accumulated += buffer;
    sendMessage('router.token', {
      delta: buffer,
      accumulated: accumulated
    });
    
    buffer = '';
    lastSentTime = Date.now();
    
    // Brief pause between batches for natural streaming feel
    await new Promise(resolve => setTimeout(resolve, WORD_BOUNDARY_DELAY));
  };
  
  // Process text character by character
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    buffer += char;
    wordBuffer += char;
    
    // Check for natural boundaries (space, punctuation)
    const isWordBoundary = /[\s.,!?;:]/.test(char);
    const isEndOfSentence = /[.!?]/.test(char);
    
    // Send batch on natural boundaries when buffer is substantial enough
    if (isWordBoundary && buffer.length >= MIN_BATCH_SIZE) {
      await sendBatch();
      wordBuffer = '';
    }
    // Send batch on sentence boundaries regardless of size
    else if (isEndOfSentence) {
      await sendBatch(); 
      wordBuffer = '';
    }
    // Send batch when max size reached
    else if (buffer.length >= MAX_BATCH_SIZE) {
      // Try to break at last word boundary if possible
      const lastSpaceIndex = buffer.lastIndexOf(' ');
      if (lastSpaceIndex > MIN_BATCH_SIZE) {
        const batchToSend = buffer.substring(0, lastSpaceIndex + 1);
        const remainder = buffer.substring(lastSpaceIndex + 1);
        
        // Send the batch up to the space
        accumulated += batchToSend;
        sendMessage('router.token', {
          delta: batchToSend,
          accumulated: accumulated
        });
        
        buffer = remainder;
        lastSentTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, WORD_BOUNDARY_DELAY));
      } else {
        // No good break point, send as-is
        await sendBatch();
      }
      wordBuffer = '';
    }
  }
  
  // Send any remaining buffer
  if (buffer.length > 0) {
    await sendBatch();
  }
  
  console.log('✅ Batched streaming completed');
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
            user_request: request.user_request,
            run_id: request.run_id
          }
        });

        if (routerResponse.error) {
          throw new Error(`Router decide error: ${routerResponse.error.message}`);
        }

        const decision = routerResponse.data;
        console.log('🎯 Decision received from router-decide:', decision);

        // Stream tokens with intelligent batching for better performance
        if (decision.mode === 'ai_draft_action') {
          const draftMessage = `Analyzing request and creating safe command plan...`;
          await streamTokensBatched(draftMessage, sendMessage);
        } else if (decision.mode === 'chat') {
          const chatText = decision.text || '';
          await streamTokensBatched(chatText, sendMessage);
        }

        // If decision includes a batch_id, get slim batch details (optimized payload)
        if (decision.mode === 'action' && decision.batch_id) {
          console.log(`Getting slim batch details for selected batch: ${decision.batch_id}`);
          const detailsResponse = await supabase.functions.invoke('batch-details-slim', {
            body: { batch_id: decision.batch_id }
          });
          
          if (!detailsResponse.error && detailsResponse.data?.batch) {
            decision.batch_details = detailsResponse.data.batch;
            console.log(`✅ Attached slim batch details (${JSON.stringify(detailsResponse.data.batch).length} bytes vs full payload)`);
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