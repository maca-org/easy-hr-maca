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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      authors: {
        Row: {
          avatar_url: string | null
          created_at: string
          expertise_area: string | null
          first_name: string
          id: string
          last_name: string
          linkedin_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          expertise_area?: string | null
          first_name: string
          id?: string
          last_name: string
          linkedin_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          expertise_area?: string | null
          first_name?: string
          id?: string
          last_name?: string
          linkedin_url?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          ai_interview_score: number | null
          applicant_user_id: string | null
          application_source: string | null
          applied_at: string | null
          assessment_answers: Json | null
          assessment_due_date: string | null
          assessment_link: string | null
          assessment_sent: boolean
          assessment_sent_at: string | null
          completed_test: boolean
          created_at: string
          cv_file_path: string | null
          cv_rate: number
          cv_text: string | null
          email: string
          extracted_data: Json | null
          id: string
          improvement_tips: Json | null
          insights: Json | null
          is_favorite: boolean | null
          is_unlocked: boolean | null
          job_id: string
          name: string
          phone: string | null
          relevance_analysis: Json | null
          test_completed_at: string | null
          test_detailed_scores: Json | null
          test_result: number | null
          title: string | null
          unlocked_at: string | null
          unlocked_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_interview_score?: number | null
          applicant_user_id?: string | null
          application_source?: string | null
          applied_at?: string | null
          assessment_answers?: Json | null
          assessment_due_date?: string | null
          assessment_link?: string | null
          assessment_sent?: boolean
          assessment_sent_at?: string | null
          completed_test?: boolean
          created_at?: string
          cv_file_path?: string | null
          cv_rate: number
          cv_text?: string | null
          email: string
          extracted_data?: Json | null
          id?: string
          improvement_tips?: Json | null
          insights?: Json | null
          is_favorite?: boolean | null
          is_unlocked?: boolean | null
          job_id: string
          name: string
          phone?: string | null
          relevance_analysis?: Json | null
          test_completed_at?: string | null
          test_detailed_scores?: Json | null
          test_result?: number | null
          title?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_interview_score?: number | null
          applicant_user_id?: string | null
          application_source?: string | null
          applied_at?: string | null
          assessment_answers?: Json | null
          assessment_due_date?: string | null
          assessment_link?: string | null
          assessment_sent?: boolean
          assessment_sent_at?: string | null
          completed_test?: boolean
          created_at?: string
          cv_file_path?: string | null
          cv_rate?: number
          cv_text?: string | null
          email?: string
          extracted_data?: Json | null
          id?: string
          improvement_tips?: Json | null
          insights?: Json | null
          is_favorite?: boolean | null
          is_unlocked?: boolean | null
          job_id?: string
          name?: string
          phone?: string | null
          relevance_analysis?: Json | null
          test_completed_at?: string | null
          test_detailed_scores?: Json | null
          test_result?: number | null
          title?: string | null
          unlocked_at?: string | null
          unlocked_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_openings: {
        Row: {
          created_at: string
          description: string
          id: string
          questions: Json | null
          slug: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          questions?: Json | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          questions?: Json | null
          slug?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_openings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          billing_period_start: string | null
          company_name: string | null
          created_at: string
          email: string
          id: string
          limit_warning_sent: boolean | null
          monthly_unlocked_count: number | null
          plan_type: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          billing_period_start?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          id: string
          limit_warning_sent?: boolean | null
          monthly_unlocked_count?: number | null
          plan_type?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          billing_period_start?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          limit_warning_sent?: boolean | null
          monthly_unlocked_count?: number | null
          plan_type?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          amount_cents: number | null
          created_at: string | null
          currency: string | null
          ended_at: string | null
          id: string
          plan_type: string
          started_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          ended_at?: string | null
          id?: string
          plan_type: string
          started_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          ended_at?: string | null
          id?: string
          plan_type?: string
          started_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_blog_slug: {
        Args: { post_id: string; title: string }
        Returns: string
      }
      generate_job_slug: {
        Args: { job_id: string; title: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
