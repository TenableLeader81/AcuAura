"use client";

import { WaterSource } from "@/types/water";
import { qualityColorMap } from "@/data/waterSources";

interface StatsBarProps {
  sources: WaterSource[];
  filter: string;
  onFilterChange: (filter: string) => void;
}

export default function StatsBar({ sources, filter, onFilterChange }: StatsBarProps) {
  const counts = {
    total: sources.length,
    excelente: sources.filter((s) => s.qualityLevel === "excelente").length,
    buena: sources.filter((s) => s.qualityLevel === "buena").length,
    regular: sources.filter((s) => s.qualityLevel === "regular").length,
    mala: sources.filter((s) => s.qualityLevel === "mala").length,
    pozos: sources.filter((s) => s.type === "pozo").length,
    presas: sources.filter((s) => s.type === "presa").length,
    active: sources.filter((s) => s.active).length,
  };

  const avgScore = Math.round(sources.reduce((acc, s) => acc + s.quality.score, 0) / sources.length);

  const filters = [
    { key: "all", label: "Todos", count: counts.total, color: "#6b7280" },
    { key: "excelente", label: "Excelente", count: counts.excelente, color: qualityColorMap.excelente },
    { key: "buena", label: "Buena", count: counts.buena, color: qualityColorMap.buena },
    { key: "regular", label: "Regular", count: counts.regular, color: qualityColorMap.regular },
    { key: "mala", label: "Mala", count: counts.mala, color: qualityColorMap.mala },
    { key: "pozo", label: "💧 Pozos", count: counts.pozos, color: "#3b82f6" },
    { key: "presa", label: "🏞️ Presas", count: counts.presas, color: "#0ea5e9" },
  ];

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Average score */}
        <div className="flex items-center gap-2 pr-4 border-r border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{avgScore}</div>
            <div className="text-xs text-gray-500">Promedio calidad</div>
          </div>
        </div>

        {/* Active indicator */}
        <div className="flex items-center gap-2 pr-4 border-r border-gray-200">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <div className="text-center">
            <div className="text-xl font-bold text-gray-800">{counts.active}</div>
            <div className="text-xs text-gray-500">Activas</div>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === f.key
                  ? "text-white shadow-md scale-105"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={filter === f.key ? { backgroundColor: f.color } : {}}
            >
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  filter === f.key ? "bg-white/30 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
