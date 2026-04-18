import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface PozoData {
  id: number;
  codigo: string;
  acuifero_id: number;
  profundidad_m: number;
  caudal_lps: number;
  latitud: number;
  longitud: number;
  acuifero?: { clave: string; nombre: string };
}

export interface ZonaCalidad {
  zona_id: number;
  zona: string;
  fuente: string;
  tipo_fuente: string;
  ultima_fecha: string;
  cloro_residual_libre_mg_l: number;
  ph: number;
  turbiedad_ntu: number;
  coliformes_totales_100ml: number;
  coliformes_fecales_100ml: number;
  clasificacion: "Excelente" | "Buena" | "Regular" | "Mala";
}

export interface AcuiferoData {
  id: number;
  clave: string;
  nombre: string;
  superficie_km2: number;
}

export async function fetchPozos(): Promise<PozoData[]> {
  const { data, error } = await supabase
    .from("pozo")
    .select("*, acuifero(clave, nombre)")
    .not("latitud", "is", null);
  if (error) { console.error("fetchPozos:", error); return []; }
  return data as PozoData[];
}

export async function fetchResumenCalidadZonas(): Promise<ZonaCalidad[]> {
  const { data, error } = await supabase
    .from("resumen_calidad_zona")
    .select("*")
    .not("clasificacion", "is", null);
  if (error) { console.error("fetchResumenCalidad:", error); return []; }
  return data as ZonaCalidad[];
}

export async function fetchAcuiferos(): Promise<AcuiferoData[]> {
  const { data, error } = await supabase.from("acuifero").select("id, clave, nombre, superficie_km2");
  if (error) { console.error("fetchAcuiferos:", error); return []; }
  return data as AcuiferoData[];
}

export async function fetchCalidadDetallada() {
  const { data, error } = await supabase
    .from("calidad_agua")
    .select("*, zona(nombre)")
    .order("fecha_muestreo", { ascending: false });
  if (error) { console.error("fetchCalidadDetallada:", error); return []; }
  return data ?? [];
}
