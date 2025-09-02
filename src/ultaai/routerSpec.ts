import { supabase } from '@/integrations/supabase/client';

// Define types for the system prompt version structure
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

// Get the published system prompt from database
export const getPublishedSystemPrompt = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai.systemPrompt')
      .maybeSingle();

    if (error) {
      console.error('Error fetching system prompt:', error);
      // Fallback to hard coded prompt if database fails
      return ROUTER_SYSTEM_PROMPT_FALLBACK;
    }

    if (data?.setting_value) {
      const prompts = Array.isArray(data.setting_value) ? 
        data.setting_value as unknown as SystemPromptVersion[] : [data.setting_value as unknown as SystemPromptVersion];
      
      const publishedPrompt = prompts.find((p: SystemPromptVersion) => p.published);
      if (publishedPrompt) {
        return publishedPrompt.content;
      }
    }

    // Fallback if no published prompt found
    return ROUTER_SYSTEM_PROMPT_FALLBACK;
  } catch (error) {
    console.error('Error loading system prompt:', error);
    return ROUTER_SYSTEM_PROMPT_FALLBACK;
  }
};

// Fallback prompt (updated for draft generation)
export const ROUTER_SYSTEM_PROMPT_FALLBACK = `You are UltaAI, a conversational hosting assistant.

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

1) Chat mode (natural text only):
   If the user is greeting or asking something that does not require server execution, reply in one short friendly sentence. No JSON.

2) Action mode (JSON only):
   If the request matches a known batch in "batches" with good confidence, return:
   {
     "mode": "action",
     "task": "<batch_key>",
     "batch_id": "<uuid>",
     "status": "<confirmed|unconfirmed>",
     "params": { ...auto_filled },
     "missing_params": [ ... ],
     "risk": "<low|medium|high>",
     "summary": "<short description of what this will do>"
   }

3) AI Draft Action mode (JSON only):
   If no batch key is a good match but the request is a real server task, create a safe draft plan:
   
   A) Single safe command (simple task):
      {
        "mode": "ai_draft_action",
        "task": "<human_readable_task_name>",
        "summary": "<one line summary of what this will do>",
        "status": "unconfirmed",
        "risk": "<low|medium|high>",
        "suggested": {
          "kind": "command",
          "description": "<short label>",
          "command": "<one safe Linux command>"
        },
        "notes": ["<short hint for UI>"]
      }

   B) Multi-step process (2-5 commands needed):
      {
        "mode": "ai_draft_action",
        "task": "<human_readable_task_name>",
        "summary": "<one line summary of what this will do>",
        "status": "unconfirmed",
        "risk": "<low|medium|high>",
        "suggested": {
          "kind": "batch_script",
          "name": "<short title>",
          "overview": "<one sentence>",
          "commands": [
            "<step 1 single command>",
            "<step 2 single command>",
            "<step 3 single command>",
            "<step 4 single command>",
            "<step 5 single command>"
          ],
          "post_checks": [
            "<curl or systemctl check>"
          ]
        },
        "notes": ["<short hint for UI>"]
      }

   C) If the request is unsafe or forbidden, return:
      {
        "mode": "action",
        "task": "not_supported",
        "status": "rejected",
        "reason": "<short reason>",
        "summary": "<short hint>"
      }

Draft Generation Rules:
- Only use ai_draft_action when no existing batch matches after retrieval of top 12 candidates
- Require either a single safe command OR a list of 2-5 single-line commands with no pipes or &&
- Always include human tone fields: "summary"
- Never output forbidden patterns or destructive commands

Package Manager Rules:
- For Ubuntu/Debian: prefer "apt-get update && apt-get install -y <pkg>" pattern, but split into separate commands for draft mode
- For RHEL/CentOS: prefer "yum install -y <pkg>" or "dnf install -y <pkg>"
- For Alpine: prefer "apk add --no-cache <pkg>"
- For Fedora: prefer "dnf install -y <pkg>"
- Detect from heartbeat.package_manager first, then infer from OS

Safety Rules:
- Commands must be safe. Never use rm, dd, mkfs, eval, base64, curl|bash, pipes, &&, or ; in a single command line
- For batch_script "commands", each array item is a single line command with no pipes or && or ;
- Respect command_policies: if a command would match a forbid pattern, do not output it. Use not_supported with a reason
- Prefer idempotent steps: use package managers, systemctl enable/start, reload rather than restart when possible
- Always set status to "unconfirmed" for ai_draft_action - they require confirmation
- Add helpful "notes" array and human-friendly message for the UI
- For chat, text only. For actions, JSON only.`;

// Legacy export for backward compatibility
export const ROUTER_SYSTEM_PROMPT = ROUTER_SYSTEM_PROMPT_FALLBACK;

export const ROUTER_RESPONSE_SCHEMA = {
  "type": "object",
  "oneOf": [
    // Chat mode - plain text response
    {
      "type": "string"
     },
     // Action mode responses
     {
       "type": "object",
       "oneOf": [
         // Confirmed/unconfirmed batch
         { 
           "type": "object",
           "required": ["mode", "task", "batch_id", "status", "params", "risk", "summary"],
           "properties": {
             "mode": { "type": "string", "enum": ["action"] },
             "task": { "type": "string" },
             "batch_id": { "type": "string" },
             "status": { "type": "string", "enum": ["confirmed", "unconfirmed"] },
             "params": { "type": "object", "additionalProperties": { "type": ["string", "number", "boolean", "null"] } },
             "missing_params": { "type": "array", "items": { "type": "string" } },
             "risk": { "type": "string", "enum": ["low", "medium", "high"] },
             "summary": { "type": "string" }
           },
           "additionalProperties": false
         },
        // Custom shell command
        { 
          "type": "object",
          "required": ["mode", "task", "status", "risk", "params", "summary"],
          "properties": {
            "mode": { "type": "string", "enum": ["action"] },
            "task": { "type": "string", "enum": ["custom_shell"] },
            "status": { "type": "string", "enum": ["unconfirmed"] },
            "risk": { "type": "string", "enum": ["low", "medium", "high"] },
            "params": {
              "type": "object",
              "required": ["description", "shell"],
              "properties": {
                "description": { "type": "string" },
                "shell": { "type": "string" }
              },
              "additionalProperties": false
            },
            "summary": { "type": "string" }
          },
          "additionalProperties": false
        },
        // Proposed batch script
        { 
          "type": "object",
          "required": ["mode", "task", "status", "risk", "script", "summary"],
          "properties": {
            "mode": { "type": "string", "enum": ["action"] },
            "task": { "type": "string", "enum": ["proposed_batch_script"] },
            "status": { "type": "string", "enum": ["unconfirmed"] },
            "risk": { "type": "string", "enum": ["low", "medium", "high"] },
            "script": {
              "type": "object",
              "required": ["name", "overview", "commands", "post_checks"],
              "properties": {
                "name": { "type": "string" },
                "overview": { "type": "string" },
                "commands": { "type": "array", "items": { "type": "string" } },
                "post_checks": { "type": "array", "items": { "type": "string" } }
              },
              "additionalProperties": false
            },
            "summary": { "type": "string" }
          },
          "additionalProperties": false
         },
         // AI Draft Action
         { 
           "type": "object",
           "required": ["mode", "task", "summary", "status", "risk", "suggested"],
           "properties": {
             "mode": { "type": "string", "enum": ["ai_draft_action"] },
             "task": { "type": "string" },
             "summary": { "type": "string" },
             "status": { "type": "string", "enum": ["unconfirmed"] },
             "risk": { "type": "string", "enum": ["low", "medium", "high"] },
             "suggested": {
               "type": "object",
               "oneOf": [
                 {
                   "type": "object",
                   "required": ["kind", "description", "command"],
                   "properties": {
                     "kind": { "type": "string", "enum": ["command"] },
                     "description": { "type": "string" },
                     "command": { "type": "string" }
                   },
                   "additionalProperties": false
                 },
                 {
                   "type": "object",
                   "required": ["kind", "name", "overview", "commands"],
                   "properties": {
                     "kind": { "type": "string", "enum": ["batch_script"] },
                     "name": { "type": "string" },
                     "overview": { "type": "string" },
                     "commands": { "type": "array", "items": { "type": "string" } },
                     "post_checks": { "type": "array", "items": { "type": "string" } }
                   },
                   "additionalProperties": false
                 }
               ]
              },
              "notes": { "type": "array", "items": { "type": "string" } }
           },
           "additionalProperties": false
         },
          // Not supported
          { 
            "type": "object",
            "required": ["mode", "task", "status", "reason", "summary"],
            "properties": {
              "mode": { "type": "string", "enum": ["action"] },
              "task": { "type": "string", "enum": ["not_supported"] },
              "status": { "type": "string", "enum": ["rejected"] },
              "reason": { "type": "string" },
              "summary": { "type": "string" }
            },
            "additionalProperties": false
          }
      ]
    }
  ]
};

export const INPUT_FILLER_SYSTEM_PROMPT = `You fill inputs for a batch. Input has inputs_schema, inputs_defaults, and params. Output JSON only: {"inputs":{...}}. Start with defaults, overwrite with params, drop keys not in schema, ensure all required are present.`;

export const PROPOSED_BATCH_SCHEMA = {
  type: "object",
  required: [
    "key",
    "name",
    "risk",
    "description",
    "inputs_schema",
    "inputs_defaults",
    "preflight",
    "commands"
  ],
  properties: {
    key: { type: "string" },                // slug like "install_custom_tool"
    name: { type: "string" },               // human-readable title
    risk: { type: "string", enum: ["low","medium","high"] },
    description: { type: "string" },        // one-sentence description
    inputs_schema: { type: "object" },      // JSON Schema for params
    inputs_defaults: { type: "object" },    // default values
    preflight: { type: "object" },          // object with "checks":[]
    commands: { 
      type: "array", 
      items: { type: "string" }             // one safe shell command per line
    }
  },
  additionalProperties: false
};