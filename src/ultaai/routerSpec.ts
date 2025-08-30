export const ROUTER_SYSTEM_PROMPT = `You are UltaAI, a conversational hosting assistant.

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
          "required": ["mode", "task", "batch_id", "status", "params", "risk", "human"],
          "properties": {
            "mode": { "type": "string", "enum": ["action"] },
            "task": { "type": "string" },
            "batch_id": { "type": "string" },
            "status": { "type": "string", "enum": ["confirmed", "unconfirmed"] },
            "params": { "type": "object", "additionalProperties": { "type": ["string", "number", "boolean", "null"] } },
            "missing_params": { "type": "array", "items": { "type": "string" } },
            "risk": { "type": "string", "enum": ["low", "medium", "high"] },
            "human": { "type": "string" }
          },
          "additionalProperties": false
        },
        // Custom shell command
        { 
          "type": "object",
          "required": ["mode", "task", "status", "risk", "params", "human"],
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
            "human": { "type": "string" }
          },
          "additionalProperties": false
        },
        // Proposed batch script
        { 
          "type": "object",
          "required": ["mode", "task", "status", "risk", "script", "human"],
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
            "human": { "type": "string" }
          },
          "additionalProperties": false
        },
        // Not supported
        { 
          "type": "object",
          "required": ["mode", "task", "status", "reason", "human"],
          "properties": {
            "mode": { "type": "string", "enum": ["action"] },
            "task": { "type": "string", "enum": ["not_supported"] },
            "status": { "type": "string", "enum": ["rejected"] },
            "reason": { "type": "string" },
            "human": { "type": "string" }
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