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
      admin_levels: {
        Row: {
          admin_role: Database["public"]["Enums"]["admin_role"]
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_role?: Database["public"]["Enums"]["admin_role"]
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_role?: Database["public"]["Enums"]["admin_role"]
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          address: string | null
          business_name: string
          code_prefix: string | null
          created_at: string
          id: string
          is_active: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          operating_hours: string | null
          phone: string
          services: string[] | null
          updated_at: string
          user_id: string
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          code_prefix?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          operating_hours?: string | null
          phone: string
          services?: string[] | null
          updated_at?: string
          user_id: string
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          code_prefix?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          operating_hours?: string | null
          phone?: string
          services?: string[] | null
          updated_at?: string
          user_id?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      broadcast_notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          message: string
          sent_by: string
          target_type: string
          target_user_ids: string[] | null
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message: string
          sent_by: string
          target_type?: string
          target_user_ids?: string[] | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          message?: string
          sent_by?: string
          target_type?: string
          target_user_ids?: string[] | null
          title?: string
        }
        Relationships: []
      }
      couriers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          price: number
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          price?: number
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          price?: number
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "couriers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_read: boolean
          media_type: string | null
          media_url: string | null
          message: string
          read_at: string | null
          title: string
          tracking_number: string | null
          type: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          media_type?: string | null
          media_url?: string | null
          message: string
          read_at?: string | null
          title: string
          tracking_number?: string | null
          type?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          media_type?: string | null
          media_url?: string | null
          message?: string
          read_at?: string | null
          title?: string
          tracking_number?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          agent_id: string | null
          assigned_rider_id: string | null
          checkout_request_id: string | null
          cod_amount: number | null
          cod_collected: boolean | null
          commission: number | null
          cost: number
          courier_id: string | null
          created_at: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          fee_collected: boolean
          fee_collected_at: string | null
          fee_on_delivery: boolean
          id: string
          is_product: boolean | null
          mpesa_receipt_number: string | null
          original_paid_amount: number | null
          package_description: string | null
          package_value: number | null
          packaging_color: string | null
          paid_at: string | null
          payment_balance_due: number
          payment_status: string
          pending_conversion_balance: number | null
          pending_conversion_cost: number | null
          pending_conversion_type:
            | Database["public"]["Enums"]["delivery_type"]
            | null
          pickup_agent_id: string | null
          pickup_point: string | null
          receiver_address: string
          receiver_name: string
          receiver_phone: string
          rejection_reason: string | null
          release_code: string | null
          sender_address: string | null
          sender_name: string
          sender_phone: string
          status: Database["public"]["Enums"]["package_status"]
          tracking_number: string
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          agent_id?: string | null
          assigned_rider_id?: string | null
          checkout_request_id?: string | null
          cod_amount?: number | null
          cod_collected?: boolean | null
          commission?: number | null
          cost: number
          courier_id?: string | null
          created_at?: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          fee_collected?: boolean
          fee_collected_at?: string | null
          fee_on_delivery?: boolean
          id?: string
          is_product?: boolean | null
          mpesa_receipt_number?: string | null
          original_paid_amount?: number | null
          package_description?: string | null
          package_value?: number | null
          packaging_color?: string | null
          paid_at?: string | null
          payment_balance_due?: number
          payment_status?: string
          pending_conversion_balance?: number | null
          pending_conversion_cost?: number | null
          pending_conversion_type?:
            | Database["public"]["Enums"]["delivery_type"]
            | null
          pickup_agent_id?: string | null
          pickup_point?: string | null
          receiver_address: string
          receiver_name: string
          receiver_phone: string
          rejection_reason?: string | null
          release_code?: string | null
          sender_address?: string | null
          sender_name: string
          sender_phone: string
          status?: Database["public"]["Enums"]["package_status"]
          tracking_number: string
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          agent_id?: string | null
          assigned_rider_id?: string | null
          checkout_request_id?: string | null
          cod_amount?: number | null
          cod_collected?: boolean | null
          commission?: number | null
          cost?: number
          courier_id?: string | null
          created_at?: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          fee_collected?: boolean
          fee_collected_at?: string | null
          fee_on_delivery?: boolean
          id?: string
          is_product?: boolean | null
          mpesa_receipt_number?: string | null
          original_paid_amount?: number | null
          package_description?: string | null
          package_value?: number | null
          packaging_color?: string | null
          paid_at?: string | null
          payment_balance_due?: number
          payment_status?: string
          pending_conversion_balance?: number | null
          pending_conversion_cost?: number | null
          pending_conversion_type?:
            | Database["public"]["Enums"]["delivery_type"]
            | null
          pickup_agent_id?: string | null
          pickup_point?: string | null
          receiver_address?: string
          receiver_name?: string
          receiver_phone?: string
          rejection_reason?: string | null
          release_code?: string | null
          sender_address?: string | null
          sender_name?: string
          sender_phone?: string
          status?: Database["public"]["Enums"]["package_status"]
          tracking_number?: string
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_assigned_rider_id_fkey"
            columns: ["assigned_rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_logs: {
        Row: {
          amount: number
          checkout_request_id: string | null
          created_at: string
          id: string
          mpesa_receipt_number: string | null
          package_ids: string[]
          payment_method: string
          status: string
          tracking_numbers: string[]
          user_id: string
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          mpesa_receipt_number?: string | null
          package_ids: string[]
          payment_method: string
          status?: string
          tracking_numbers?: string[]
          user_id: string
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          id?: string
          mpesa_receipt_number?: string | null
          package_ids?: string[]
          payment_method?: string
          status?: string
          tracking_numbers?: string[]
          user_id?: string
        }
        Relationships: []
      }
      pochi_withdrawal_codes: {
        Row: {
          amount: number | null
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string | null
          used: boolean
          user_id: string
        }
        Insert: {
          amount?: number | null
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string | null
          used?: boolean
          user_id: string
        }
        Update: {
          amount?: number | null
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string | null
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_order: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          package_id: string | null
          reason: string
          reviewed_by: string | null
          status: string
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          package_id?: string | null
          reason: string
          reviewed_by?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          package_id?: string | null
          reason?: string
          reviewed_by?: string | null
          status?: string
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_online: boolean | null
          is_verified: boolean | null
          license_plate: string | null
          phone: string
          rating: number | null
          total_deliveries: number | null
          updated_at: string
          user_id: string
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          license_plate?: string | null
          phone: string
          rating?: number | null
          total_deliveries?: number | null
          updated_at?: string
          user_id: string
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          license_plate?: string | null
          phone?: string
          rating?: number | null
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          category: string
          config_key: string
          config_value: Json
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          config_key: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          config_key?: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          package_id: string
          pin_hash: string | null
          revoked: boolean
          token: string
          tracking_number: string
          updated_at: string
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          package_id: string
          pin_hash?: string | null
          revoked?: boolean
          token: string
          tracking_number: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          package_id?: string
          pin_hash?: string | null
          revoked?: boolean
          token?: string
          tracking_number?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tracking_links_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          bluetooth_enabled: boolean | null
          created_at: string
          id: string
          notifications_enabled: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bluetooth_enabled?: boolean | null
          created_at?: string
          id?: string
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bluetooth_enabled?: boolean | null
          created_at?: string
          id?: string
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference: string | null
          status: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: string
          type?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          pin_hash: string | null
          security_answer_hash: string | null
          security_question: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          pin_hash?: string | null
          security_answer_hash?: string | null
          security_question?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          pin_hash?: string | null
          security_answer_hash?: string | null
          security_question?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          mpesa_receipt: string | null
          phone: string
          status: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          mpesa_receipt?: string | null
          phone: string
          status?: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          mpesa_receipt?: string | null
          phone?: string
          status?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          area: string
          created_at: string
          delivery_fee: number
          description: string | null
          id: string
          is_active: boolean
          is_cbd: boolean
          name: string
          supports_doorstep: boolean
          updated_at: string
          zone_type: Database["public"]["Enums"]["zone_type"]
        }
        Insert: {
          area?: string
          created_at?: string
          delivery_fee?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_cbd?: boolean
          name: string
          supports_doorstep?: boolean
          updated_at?: string
          zone_type?: Database["public"]["Enums"]["zone_type"]
        }
        Update: {
          area?: string
          created_at?: string
          delivery_fee?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_cbd?: boolean
          name?: string
          supports_doorstep?: boolean
          updated_at?: string
          zone_type?: Database["public"]["Enums"]["zone_type"]
        }
        Relationships: []
      }
    }
    Views: {
      agents_public: {
        Row: {
          address: string | null
          business_name: string | null
          id: string | null
          is_active: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          operating_hours: string | null
          services: string[] | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          id?: string | null
          is_active?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          operating_hours?: string | null
          services?: string[] | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          id?: string | null
          is_active?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          operating_hours?: string | null
          services?: string[] | null
        }
        Relationships: []
      }
      promo_codes_public: {
        Row: {
          code: string | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          id: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_conversion: { Args: { _package_id: string }; Returns: Json }
      admin_convert_to_doorstep: {
        Args: { _new_cost: number; _package_id: string }
        Returns: Json
      }
      collect_delivery_cash: { Args: { _package_id: string }; Returns: Json }
      consume_pochi_withdrawal_code: {
        Args: { _code: string }
        Returns: boolean
      }
      create_pochi_withdrawal_code: {
        Args: { _amount: number; _phone: string }
        Returns: Json
      }
      create_tracking_link: {
        Args: { _expires_at?: string; _package_id: string; _pin?: string }
        Returns: Json
      }
      get_admin_level: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["admin_role"]
      }
      get_public_tracking: { Args: { _tracking_number: string }; Returns: Json }
      get_shared_tracking: {
        Args: { _pin?: string; _token: string }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      normalize_ke_phone: { Args: { _raw: string }; Returns: string }
      pay_with_pochi:
        | { Args: { _package_ids: string[] }; Returns: Json }
        | { Args: { _package_ids: string[]; _pin: string }; Returns: Json }
      phone_in_use: { Args: { _phone: string }; Returns: boolean }
      reject_conversion: { Args: { _package_id: string }; Returns: Json }
      release_package: {
        Args: { _package_id: string; _release_code: string }
        Returns: Json
      }
      setup_pochi_security: {
        Args: { _answer: string; _pin: string; _question: string }
        Returns: Json
      }
      verify_pochi_pin: { Args: { _pin: string }; Returns: boolean }
    }
    Enums: {
      admin_role:
        | "super_admin"
        | "operations_admin"
        | "finance_admin"
        | "support_admin"
      delivery_type: "xpress" | "pickup_point" | "doorstep" | "errand"
      package_status:
        | "pending"
        | "dropped_at_agent"
        | "picked_up"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "refunded"
        | "received_in_warehouse"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_role: "sender" | "agent" | "admin"
      zone_type: "pickup" | "doorstep" | "errand"
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
      admin_role: [
        "super_admin",
        "operations_admin",
        "finance_admin",
        "support_admin",
      ],
      delivery_type: ["xpress", "pickup_point", "doorstep", "errand"],
      package_status: [
        "pending",
        "dropped_at_agent",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
        "received_in_warehouse",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_role: ["sender", "agent", "admin"],
      zone_type: ["pickup", "doorstep", "errand"],
    },
  },
} as const
