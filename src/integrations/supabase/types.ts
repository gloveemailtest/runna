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
      completed_strength_workouts: {
        Row: {
          completed_at: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          pain_level: number | null
          rating: number | null
          strength_workout_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          pain_level?: number | null
          rating?: number | null
          strength_workout_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          pain_level?: number | null
          rating?: number | null
          strength_workout_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_strength_workouts_strength_workout_id_fkey"
            columns: ["strength_workout_id"]
            isOneToOne: false
            referencedRelation: "strength_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      completed_workouts: {
        Row: {
          actual_distance: number | null
          actual_duration_minutes: number | null
          completed_at: string | null
          id: string
          notes: string | null
          rating: number | null
          user_id: string
          workout_id: string
        }
        Insert: {
          actual_distance?: number | null
          actual_duration_minutes?: number | null
          completed_at?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          user_id: string
          workout_id: string
        }
        Update: {
          actual_distance?: number | null
          actual_duration_minutes?: number | null
          completed_at?: string | null
          id?: string
          notes?: string | null
          rating?: number | null
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "completed_workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          current_weekly_mileage: number | null
          full_name: string | null
          id: string
          injury_history: string[] | null
          longest_recent_run: number | null
          training_preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_weekly_mileage?: number | null
          full_name?: string | null
          id: string
          injury_history?: string[] | null
          longest_recent_run?: number | null
          training_preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_weekly_mileage?: number | null
          full_name?: string | null
          id?: string
          injury_history?: string[] | null
          longest_recent_run?: number | null
          training_preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      strength_exercises: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          equipment: string[] | null
          helps_with_injuries: Database["public"]["Enums"]["body_part"][] | null
          id: string
          instructions: string[] | null
          name: string
          target_muscles: string[]
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string[] | null
          helps_with_injuries?:
            | Database["public"]["Enums"]["body_part"][]
            | null
          id?: string
          instructions?: string[] | null
          name: string
          target_muscles: string[]
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string[] | null
          helps_with_injuries?:
            | Database["public"]["Enums"]["body_part"][]
            | null
          id?: string
          instructions?: string[] | null
          name?: string
          target_muscles?: string[]
          video_url?: string | null
        }
        Relationships: []
      }
      strength_workout_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          order_index: number | null
          reps: string | null
          sets: number | null
          strength_workout_id: string
          weight: string | null
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps?: string | null
          sets?: number | null
          strength_workout_id: string
          weight?: string | null
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number | null
          reps?: string | null
          sets?: number | null
          strength_workout_id?: string
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strength_workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "strength_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_workout_exercises_strength_workout_id_fkey"
            columns: ["strength_workout_id"]
            isOneToOne: false
            referencedRelation: "strength_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      strength_workouts: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_injury_focused: boolean | null
          name: string
          scheduled_date: string | null
          target_injuries: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_injury_focused?: boolean | null
          name: string
          scheduled_date?: string | null
          target_injuries?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_injury_focused?: boolean | null
          name?: string
          scheduled_date?: string | null
          target_injuries?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          created_at: string | null
          goal_time_minutes: number
          id: string
          plan_data: Json
          race_date: string
          training_days_per_week: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          goal_time_minutes: number
          id?: string
          plan_data: Json
          race_date: string
          training_days_per_week: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          goal_time_minutes?: number
          id?: string
          plan_data?: Json
          race_date?: string
          training_days_per_week?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_injuries: {
        Row: {
          body_part: Database["public"]["Enums"]["body_part"]
          created_at: string | null
          description: string | null
          id: string
          injury_date: string | null
          is_active: boolean | null
          notes: string | null
          severity: Database["public"]["Enums"]["injury_severity"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body_part: Database["public"]["Enums"]["body_part"]
          created_at?: string | null
          description?: string | null
          id?: string
          injury_date?: string | null
          is_active?: boolean | null
          notes?: string | null
          severity?: Database["public"]["Enums"]["injury_severity"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body_part?: Database["public"]["Enums"]["body_part"]
          created_at?: string | null
          description?: string | null
          id?: string
          injury_date?: string | null
          is_active?: boolean | null
          notes?: string | null
          severity?: Database["public"]["Enums"]["injury_severity"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workout_pain_log: {
        Row: {
          body_part: Database["public"]["Enums"]["body_part"]
          description: string | null
          id: string
          logged_at: string | null
          pain_level: number | null
          user_id: string
          workout_id: string | null
        }
        Insert: {
          body_part: Database["public"]["Enums"]["body_part"]
          description?: string | null
          id?: string
          logged_at?: string | null
          pain_level?: number | null
          user_id: string
          workout_id?: string | null
        }
        Update: {
          body_part?: Database["public"]["Enums"]["body_part"]
          description?: string | null
          id?: string
          logged_at?: string | null
          pain_level?: number | null
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_pain_log_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          cooldown: string | null
          created_at: string | null
          description: string | null
          distance: number | null
          duration_minutes: number | null
          id: string
          main_workout: string | null
          pace_target: string | null
          training_plan_id: string
          warmup: string | null
          workout_date: string
          workout_type: string
        }
        Insert: {
          cooldown?: string | null
          created_at?: string | null
          description?: string | null
          distance?: number | null
          duration_minutes?: number | null
          id?: string
          main_workout?: string | null
          pace_target?: string | null
          training_plan_id: string
          warmup?: string | null
          workout_date: string
          workout_type: string
        }
        Update: {
          cooldown?: string | null
          created_at?: string | null
          description?: string | null
          distance?: number | null
          duration_minutes?: number | null
          id?: string
          main_workout?: string | null
          pace_target?: string | null
          training_plan_id?: string
          warmup?: string | null
          workout_date?: string
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
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
      body_part:
        | "neck"
        | "shoulder"
        | "upper_back"
        | "lower_back"
        | "chest"
        | "bicep"
        | "tricep"
        | "forearm"
        | "wrist"
        | "hand"
        | "hip"
        | "glute"
        | "quad"
        | "hamstring"
        | "knee"
        | "calf"
        | "shin"
        | "ankle"
        | "foot"
        | "it_band"
        | "groin"
      injury_severity: "mild" | "moderate" | "severe"
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
      body_part: [
        "neck",
        "shoulder",
        "upper_back",
        "lower_back",
        "chest",
        "bicep",
        "tricep",
        "forearm",
        "wrist",
        "hand",
        "hip",
        "glute",
        "quad",
        "hamstring",
        "knee",
        "calf",
        "shin",
        "ankle",
        "foot",
        "it_band",
        "groin",
      ],
      injury_severity: ["mild", "moderate", "severe"],
    },
  },
} as const
