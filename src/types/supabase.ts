
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      brand_keywords: {
        Row: {
          brand: string
          category: string | null
          conversion_rate: number | null
          created_at: string | null
          id: number
          keywords: Json
          search_volume: number | null
          seasonal_boost: Json | null
          style_name: string | null
          updated_at: string | null
        }
        Insert: {
          brand: string
          category?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: number
          keywords: Json
          search_volume?: number | null
          seasonal_boost?: Json | null
          style_name?: string | null
          updated_at?: string | null
        }
        Update: {
          brand?: string
          category?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: number
          keywords?: Json
          search_volume?: number | null
          seasonal_boost?: Json | null
          style_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      items: {
        Row: {
          ai_analysis: Json | null
          ai_confidence: number | null
          ai_detected_brand: string | null
          ai_detected_category:
            | Database["public"]["Enums"]["item_category"]
            | null
          ai_detected_condition:
            | Database["public"]["Enums"]["item_condition"]
            | null
          ai_key_features: string[] | null
          ai_suggested_keywords: string[] | null
          brand: string | null
          category: Database["public"]["Enums"]["item_category"]
          color: string | null
          condition: Database["public"]["Enums"]["item_condition"]
          created_at: string | null
          description: string | null
          estimated_sale_time_days: number | null
          final_price: number | null
          id: string
          images: string[] | null
          market_comparisons: Json | null
          model_number: string | null
          price_range_max: number | null
          price_range_min: number | null
          primary_image_url: string | null
          size: string | null
          sku: string | null
          status: string | null
          suggested_price: number
          title: string
          updated_at: string | null
          user_id: string
          weight_oz: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_confidence?: number | null
          ai_detected_brand?: string | null
          ai_detected_category?:
            | Database["public"]["Enums"]["item_category"]
            | null
          ai_detected_condition?:
            | Database["public"]["Enums"]["item_condition"]
            | null
          ai_key_features?: string[] | null
          ai_suggested_keywords?: string[] | null
          brand?: string | null
          category: Database["public"]["Enums"]["item_category"]
          color?: string | null
          condition: Database["public"]["Enums"]["item_condition"]
          created_at?: string | null
          description?: string | null
          estimated_sale_time_days?: number | null
          final_price?: number | null
          id?: string
          images?: string[] | null
          market_comparisons?: Json | null
          model_number?: string | null
          price_range_max?: number | null
          price_range_min?: number | null
          primary_image_url?: string | null
          size?: string | null
          sku?: string | null
          status?: string | null
          suggested_price: number
          title: string
          updated_at?: string | null
          user_id: string
          weight_oz?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_confidence?: number | null
          ai_detected_brand?: string | null
          ai_detected_category?:
            | Database["public"]["Enums"]["item_category"]
            | null
          ai_detected_condition?:
            | Database["public"]["Enums"]["item_condition"]
            | null
          ai_key_features?: string[] | null
          ai_suggested_keywords?: string[] | null
          brand?: string | null
          category?: Database["public"]["Enums"]["item_category"]
          color?: string | null
          condition?: Database["public"]["Enums"]["item_condition"]
          created_at?: string | null
          description?: string | null
          estimated_sale_time_days?: number | null
          final_price?: number | null
          id?: string
          images?: string[] | null
          market_comparisons?: Json | null
          model_number?: string | null
          price_range_max?: number | null
          price_range_min?: number | null
          primary_image_url?: string | null
          size?: string | null
          sku?: string | null
          status?: string | null
          suggested_price?: number
          title?: string
          updated_at?: string | null
          user_id?: string
          weight_oz?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_performance: {
        Row: {
          created_at: string | null
          days_to_sell: number | null
          id: number
          keyword: string
          messages: number | null
          photo_analysis_id: string | null
          platform: string
          sale_price: number | null
          sold: boolean | null
          views: number | null
          watchers: number | null
        }
        Insert: {
          created_at?: string | null
          days_to_sell?: number | null
          id?: number
          keyword: string
          messages?: number | null
          photo_analysis_id?: string | null
          platform: string
          sale_price?: number | null
          sold?: boolean | null
          views?: number | null
          watchers?: number | null
        }
        Update: {
          created_at?: string | null
          days_to_sell?: number | null
          id?: number
          keyword?: string
          messages?: number | null
          photo_analysis_id?: string | null
          platform?: string
          sale_price?: number | null
          sold?: boolean | null
          views?: number | null
          watchers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "keyword_performance_photo_analysis_id_fkey"
            columns: ["photo_analysis_id"]
            isOneToOne: false
            referencedRelation: "photo_analysis"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          brand: string | null
          category: string | null
          color: string | null
          condition: string | null
          created_at: string | null
          description: string
          ended_at: string | null
          gender: string | null
          id: string
          images: string[] | null
          item_id: string
          item_specifics: Json | null
          listed_at: string | null
          material: string | null
          platforms: Database["public"]["Enums"]["platform_type"][] | null
          price: number
          size: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["listing_status"] | null
          style: string | null
          title: string
          total_messages: number | null
          total_views: number | null
          total_watchers: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          description: string
          ended_at?: string | null
          gender?: string | null
          id?: string
          images?: string[] | null
          item_id: string
          item_specifics?: Json | null
          listed_at?: string | null
          material?: string | null
          platforms?: Database["public"]["Enums"]["platform_type"][] | null
          price: number
          size?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          style?: string | null
          title: string
          total_messages?: number | null
          total_views?: number | null
          total_watchers?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string
          ended_at?: string | null
          gender?: string | null
          id?: string
          images?: string[] | null
          item_id?: string
          item_specifics?: Json | null
          listed_at?: string | null
          material?: string | null
          platforms?: Database["public"]["Enums"]["platform_type"][] | null
          price?: number
          size?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"] | null
          style?: string | null
          title?: string
          total_messages?: number | null
          total_views?: number | null
          total_watchers?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      market_research_cache: {
        Row: {
          active_listings: number | null
          average_price: number | null
          confidence_score: number | null
          data_points: Json | null
          expires_at: string | null
          last_updated: string | null
          price_range_max: number | null
          price_range_min: number | null
          search_key: string
          sold_count: number | null
          suggested_price: number | null
        }
        Insert: {
          active_listings?: number | null
          average_price?: number | null
          confidence_score?: number | null
          data_points?: Json | null
          expires_at?: string | null
          last_updated?: string | null
          price_range_max?: number | null
          price_range_min?: number | null
          search_key: string
          sold_count?: number | null
          suggested_price?: number | null
        }
        Update: {
          active_listings?: number | null
          average_price?: number | null
          confidence_score?: number | null
          data_points?: Json | null
          expires_at?: string | null
          last_updated?: string | null
          price_range_max?: number | null
          price_range_min?: number | null
          search_key?: string
          sold_count?: number | null
          suggested_price?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          sent_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          sent_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          sent_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_analysis: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          detected_brand: string | null
          detected_category: string | null
          detected_color: string | null
          detected_condition: string | null
          detected_size: string | null
          detected_style: string | null
          id: string
          image_url: string
          item_id: string | null
          listing_id: string | null
          listing_platform: string | null
          original_keywords: Json | null
          suggested_keywords: Json | null
          user_approved_keywords: Json | null
          user_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          detected_brand?: string | null
          detected_category?: string | null
          detected_color?: string | null
          detected_condition?: string | null
          detected_size?: string | null
          detected_style?: string | null
          id?: string
          image_url: string
          item_id?: string | null
          listing_id?: string | null
          listing_platform?: string | null
          original_keywords?: Json | null
          suggested_keywords?: Json | null
          user_approved_keywords?: Json | null
          user_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          detected_brand?: string | null
          detected_category?: string | null
          detected_color?: string | null
          detected_condition?: string | null
          detected_size?: string | null
          detected_style?: string | null
          id?: string
          image_url?: string
          item_id?: string | null
          listing_id?: string | null
          listing_platform?: string | null
          original_keywords?: Json | null
          suggested_keywords?: Json | null
          user_approved_keywords?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_analysis_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_analysis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          app_fee: number | null
          buyer_info: Json
          created_at: string | null
          delivered_at: string | null
          id: string
          item_title: string
          listing_id: string
          net_profit: number | null
          payment_fee: number | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          payment_transaction_id: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_fee: number | null
          sale_price: number
          shipped_at: string | null
          shipping_address: Json
          shipping_cost: number | null
          shipping_fee: number | null
          shipping_method: string | null
          shipping_status: Database["public"]["Enums"]["shipping_status"] | null
          sold_at: string | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_fee?: number | null
          buyer_info?: Json
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          item_title: string
          listing_id: string
          net_profit?: number | null
          payment_fee?: number | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_transaction_id?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_fee?: number | null
          sale_price: number
          shipped_at?: string | null
          shipping_address?: Json
          shipping_cost?: number | null
          shipping_fee?: number | null
          shipping_method?: string | null
          shipping_status?:
            | Database["public"]["Enums"]["shipping_status"]
            | null
          sold_at?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_fee?: number | null
          buyer_info?: Json
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          item_title?: string
          listing_id?: string
          net_profit?: number | null
          payment_fee?: number | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_transaction_id?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          platform_fee?: number | null
          sale_price?: number
          shipped_at?: string | null
          shipping_address?: Json
          shipping_cost?: number | null
          shipping_fee?: number | null
          shipping_method?: string | null
          shipping_status?:
            | Database["public"]["Enums"]["shipping_status"]
            | null
          sold_at?: string | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: number
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: number
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: number
        }
        Relationships: []
      }
      trending_keywords: {
        Row: {
          category: string | null
          created_at: string | null
          id: number
          keyword: string
          search_volume: number | null
          trend_score: number | null
          week_start: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: number
          keyword: string
          search_volume?: number | null
          trend_score?: number | null
          week_start: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: number
          keyword?: string
          search_volume?: number | null
          trend_score?: number | null
          week_start?: string
        }
        Relationships: []
      }
      uploaded_photos: {
        Row: {
          assigned_item_id: string | null
          assigned_sku: string | null
          created_at: string | null
          file_size: number | null
          file_type: string | null
          filename: string
          id: string
          image_url: string
          status: string | null
          updated_at: string | null
          upload_order: number | null
          user_id: string
        }
        Insert: {
          assigned_item_id?: string | null
          assigned_sku?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          filename: string
          id?: string
          image_url: string
          status?: string | null
          updated_at?: string | null
          upload_order?: number | null
          user_id: string
        }
        Update: {
          assigned_item_id?: string | null
          assigned_sku?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          filename?: string
          id?: string
          image_url?: string
          status?: string | null
          updated_at?: string | null
          upload_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_photos_assigned_item_id_fkey"
            columns: ["assigned_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_keyword_preferences: {
        Row: {
          auto_approve: boolean | null
          blocked_keywords: Json | null
          created_at: string | null
          id: number
          preferred_keywords: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_approve?: boolean | null
          blocked_keywords?: Json | null
          created_at?: string | null
          id?: number
          preferred_keywords?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_approve?: boolean | null
          blocked_keywords?: Json | null
          created_at?: string | null
          id?: number
          preferred_keywords?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_keyword_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          address: Json | null
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          listings_limit: number | null
          listings_used: number | null
          monthly_revenue: number | null
          name: string
          notification_preferences: Json | null
          phone: string | null
          stripe_customer_id: string | null
          subscription_ends_at: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_started_at: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          timezone: string | null
          total_sales: number | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          listings_limit?: number | null
          listings_used?: number | null
          monthly_revenue?: number | null
          name: string
          notification_preferences?: Json | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_started_at?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          timezone?: string | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          listings_limit?: number | null
          listings_used?: number | null
          monthly_revenue?: number | null
          name?: string
          notification_preferences?: Json | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          subscription_started_at?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          timezone?: string | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      user_recent_activity: {
        Row: {
          activity_date: string | null
          activity_type: string | null
          amount: number | null
          platform: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auto_promote_brand_keywords: {
        Args: { min_submissions?: number; min_approval_rate?: number }
        Returns: {
          promoted_brand: string
          promoted_category: string
          new_keywords: Json
          submission_count: number
        }[]
      }
      create_user_profile: {
        Args: {
          user_id: string
          user_email: string
          user_name: string
          user_avatar_url?: string
        }
        Returns: Json
      }
      get_keyword_suggestions: {
        Args: { p_brand: string; p_category?: string; p_style?: string }
        Returns: Json
      }
      preview_promotable_brands: {
        Args: { min_submissions?: number }
        Returns: {
          brand: string
          category: string
          submission_count: number
          top_keywords: Json
          ready_for_promotion: boolean
        }[]
      }
      update_keyword_performance: {
        Args: {
          p_photo_analysis_id: string
          p_views?: number
          p_watchers?: number
          p_messages?: number
          p_sold?: boolean
          p_sale_price?: number
        }
        Returns: undefined
      }
      weekly_auto_promotion: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      item_category:
        | "clothing"
        | "shoes"
        | "accessories"
        | "electronics"
        | "home_garden"
        | "toys_games"
        | "sports_outdoors"
        | "books_media"
        | "jewelry"
        | "collectibles"
        | "other"
      item_condition: "like_new" | "good" | "fair" | "poor" | "Good"
      listing_status: "draft" | "active" | "sold" | "ended" | "pending"
      notification_type:
        | "sale"
        | "message"
        | "view"
        | "watcher"
        | "system"
        | "payment"
      payment_status: "pending" | "completed" | "refunded" | "failed"
      platform_type: "ebay" | "facebook" | "poshmark" | "offerup" | "mercari"
      shipping_status:
        | "pending"
        | "label_created"
        | "shipped"
        | "delivered"
        | "returned"
      subscription_plan: "free" | "pro" | "commission"
      subscription_status: "active" | "canceled" | "past_due" | "trialing"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      item_category: [
        "clothing",
        "shoes",
        "accessories",
        "electronics",
        "home_garden",
        "toys_games",
        "sports_outdoors",
        "books_media",
        "jewelry",
        "collectibles",
        "other",
      ],
      item_condition: ["like_new", "good", "fair", "poor", "Good"],
      listing_status: ["draft", "active", "sold", "ended", "pending"],
      notification_type: [
        "sale",
        "message",
        "view",
        "watcher",
        "system",
        "payment",
      ],
      payment_status: ["pending", "completed", "refunded", "failed"],
      platform_type: ["ebay", "facebook", "poshmark", "offerup", "mercari"],
      shipping_status: [
        "pending",
        "label_created",
        "shipped",
        "delivered",
        "returned",
      ],
      subscription_plan: ["free", "pro", "commission"],
      subscription_status: ["active", "canceled", "past_due", "trialing"],
    },
  },
} as const
