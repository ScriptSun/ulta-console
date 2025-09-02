import { supabase } from '@/integrations/supabase/client';

// Base64 utility functions
export const encodeToBase64 = (content: string): string => {
  return btoa(unescape(encodeURIComponent(content)));
};

export const decodeFromBase64 = (base64: string): string => {
  return decodeURIComponent(escape(atob(base64)));
};

// System prompt types
export interface SystemPrompt {
  id?: string;
  prompt_key: string;
  name: string;
  description?: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

// Database operations for system prompts
export const loadPromptFromDB = async (promptKey: string): Promise<string> => {
  const { data, error } = await supabase
    .from('system_prompts')
    .select('content_base64')
    .eq('prompt_key', promptKey)
    .single();

  if (error) {
    console.error(`Failed to load prompt ${promptKey}:`, error);
    throw new Error(`Failed to load prompt: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Prompt ${promptKey} not found`);
  }

  return decodeFromBase64(data.content_base64);
};

export const savePromptToDB = async (promptKey: string, content: string, name?: string): Promise<void> => {
  const contentBase64 = encodeToBase64(content);
  
  // Get existing prompt metadata to preserve name if not provided
  let promptName = name;
  if (!promptName) {
    try {
      const existing = await getPromptMetadata(promptKey);
      promptName = existing.name;
    } catch (error) {
      // If prompt doesn't exist, use a default name
      promptName = promptKey.charAt(0).toUpperCase() + promptKey.slice(1) + ' System Prompt';
    }
  }
  
  const { error } = await supabase
    .from('system_prompts')
    .upsert({
      prompt_key: promptKey,
      name: promptName,
      content_base64: contentBase64,
      updated_by: (await supabase.auth.getUser()).data.user?.id
    }, {
      onConflict: 'prompt_key'
    });

  if (error) {
    console.error(`Failed to save prompt ${promptKey}:`, error);
    throw new Error(`Failed to save prompt: ${error.message}`);
  }
};

export const loadAllPromptsFromDB = async (): Promise<SystemPrompt[]> => {
  const { data, error } = await supabase
    .from('system_prompts')
    .select('*')
    .order('prompt_key');

  if (error) {
    console.error('Failed to load prompts:', error);
    throw new Error(`Failed to load prompts: ${error.message}`);
  }

  return (data || []).map(prompt => ({
    ...prompt,
    content: decodeFromBase64(prompt.content_base64)
  }));
};

export const getPromptMetadata = async (promptKey: string): Promise<Omit<SystemPrompt, 'content'>> => {
  const { data, error } = await supabase
    .from('system_prompts')
    .select('id, prompt_key, name, description, created_at, updated_at, updated_by')
    .eq('prompt_key', promptKey)
    .single();

  if (error) {
    console.error(`Failed to get prompt metadata ${promptKey}:`, error);
    throw new Error(`Failed to get prompt metadata: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Prompt ${promptKey} not found`);
  }

  return data;
};