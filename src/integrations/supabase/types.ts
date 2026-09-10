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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      gfr_rules_kb: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          rule_reference: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          rule_reference: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          rule_reference?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_milestones: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          invoice_date: string
          milestone_description: string
          startup_name: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date: string
          id?: string
          invoice_date: string
          milestone_description: string
          startup_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          invoice_date?: string
          milestone_description?: string
          startup_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      procurement_needs: {
        Row: {
          budget_range: string
          created_at: string
          department: string
          id: string
          need_description: string
        }
        Insert: {
          budget_range: string
          created_at?: string
          department: string
          id?: string
          need_description: string
        }
        Update: {
          budget_range?: string
          created_at?: string
          department?: string
          id?: string
          need_description?: string
        }
        Relationships: []
      }
      startup_pitches: {
        Row: {
          created_at: string
          id: string
          pitch_text: string
          sector: string
          startup_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          pitch_text: string
          sector: string
          startup_name: string
        }
        Update: {
          created_at?: string
          id?: string
          pitch_text?: string
          sector?: string
          startup_name?: string
        }
        Relationships: []
      }
      startups: {
        Row: {
          created_at: string
          dpiit_number: string | null
          id: string
          incorporation_date: string | null
          startup_name: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          created_at?: string
          dpiit_number?: string | null
          id?: string
          incorporation_date?: string | null
          startup_name: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          created_at?: string
          dpiit_number?: string | null
          id?: string
          incorporation_date?: string | null
          startup_name?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      telemetry_ledger: {
        Row: {
          action: string
          api_endpoint: string
          created_at: string
          id: string
          prev_hash: string | null
          row_hash: string | null
          status: string
          ts: string
        }
        Insert: {
          action: string
          api_endpoint: string
          created_at?: string
          id?: string
          prev_hash?: string | null
          row_hash?: string | null
          status?: string
          ts?: string
        }
        Update: {
          action?: string
          api_endpoint?: string
          created_at?: string
          id?: string
          prev_hash?: string | null
          row_hash?: string | null
          status?: string
          ts?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_gfr_rules: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: string
          rule_reference: string
          similarity: number
        }[]
      }
      telemetry_chain_payload: {
        Args: {
          _action: string
          _api_endpoint: string
          _prev_hash: string
          _status: string
          _ts: string
        }
        Returns: string
      }
      verify_telemetry_chain: {
        Args: never
        Returns: {
          broken_endpoint: string
          broken_id: string
          broken_ts: string
          is_valid: boolean
          total_records: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
