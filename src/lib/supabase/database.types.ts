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
      admin_users: {
        Row: {
          created_at: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      back_in_stock_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          notified_at: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notified_at?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notified_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "back_in_stock_requests_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "low_stock_variants"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "back_in_stock_requests_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "back_in_stock_requests_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variant_availability"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          ends_at: string | null
          id: string
          max_uses: number | null
          min_subtotal_cents: number
          starts_at: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_subtotal_cents?: number
          starts_at?: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          max_uses?: number | null
          min_subtotal_cents?: number
          starts_at?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_items: {
        Row: {
          kit_id: string
          quantity: number
          variant_id: string
        }
        Insert: {
          kit_id: string
          quantity: number
          variant_id: string
        }
        Update: {
          kit_id?: string
          quantity?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kit_availability"
            referencedColumns: ["kit_id"]
          },
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "low_stock_variants"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "kit_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variant_availability"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      kits: {
        Row: {
          compare_at_price_cents: number | null
          created_at: string
          id: string
          is_published: boolean
          name: string
          price_cents: number
          slug: string
          updated_at: string
        }
        Insert: {
          compare_at_price_cents?: number | null
          created_at?: string
          id?: string
          is_published?: boolean
          name: string
          price_cents: number
          slug: string
          updated_at?: string
        }
        Update: {
          compare_at_price_cents?: number | null
          created_at?: string
          id?: string
          is_published?: boolean
          name?: string
          price_cents?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          kit_id: string | null
          name_snapshot: string
          order_id: string
          parent_item_id: string | null
          quantity: number
          unit_price_cents: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kit_id?: string | null
          name_snapshot: string
          order_id: string
          parent_item_id?: string | null
          quantity: number
          unit_price_cents: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kit_id?: string | null
          name_snapshot?: string
          order_id?: string
          parent_item_id?: string | null
          quantity?: number
          unit_price_cents?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kit_availability"
            referencedColumns: ["kit_id"]
          },
          {
            foreignKeyName: "order_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "low_stock_variants"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variant_availability"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_discount_cents: number
          coupon_id: string | null
          created_at: string
          discount_cents: number
          email: string
          gift_message: string | null
          id: string
          is_gift: boolean
          mp_payment_id: string | null
          mp_preference_id: string | null
          needs_review: boolean
          number: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone: string
          reserved_until: string | null
          review_reason: string | null
          shipping_address: Json | null
          shipping_cents: number
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          shipping_zone_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          transfer_discount_cents: number
          updated_at: string
        }
        Insert: {
          coupon_discount_cents?: number
          coupon_id?: string | null
          created_at?: string
          discount_cents?: number
          email: string
          gift_message?: string | null
          id?: string
          is_gift?: boolean
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          needs_review?: boolean
          number?: string
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          phone: string
          reserved_until?: string | null
          review_reason?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_method: Database["public"]["Enums"]["shipping_method"]
          shipping_zone_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          transfer_discount_cents?: number
          updated_at?: string
        }
        Update: {
          coupon_discount_cents?: number
          coupon_id?: string | null
          created_at?: string
          discount_cents?: number
          email?: string
          gift_message?: string | null
          id?: string
          is_gift?: boolean
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          needs_review?: boolean
          number?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          phone?: string
          reserved_until?: string | null
          review_reason?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_method?: Database["public"]["Enums"]["shipping_method"]
          shipping_zone_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          transfer_discount_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_zone_id_fkey"
            columns: ["shipping_zone_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider?: string
          provider_event_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
        }
        Relationships: []
      }
      price_changes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          new_price_cents: number
          old_price_cents: number
          product_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_price_cents: number
          old_price_cents: number
          product_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          new_price_cents?: number
          old_price_cents?: number
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_changes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string
          created_at: string
          id: string
          path: string
          product_id: string
          sort_order: number
        }
        Insert: {
          alt: string
          created_at?: string
          id?: string
          path: string
          product_id: string
          sort_order?: number
        }
        Update: {
          alt?: string
          created_at?: string
          id?: string
          path?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string
          created_at: string
          id: string
          low_stock_threshold: number | null
          product_id: string
          size: string
          sku: string | null
          stock_on_hand: number
          stock_reserved: number
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          product_id: string
          size: string
          sku?: string | null
          stock_on_hand?: number
          stock_reserved?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          low_stock_threshold?: number | null
          product_id?: string
          size?: string
          sku?: string | null
          stock_on_hand?: number
          stock_reserved?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          compare_at_price_cents: number | null
          cost_cents: number | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          materials_care: string | null
          measurements: string | null
          model_info: string | null
          name: string
          price_cents: number
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          category_id: string
          compare_at_price_cents?: number | null
          cost_cents?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          materials_care?: string | null
          measurements?: string | null
          model_info?: string | null
          name: string
          price_cents: number
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          compare_at_price_cents?: number | null
          cost_cents?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          materials_care?: string | null
          measurements?: string | null
          model_info?: string | null
          name?: string
          price_cents?: number
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          name: string
          order_id: string | null
          product_id: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_id?: string | null
          product_id: string
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_id?: string | null
          product_id?: string
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          created_at: string
          eta_text: string
          id: string
          name: string
          postal_codes: string[]
          price_cents: number
          provinces: string[]
          same_day: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          eta_text: string
          id?: string
          name: string
          postal_codes?: string[]
          price_cents: number
          provinces?: string[]
          same_day?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          eta_text?: string
          id?: string
          name?: string
          postal_codes?: string[]
          price_cents?: number
          provinces?: string[]
          same_day?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string | null
          quantity: number
          type: Database["public"]["Enums"]["stock_movement_type"]
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          quantity: number
          type: Database["public"]["Enums"]["stock_movement_type"]
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          quantity?: number
          type?: Database["public"]["Enums"]["stock_movement_type"]
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "low_stock_variants"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variant_availability"
            referencedColumns: ["variant_id"]
          },
        ]
      }
    }
    Views: {
      kit_availability: {
        Row: {
          is_available: boolean | null
          is_last_units: boolean | null
          kit_id: string | null
        }
        Relationships: []
      }
      low_stock_variants: {
        Row: {
          available: number | null
          color: string | null
          product_id: string | null
          product_name: string | null
          size: string | null
          sku: string | null
          threshold: number | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_settings: {
        Row: {
          key: string | null
          value: Json | null
        }
        Insert: {
          key?: string | null
          value?: Json | null
        }
        Update: {
          key?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      variant_availability: {
        Row: {
          is_available: boolean | null
          is_last_units: boolean | null
          product_id: string | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      adjusted_price: {
        Args: {
          p_percent: number
          p_price_cents: number
          p_round_to_cents: number
        }
        Returns: number
      }
      admin_dashboard: { Args: never; Returns: Json }
      apply_price_change: {
        Args: {
          p_include_compare_at: boolean
          p_percent: number
          p_product_ids: string[]
          p_reason: string
          p_round_to_cents: number
        }
        Returns: number
      }
      calculate_order_totals: {
        Args: {
          p_coupon_code?: string
          p_items: Json
          p_payment_method?: Database["public"]["Enums"]["payment_method"]
          p_shipping_method?: Database["public"]["Enums"]["shipping_method"]
          p_shipping_zone_id?: string
          p_strict?: boolean
        }
        Returns: Json
      }
      check_price_change: {
        Args: {
          p_percent: number
          p_product_ids: string[]
          p_round_to_cents: number
        }
        Returns: undefined
      }
      confirm_order_payment: {
        Args: { p_mp_payment_id?: string; p_order_id: string }
        Returns: Json
      }
      coupon_error: {
        Args: {
          p_at: string
          p_coupon: Database["public"]["Tables"]["coupons"]["Row"]
          p_subtotal_cents: number
        }
        Returns: string
      }
      create_order_with_reservation: { Args: { payload: Json }; Returns: Json }
      kit_available_quantity: { Args: { p_kit_id: string }; Returns: number }
      preview_price_change: {
        Args: {
          p_include_compare_at?: boolean
          p_percent: number
          p_product_ids: string[]
          p_round_to_cents?: number
        }
        Returns: {
          cost_cents: number
          name: string
          new_compare_at_price_cents: number
          new_price_cents: number
          old_compare_at_price_cents: number
          old_price_cents: number
          product_id: string
        }[]
      }
      quote_cart: { Args: { payload: Json }; Returns: Json }
      record_stock_movement: {
        Args: {
          p_created_by: string
          p_note: string
          p_quantity: number
          p_type: Database["public"]["Enums"]["stock_movement_type"]
          p_variant_id: string
        }
        Returns: Json
      }
      release_expired_reservations: { Args: never; Returns: number }
      release_order_reservation: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: boolean
      }
      restock_variant: {
        Args: {
          p_created_by: string
          p_note: string
          p_quantity: number
          p_variant_id: string
        }
        Returns: Json
      }
      set_order_status: {
        Args: {
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Json
      }
      set_settings: { Args: { p_values: Json }; Returns: number }
      setting_text: { Args: { p_key: string }; Returns: string }
    }
    Enums: {
      coupon_type: "percent" | "fixed"
      order_status:
        | "pending_payment"
        | "paid"
        | "preparing"
        | "shipped"
        | "ready_for_pickup"
        | "delivered"
        | "cancelled"
      payment_method: "mercadopago" | "transfer"
      review_status: "pending" | "approved" | "rejected"
      shipping_method: "delivery" | "same_day" | "pickup"
      stock_movement_type:
        | "restock"
        | "web_sale"
        | "manual_sale"
        | "adjustment"
        | "reservation"
        | "release"
        | "return"
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
    Enums: {
      coupon_type: ["percent", "fixed"],
      order_status: [
        "pending_payment",
        "paid",
        "preparing",
        "shipped",
        "ready_for_pickup",
        "delivered",
        "cancelled",
      ],
      payment_method: ["mercadopago", "transfer"],
      review_status: ["pending", "approved", "rejected"],
      shipping_method: ["delivery", "same_day", "pickup"],
      stock_movement_type: [
        "restock",
        "web_sale",
        "manual_sale",
        "adjustment",
        "reservation",
        "release",
        "return",
      ],
    },
  },
} as const
