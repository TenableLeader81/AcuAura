import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ReportType = "sin_agua" | "fuga" | "contaminacion" | "baja_presion" | "otro";
export type ReportStatus = "activo" | "en_revision" | "resuelto";

export interface Report {
  id: string;
  type: ReportType;
  description: string;
  lat: number;
  lng: number;
  municipality: string;
  address?: string;
  status: ReportStatus;
  votes: number;
  created_at: string;
}
