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
      app_settings: {
        Row: {
          id: string
          key: string
          label: string | null
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          label?: string | null
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          label?: string | null
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      catalog_spreads: {
        Row: {
          category: string | null
          created_at: string
          id: string
          page_left: number
          page_right: number
          product_id: string | null
          sort_order: number
          spread_id: string
          spread_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          page_left: number
          page_right: number
          product_id?: string | null
          sort_order?: number
          spread_id: string
          spread_type: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          page_left?: number
          page_right?: number
          product_id?: string | null
          sort_order?: number
          spread_id?: string
          spread_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_spreads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_themes: {
        Row: {
          accent: string
          accent2: string
          bg: string
          display_bg: string
          id: string
          is_active: boolean | null
          name: string
          subtext_color: string
          surface: string
          text_color: string
          theme_id: string
        }
        Insert: {
          accent: string
          accent2: string
          bg: string
          display_bg?: string
          id?: string
          is_active?: boolean | null
          name: string
          subtext_color: string
          surface: string
          text_color: string
          theme_id: string
        }
        Update: {
          accent?: string
          accent2?: string
          bg?: string
          display_bg?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subtext_color?: string
          surface?: string
          text_color?: string
          theme_id?: string
        }
        Relationships: []
      }
      color_variants: {
        Row: {
          body_photo: string | null
          body_photo_name: string | null
          created_at: string
          hex_main: string
          hex_shade: string | null
          id: string
          is_light: boolean | null
          jersey_photo: string | null
          jersey_photo_name: string | null
          motion_gif: string | null
          motion_gif_name: string | null
          name: string
          note: string | null
          product_id: string | null
          sort_order: number | null
        }
        Insert: {
          body_photo?: string | null
          body_photo_name?: string | null
          created_at?: string
          hex_main?: string
          hex_shade?: string | null
          id?: string
          is_light?: boolean | null
          jersey_photo?: string | null
          jersey_photo_name?: string | null
          motion_gif?: string | null
          motion_gif_name?: string | null
          name?: string
          note?: string | null
          product_id?: string | null
          sort_order?: number | null
        }
        Update: {
          body_photo?: string | null
          body_photo_name?: string | null
          created_at?: string
          hex_main?: string
          hex_shade?: string | null
          id?: string
          is_light?: boolean | null
          jersey_photo?: string | null
          jersey_photo_name?: string | null
          motion_gif?: string | null
          motion_gif_name?: string | null
          name?: string
          note?: string | null
          product_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "color_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          created_at: string
          hex_color: string
          id: string
          photo_url: string
          sort_order: number
          spread_id: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          hex_color?: string
          id?: string
          photo_url: string
          sort_order?: number
          spread_id: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          hex_color?: string
          id?: string
          photo_url?: string
          sort_order?: number
          spread_id?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_spread_id_fkey"
            columns: ["spread_id"]
            isOneToOne: false
            referencedRelation: "catalog_spreads"
            referencedColumns: ["spread_id"]
          },
        ]
      }
      mix_match_defaults: {
        Row: {
          jersey_id: string
          result_photo: string
          shorts_id: string
          updated_at: string
        }
        Insert: {
          jersey_id: string
          result_photo: string
          shorts_id: string
          updated_at?: string
        }
        Update: {
          jersey_id?: string
          result_photo?: string
          shorts_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mix_match_defaults_jersey_id_fkey"
            columns: ["jersey_id"]
            isOneToOne: false
            referencedRelation: "mix_match_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mix_match_defaults_shorts_id_fkey"
            columns: ["shorts_id"]
            isOneToOne: false
            referencedRelation: "mix_match_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mix_match_results: {
        Row: {
          created_at: string
          id: string
          jersey_id: string
          result_photo: string
          shorts_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_id: string
          result_photo: string
          shorts_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_id?: string
          result_photo?: string
          shorts_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mix_match_results_jersey_id_fkey"
            columns: ["jersey_id"]
            isOneToOne: false
            referencedRelation: "mix_match_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mix_match_results_shorts_id_fkey"
            columns: ["shorts_id"]
            isOneToOne: false
            referencedRelation: "mix_match_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mix_match_templates: {
        Row: {
          athlete_template: string | null
          created_at: string
          id: string
          photo: string | null
          photo_name: string | null
          sort_order: number
          type: string
        }
        Insert: {
          athlete_template?: string | null
          created_at?: string
          id?: string
          photo?: string | null
          photo_name?: string | null
          sort_order?: number
          type: string
        }
        Update: {
          athlete_template?: string | null
          created_at?: string
          id?: string
          photo?: string | null
          photo_name?: string | null
          sort_order?: number
          type?: string
        }
        Relationships: []
      }
      product_tiers: {
        Row: {
          created_at: string
          fabric: string | null
          feature: string | null
          id: string
          label: string
          price: string | null
          product_id: string
          sort_order: number
          tier_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fabric?: string | null
          feature?: string | null
          id?: string
          label: string
          price?: string | null
          product_id: string
          sort_order?: number
          tier_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fabric?: string | null
          feature?: string | null
          id?: string
          label?: string
          price?: string | null
          product_id?: string
          sort_order?: number
          tier_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge_label: string | null
          category: string | null
          collection_label: string | null
          created_at: string
          cta_label: string | null
          description: string | null
          id: string
          motion_video_prompt: string | null
          motion_video_task_id: string | null
          motion_video_url: string | null
          name: string
          page_left: string | null
          page_right: string | null
          price: string | null
          price_original: string | null
          price_save_label: string | null
          season_label: string | null
          sku: string
          subtitle: string | null
          updated_at: string
        }
        Insert: {
          badge_label?: string | null
          category?: string | null
          collection_label?: string | null
          created_at?: string
          cta_label?: string | null
          description?: string | null
          id?: string
          motion_video_prompt?: string | null
          motion_video_task_id?: string | null
          motion_video_url?: string | null
          name?: string
          page_left?: string | null
          page_right?: string | null
          price?: string | null
          price_original?: string | null
          price_save_label?: string | null
          season_label?: string | null
          sku?: string
          subtitle?: string | null
          updated_at?: string
        }
        Update: {
          badge_label?: string | null
          category?: string | null
          collection_label?: string | null
          created_at?: string
          cta_label?: string | null
          description?: string | null
          id?: string
          motion_video_prompt?: string | null
          motion_video_task_id?: string | null
          motion_video_url?: string | null
          name?: string
          page_left?: string | null
          page_right?: string | null
          price?: string | null
          price_original?: string | null
          price_save_label?: string | null
          season_label?: string | null
          sku?: string
          subtitle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      spec_rows: {
        Row: {
          id: string
          label: string
          product_id: string | null
          sort_order: number | null
          value: string
        }
        Insert: {
          id?: string
          label?: string
          product_id?: string | null
          sort_order?: number | null
          value?: string
        }
        Update: {
          id?: string
          label?: string
          product_id?: string | null
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "spec_rows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          product_id: string | null
          template_back: string | null
          template_back_name: string | null
          template_jersey: string | null
          template_name: string | null
          template_shorts: string | null
          template_shorts_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string | null
          template_back?: string | null
          template_back_name?: string | null
          template_jersey?: string | null
          template_name?: string | null
          template_shorts?: string | null
          template_shorts_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          product_id?: string | null
          template_back?: string | null
          template_back_name?: string | null
          template_jersey?: string | null
          template_name?: string | null
          template_shorts?: string | null
          template_shorts_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_sets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
