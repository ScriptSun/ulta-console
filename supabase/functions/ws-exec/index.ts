import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ExecMessage {
  type: string;
  rid: string;
  ts: number;
  data: any;
}

interface ExecRequest {
  run_id?: string;
  agent_id?: string;
  decision?: any;
  mode?: 'preflight' | 'execution';
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
  let subscriptions: any[] = [];

  const sendMessage = (type: string, data: any = {}) => {
    const message: ExecMessage = {
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

  const cleanup = () => {
    // Remove all subscriptions
    subscriptions.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Error removing channel:', error);
      }
    });
    subscriptions = [];
  };

  socket.onopen = () => {
    console.log('Execution WebSocket connection opened');
  };

  socket.onmessage = async (event) => {
    try {
      const request: ExecRequest = JSON.parse(event.data);
      rid = crypto.randomUUID(); // Generate new rid for this request
      
      console.log('Execution request received:', request);

      // Handle preflight mode
      if (request.mode === 'preflight') {
        await handlePreflightStream(request, sendMessage);
      } 
      // Handle execution mode
      else if (request.mode === 'execution') {
        await handleExecutionStream(request, sendMessage);
      }
      // Auto-detect mode based on request content
      else {
        // If it has decision data, start with preflight
        if (request.decision) {
          await handlePreflightStream(request, sendMessage);
        } else if (request.run_id) {
          await handleExecutionStream(request, sendMessage);
        } else {
          sendMessage('error', { error: 'Invalid request: missing decision or run_id' });
        }
      }

    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      sendMessage('exec.error', { 
        error: 'Failed to process request',
        details: error.message 
      });
    }
  };

  socket.onclose = () => {
    console.log('Execution WebSocket connection closed');
    cleanup();
  };

  socket.onerror = (error) => {
    console.error('Execution WebSocket error:', error);
    cleanup();
  };

  // Handle preflight streaming
  async function handlePreflightStream(request: ExecRequest, sendMessage: Function) {
    try {
      sendMessage('preflight.start', { 
        agent_id: request.agent_id,
        decision: request.decision 
      });

      let preflightResponse;
      
      // Check if this is an AI draft action - use special preflight endpoint
      if (request.decision?.suggested || request.decision?.script) {
        preflightResponse = await supabase.functions.invoke('ultaai-draft-preflight', {
          body: {
            agent_id: request.agent_id,
            decision: request.decision
          }
        });
      } else {
        // Use existing preflight endpoint for regular batches
        preflightResponse = await supabase.functions.invoke('ultaai-preflight-run', {
          body: {
            agent_id: request.agent_id,
            decision: request.decision
          }
        });
      }

      if (preflightResponse.error) {
        throw new Error(`Preflight error: ${preflightResponse.error.message}`);
      }

      const preflightData = preflightResponse.data;
      
      // Simulate streaming individual checks
      if (preflightData.preflight_checks) {
        for (const check of preflightData.preflight_checks) {
          // Add delay to simulate real-time checking
          await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
          
          sendMessage('preflight.item', {
            name: check.check,
            status: check.status || (check.message ? 'fail' : 'pass'),
            message: check.message,
            details: check
          });
        }
      }

      // Send preflight done
      sendMessage('preflight.done', {
        ok: preflightData.preflight_ok,
        failed: preflightData.failed || [],
        checks: preflightData.preflight_checks || []
      });

      // If preflight passed and this is a draft action, start execution via ultaai-exec-run
      if (preflightData.preflight_ok && (request.decision?.suggested || request.decision?.script)) {
        console.log('Starting draft action execution...');
        
        // Call exec-run to create batch_runs and start execution
        const execResponse = await supabase.functions.invoke('ultaai-exec-run', {
          body: {
            agent_id: request.agent_id,
            decision: request.decision,
            confirm: true
          }
        });

        if (execResponse.error) {
          console.error('Error starting draft execution:', execResponse.error);
          sendMessage('exec.error', { 
            error: 'Failed to start execution',
            details: execResponse.error.message 
          });
          return;
        }

        const execData = execResponse.data;
        if (execData.run_id) {
          // Switch to execution mode
          await handleExecutionStream({ run_id: execData.run_id }, sendMessage);
        }
      } else if (preflightData.preflight_ok && preflightData.run_id) {
        // For regular batches, use existing flow
        await handleExecutionStream({ run_id: preflightData.run_id }, sendMessage);
      }

    } catch (error) {
      console.error('Error in preflight streaming:', error);
      sendMessage('preflight.error', { 
        error: 'Preflight checks failed',
        details: error.message 
      });
    }
  }

  // Handle execution streaming
  async function handleExecutionStream(request: ExecRequest, sendMessage: Function) {
    try {
      const runId = request.run_id;
      
      // Get initial run status
      const { data: runData, error: runError } = await supabase
        .from('batch_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (runError || !runData) {
        throw new Error('Run not found');
      }

      // Send initial status
      sendMessage('exec.queued', {
        run_id: runId,
        status: runData.status
      });

      // Subscribe to batch_runs changes
      const runsChannel = supabase
        .channel(`batch-runs-${runId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'batch_runs',
            filter: `id=eq.${runId}`
          },
          (payload) => {
            console.log('Batch run update:', payload);
            
            const run = payload.new || payload.old;
            
            switch (run.status) {
              case 'running':
                sendMessage('exec.started', {
                  run_id: runId,
                  started_at: run.started_at
                });
                break;
                
              case 'completed':
              case 'failed':
                sendMessage('exec.finished', {
                  run_id: runId,
                  success: run.status === 'completed',
                  duration_ms: run.duration_sec * 1000,
                  finished_at: run.finished_at,
                  contract: run.contract,
                  stdout: run.raw_stdout,
                  stderr: run.raw_stderr
                });
                break;
            }
          }
        )
        .subscribe();

      subscriptions.push(runsChannel);

      // Subscribe to agent_logs for stdout streaming
      const logsChannel = supabase
        .channel(`agent-logs-${runData.agent_id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'agent_logs',
            filter: `agent_id=eq.${runData.agent_id}`
          },
          (payload) => {
            console.log('Agent log:', payload);
            
            const log = payload.new;
            
            // Check if this log is related to our run
            if (log.metadata?.run_id === runId || log.message?.includes(runId)) {
              if (log.level === 'stdout') {
                sendMessage('exec.stdout', {
                  run_id: runId,
                  line: log.message,
                  timestamp: log.timestamp
                });
              } else if (log.metadata?.progress) {
                sendMessage('exec.progress', {
                  run_id: runId,
                  pct: log.metadata.progress,
                  message: log.message
                });
              }
            }
          }
        )
        .subscribe();

      subscriptions.push(logsChannel);

      // If run is already completed, send final status
      if (runData.status === 'completed' || runData.status === 'failed') {
        sendMessage('exec.finished', {
          run_id: runId,
          success: runData.status === 'completed',
          duration_ms: runData.duration_sec * 1000,
          finished_at: runData.finished_at,
          contract: runData.contract,
          stdout: runData.raw_stdout,
          stderr: runData.raw_stderr
        });
      } else if (runData.status === 'running') {
        sendMessage('exec.started', {
          run_id: runId,
          started_at: runData.started_at
        });
      }

    } catch (error) {
      console.error('Error in execution streaming:', error);
      sendMessage('exec.error', { 
        error: 'Execution monitoring failed',
        details: error.message 
      });
    }
  }

  return response;
});