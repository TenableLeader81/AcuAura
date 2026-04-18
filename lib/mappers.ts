import { WaterSource, WaterQuality, QualityLevel } from "@/types/water";
import { PozoData, ZonaCalidad } from "@/lib/dbQueries";

// Zona coordinates lookup — matches zona names to approximate center coords
const zonaCoordsMap: Record<string, [number, number]> = {
  "Centro Histórico":      [20.5881, -100.3899],
  "Jurica":                [20.7001, -100.4512],
  "San Pedro Mártir":      [20.5612, -100.3721],
  "Villa Corregidora":     [20.5214, -100.3672],
  "Lomas de Querétaro":    [20.6102, -100.4231],
  "Amazcala":              [20.7234, -100.2345],
  "Chichimequillas":       [20.6891, -100.2012],
  "Tierra Blanca":         [20.6543, -100.1987],
  "San Juan del Río Centro":[20.3889, -99.9976],
  "La Llave":              [20.4123, -99.9512],
  "El Marqués Centro":     [20.6331, -100.1853],
  "Zibatá":                [20.6721, -100.3124],
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
