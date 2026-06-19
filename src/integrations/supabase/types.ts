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
      account_access_controls: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          created_at: string
          delete_requested_at: string | null
          delete_requested_by: string | null
          internal_note: string | null
          status: string
          unblocked_at: string | null
          unblocked_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          delete_requested_at?: string | null
          delete_requested_by?: string | null
          internal_note?: string | null
          status?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string
          delete_requested_at?: string | null
          delete_requested_by?: string | null
          internal_note?: string | null
          status?: string
          unblocked_at?: string | null
          unblocked_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          enabled: boolean
          id: string
          invited_by: string | null
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          enabled?: boolean
          id?: string
          invited_by?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          enabled?: boolean
          id?: string
          invited_by?: string | null
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          error_type: string | null
          estimated_cost_usd: number | null
          estimated_input_tokens: number | null
          estimated_output_tokens: number | null
          estimated_total_tokens: number | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          metadata: Json
          model: string
          output_tokens: number | null
          prompt_preview: string | null
          scope: string
          status: string
          total_tokens: number | null
          used_streaming: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          error_type?: string | null
          estimated_cost_usd?: number | null
          estimated_input_tokens?: number | null
          estimated_output_tokens?: number | null
          estimated_total_tokens?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          metadata?: Json
          model: string
          output_tokens?: number | null
          prompt_preview?: string | null
          scope: string
          status: string
          total_tokens?: number | null
          used_streaming?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          error_type?: string | null
          estimated_cost_usd?: number | null
          estimated_input_tokens?: number | null
          estimated_output_tokens?: number | null
          estimated_total_tokens?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          metadata?: Json
          model?: string
          output_tokens?: number | null
          prompt_preview?: string | null
          scope?: string
          status?: string
          total_tokens?: number | null
          used_streaming?: boolean
          user_id?: string
        }
        Relationships: []
      }
      app_runtime_config: {
        Row: {
          forced_logout_after: string | null
          latest_version: string
          singleton: boolean
          update_message: string
          update_required: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          forced_logout_after?: string | null
          latest_version?: string
          singleton?: boolean
          update_message?: string
          update_required?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          forced_logout_after?: string | null
          latest_version?: string
          singleton?: boolean
          update_message?: string
          update_required?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      earnings_snapshots: {
        Row: {
          app: string
          created_at: string
          day_date: string
          delta: number
          id: string
          new_amount: number
          previous_amount: number
          shift_id: string | null
          user_id: string
          week_id: string
        }
        Insert: {
          app: string
          created_at?: string
          day_date: string
          delta?: number
          id?: string
          new_amount?: number
          previous_amount?: number
          shift_id?: string | null
          user_id: string
          week_id: string
        }
        Update: {
          app?: string
          created_at?: string
          day_date?: string
          delta?: number
          id?: string
          new_amount?: number
          previous_amount?: number
          shift_id?: string | null
          user_id?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earnings_snapshots_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          resend_email_id: string | null
          sent_at: string | null
          status: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          resend_email_id?: string | null
          sent_at?: string | null
          status?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          app_url: string
          audience: string
          body: string
          created_at: string
          created_by: string | null
          failed_count: number
          id: string
          metadata: Json
          name: string
          requested_count: number
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          app_url: string
          audience: string
          body: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          metadata?: Json
          name: string
          requested_count?: number
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          app_url?: string
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          metadata?: Json
          name?: string
          requested_count?: number
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          created_at: string
          id: string
          marketing_opt_out: boolean
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          marketing_opt_out?: boolean
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          marketing_opt_out?: boolean
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      feedback_items: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
          type: string
          updated_at: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          type: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          type?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          active_apps: Json
          created_at: string
          currency_symbol: string
          default_weekly_goal: number
          default_weekly_hours_goal: number
          id: string
          octopus_points: number
          octopus_updated_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_apps?: Json
          created_at?: string
          currency_symbol?: string
          default_weekly_goal?: number
          default_weekly_hours_goal?: number
          id?: string
          octopus_points?: number
          octopus_updated_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_apps?: Json
          created_at?: string
          currency_symbol?: string
          default_weekly_goal?: number
          default_weekly_hours_goal?: number
          id?: string
          octopus_points?: number
          octopus_updated_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weeks: {
        Row: {
          created_at: string
          end_date: string
          entries: Json
          id: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
          weekly_goal: number
          weekly_hours_goal: number
        }
        Insert: {
          created_at?: string
          end_date: string
          entries?: Json
          id?: string
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
          weekly_goal?: number
          weekly_hours_goal?: number
        }
        Update: {
          created_at?: string
          end_date?: string
          entries?: Json
          id?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          weekly_goal?: number
          weekly_hours_goal?: number
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          created_at: string
          event_key: string
          event_type: string
          id: string
          metadata: Json
          source_date: string | null
          source_week_id: string | null
          user_id: string
          xp_amount: number
          xp_category: string
        }
        Insert: {
          created_at?: string
          event_key: string
          event_type: string
          id?: string
          metadata?: Json
          source_date?: string | null
          source_week_id?: string | null
          user_id: string
          xp_amount: number
          xp_category: string
        }
        Update: {
          created_at?: string
          event_key?: string
          event_type?: string
          id?: string
          metadata?: Json
          source_date?: string | null
          source_week_id?: string | null
          user_id?: string
          xp_amount?: number
          xp_category?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
