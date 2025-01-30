export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      daily_stats: {
        Row: {
          created_at: string | null
          date: string
          games_played: number | null
          id: string
          total_losses: number | null
          total_purchases: number | null
          total_winnings: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          games_played?: number | null
          id?: string
          total_losses?: number | null
          total_purchases?: number | null
          total_winnings?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          games_played?: number | null
          id?: string
          total_losses?: number | null
          total_purchases?: number | null
          total_winnings?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      game_history: {
        Row: {
          created_at: string | null
          final_pot: number | null
          game_id: string | null
          id: string
          players: Json | null
          room_id: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          final_pot?: number | null
          game_id?: string | null
          id?: string
          players?: Json | null
          room_id?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          final_pot?: number | null
          game_id?: string | null
          id?: string
          players?: Json | null
          room_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_history_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_history_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          biggest_win: number | null
          cards: Json | null
          chips: number | null
          created_at: string | null
          current_bet: number | null
          default_chips: number | null
          game_id: string | null
          games_played: number | null
          id: string
          is_active: boolean | null
          is_turn: boolean | null
          lifetime_winnings: number | null
          position: string | null
          score: number | null
          user_id: string
        }
        Insert: {
          biggest_win?: number | null
          cards?: Json | null
          chips?: number | null
          created_at?: string | null
          current_bet?: number | null
          default_chips?: number | null
          game_id?: string | null
          games_played?: number | null
          id?: string
          is_active?: boolean | null
          is_turn?: boolean | null
          lifetime_winnings?: number | null
          position?: string | null
          score?: number | null
          user_id: string
        }
        Update: {
          biggest_win?: number | null
          cards?: Json | null
          chips?: number | null
          created_at?: string | null
          current_bet?: number | null
          default_chips?: number | null
          game_id?: string | null
          games_played?: number | null
          id?: string
          is_active?: boolean | null
          is_turn?: boolean | null
          lifetime_winnings?: number | null
          position?: string | null
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          community_cards: Json | null
          created_at: string | null
          current_bet: number | null
          current_player_index: number | null
          dealer_position: number | null
          id: string
          minimum_bet: number | null
          pot: number | null
          rake: number | null
          room_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          community_cards?: Json | null
          created_at?: string | null
          current_bet?: number | null
          current_player_index?: number | null
          dealer_position?: number | null
          id?: string
          minimum_bet?: number | null
          pot?: number | null
          rake?: number | null
          room_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          community_cards?: Json | null
          created_at?: string | null
          current_bet?: number | null
          current_player_index?: number | null
          dealer_position?: number | null
          id?: string
          minimum_bet?: number | null
          pot?: number | null
          rake?: number | null
          room_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_history: {
        Row: {
          admin_id: string
          amount: number
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          actual_players: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          max_players: number
          min_bet: number
          name: string
          with_bots: boolean | null
        }
        Insert: {
          actual_players?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          max_players?: number
          min_bet?: number
          name: string
          with_bots?: boolean | null
        }
        Update: {
          actual_players?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          max_players?: number
          min_bet?: number
          name?: string
          with_bots?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      is_admin_secure: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
