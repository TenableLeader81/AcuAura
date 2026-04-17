"use client";

import { WaterSource } from "@/types/water";
import { qualityColorMap } from "@/data/waterSources";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface WaterQualityPanelProps {
  source: WaterSource;
  onClose: () => void;
}

const parameterLabels: Record<string, { label: string; unit: string; ideal: [number, number]; invert?: boolean }> = {
  ph: { label: "pH", unit: "", ideal: [6.5, 8.5] },
  turbidity: { label: "Turbidez", unit: "NTU", ideal: [0, 4], invert: true },
  conductivity: { label: "Conductividad", unit: "µS/cm", ideal: [100, 600], invert: true },
  dissolvedOxygen: { label: "Oxígeno Disuelto", unit: "mg/L", ideal: [6, 14] },
  nitrates: { label: "Nitratos", unit: "mg/L", ideal: [0, 10], invert: true },
  coliform: { label: "Coliformes", unit: "UFC/100mL", ideal: [0, 0], invert: true },
};

function getParamScore(key: string, value: number): number {
  const p = parameterLabels[key];
  if (!p) return 50;
  if (key === "ph") {
    if (value >= 6.5 && value <= 8.5) return 100;
    return Math.max(0, 100 - Math.abs(value - 7.5) * 30);
  }
  if (p.invert) {
    const max = p.ideal[1] === 0 ? 1 : p.ideal[1] * 3;
    return Math.max(0, 100 - (value / max) * 100);
  }
  const [min, max] = p.ideal;
  if (value >= min && value <= max) return 100;
  return Math.max(0, 100 - Math.abs(value - (min + max) / 2) * 10);
}

const qualityLabels: Record<string, string> = {
  excelente: "Excelente",
  buena: "Buena",
  regular: "Regular",
  mala: "Mala",
};

const qualityBg: Record<string, string> = {
  excelente: "bg-green-100 text-green-800",
  buena: "bg-lime-100 text-lime-800",
  regular: "bg-amber-100 text-amber-800",
  mala: "bg-red-100 text-red-800",
};

export default function WaterQualityPanel({ source, onClose }: WaterQualityPanelProps) {
  const color = qualityColorMap[source.qualityLevel];

  const radarData = Object.entries(parameterLabels).map(([key, meta]) => ({
    parameter: meta.label,
    score: getParamScore(key, source.quality[key as keyof typeof source.quality] as number),
    value: source.quality[key as keyof typeof source.quality],
    unit: meta.unit,
  }));

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-100" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${qualityBg[source.qualityLevel]}`}>
              {qualityLabels[source.qualityLevel]}
            </span>
            <span className="text-xs text-gray-500 capitalize">{source.type}</span>
            {!source.active && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>
            )}
          </div>
          <h2 className="text-lg font-bold text-gray-800 leading-tight">{source.name}</h2>
          <p className="text-sm text-gray-500">{source.municipality}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light p-1">✕</button>
      </div>

      {/* Score */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-600">Índice de calidad</span>
          <span className="text-2xl font-bold" style={{ color }}>{source.quality.score}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${source.quality.score}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Radar Chart */}
      <div className="px-2 pt-2 pb-0">
        <p className="text-xs font-semibold text-gray-500 px-2 mb-1">Perfil de parámetros</p>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="parameter" tick={{ fontSize: 10, fill: "#6b7280" }} />
            <Radar
              name="Puntuación"
              dataKey="score"
              stroke={color}
              fill={color}
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(value, _name, props) => [
                `${Number(value).toFixed(0)}/100 (${props.payload?.value} ${props.payload?.unit})`,
                "Puntuación",
              ]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Parameters Table */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">Parámetros medidos</p>
        <div className="space-y-2">
          {Object.entries(parameterLabels).map(([key, meta]) => {
            const value = source.quality[key as keyof typeof source.quality] as number;
            const score = getParamScore(key, value);
            const barColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
            return (
              <div key={key} className="bg-gray-50 rounded-lg p-2.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700">{meta.label}</span>
                  <span className="text-xs font-bold text-gray-800">
                    {value} {meta.unit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${score}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Meta info */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
          {source.depth && <div><span className="font-medium">Profundidad:</span> {source.depth} m</div>}
          {source.capacity && <div><span className="font-medium">Capacidad:</span> {source.capacity} Mm³</div>}
          {source.flowRate && <div><span className="font-medium">Caudal:</span> {source.flowRate} L/s</div>}
          <div><span className="font-medium">Actualizado:</span> {source.lastUpdated}</div>
        </div>
      </div>
    </div>
  );
}
