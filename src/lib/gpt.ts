import { aiService, type AIRequestParams } from './aiService';

// Re-export types for backward compatibility
export type { AIRequestParams as CallGPTParams };

// Legacy function - now uses the new AI service with failover
export async function callGPT(params: AIRequestParams): Promise<any> {
  const result = await aiService.callAI(params);
  return result.content; // Return just content for backward compatibility
}