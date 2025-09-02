// File-based system prompt loader with caching
interface PromptCache {
  [key: string]: {
    content: string;
    timestamp: number;
  };
}

const promptCache: PromptCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fallback prompts (in case file loading fails)
const FALLBACK_PROMPTS = {
  router: `You are UltaAI, a conversational hosting assistant. Respond in JSON format for actions or plain text for chat.`,
  chat: `You are UltaAI, a friendly server management assistant. Keep responses concise and helpful.`,
  tools: `You are UltaAI, a server management assistant focused on tool execution and system operations.`,
  advice: `Analyze server metrics and provide JSON recommendations.`,
  'input-filler': `You fill inputs for a batch. Output JSON only: {"inputs":{...}}.`,
  'command-suggestion': `Analyze command requests and provide JSON suggestions with safety considerations.`
};

/**
 * Load system prompt from file with caching
 */
async function loadPromptFromFile(promptType: string): Promise<string> {
  const cacheKey = promptType;
  
  // Check cache first
  const cached = promptCache[cacheKey];
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`📄 Using cached prompt for ${promptType}`);
    return cached.content;
  }

  try {
    const promptPath = `./prompts/${promptType}-system-prompt.md`;
    console.log(`📖 Loading prompt from file: ${promptPath}`);
    
    const content = await Deno.readTextFile(promptPath);
    
    // Cache the result
    promptCache[cacheKey] = {
      content: content.trim(),
      timestamp: Date.now()
    };
    
    console.log(`✅ Loaded ${promptType} prompt (${content.length} chars)`);
    return content.trim();
    
  } catch (error) {
    console.warn(`⚠️ Failed to load ${promptType} prompt from file:`, error);
    
    // Return fallback prompt
    const fallback = FALLBACK_PROMPTS[promptType as keyof typeof FALLBACK_PROMPTS];
    if (fallback) {
      console.log(`🔄 Using fallback prompt for ${promptType}`);
      return fallback;
    }
    
    // Ultimate fallback
    console.error(`❌ No fallback available for ${promptType}`);
    return FALLBACK_PROMPTS.router;
  }
}

/**
 * Get system prompt from file with fallback
 * @param target - Which target to get prompt for ('router', 'chat', 'tools', etc.)
 * @returns Promise<string> - The system prompt content
 */
export async function getPromptFromFile(target: string = 'router'): Promise<string> {
  return await loadPromptFromFile(target);
}

/**
 * Get system prompt for router decisions (main UltaAI prompt)
 */
export async function getRouterSystemPrompt(): Promise<string> {
  return await getPromptFromFile('router');
}

/**
 * Get system prompt for chat conversations
 */
export async function getChatSystemPrompt(): Promise<string> {
  return await getPromptFromFile('chat');
}

/**
 * Get system prompt for tool execution contexts
 */
export async function getToolsSystemPrompt(): Promise<string> {
  return await getPromptFromFile('tools');
}

/**
 * Get system prompt for advice generation
 */
export async function getAdviceSystemPrompt(): Promise<string> {
  return await getPromptFromFile('advice');
}

/**
 * Get system prompt for input filling
 */
export async function getInputFillerSystemPrompt(): Promise<string> {
  return await getPromptFromFile('input-filler');
}

/**
 * Get system prompt for command suggestions
 */
export async function getCommandSuggestionSystemPrompt(): Promise<string> {
  return await getPromptFromFile('command-suggestion');
}