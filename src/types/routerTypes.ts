export type RouterDecision =
  | { mode: "chat"; text: string }
  | {
      mode: "action";
      task: string;           // matched batch key
      batch_id: string;
      status: "confirmed" | "unconfirmed";
      params?: Record<string, any>;
      missing_params?: string[];
      risk: "low" | "medium" | "high";
      human?: string;
    }
  | {
      mode: "ai_draft_action";
      task: string;           // human readable, e.g. "install_wordpress"
      summary: string;        // one line human summary
      status: "unconfirmed";  // always requires confirmation
      risk: "low" | "medium" | "high";
      suggested:                 // how to do it if no batch exists
        | {
            kind: "command";
            description: string; // short label
            command: string;     // single safe command
          }
        | {
            kind: "commands";
            commands: string[];  // array of commands
          }
        | {
            kind: "batch_script";
            name: string;
            overview: string;
            commands: string[];     // single line commands, no pipes
            post_checks?: string[]; // simple verifications
          };
      notes?: string[];        // short hints for the UI
      human?: string;          // "Confirm to apply changes"
    };

export type AiDraftAction = Extract<RouterDecision, { mode: "ai_draft_action" }>;