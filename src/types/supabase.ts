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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      agent_logs: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          level?: string
          message: string
          metadata?: Json
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json
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
      agents: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          last_run_at: string | null
          name: string
          status: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          status?: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      aircraft_status: {
        Row: {
          aircraft_tail_number: string
          aircraft_type: string
          airport_base: string | null
          created_at: string | null
          id: string
          last_updated: string | null
          location: string | null
          metadata: Json | null
          status: string
          user_id: string
        }
        Insert: {
          aircraft_tail_number: string
          aircraft_type: string
          airport_base?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          location?: string | null
          metadata?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          aircraft_tail_number?: string
          aircraft_type?: string
          airport_base?: string | null
          created_at?: string | null
          id?: string
          last_updated?: string | null
          location?: string | null
          metadata?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      airport_coordinates: {
        Row: {
          code: string
          created_at: string | null
          latitude: number
          longitude: number
          name: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          latitude: number
          longitude: number
          name?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          latitude?: number
          longitude?: number
          name?: string | null
        }
        Relationships: []
      }
      availability_profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          rules: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          rules?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          rules?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          images: Json | null
          is_published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          images?: Json | null
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          images?: Json | null
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          follow_up_date: string | null
          id: string
          last_contacted_at: string | null
          metadata: Json | null
          name: string
          notes: string | null
          phone: string | null
          position: string | null
          priority: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted_at?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted_at?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      current_flight: {
        Row: {
          created_at: string | null
          departure_time: string | null
          destination: string | null
          flight_status: string | null
          id: string
          tail_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          departure_time?: string | null
          destination?: string | null
          flight_status?: string | null
          id?: string
          tail_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          departure_time?: string | null
          destination?: string | null
          flight_status?: string | null
          id?: string
          tail_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flight_tracking: {
        Row: {
          aircraft: string | null
          arrival_time: string | null
          created_at: string | null
          departure_time: string | null
          destination: string
          fa_flight_id: string
          flight_number: string | null
          id: string
          origin: string
          status: string | null
          tracking_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aircraft?: string | null
          arrival_time?: string | null
          created_at?: string | null
          departure_time?: string | null
          destination: string
          fa_flight_id: string
          flight_number?: string | null
          id?: string
          origin: string
          status?: string | null
          tracking_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aircraft?: string | null
          arrival_time?: string | null
          created_at?: string | null
          departure_time?: string | null
          destination?: string
          fa_flight_id?: string
          flight_number?: string | null
          id?: string
          origin?: string
          status?: string | null
          tracking_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flights: {
        Row: {
          aircraft: Json
          altitude: number | null
          arrival_time: string | null
          created_at: string | null
          date: string
          departure_time: string | null
          description: string | null
          duration: string | null
          id: string
          position: Json | null
          route: Json
          speed: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          aircraft: Json
          altitude?: number | null
          arrival_time?: string | null
          created_at?: string | null
          date: string
          departure_time?: string | null
          description?: string | null
          duration?: string | null
          id: string
          position?: Json | null
          route: Json
          speed?: number | null
          status: string
          updated_at?: string | null
        }
        Update: {
          aircraft?: Json
          altitude?: number | null
          arrival_time?: string | null
          created_at?: string | null
          date?: string
          departure_time?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          position?: Json | null
          route?: Json
          speed?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      generated_posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          platform: string | null
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string | null
          upload_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          platform?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string | null
          upload_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          platform?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string | null
          upload_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_posts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      inoah_conversations: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json
          role: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          role: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          role?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      inoah_memory: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meeting_types: {
        Row: {
          buffer_min: number
          created_at: string
          description: string | null
          duration_min: number
          id: string
          is_active: boolean
          location_details: string | null
          location_type: string
          name: string
          profile_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          buffer_min?: number
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          is_active?: boolean
          location_details?: string | null
          location_type?: string
          name: string
          profile_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          buffer_min?: number
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          is_active?: boolean
          location_details?: string | null
          location_type?: string
          name?: string
          profile_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_types_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "availability_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          collection: string
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          collection: string
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          collection?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          category: string
          created_at: string | null
          description: string
          id: string
          image: string | null
          link: string | null
          technologies: string[] | null
          title: string
          updated_at: string | null
          venture_link: string | null
          venture_name: string | null
          year: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          id: string
          image?: string | null
          link?: string | null
          technologies?: string[] | null
          title: string
          updated_at?: string | null
          venture_link?: string | null
          venture_name?: string | null
          year: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          image?: string | null
          link?: string | null
          technologies?: string[] | null
          title?: string
          updated_at?: string | null
          venture_link?: string | null
          venture_name?: string | null
          year?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          created_at: string
          id: string
          last_attempt: string | null
          post_id: string
          scheduled_for: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_attempt?: string | null
          post_id: string
          scheduled_for: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_attempt?: string | null
          post_id?: string
          scheduled_for?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "generated_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_auth: {
        Row: {
          id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          id?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      uploads: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          status: string
          text: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          status?: string
          text?: string | null
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          status?: string
          text?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ventures: {
        Row: {
          created_at: string | null
          description: string
          id: string
          is_new: boolean | null
          link: string | null
          role: string
          status: string
          subtitle_en: string | null
          subtitle_es: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          year: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id: string
          is_new?: boolean | null
          link?: string | null
          role: string
          status: string
          subtitle_en?: string | null
          subtitle_es?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          year: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          is_new?: boolean | null
          link?: string | null
          role?: string
          status?: string
          subtitle_en?: string | null
          subtitle_es?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          year?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_memories: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          metadata: Json
          similarity: number
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
    Enums: {},
  },
} as const
