import { supabaseAdmin } from './supabase-admin.ts';

interface SystemPromptVersion {
  id: string;
  content: string;
  version: number;
  published: boolean;
  created_at: string;
  author: string;
  notes?: string;
  targets: string[];
}

// Fallback prompt (your original UltaAI prompt)
const FALLBACK_SYSTEM_PROMPT = `You are UltaAI, a conversational hosting assistant.

Input payload:
{
  "user_request": "<string>",
  "heartbeat": { "os": "...", "os_version": "...", "package_manager": "apt|yum|dnf|apk|choco", "open_ports": [ ... ], "running_services": [ ... ] },
  "batches": [ { "id": "<uuid>", "key": "<slug>", "name": "<title>", "description": "<one sentence>", "risk": "<low|medium|high>", "inputs_schema": { ... }, "inputs_defaults": { ... }, "preflight": { "checks": [ ... ] } } ],
  "command_policies": [ { "mode": "auto|confirm|forbid", "match_type": "regex|exact", "match_value": "<pattern>" } ],
  "policy_notes": { "wp_min_ram_mb": 2048, "wp_min_disk_gb": 5 }
}

Respond in two modes:

1) Chat mode (natural text only):
   If the user is greeting or asking something that does not require server execution, reply in one short friendly sentence. No JSON.

2) Action mode (JSON only):
   A) If the request matches a known batch in "batches", return:
      {
        "mode": "action",
        "task": "<batch_key>",
        "batch_id": "<uuid>",
        "status": "<confirmed|unconfirmed>",
        "params": { ...auto_filled },
        "missing_params": [ ... ],
        "risk": "<low|medium|high>",
        "human": "<short tip for the UI>"
      }

   B) If there is no matching batch but the request is a real server task, choose ONE of:
      B1) Single safe command (simple task):
          {
            "mode": "action",
            "task": "custom_shell",
            "status": "unconfirmed",
            "risk": "<low|medium|high>",
            "params": {
              "description": "<short description>",
              "shell": "<one safe Linux command>"
            },
            "human": "Press Execute if allowed by policy."
          }

      B2) Mini batch script (needs several steps):
          {
            "mode": "action",
            "task": "proposed_batch_script",
            "status": "unconfirmed",
            "risk": "<low|medium|high>",
            "script": {
              "name": "<short title>",
              "overview": "<one sentence>",
              "commands": [
                "<step 1 single command>",
                "<step 2 single command>",
                "<step 3 single command>"
              ],
              "post_checks": [
                "<curl or systemctl check>"
              ]
            },
            "human": "This script can be executed as a batch if allowed by policy."
          }

   C) If the request is unsafe or forbidden, return:
      {
        "mode": "action",
        "task": "not_supported",
        "status": "rejected",
        "reason": "<short reason>",
        "human": "<short hint>"
      }

Rules:
- Detect the package manager from heartbeat (prefer heartbeat.package_manager). If unknown, infer: Ubuntu/Debian=apt, CentOS/RHEL=yum or dnf, Fedora=dnf, Alpine=apk.
- Commands must be safe. Never use rm, dd, mkfs, eval, base64, curl|bash, pipes, &&, or ; in a single command line.
- For mini batch "commands", each array item is a single line command with no pipes or && or ;.
- Respect command_policies: if a command would match a forbid pattern, do not output it. Prefer the not_supported form with a reason.
- Prefer idempotent steps. Example: install packages with the native package manager, enable services with systemctl, reload rather than restart when possible.
- Add a very short "human" sentence to help the UI.
- For chat, text only. For actions, JSON only.`;

/**
 * Get the published system prompt from database with fallback
 * @param target - Which target to get prompt for ('router', 'chat', 'tools', 'custom')
 * @returns Promise<string> - The system prompt content
 */
export async function getPublishedSystemPrompt(target: string = 'router'): Promise<string> {
  try {
    console.log(`🔍 Getting system prompt for target: ${target}`);
    
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai.systemPrompt')
      .maybeSingle();

    if (error) {
      console.error('❌ Error fetching system prompt from database:', error);
      return FALLBACK_SYSTEM_PROMPT;
    }

    if (data?.setting_value) {
      console.log('📄 Found system prompt data in database');
      
      const prompts = Array.isArray(data.setting_value) ? 
        data.setting_value as unknown as SystemPromptVersion[] : 
        [data.setting_value as unknown as SystemPromptVersion];
      
      // Find published prompt that targets this specific use case
      const publishedPrompt = prompts.find((p: SystemPromptVersion) => 
        p.published && (p.targets?.includes(target) || p.targets?.includes('router'))
      );
      
      if (publishedPrompt) {
        console.log(`✅ Using published system prompt v${publishedPrompt.version} for ${target}`);
        return publishedPrompt.content;
      } else {
        console.log('⚠️ No published prompt found with matching target, checking for any published prompt');
        const anyPublished = prompts.find((p: SystemPromptVersion) => p.published);
        if (anyPublished) {
          console.log(`✅ Using published system prompt v${anyPublished.version} (fallback)`);
          return anyPublished.content;
        }
      }
    }

    console.log('⚠️ No system prompt found in database, using fallback');
    return FALLBACK_SYSTEM_PROMPT;
    
  } catch (error) {
    console.error('❌ Error loading system prompt:', error);
    return FALLBACK_SYSTEM_PROMPT;
  }
}

/**
 * Get system prompt for router decisions (main UltaAI prompt)
 */
export async function getRouterSystemPrompt(): Promise<string> {
  return getPublishedSystemPrompt('router');
}

/**
 * Get system prompt for chat conversations
 */
export async function getChatSystemPrompt(): Promise<string> {
  return getPublishedSystemPrompt('chat');
}

/**
 * Get system prompt for tool execution contexts
 */
export async function getToolsSystemPrompt(): Promise<string> {
  return getPublishedSystemPrompt('tools');
}