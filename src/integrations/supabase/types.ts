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
      agents: {
        Row: {
          agent_type: string
          auto_updates_enabled: boolean | null
          certificate_fingerprint: string | null
          cpu_usage: number | null
          created_at: string
          created_by: string
          customer_id: string
          hostname: string | null
          id: string
          ip_address: unknown | null
          last_cert_rotation: string | null
          last_seen: string | null
          memory_usage: number | null
          os: string | null
          region: string | null
          signature_key_version: number | null
          status: string
          tasks_completed: number | null
          updated_at: string
          updated_by: string
          uptime_seconds: number | null
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
          hostname?: string | null
          id?: string
          ip_address?: unknown | null
          last_cert_rotation?: string | null
          last_seen?: string | null
          memory_usage?: number | null
          os?: string | null
          region?: string | null
          signature_key_version?: number | null
          status?: string
          tasks_completed?: number | null
          updated_at?: string
          updated_by?: string
          uptime_seconds?: number | null
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
          hostname?: string | null
          id?: string
          ip_address?: unknown | null
          last_cert_rotation?: string | null
          last_seen?: string | null
          memory_usage?: number | null
          os?: string | null
          region?: string | null
          signature_key_version?: number | null
          status?: string
          tasks_completed?: number | null
          updated_at?: string
          updated_by?: string
          uptime_seconds?: number | null
          version?: string | null
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
          conversation_id: string
          created_at: string
          id: string
          redacted: boolean
          role: string
          tokens: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          redacted?: boolean
          role: string
          tokens?: number | null
        }
        Update: {
          content?: string
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
          id: string
          inputs_defaults: Json | null
          inputs_schema: Json | null
          max_timeout_sec: number
          name: string
          os_targets: string[]
          per_agent_concurrency: number
          per_tenant_concurrency: number
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
          id?: string
          inputs_defaults?: Json | null
          inputs_schema?: Json | null
          max_timeout_sec?: number
          name: string
          os_targets?: string[]
          per_agent_concurrency?: number
          per_tenant_concurrency?: number
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
          id?: string
          inputs_defaults?: Json | null
          inputs_schema?: Json | null
          max_timeout_sec?: number
          name?: string
          os_targets?: string[]
          per_agent_concurrency?: number
          per_tenant_concurrency?: number
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
      can_activate_in_customer: {
        Args: { _customer_id: string }
        Returns: boolean
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
      complete_batch_run: {
        Args: {
          _raw_stderr?: string
          _raw_stdout?: string
          _run_id: string
          _status: string
        }
        Returns: boolean
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
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      start_batch_run: {
        Args: { _agent_id: string; _batch_id: string }
        Returns: {
          message: string
          run_id: string
          status: string
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
