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
      alert_acknowledgements: {
        Row: {
          acknowledged_at: string
          alert_id: string
          chw_id: string
          id: string
        }
        Insert: {
          acknowledged_at?: string
          alert_id: string
          chw_id: string
          id?: string
        }
        Update: {
          acknowledged_at?: string
          alert_id?: string
          chw_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_acknowledgements_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          affected_population: number | null
          body_en: string
          body_ur: string | null
          cleared_at: string | null
          created_at: string
          district_id: string | null
          estimated_window: string | null
          id: string
          issued_by: string | null
          lake_id: string | null
          tier: Database["public"]["Enums"]["risk_tier"]
          title: string
        }
        Insert: {
          affected_population?: number | null
          body_en: string
          body_ur?: string | null
          cleared_at?: string | null
          created_at?: string
          district_id?: string | null
          estimated_window?: string | null
          id?: string
          issued_by?: string | null
          lake_id?: string | null
          tier: Database["public"]["Enums"]["risk_tier"]
          title: string
        }
        Update: {
          affected_population?: number | null
          body_en?: string
          body_ur?: string | null
          cleared_at?: string | null
          created_at?: string
          district_id?: string | null
          estimated_window?: string | null
          id?: string
          issued_by?: string | null
          lake_id?: string | null
          tier?: Database["public"]["Enums"]["risk_tier"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_lake_id_fkey"
            columns: ["lake_id"]
            isOneToOne: false
            referencedRelation: "lakes"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_messages: {
        Row: {
          created_at: string
          district_id: string | null
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          district_id?: string | null
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string
          district_id?: string | null
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_messages_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          chw_id: string
          created_at: string
          diagnosis: string | null
          district_id: string | null
          id: string
          is_disaster_related: boolean
          outcome: Database["public"]["Enums"]["case_outcome"] | null
          patient_age: number | null
          patient_sex: string | null
          symptoms: string
          treatment: string | null
        }
        Insert: {
          chw_id: string
          created_at?: string
          diagnosis?: string | null
          district_id?: string | null
          id?: string
          is_disaster_related?: boolean
          outcome?: Database["public"]["Enums"]["case_outcome"] | null
          patient_age?: number | null
          patient_sex?: string | null
          symptoms: string
          treatment?: string | null
        }
        Update: {
          chw_id?: string
          created_at?: string
          diagnosis?: string | null
          district_id?: string | null
          id?: string
          is_disaster_related?: boolean
          outcome?: Database["public"]["Enums"]["case_outcome"] | null
          patient_age?: number | null
          patient_sex?: string | null
          symptoms?: string
          treatment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      chw_profiles: {
        Row: {
          created_at: string
          district_id: string | null
          facility_id: string | null
          full_name: string
          id: string
          language: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          district_id?: string | null
          facility_id?: string | null
          full_name?: string
          id: string
          language?: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          district_id?: string | null
          facility_id?: string | null
          full_name?: string
          id?: string
          language?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chw_profiles_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chw_profiles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          centroid_lat: number | null
          centroid_lng: number | null
          created_at: string
          id: string
          name: string
          population: number | null
          province: string
        }
        Insert: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          id?: string
          name: string
          population?: number | null
          province?: string
        }
        Update: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          created_at?: string
          id?: string
          name?: string
          population?: number | null
          province?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          created_at: string
          district_id: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          type: string
          vulnerability: string
        }
        Insert: {
          created_at?: string
          district_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          type?: string
          vulnerability?: string
        }
        Update: {
          created_at?: string
          district_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          type?: string
          vulnerability?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      glaciers: {
        Row: {
          area_km2: number | null
          created_at: string
          district_id: string | null
          elevation_max_m: number | null
          elevation_min_m: number | null
          glims_id: string | null
          id: string
          last_observed: string | null
          lat: number
          length_km: number | null
          lng: number
          name: string
          notes: string | null
          rgi_id: string | null
          source: string
          status: Database["public"]["Enums"]["glacier_status"]
          terminus_type: string | null
          updated_at: string
        }
        Insert: {
          area_km2?: number | null
          created_at?: string
          district_id?: string | null
          elevation_max_m?: number | null
          elevation_min_m?: number | null
          glims_id?: string | null
          id?: string
          last_observed?: string | null
          lat: number
          length_km?: number | null
          lng: number
          name: string
          notes?: string | null
          rgi_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["glacier_status"]
          terminus_type?: string | null
          updated_at?: string
        }
        Update: {
          area_km2?: number | null
          created_at?: string
          district_id?: string | null
          elevation_max_m?: number | null
          elevation_min_m?: number | null
          glims_id?: string | null
          id?: string
          last_observed?: string | null
          lat?: number
          length_km?: number | null
          lng?: number
          name?: string
          notes?: string | null
          rgi_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["glacier_status"]
          terminus_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "glaciers_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      lake_risk_scores: {
        Row: {
          confidence: number
          id: string
          lake_id: string
          observed_at: string
          score: number
          source: string
          tier: Database["public"]["Enums"]["risk_tier"]
        }
        Insert: {
          confidence: number
          id?: string
          lake_id: string
          observed_at?: string
          score: number
          source?: string
          tier: Database["public"]["Enums"]["risk_tier"]
        }
        Update: {
          confidence?: number
          id?: string
          lake_id?: string
          observed_at?: string
          score?: number
          source?: string
          tier?: Database["public"]["Enums"]["risk_tier"]
        }
        Relationships: [
          {
            foreignKeyName: "lake_risk_scores_lake_id_fkey"
            columns: ["lake_id"]
            isOneToOne: false
            referencedRelation: "lakes"
            referencedColumns: ["id"]
          },
        ]
      }
      lakes: {
        Row: {
          area_km2: number | null
          created_at: string
          current_confidence: number
          current_risk_score: number
          current_tier: Database["public"]["Enums"]["risk_tier"]
          district_id: string | null
          downstream_population: number
          elevation_m: number | null
          id: string
          last_updated: string
          lat: number
          lng: number
          name: string
        }
        Insert: {
          area_km2?: number | null
          created_at?: string
          current_confidence?: number
          current_risk_score?: number
          current_tier?: Database["public"]["Enums"]["risk_tier"]
          district_id?: string | null
          downstream_population?: number
          elevation_m?: number | null
          id?: string
          last_updated?: string
          lat: number
          lng: number
          name: string
        }
        Update: {
          area_km2?: number | null
          created_at?: string
          current_confidence?: number
          current_risk_score?: number
          current_tier?: Database["public"]["Enums"]["risk_tier"]
          district_id?: string | null
          downstream_population?: number
          elevation_m?: number | null
          id?: string
          last_updated?: string
          lat?: number
          lng?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lakes_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_disaster: boolean
          slug: string
          source: string
          title: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          id?: string
          is_disaster?: boolean
          slug: string
          source?: string
          title: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_disaster?: boolean
          slug?: string
          source?: string
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "chw" | "facility_admin" | "ndma" | "public_viewer"
      case_outcome: "treat_at_home" | "refer" | "emergency"
      glacier_status:
        | "stable"
        | "retreating"
        | "advancing"
        | "surging"
        | "unknown"
      risk_tier: "NORMAL" | "WATCH" | "HIGH" | "CRITICAL"
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
      app_role: ["chw", "facility_admin", "ndma", "public_viewer"],
      case_outcome: ["treat_at_home", "refer", "emergency"],
      glacier_status: [
        "stable",
        "retreating",
        "advancing",
        "surging",
        "unknown",
      ],
      risk_tier: ["NORMAL", "WATCH", "HIGH", "CRITICAL"],
    },
  },
} as const
