export type UserRole = "admin" | "sales_user";

export type ProjectStatus =
  | "prospecto"
  | "calificacion"
  | "cotizacion"
  | "prueba_tecnica"
  | "negociacion"
  | "ganado"
  | "perdido";

export type ActivityType =
  | "visita"
  | "llamada"
  | "email"
  | "reunion"
  | "inspeccion_tecnica"
  | "demo"
  | "seguimiento";

export type ImportStatus = "pending" | "processed" | "failed";
export type ExportFormat = "xlsx" | "csv" | "json";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          region: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          full_name: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          industry_segment: string;
          plant_name: string | null;
          city: string | null;
          country: string | null;
          contact_name: string | null;
          contact_position: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          current_competitor: string | null;
          annual_potential_usd: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["clients"]["Row"]> & {
          owner_id: string;
          name: string;
          industry_segment: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "clients_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          client_id: string;
          name: string;
          industry_segment: string;
          coating_type: string;
          status: ProjectStatus;
          estimated_value: number;
          currency: string;
          win_probability: number;
          estimated_close_date: string | null;
          competitor: string | null;
          technical_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & {
          owner_id: string;
          client_id: string;
          name: string;
          industry_segment: string;
          coating_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projects_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      activities: {
        Row: {
          id: string;
          owner_id: string;
          client_id: string | null;
          project_id: string | null;
          activity_type: ActivityType;
          activity_date: string;
          result: string | null;
          next_action: string | null;
          next_action_date: string | null;
          comments: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activities"]["Row"]> & {
          owner_id: string;
          activity_type: ActivityType;
        };
        Update: Partial<Database["public"]["Tables"]["activities"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "activities_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      exports: {
        Row: {
          id: string;
          owner_id: string;
          format: ExportFormat;
          entity: string;
          record_count: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["exports"]["Row"]> & {
          owner_id: string;
          format: ExportFormat;
          entity: string;
        };
        Update: Partial<Database["public"]["Tables"]["exports"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "exports_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      imports: {
        Row: {
          id: string;
          imported_by: string;
          file_name: string;
          entity: string;
          status: ImportStatus;
          total_rows: number;
          inserted_rows: number;
          updated_rows: number;
          skipped_rows: number;
          error_log: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["imports"]["Row"]> & {
          imported_by: string;
          file_name: string;
          entity: string;
        };
        Update: Partial<Database["public"]["Tables"]["imports"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "imports_imported_by_fkey";
            columns: ["imported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      activity_type: ActivityType;
      import_status: ImportStatus;
      export_format: ExportFormat;
    };
    CompositeTypes: Record<string, never>;
  };
}
