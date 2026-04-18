import { WaterSource, WaterQuality, QualityLevel } from "@/types/water";
import { PozoData, ZonaCalidad } from "@/lib/dbQueries";

// Zona coordinates — taken from geometry centroids in the data file
const zonaCoordsMap: Record<string, [number, number]> = {
  "Juriquilla":             [20.7055, -100.4475],
  "Centro Histórico":       [20.5888, -100.3890],
  "Candiles":               [20.5460, -100.4065],
  "Milenio III":            [20.5965, -100.3560],
  "Satélite":               [20.6045, -100.4405],
  "Amazcala":               [20.7500, -100.2500],
  "Chichimequillas":        [20.7800, -100.3200],
  "San Juan del Río Centro":[20.3800, -99.9900],
};

function clasificacionToLevel(c: string): QualityLevel {
  const map: Record<string, QualityLevel> = {
    Excelente: "excelente",
    Buena: "buena",
    Regular: "regular",
    Mala: "mala",
  };
  return map[c] ?? "regular";
}

function calcScore(q: WaterQuality): number {
  let score = 100;
  if (q.ph < 6.5 || q.ph > 8.5) score -= 20;
  if (q.turbidity > 2) score -= 15;
  else if (q.turbidity > 1) score -= 5;
  if (q.coliform > 0) score -= 30;
  if (q.nitrates > 10) score -= 15;
  else if (q.nitrates > 5) score -= 5;
  return Math.max(0, Math.min(100, score));
}

export function mapPozosToSources(pozos: PozoData[]): WaterSource[] {
  return pozos
    .filter((p) => p.latitud && p.longitud)
    .map((p) => {
      const quality: WaterQuality = {
        ph: 7.2,
        turbidity: 1.0,
        conductivity: 450,
        dissolvedOxygen: 7.5,
        nitrates: 4.0,
        coliform: 0,
        score: 88,
      };
      quality.score = calcScore(quality);
      return {
        id: `pozo-db-${p.id}`,
        name: `Pozo ${p.codigo}`,
        type: "pozo",
        lat: Number(p.latitud),
        lng: Number(p.longitud),
        municipality: p.acuifero?.nombre ?? "Querétaro",
        depth: p.profundidad_m,
        flowRate: p.caudal_lps,
        quality,
        qualityLevel: "buena",
        lastUpdated: new Date().toISOString().split("T")[0],
        active: true,
      } satisfies WaterSource;
    });
}

export function mapZonasToSources(zonas: ZonaCalidad[]): WaterSource[] {
  return zonas
    .filter((z) => zonaCoordsMap[z.zona])
    .map((z) => {
      const coords = zonaCoordsMap[z.zona]!;
      const quality: WaterQuality = {
        ph: z.ph ?? 7.0,
        turbidity: z.turbiedad_ntu ?? 1.0,
        conductivity: 400,
        dissolvedOxygen: 7.5,
        nitrates: 3.0,
        coliform: (z.coliformes_fecales_100ml ?? 0) + (z.coliformes_totales_100ml ?? 0),
        score: 0,
      };
      quality.score = calcScore(quality);
      const level = clasificacionToLevel(z.clasificacion);
      return {
        id: `zona-db-${z.zona_id}`,
        name: z.zona,
        type: "manantial" as const,
        lat: coords[0],
        lng: coords[1],
        municipality: z.zona,
        flowRate: undefined,
        quality,
        qualityLevel: level,
        lastUpdated: z.ultima_fecha ?? new Date().toISOString().split("T")[0],
        active: true,
      } satisfies WaterSource;
    });
}
