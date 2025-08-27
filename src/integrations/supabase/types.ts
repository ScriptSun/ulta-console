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
      [_ in never]: never
    }
    Functions: {
      can_activate_in_customer: {
        Args: { _customer_id: string }
        Returns: boolean
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
    }
    Enums: {
      app_role: "admin" | "editor" | "approver" | "viewer"
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
      app_role: ["admin", "editor", "approver", "viewer"],
    },
  },
} as const
