export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      agent_deployment_tokens: {
        Row: {
          agent_id: string | null
          created_at: string
          created_by: string
          customer_id: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          created_by?: string
          customer_id: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_deployment_tokens_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_heartbeats: {
        Row: {
          agent_id: string
          cpu_usage: number
          disk_usage: number | null
          id: string
          memory_usage: number
          network_io_in: number | null
          network_io_out: number | null
          open_ports: number[] | null
          timestamp: string
          uptime_seconds: number
        }
        Insert: {
          agent_id: string
          cpu_usage: number
          disk_usage?: number | null
          id?: string
          memory_usage: number
          network_io_in?: number | null
          network_io_out?: number | null
          open_ports?: number[] | null
          timestamp?: string
          uptime_seconds: number
        }
        Update: {
          agent_id?: string
          cpu_usage?: number
          disk_usage?: number | null
          id?: string
          memory_usage?: number
          network_io_in?: number | null
          network_io_out?: number | null
          open_ports?: number[] | null
          timestamp?: string
          uptime_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_heartbeats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_logs: {
        Row: {
          agent_id: string
          id: string
          level: string
          message: string
          metadata: Json | null
          timestamp: string
        }
        Insert: {
          agent_id: string
          id?: string
          level?: string
          message: string
          metadata?: Json | null
          timestamp?: string
        }
        Update: {
          agent_id?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          started_at: string | null
          status: string
          task_name: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string
          task_name: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string
          task_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_usage: {
        Row: {
          agent_id: string
          completion_tokens: number | null
          count: number
          created_at: string
          id: string
          model: string | null
          prompt_tokens: number | null
          updated_at: string
          usage_date: string
          usage_type: string
        }
        Insert: {
          agent_id: string
          completion_tokens?: number | null
          count?: number
          created_at?: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          updated_at?: string
          usage_date?: string
          usage_type: string
        }
        Update: {
          agent_id?: string
          completion_tokens?: number | null
          count?: number
          created_at?: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
          updated_at?: string
          usage_date?: string
          usage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agent_type: string
          auto_updates_enabled: boolean | null
          certificate_fingerprint: string | null
          cpu_usage: number | null
          created_at: string
          created_by: string
          customer_id: string
          heartbeat: Json
          hostname: string | null
          id: string
          ip_address: unknown | null
          last_cert_rotation: string | null
          last_decision_json: Json | null
          last_heartbeat: string | null
          last_seen: string | null
          memory_usage: number | null
          os: string | null
          plan_key: string
          region: string | null
          signature_key_version: number | null
          status: string
          tasks_completed: number | null
          updated_at: string
          updated_by: string
          uptime_seconds: number | null
          user_id: string
          version: string | null
        }
        Insert: {
          agent_type?: string
          auto_updates_enabled?: boolean | null
          certificate_fingerprint?: string | null
          cpu_usage?: number | null
          created_at?: string
          created_by?: string
          customer_id: string
          heartbeat?: Json
          hostname?: string | null
          id?: string
          ip_address?: unknown | null
          last_cert_rotation?: string | null
          last_decision_json?: Json | null
          last_heartbeat?: string | null
          last_seen?: string | null
          memory_usage?: number | null
          os?: string | null
          plan_key: string
          region?: string | null
          signature_key_version?: number | null
          status?: string
          tasks_completed?: number | null
          updated_at?: string
          updated_by?: string
          uptime_seconds?: number | null
          user_id: string
          version?: string | null
        }
        Update: {
          agent_type?: string
          auto_updates_enabled?: boolean | null
          certificate_fingerprint?: string | null
          cpu_usage?: number | null
          created_at?: string
          created_by?: string
          customer_id?: string
          heartbeat?: Json
          hostname?: string | null
          id?: string
          ip_address?: unknown | null
          last_cert_rotation?: string | null
          last_decision_json?: Json | null
          last_heartbeat?: string | null
          last_seen?: string | null
          memory_usage?: number | null
          os?: string | null
          plan_key?: string
          region?: string | null
          signature_key_version?: number | null
          status?: string
          tasks_completed?: number | null
          updated_at?: string
          updated_by?: string
          uptime_seconds?: number | null
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          agent_id: string | null
          completion_tokens: number
          cost_usd: number
          created_at: string
          id: string
          metadata: Json | null
          model: string
          prompt_tokens: number
          request_type: string
          tenant_id: string
          total_tokens: number
        }
        Insert: {
          agent_id?: string | null
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          model: string
          prompt_tokens?: number
          request_type: string
          tenant_id: string
          total_tokens?: number
        }
        Update: {
          agent_id?: string | null
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          model?: string
          prompt_tokens?: number
          request_type?: string
          tenant_id?: string
          total_tokens?: number
        }
        Relationships: []
      }
      allowlist_batch_steps: {
        Row: {
          batch_id: string
          command_id: string
          created_at: string
          id: string
          params_template: Json | null
          step_index: number
          updated_at: string
        }
        Insert: {
          batch_id: string
          command_id: string
          created_at?: string
          id?: string
          params_template?: Json | null
          step_index: number
          updated_at?: string
        }
        Update: {
          batch_id?: string
          command_id?: string
          created_at?: string
          id?: string
          params_template?: Json | null
          step_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowlist_batch_steps_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "allowlist_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowlist_batch_steps_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "allowlist_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      allowlist_batches: {
        Row: {
          active: boolean
          batch_name: string
          created_at: string
          customer_id: string
          id: string
          inputs_schema: Json | null
          preflight: Json | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          active?: boolean
          batch_name: string
          created_at?: string
          customer_id: string
          id?: string
          inputs_schema?: Json | null
          preflight?: Json | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          active?: boolean
          batch_name?: string
          created_at?: string
          customer_id?: string
          id?: string
          inputs_schema?: Json | null
          preflight?: Json | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      allowlist_command_params: {
        Row: {
          command_id: string
          created_at: string
          defaults: Json | null
          id: string
          json_schema: Json | null
          updated_at: string
        }
        Insert: {
          command_id: string
          created_at?: string
          defaults?: Json | null
          id?: string
          json_schema?: Json | null
          updated_at?: string
        }
        Update: {
          command_id?: string
          created_at?: string
          defaults?: Json | null
          id?: string
          json_schema?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowlist_command_params_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "allowlist_commands"
            referencedColumns: ["id"]
          },
        ]
      }
      allowlist_commands: {
        Row: {
          active: boolean
          command_name: string
          created_at: string
          customer_id: string
          expected_sha256: string
          id: string
          min_agent_version: string | null
          os_whitelist: string[] | null
          risk: string
          script_id: string
          script_version: number
          timeout_sec: number | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          active?: boolean
          command_name: string
          created_at?: string
          customer_id: string
          expected_sha256: string
          id?: string
          min_agent_version?: string | null
          os_whitelist?: string[] | null
          risk?: string
          script_id: string
          script_version: number
          timeout_sec?: number | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          active?: boolean
          command_name?: string
          created_at?: string
          customer_id?: string
          expected_sha256?: string
          id?: string
          min_agent_version?: string | null
          os_whitelist?: string[] | null
          risk?: string
          script_id?: string
          script_version?: number
          timeout_sec?: number | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowlist_commands_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string
          daily_request_count: number
          daily_request_date: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: string[]
          request_count: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          customer_id: string
          daily_request_count?: number
          daily_request_date?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: string[]
          request_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string
          daily_request_count?: number
          daily_request_date?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[]
          request_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor: string
          created_at: string
          customer_id: string
          id: string
          meta: Json | null
          target: string
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          customer_id: string
          id?: string
          meta?: Json | null
          target: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          customer_id?: string
          id?: string
          meta?: Json | null
          target?: string
        }
        Relationships: []
      }
      batch_dependencies: {
        Row: {
          batch_id: string
          created_at: string
          created_by: string
          depends_on_batch_id: string
          id: string
          min_version: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          created_by?: string
          depends_on_batch_id: string
          id?: string
          min_version?: number
          updated_at?: string
          updated_by?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          created_by?: string
          depends_on_batch_id?: string
          id?: string
          min_version?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_batch_dependencies_batch_id"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "script_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_batch_dependencies_depends_on_batch_id"
            columns: ["depends_on_batch_id"]
            isOneToOne: false
            referencedRelation: "script_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_runs: {
        Row: {
          agent_id: string
          batch_id: string
          contract: Json | null
          created_at: string
          created_by: string
          duration_sec: number | null
          finished_at: string | null
          id: string
          parser_warning: boolean | null
          raw_stderr: string | null
          raw_stdout: string | null
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          agent_id: string
          batch_id: string
          contract?: Json | null
          created_at?: string
          created_by?: string
          duration_sec?: number | null
          finished_at?: string | null
          id?: string
          parser_warning?: boolean | null
          raw_stderr?: string | null
          raw_stdout?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          agent_id?: string
          batch_id?: string
          contract?: Json | null
          created_at?: string
          created_by?: string
          duration_sec?: number | null
          finished_at?: string | null
          id?: string
          parser_warning?: boolean | null
          raw_stderr?: string | null
          raw_stdout?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_runs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "script_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      ca_config: {
        Row: {
          ca_fingerprint_sha256: string
          ca_key_pem: string
          ca_pem: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          ca_fingerprint_sha256: string
          ca_key_pem: string
          ca_pem: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          ca_fingerprint_sha256?: string
          ca_key_pem?: string
          ca_pem?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      certificate_revocation_list: {
        Row: {
          certificate_id: string
          created_at: string
          fingerprint_sha256: string
          id: string
          reason: string | null
          revoked_at: string
          revoked_by: string | null
        }
        Insert: {
          certificate_id: string
          created_at?: string
          fingerprint_sha256: string
          id?: string
          reason?: string | null
          revoked_at?: string
          revoked_by?: string | null
        }
        Update: {
          certificate_id?: string
          created_at?: string
          fingerprint_sha256?: string
          id?: string
          reason?: string | null
          revoked_at?: string
          revoked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_revocation_list_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_revocation_list_certificate_id_fkey"
            columns: ["certificate_id"]
            isOneToOne: false
            referencedRelation: "certificates_safe_view"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          agent_id: string
          cert_pem: string
          created_at: string
          expires_at: string
          fingerprint_sha256: string
          id: string
          issued_at: string
          key_pem: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          cert_pem: string
          created_at?: string
          expires_at: string
          fingerprint_sha256: string
          id?: string
          issued_at?: string
          key_pem: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          cert_pem?: string
          created_at?: string
          expires_at?: string
          fingerprint_sha256?: string
          id?: string
          issued_at?: string
          key_pem?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          agent_id: string
          closed_at: string | null
          created_at: string
          id: string
          last_action: string | null
          last_intent: string | null
          meta: Json | null
          session_id: string | null
          source: string
          started_at: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          closed_at?: string | null
          created_at?: string
          id?: string
          last_action?: string | null
          last_intent?: string | null
          meta?: Json | null
          session_id?: string | null
          source?: string
          started_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          last_action?: string | null
          last_intent?: string | null
          meta?: Json | null
          session_id?: string | null
          source?: string
          started_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_conversations_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_events: {
        Row: {
          agent_id: string
          conversation_id: string
          created_at: string
          id: string
          payload: Json | null
          ref_id: string | null
          type: string
        }
        Insert: {
          agent_id: string
          conversation_id: string
          created_at?: string
          id?: string
          payload?: Json | null
          ref_id?: string | null
          type: string
        }
        Update: {
          agent_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
          ref_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_events_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_chat_events_conversation"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          content_sha256: string | null
          conversation_id: string
          created_at: string
          id: string
          redacted: boolean
          role: string
          tokens: number | null
        }
        Insert: {
          content: string
          content_sha256?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          redacted?: boolean
          role: string
          tokens?: number | null
        }
        Update: {
          content?: string
          content_sha256?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          redacted?: boolean
          role?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_chat_messages_conversation"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      command_confirmations: {
        Row: {
          agent_id: string
          approved_at: string | null
          approved_by: string | null
          command_id: string
          command_text: string
          created_at: string
          customer_id: string
          expires_at: string
          id: string
          params: Json | null
          policy_id: string
          rejection_reason: string | null
          requested_at: string
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          command_id: string
          command_text: string
          created_at?: string
          customer_id: string
          expires_at?: string
          id?: string
          params?: Json | null
          policy_id: string
          rejection_reason?: string | null
          requested_at?: string
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          command_id?: string
          command_text?: string
          created_at?: string
          customer_id?: string
          expires_at?: string
          id?: string
          params?: Json | null
          policy_id?: string
          rejection_reason?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_confirmations_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "command_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      command_policies: {
        Row: {
          active: boolean
          confirm_message: string | null
          created_at: string
          created_by: string
          customer_id: string
          id: string
          match_type: string
          match_value: string
          mode: string
          os_whitelist: string[] | null
          param_schema: Json | null
          policy_name: string
          risk: string
          timeout_sec: number | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          active?: boolean
          confirm_message?: string | null
          created_at?: string
          created_by?: string
          customer_id: string
          id?: string
          match_type: string
          match_value: string
          mode: string
          os_whitelist?: string[] | null
          param_schema?: Json | null
          policy_name: string
          risk?: string
          timeout_sec?: number | null
          updated_at?: string
          updated_by?: string
        }
        Update: {
          active?: boolean
          confirm_message?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          match_type?: string
          match_value?: string
          mode?: string
          os_whitelist?: string[] | null
          param_schema?: Json | null
          policy_name?: string
          risk?: string
          timeout_sec?: number | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      console_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: string
          status: string
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          role: string
          status?: string
          team_id: string
          token?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: string
          status?: string
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "console_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "console_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "console_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      console_member_page_perms: {
        Row: {
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          member_id: string
          page_key: string
          updated_at: string | null
        }
        Insert: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          member_id: string
          page_key: string
          updated_at?: string | null
        }
        Update: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          member_id?: string
          page_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "console_member_page_perms_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "console_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "console_member_page_perms_page_key_fkey"
            columns: ["page_key"]
            isOneToOne: false
            referencedRelation: "console_pages"
            referencedColumns: ["key"]
          },
        ]
      }
      console_member_widget_scopes: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          updated_at: string | null
          widget_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          updated_at?: string | null
          widget_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          updated_at?: string | null
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "console_member_widget_scopes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "console_team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "console_member_widget_scopes_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      console_pages: {
        Row: {
          created_at: string | null
          id: string
          key: string
          label: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          label: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          label?: string
        }
        Relationships: []
      }
      console_role_templates: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string | null
          page_key: string
          role: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string | null
          page_key: string
          role: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string | null
          page_key?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "console_role_templates_page_key_fkey"
            columns: ["page_key"]
            isOneToOne: false
            referencedRelation: "console_pages"
            referencedColumns: ["key"]
          },
        ]
      }
      console_team_members: {
        Row: {
          admin_id: string | null
          created_at: string | null
          id: string
          role: string
          team_id: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          role: string
          team_id?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          role?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "console_team_members_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "console_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "console_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      console_teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      intent_mappings: {
        Row: {
          active: boolean
          batch_key: string | null
          command_template: string | null
          created_at: string
          created_by: string
          customer_id: string
          description: string | null
          id: string
          intent_name: string
          operation_type: string
          policy_mode: string | null
          risk_level: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          active?: boolean
          batch_key?: string | null
          command_template?: string | null
          created_at?: string
          created_by?: string
          customer_id: string
          description?: string | null
          id?: string
          intent_name: string
          operation_type: string
          policy_mode?: string | null
          risk_level?: string | null
          updated_at?: string
          updated_by?: string
        }
        Update: {
          active?: boolean
          batch_key?: string | null
          command_template?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          description?: string | null
          id?: string
          intent_name?: string
          operation_type?: string
          policy_mode?: string | null
          risk_level?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      policy_history: {
        Row: {
          action: string
          actor_id: string
          changes: Json | null
          created_at: string
          id: string
          policy_id: string
        }
        Insert: {
          action: string
          actor_id?: string
          changes?: Json | null
          created_at?: string
          id?: string
          policy_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          changes?: Json | null
          created_at?: string
          id?: string
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_history_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "command_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          bucket_type: string
          count: number
          created_at: string
          id: string
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket_key: string
          bucket_type: string
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          bucket_key?: string
          bucket_type?: string
          count?: number
          created_at?: string
          id?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      script_batch_variants: {
        Row: {
          active: boolean
          batch_id: string
          created_at: string
          created_by: string
          id: string
          min_os_version: string | null
          notes: string | null
          os: string
          sha256: string
          size_bytes: number
          source: string
          version: number
        }
        Insert: {
          active?: boolean
          batch_id: string
          created_at?: string
          created_by?: string
          id?: string
          min_os_version?: string | null
          notes?: string | null
          os: string
          sha256: string
          size_bytes: number
          source: string
          version: number
        }
        Update: {
          active?: boolean
          batch_id?: string
          created_at?: string
          created_by?: string
          id?: string
          min_os_version?: string | null
          notes?: string | null
          os?: string
          sha256?: string
          size_bytes?: number
          source?: string
          version?: number
        }
        Relationships: []
      }
      script_batch_versions: {
        Row: {
          batch_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          sha256: string
          size_bytes: number
          source: string
          status: string
          version: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          sha256: string
          size_bytes: number
          source: string
          status?: string
          version: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          sha256?: string
          size_bytes?: number
          source?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_batch_versions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "script_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      script_batches: {
        Row: {
          active_version: number | null
          auto_version: boolean
          created_at: string
          created_by: string
          customer_id: string
          description: string | null
          id: string
          inputs_defaults: Json | null
          inputs_schema: Json | null
          key: string | null
          max_timeout_sec: number
          name: string
          os_targets: string[]
          per_agent_concurrency: number
          per_tenant_concurrency: number
          preflight: Json | null
          render_config: Json | null
          risk: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          active_version?: number | null
          auto_version?: boolean
          created_at?: string
          created_by?: string
          customer_id: string
          description?: string | null
          id?: string
          inputs_defaults?: Json | null
          inputs_schema?: Json | null
          key?: string | null
          max_timeout_sec?: number
          name: string
          os_targets?: string[]
          per_agent_concurrency?: number
          per_tenant_concurrency?: number
          preflight?: Json | null
          render_config?: Json | null
          risk?: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          active_version?: number | null
          auto_version?: boolean
          created_at?: string
          created_by?: string
          customer_id?: string
          description?: string | null
          id?: string
          inputs_defaults?: Json | null
          inputs_schema?: Json | null
          key?: string | null
          max_timeout_sec?: number
          name?: string
          os_targets?: string[]
          per_agent_concurrency?: number
          per_tenant_concurrency?: number
          preflight?: Json | null
          render_config?: Json | null
          risk?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: []
      }
      script_versions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          script_id: string
          sha256: string
          size_bytes: number
          source: string
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          script_id: string
          sha256: string
          size_bytes: number
          source: string
          status?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          script_id?: string
          sha256?: string
          size_bytes?: number
          source?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_versions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          created_at: string
          customer_id: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          agent_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: unknown | null
          payload: Json | null
          session_id: string | null
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown | null
          payload?: Json | null
          session_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown | null
          payload?: Json | null
          session_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          key: string
          monthly_ai_requests: number
          monthly_server_events: number
          name: string
          price_cents: number
          price_monthly: number | null
          slug: string | null
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key: string
          monthly_ai_requests?: number
          monthly_server_events?: number
          name: string
          price_cents?: number
          price_monthly?: number | null
          slug?: string | null
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          monthly_ai_requests?: number
          monthly_server_events?: number
          name?: string
          price_cents?: number
          price_monthly?: number | null
          slug?: string | null
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          invited_by: string
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: []
      }
      team_rate_limits: {
        Row: {
          count: number
          created_at: string | null
          id: string
          limit_type: string
          team_id: string
          updated_at: string | null
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          id?: string
          limit_type: string
          team_id: string
          updated_at?: string | null
          user_id: string
          window_start?: string
        }
        Update: {
          count?: number
          created_at?: string | null
          id?: string
          limit_type?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          customer_id: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          count: number
          created_at: string
          customer_id: string
          id: string
          usage_date: string
          usage_type: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          customer_id: string
          id?: string
          usage_date?: string
          usage_type: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          customer_id?: string
          id?: string
          usage_date?: string
          usage_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_page_permissions: {
        Row: {
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          page_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          page_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          page_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          agent_notifications: boolean
          created_at: string
          email_alerts: boolean
          id: string
          security_alerts: boolean
          system_updates: boolean
          theme_preference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_notifications?: boolean
          created_at?: string
          email_alerts?: boolean
          id?: string
          security_alerts?: boolean
          system_updates?: boolean
          theme_preference?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_notifications?: boolean
          created_at?: string
          email_alerts?: boolean
          id?: string
          security_alerts?: boolean
          system_updates?: boolean
          theme_preference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          ip_address: unknown | null
          is_active: boolean
          location: string | null
          session_end: string | null
          session_start: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          location?: string | null
          session_end?: string | null
          session_start?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          location?: string | null
          session_end?: string | null
          session_start?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          expires_at: string | null
          id: string
          plan_id: string
          started_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          plan_id: string
          started_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          started_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      widget_analytics_enhanced: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          page_url: string | null
          referrer: string | null
          site_key: string
          timestamp: string | null
          user_agent: string | null
          user_session: string | null
          widget_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          referrer?: string | null
          site_key: string
          timestamp?: string | null
          user_agent?: string | null
          user_session?: string | null
          widget_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          page_url?: string | null
          referrer?: string | null
          site_key?: string
          timestamp?: string | null
          user_agent?: string | null
          user_session?: string | null
          widget_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "widget_analytics_enhanced_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_config_updates: {
        Row: {
          auto_deployed: boolean | null
          created_at: string | null
          deployed_at: string | null
          id: string
          new_config: Json
          old_config: Json | null
          update_type: string | null
          updated_by: string | null
          widget_id: string
        }
        Insert: {
          auto_deployed?: boolean | null
          created_at?: string | null
          deployed_at?: string | null
          id?: string
          new_config: Json
          old_config?: Json | null
          update_type?: string | null
          updated_by?: string | null
          widget_id: string
        }
        Update: {
          auto_deployed?: boolean | null
          created_at?: string | null
          deployed_at?: string | null
          id?: string
          new_config?: Json
          old_config?: Json | null
          update_type?: string | null
          updated_by?: string | null
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_config_updates_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_deployments: {
        Row: {
          config: Json
          created_at: string | null
          deployed_at: string | null
          deployed_by: string | null
          deployment_type: string | null
          id: string
          notes: string | null
          status: string | null
          version: number
          widget_id: string
        }
        Insert: {
          config: Json
          created_at?: string | null
          deployed_at?: string | null
          deployed_by?: string | null
          deployment_type?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          version: number
          widget_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          deployed_at?: string | null
          deployed_by?: string | null
          deployment_type?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          version?: number
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_deployments_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_metrics: {
        Row: {
          created_at: string
          date_bucket: string
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_bucket?: string
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_bucket?: string
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      widget_sessions: {
        Row: {
          agent_id: string
          conversation_id: string | null
          created_at: string
          csrf: string
          expires_at: string
          id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          conversation_id?: string | null
          created_at?: string
          csrf: string
          expires_at?: string
          id?: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          conversation_id?: string | null
          created_at?: string
          csrf?: string
          expires_at?: string
          id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      widget_tickets: {
        Row: {
          agent_id: string
          created_at: string
          expires_at: string
          id: string
          origin: string
          tenant_id: string
          ua_hash: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          expires_at?: string
          id?: string
          origin: string
          tenant_id: string
          ua_hash?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          origin?: string
          tenant_id?: string
          ua_hash?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      widgets: {
        Row: {
          allowed_domains: string[]
          auto_update_enabled: boolean | null
          created_at: string
          created_by: string
          customer_id: string
          deployment_status: string | null
          id: string
          last_deployed_at: string | null
          name: string
          secret_hash: string | null
          site_key: string
          theme: Json
          updated_at: string
          updated_by: string
          version: number | null
        }
        Insert: {
          allowed_domains?: string[]
          auto_update_enabled?: boolean | null
          created_at?: string
          created_by?: string
          customer_id: string
          deployment_status?: string | null
          id?: string
          last_deployed_at?: string | null
          name: string
          secret_hash?: string | null
          site_key?: string
          theme?: Json
          updated_at?: string
          updated_by?: string
          version?: number | null
        }
        Update: {
          allowed_domains?: string[]
          auto_update_enabled?: boolean | null
          created_at?: string
          created_by?: string
          customer_id?: string
          deployment_status?: string | null
          id?: string
          last_deployed_at?: string | null
          name?: string
          secret_hash?: string | null
          site_key?: string
          theme?: Json
          updated_at?: string
          updated_by?: string
          version?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      certificates_safe_view: {
        Row: {
          agent_id: string | null
          cert_pem: string | null
          created_at: string | null
          expires_at: string | null
          fingerprint_sha256: string | null
          id: string | null
          issued_at: string | null
          revoked_at: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          cert_pem?: string | null
          created_at?: string | null
          expires_at?: string | null
          fingerprint_sha256?: string | null
          id?: string | null
          issued_at?: string | null
          revoked_at?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          cert_pem?: string | null
          created_at?: string | null
          expires_at?: string | null
          fingerprint_sha256?: string | null
          id?: string | null
          issued_at?: string | null
          revoked_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      v_batch_variants_active: {
        Row: {
          batch_id: string | null
          created_at: string | null
          created_by: string | null
          min_os_version: string | null
          notes: string | null
          os: string | null
          sha256: string | null
          source: string | null
          version: number | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          min_os_version?: string | null
          notes?: string | null
          os?: string | null
          sha256?: string | null
          source?: string | null
          version?: number | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          min_os_version?: string | null
          notes?: string | null
          os?: string | null
          sha256?: string | null
          source?: string | null
          version?: number | null
        }
        Relationships: []
      }
      view_active_commands: {
        Row: {
          count: number | null
        }
        Relationships: []
      }
      view_high_risk_commands: {
        Row: {
          count: number | null
        }
        Relationships: []
      }
      view_success_rate_30d: {
        Row: {
          percentage: number | null
        }
        Relationships: []
      }
      view_total_scripts: {
        Row: {
          count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_batch_version: {
        Args: { _batch_id: string; _user_id: string; _version: number }
        Returns: boolean
      }
      activate_variant_version: {
        Args: {
          _batch_id: string
          _os: string
          _user_id: string
          _version: number
        }
        Returns: boolean
      }
      apply_role_template_permissions: {
        Args: { _member_id: string; _role: string }
        Returns: undefined
      }
      bulk_invite_team_members: {
        Args: { _invites: Json; _team_id: string }
        Returns: Json
      }
      can_activate_in_customer: {
        Args: { _customer_id: string }
        Returns: boolean
      }
      check_agent_usage_limit: {
        Args: { _agent_id: string; _usage_type: string }
        Returns: {
          allowed: boolean
          current_usage: number
          limit_amount: number
          plan_name: string
        }[]
      }
      check_and_increment_rate_limit: {
        Args: {
          _limit_type: string
          _max_count: number
          _team_id: string
          _user_id: string
          _window_hours?: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          retry_after_seconds: number
        }[]
      }
      check_batch_concurrency: {
        Args: { _agent_id: string; _batch_id: string }
        Returns: {
          agent_limit: number
          block_reason: string
          block_scope: string
          can_run: boolean
          current_agent_runs: number
          current_tenant_runs: number
          tenant_limit: number
        }[]
      }
      check_usage_limit: {
        Args: { _customer_id: string; _usage_type: string; _user_id: string }
        Returns: {
          allowed: boolean
          current_usage: number
          limit_amount: number
        }[]
      }
      complete_batch_run: {
        Args: {
          _raw_stderr?: string
          _raw_stdout?: string
          _run_id: string
          _status: string
        }
        Returns: boolean
      }
      generate_api_key: {
        Args: { _customer_id: string; _name: string; _permissions?: string[] }
        Returns: {
          api_key: string
          id: string
          key_prefix: string
        }[]
      }
      get_agent_tenant_id: {
        Args: { agent_uuid: string }
        Returns: string
      }
      get_next_batch_version: {
        Args: { _batch_id: string }
        Returns: number
      }
      get_next_variant_version: {
        Args: { _batch_id: string; _os: string }
        Returns: number
      }
      get_user_current_plan: {
        Args: { _customer_id: string; _user_id: string }
        Returns: {
          monthly_ai_requests: number
          monthly_server_events: number
          plan_name: string
        }[]
      }
      get_user_customer_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_user_role_in_customer: {
        Args: {
          _customer_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      get_user_team_memberships: {
        Args: { _user_id: string }
        Returns: {
          member_id: string
          role: string
          team_id: string
        }[]
      }
      increment_agent_usage: {
        Args: { _agent_id: string; _increment?: number; _usage_type: string }
        Returns: undefined
      }
      increment_usage: {
        Args: { _customer_id: string; _usage_type: string; _user_id: string }
        Returns: boolean
      }
      increment_widget_metric: {
        Args: {
          _increment?: number
          _metadata?: Json
          _metric_type: string
          _tenant_id: string
        }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_owner_or_admin: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_owner_or_admin_simple: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      log_ai_usage: {
        Args: {
          _agent_id: string
          _completion_tokens: number
          _cost_usd: number
          _metadata?: Json
          _model: string
          _prompt_tokens: number
          _request_type: string
          _tenant_id: string
        }
        Returns: string
      }
      log_team_audit_event: {
        Args: {
          _action: string
          _actor_email: string
          _details?: Json
          _target: string
          _team_id: string
        }
        Returns: undefined
      }
      set_agent_heartbeat: {
        Args: { p_id: string; p_json: Json }
        Returns: undefined
      }
      start_batch_run: {
        Args: { _agent_id: string; _batch_id: string }
        Returns: {
          message: string
          run_id: string
          status: string
        }[]
      }
      track_api_key_usage: {
        Args: { _api_key_id: string }
        Returns: undefined
      }
      track_user_session: {
        Args: {
          client_ip?: unknown
          client_user_agent?: string
          user_uuid: string
        }
        Returns: string
      }
      validate_api_key: {
        Args: { _api_key: string }
        Returns: {
          api_key_id: string
          customer_id: string
          valid: boolean
        }[]
      }
      validate_batch_dependencies: {
        Args: { _batch_id: string }
        Returns: {
          is_valid: boolean
          missing_dependencies: string[]
          outdated_dependencies: string[]
        }[]
      }
      validate_variant_dependencies: {
        Args: { _batch_id: string; _os: string }
        Returns: {
          incompatible_variants: string[]
          is_valid: boolean
          missing_variants: string[]
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "approver" | "viewer" | "owner" | "guest"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "approver", "viewer", "owner", "guest"],
    },
  },
} as const
