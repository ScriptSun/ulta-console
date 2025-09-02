// File-based system prompt loader with caching
interface PromptCache {
  [key: string]: {
    content: string;
    timestamp: number;
  };
}

const promptCache: PromptCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes


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
    const promptPath = `./prompts/${promptType}-system-prompt.md`;
    const errorMessage = `Failed to load ${promptType} prompt from file: ${promptPath}`;
    console.error(`❌ ${errorMessage}`, error);
    throw new Error(`${errorMessage} - ${error.message}`);
  }
}

/**
 * Get system prompt from file
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