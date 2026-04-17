"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { WaterSource } from "@/types/water";
import { waterSources, waterRoutes } from "@/data/waterSources";
import WaterQualityPanel from "@/components/WaterQualityPanel";
import StatsBar from "@/components/StatsBar";

const WaterMap = dynamic(() => import("@/components/WaterMap"), { ssr: false });

export default function Home() {
  const [selectedSource, setSelectedSource] = useState<WaterSource | null>(null);
  const [filter, setFilter] = useState("all");

  const filteredSources = useMemo(() => {
    if (filter === "all") return waterSources;
    if (["excelente", "buena", "regular", "mala"].includes(filter)) {
      return waterSources.filter((s) => s.qualityLevel === filter);
    }
    if (["pozo", "presa", "manantial"].includes(filter)) {
      return waterSources.filter((s) => s.type === filter);
    }
    return waterSources;
  }, [filter]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white px-6 py-3 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💧</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AguaQRO</h1>
              <p className="text-xs text-blue-200">Sistema de Monitoreo Hídrico — Querétaro</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-blue-100">
            <span className="hidden sm:block">Actualizado: 17 Apr 2026</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
              {waterSources.length} fuentes monitoreadas
            </span>
          </div>
        </div>
      </header>

      {/* Stats & Filters */}
      <StatsBar sources={waterSources} filter={filter} onFilterChange={setFilter} />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Map */}
        <div className="flex-1">
          <WaterMap
            sources={filteredSources}
            routes={waterRoutes}
            onSelectSource={setSelectedSource}
            selectedSource={selectedSource}
          />
        </div>

        {/* Side panel */}
        {selectedSource && (
          <div className="w-80 flex-shrink-0 shadow-xl z-10 border-l border-gray-200 overflow-hidden">
            <WaterQualityPanel
              source={selectedSource}
              onClose={() => setSelectedSource(null)}
            />
          </div>
        )}

        {/* Footer hint */}
        {!selectedSource && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800/80 text-white text-xs px-4 py-2 rounded-full backdrop-blur pointer-events-none z-[500]">
            Haz clic en un marcador para ver la evaluación de calidad del agua
          </div>
        )}
      </div>
    </div>
  );
}
