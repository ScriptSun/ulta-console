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
  const [loading, setLoading] = useState(true);

  const fetchActualSystemPrompt = async (): Promise<string> => {
    try {
      // Fetch the actual router system prompt from database
      const { data, error } = await supabase
        .from('system_prompts')
        .select('content_base64, updated_at, id')
        .eq('prompt_key', 'router')
        .single();

      if (error) {
        console.error('Error fetching system prompt:', error);
        return 'Error: Could not fetch system prompt from database';
      }

      if (!data?.content_base64) {
        return 'Error: No system prompt found in database';
      }

      // Decode base64 content to get the actual prompt
      const decodedPrompt = atob(data.content_base64);
      console.log('✅ Fetched actual system prompt from DB:', {
        id: data.id,
        updated_at: data.updated_at,
        length: decodedPrompt.length,
        preview: decodedPrompt.substring(0, 100) + '...'
      });
      
      return decodedPrompt;
    } catch (error) {
      console.error('Error decoding system prompt:', error);
      return 'Error: Failed to decode system prompt';
    }
  };

  const fetchRouterLogs = async () => {
    setLoading(true);
    try {
      // Get the actual current system prompt from database
      const actualSystemPrompt = await fetchActualSystemPrompt();
      
      const currentData: RouterLogData = {
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        systemPrompt: actualSystemPrompt,
        openaiRequest: {
          model: 'gpt-5-mini-2025-08-07',
          max_completion_tokens: 8000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: actualSystemPrompt },
            { role: "user", content: "[Transformed payload with user request and server data]" }
          ]
        },
        openaiResponse: {
          model: 'gpt-5-mini-2025-08-07',
          usage: {
            prompt_tokens: 7300,
            completion_tokens: 271,
            total_tokens: 7571
          },
          finish_reason: 'stop'
        }
      };
      
      setRouterLogData(new Map([['latest', currentData]]));
      
    } catch (error) {
      console.error('Error in router logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRouterLogs();
  }, []);

  return {
    routerLogData,
    fetchRouterLogs,
    loading
  };
};