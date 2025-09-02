// Database-based system prompt loader with intelligent caching
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

interface PromptCacheEntry {
  content: string;
  timestamp: number;
  promptKey: string;
}

class PromptCache {
  private cache: Map<string, PromptCacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes cache TTL
  private supabase: ReturnType<typeof createClient>;
  private isInitialized = false;

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  private async initializeCache() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing prompt cache...');
    try {
      // Pre-load all system prompts at startup
      await Promise.all([
        this.loadPrompt('router'),
        this.loadPrompt('chat'), 
        this.loadPrompt('tools'),
        this.loadPrompt('advice'),
        this.loadPrompt('input-filler'),
        this.loadPrompt('command-suggestion')
      ]);
      
      this.isInitialized = true;
      console.log('✅ Prompt cache initialized with', this.cache.size, 'prompts');
    } catch (error) {
      console.error('❌ Failed to initialize prompt cache:', error);
      // Don't mark as initialized so we can retry
    }
  }

  private isExpired(entry: PromptCacheEntry): boolean {
    return Date.now() - entry.timestamp > this.TTL;
  }

  private async loadFromDatabase(promptKey: string): Promise<string> {
    console.log(`📡 Loading ${promptKey} prompt from database...`);
    
    const { data, error } = await this.supabase
      .from('system_prompts')
      .select('content_base64')
      .eq('prompt_key', promptKey)
      .single();

    if (error) {
      throw new Error(`Failed to load ${promptKey} prompt from database: ${error.message}`);
    }

    if (!data?.content_base64) {
      throw new Error(`No content found for ${promptKey} prompt`);
    }

    // Decode base64 content
    const content = atob(data.content_base64);
    
    console.log(`✅ Loaded ${promptKey} prompt from database (${content.length} chars)`);
    return content;
  }

  private async loadPrompt(promptKey: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(promptKey);
    if (cached && !this.isExpired(cached)) {
      console.log(`💾 Using cached ${promptKey} prompt`);
      return cached.content;
    }

    try {
      // Load from database
      const content = await this.loadFromDatabase(promptKey);
      
      // Update cache
      this.cache.set(promptKey, {
        content,
        timestamp: Date.now(),
        promptKey
      });
      
      return content;
    } catch (error) {
      // If database fails and we have an expired cache entry, use it as fallback
      if (cached) {
        console.warn(`⚠️ Database failed, using expired cache for ${promptKey}:`, error.message);
        return cached.content;
      }
      
      throw error;
    }
  }

  async getPrompt(promptKey: string): Promise<string> {
    // Initialize cache on first use
    if (!this.isInitialized) {
      await this.initializeCache();
    }
    
    return this.loadPrompt(promptKey);
  }

  // Force refresh a specific prompt
  async refreshPrompt(promptKey: string): Promise<string> {
    this.cache.delete(promptKey);
    return this.loadPrompt(promptKey);
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        expired: this.isExpired(entry)
      }))
    };
  }
}

// Global cache instance for the module
const promptCache = new PromptCache();

// Export individual prompt functions for backward compatibility
export async function getRouterSystemPrompt(): Promise<string> {
  return promptCache.getPrompt('router');
}

export async function getChatSystemPrompt(): Promise<string> {
  return promptCache.getPrompt('chat');
}

export async function getToolsSystemPrompt(): Promise<string> {
  return promptCache.getPrompt('tools');
}

export async function getAdviceSystemPrompt(): Promise<string> {
  return promptCache.getPrompt('advice');
}

export async function getInputFillerSystemPrompt(): Promise<string> {
  return promptCache.getPrompt('input-filler');
}

export async function getCommandSuggestionSystemPrompt(): Promise<string> {
  return promptCache.getPrompt('command-suggestion');
}

// Export generic prompt function
export async function getPromptFromDB(promptKey: string): Promise<string> {
  return promptCache.getPrompt(promptKey);
}

// Export cache management functions
export async function refreshPromptCache(promptKey?: string): Promise<void> {
  if (promptKey) {
    await promptCache.refreshPrompt(promptKey);
  } else {
    // Refresh all cached prompts
    const stats = promptCache.getCacheStats();
    await Promise.all(
      stats.entries.map(entry => promptCache.refreshPrompt(entry.key))
    );
  }
}

export function getPromptCacheStats() {
  return promptCache.getCacheStats();
}