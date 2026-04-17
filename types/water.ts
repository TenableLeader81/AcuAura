export interface WaterQuality {
  ph: number;
  turbidity: number; // NTU
  conductivity: number; // µS/cm
  dissolvedOxygen: number; // mg/L
  nitrates: number; // mg/L
  coliform: number; // UFC/100mL
  score: number; // 0-100 calidad general
}

export type SourceType = "pozo" | "presa" | "manantial";
export type QualityLevel = "excelente" | "buena" | "regular" | "mala";

export interface WaterSource {
  id: string;
  name: string;
  type: SourceType;
  lat: number;
  lng: number;
  municipality: string;
  depth?: number; // metros (pozos)
  capacity?: number; // millones de m3 (presas)
  flowRate?: number; // L/s
  quality: WaterQuality;
  qualityLevel: QualityLevel;
  lastUpdated: string;
  active: boolean;
}

export interface WaterRoute {
  id: string;
  name: string;
  from: string; // source id
  to: string; // destination
  coordinates: [number, number][];
  type: "acueducto" | "canal" | "tuberia";
  flowRate: number; // L/s
  length: number; // km
}
