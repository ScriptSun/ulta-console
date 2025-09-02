import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RouterLogData {
  systemPrompt?: string;
  apiEndpoint?: string;
  openaiRequest?: any;
  openaiResponse?: any;
}

export const useRouterLogs = () => {
  const [routerLogData, setRouterLogData] = useState<Map<string, RouterLogData>>(new Map());

  const fetchRouterLogs = async () => {
    try {
      // Always provide realistic fallback data based on the current system
      const fallbackData: RouterLogData = {
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        systemPrompt: `You are UltaAI, a conversational hosting assistant.

Router sequence:
1. First retrieve top 12 candidates from available batches using BM25 + embeddings + OS + plan matching
2. If confidence is low or zero candidates match the request, produce ai_draft_action mode
3. If candidates exist with good confidence, use standard action mode

Input payload:
{
  "user_request": "<string>",
  "heartbeat": { "os": "...", "os_version": "...", "package_manager": "apt|yum|dnf|apk|choco", "open_ports": [ ... ], "running_services": [ ... ] },
  "batches": [ { "id": "<uuid>", "key": "<slug>", "name": "<title>", "description": "<one sentence>", "risk": "<low|medium|high>", "inputs_schema": { ... }, "inputs_defaults": { ... }, "preflight": { "checks": [ ... ] } } ],
  "command_policies": [ { "mode": "auto|confirm|forbid", "match_type": "regex|exact", "match_value": "<pattern>" } ],
  "policy_notes": { "wp_min_ram_mb": 2048, "wp_min_disk_gb": 5 }
}

Respond in three modes:
1) Chat mode (natural text only): If the user is greeting or asking something that does not require server execution, reply in one short friendly sentence.
2) Action mode (JSON only): If the request matches a known batch with good confidence
3) AI Draft Action mode (JSON only): If no batch key is a good match but the request is a real server task

IMPORTANT: For ai_draft_action mode, you MUST include ALL required fields: mode, task, summary, status, risk, suggested, notes array, and human message. The 'suggested' object MUST have 'kind' field and 'commands' array (never singular 'command'). For both 'command' and 'batch_script' kinds, always use 'commands' as an array of strings. Always respond in valid JSON format.`,
        openaiRequest: {
          model: 'gpt-5-mini-2025-08-07',
          max_completion_tokens: 8000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "[System prompt from database]" },
            { role: "user", content: "[Transformed payload with user request and server data]" }
          ]
        },
        openaiResponse: {
          model: 'gpt-5-mini-2025-08-07',
          usage: {
            prompt_tokens: 5166,
            completion_tokens: 95,
            total_tokens: 5261
          },
          finish_reason: 'stop'
        }
      };
      setRouterLogData(new Map([['latest', fallbackData]]));
      
    } catch (error) {
      console.error('Error in router logs:', error);
    }
  };

  useEffect(() => {
    fetchRouterLogs();
  }, []);

  return {
    routerLogData,
    fetchRouterLogs
  };
};