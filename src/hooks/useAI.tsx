import { useState } from 'react';
import { aiService, type AIRequestParams } from '@/lib/aiService';

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callAI = async (params: AIRequestParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await aiService.callAI(params);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'AI request failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getFailoverModels = () => {
    return aiService.getFailoverModels();
  };

  const refreshSettings = async () => {
    await aiService.refreshSettings();
  };

  return {
    callAI,
    loading,
    error,
    getFailoverModels,
    refreshSettings
  };
}