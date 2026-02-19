export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      app_config: {
        Row: {
          id: number;
          config: Json;
          updated_at: string;
        };
        Insert: {
          id?: number;
          config: Json;
          updated_at?: string;
        };
        Update: {
          id?: number;
          config?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_config_history: {
        Row: {
          id: string;
          config: Json;
          previous_config: Json | null;
          updated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          config: Json;
          previous_config?: Json | null;
          updated_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          config?: Json;
          previous_config?: Json | null;
          updated_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      expo_updates: {
        Row: {
          id: string;
          platform: string;
          channel: string;
          runtime_version: string;
          app_version: string | null;
          message: string | null;
          manifest: Json;
          assets_count: number;
          created_at: string;
        };
        Insert: {
          id: string;
          platform: string;
          channel: string;
          runtime_version: string;
          app_version?: string | null;
          message?: string | null;
          manifest: Json;
          assets_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          platform?: string;
          channel?: string;
          runtime_version?: string;
          app_version?: string | null;
          message?: string | null;
          manifest?: Json;
          assets_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      expo_events: {
        Row: {
          id: number;
          event_type: string;
          platform: string | null;
          runtime_version: string | null;
          channel: string | null;
          app_version: string | null;
          device_id: string | null;
          ip_hash: string | null;
          os_name: string | null;
          os_version: string | null;
          device_model: string | null;
          update_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          event_type: string;
          platform?: string | null;
          runtime_version?: string | null;
          channel?: string | null;
          app_version?: string | null;
          device_id?: string | null;
          ip_hash?: string | null;
          os_name?: string | null;
          os_version?: string | null;
          device_model?: string | null;
          update_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          event_type?: string;
          platform?: string | null;
          runtime_version?: string | null;
          channel?: string | null;
          app_version?: string | null;
          device_id?: string | null;
          ip_hash?: string | null;
          os_name?: string | null;
          os_version?: string | null;
          device_model?: string | null;
          update_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
