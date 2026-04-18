"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { WaterSource } from "@/types/water";
import { waterSources, waterRoutes } from "@/data/waterSources";
import WaterQualityPanel from "@/components/WaterQualityPanel";
import StatsBar from "@/components/StatsBar";
import ReportModal from "@/components/ReportModal";
import ReportsPanel from "@/components/ReportsPanel";
import { supabase, Report } from "@/lib/supabase";
import ChatBot from "@/components/ChatBot";

const WaterMap = dynamic(() => import("@/components/WaterMap"), { ssr: false });

function MobileSheetHandle({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white flex-shrink-0">
      <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
      <div />
      <button
        onClick={onClose}
        className="ml-auto flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
      >
        ✕ Cerrar
      </button>
    </div>
  );
}

type SidePanel = "quality" | "reports" | null;

export default function Home() {
  const [selectedSource, setSelectedSource] = useState<WaterSource | null>(null);
  const [filter, setFilter] = useState("all");
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [reportingMode, setReportingMode] = useState(false);
  const [pendingReport, setPendingReport] = useState<{ lat: number; lng: number } | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const filteredSources = useMemo(() => {
    if (filter === "all") return waterSources;
    if (["excelente", "buena", "regular", "mala"].includes(filter))
      return waterSources.filter((s) => s.qualityLevel === filter);
    if (["pozo", "presa", "manantial"].includes(filter))
      return waterSources.filter((s) => s.type === filter);
    return waterSources;
  }, [filter]);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setReports(data as Report[]);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    const channel = supabase
      .channel("reports-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, fetchReports)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports]);

  const handleSelectSource = useCallback((source: WaterSource | null) => {
    setSelectedSource(source);
    setSidePanel(source ? "quality" : null);
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (!reportingMode) return;
    setPendingReport({ lat, lng });
    setReportingMode(false);
  }, [reportingMode]);

  function toggleReportingMode() {
    setReportingMode((v) => !v);
    setSelectedSource(null);
    setSidePanel(null);
  }

  function toggleReportsPanel() {
    setSidePanel((v) => (v === "reports" ? null : "reports"));
    setSelectedSource(null);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const activeReports = reports.filter((r) => r.status !== "resuelto").length;

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white px-4 py-3 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl sm:text-3xl flex-shrink-0">💧</span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-tight">AcuAura</h1>
              <p className="text-xs text-blue-200 hidden sm:block">Monitoreo Hídrico Comunitario — Querétaro</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={toggleReportsPanel}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                sidePanel === "reports" ? "bg-white text-blue-700" : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <span>📋</span>
              <span className="hidden sm:inline">Reportes</span>
              {activeReports > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                  {activeReports}
                </span>
              )}
            </button>

            <button
              onClick={toggleReportingMode}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                reportingMode ? "bg-red-500 text-white animate-pulse" : "bg-white text-blue-700 hover:bg-blue-50"
              }`}
            >
              <span>{reportingMode ? "✕" : "⚠️"}</span>
              <span>{reportingMode ? "Cancelar" : "Reportar"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Stats & Filters */}
      <StatsBar sources={waterSources} filter={filter} onFilterChange={setFilter} />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1">
          <WaterMap
            sources={filteredSources}
            routes={waterRoutes}
            reports={reports}
            onSelectSource={handleSelectSource}
            selectedSource={selectedSource}
            onMapClick={handleMapClick}
            reportingMode={reportingMode}
            panelOpen={sidePanel !== null}
          />
        </div>

        {/* Side panel — desktop: right column, mobile: bottom sheet */}
        {sidePanel === "quality" && selectedSource && (
          <>
            <div className="hidden sm:block w-80 flex-shrink-0 shadow-xl z-10 border-l border-gray-200 overflow-hidden">
              <WaterQualityPanel source={selectedSource} onClose={() => { setSidePanel(null); setSelectedSource(null); }} />
            </div>
            <div className="sm:hidden absolute bottom-0 left-0 right-0 max-h-[62vh] shadow-2xl z-[800] rounded-t-2xl overflow-hidden bg-white">
              <MobileSheetHandle onClose={() => { setSidePanel(null); setSelectedSource(null); }} />
              <div className="overflow-y-auto" style={{ maxHeight: "calc(62vh - 44px)" }}>
                <WaterQualityPanel source={selectedSource} onClose={() => { setSidePanel(null); setSelectedSource(null); }} />
              </div>
            </div>
          </>
        )}

        {sidePanel === "reports" && (
          <>
            <div className="hidden sm:block w-80 flex-shrink-0 shadow-xl z-10 border-l border-gray-200 overflow-hidden">
              <ReportsPanel reports={reports} onRefresh={fetchReports} />
            </div>
            <div className="sm:hidden absolute bottom-0 left-0 right-0 h-[62vh] shadow-2xl z-[800] rounded-t-2xl overflow-hidden bg-white">
              <MobileSheetHandle onClose={() => setSidePanel(null)} />
              <div className="overflow-y-auto h-[calc(62vh-44px)]">
                <ReportsPanel reports={reports} onRefresh={fetchReports} />
              </div>
            </div>
          </>
        )}

        {!sidePanel && !reportingMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800/80 text-white text-xs px-4 py-2 rounded-full backdrop-blur pointer-events-none z-[500] whitespace-nowrap">
            Toca un marcador para ver calidad · ⚠️ Reportar un problema
          </div>
        )}
      </div>

      {pendingReport && (
        <ReportModal
          lat={pendingReport.lat}
          lng={pendingReport.lng}
          onClose={() => setPendingReport(null)}
          onSuccess={() => {
            setPendingReport(null);
            showToast("✅ ¡Reporte enviado! Gracias por contribuir.");
            setSidePanel("reports");
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white text-sm px-5 py-3 rounded-full shadow-xl z-[3000]">
          {toast}
        </div>
      )}

      <ChatBot />
    </div>
  );
}
