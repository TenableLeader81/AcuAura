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
import { useAuth } from "@/hooks/useAuth";
import AuthModal from "@/components/AuthModal";

const WaterMap = dynamic(() => import("@/components/WaterMap"), { ssr: false });

type SidePanel = "quality" | "reports" | null;

export default function Home() {
  const [selectedSource, setSelectedSource] = useState<WaterSource | null>(null);
  const [filter, setFilter] = useState("all");
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [reportingMode, setReportingMode] = useState(false);
  const [pendingReport, setPendingReport] = useState<{ lat: number; lng: number } | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const { user, profile, signOut } = useAuth();

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

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("reports-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, fetchReports)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchReports]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleSelectSource(source: WaterSource | null) {
    if (reportingMode) return;
    setSelectedSource(source);
    setSidePanel(source ? "quality" : null);
  }

  function handleMapClick(lat: number, lng: number) {
    if (!reportingMode) return;
    setPendingReport({ lat, lng });
    setReportingMode(false);
  }

  function toggleReportingMode() {
    setReportingMode((v) => !v);
    setSelectedSource(null);
    setSidePanel(null);
  }

  function toggleReportsPanel() {
    setSidePanel((v) => (v === "reports" ? null : "reports"));
    setSelectedSource(null);
  }

  const activeReports = reports.filter((r) => r.status !== "resuelto").length;

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white px-4 py-3 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💧</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AcuAura</h1>
              <p className="text-xs text-blue-200">Monitoreo Hídrico Comunitario — Querétaro</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Reports toggle */}
            <button
              onClick={toggleReportsPanel}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                sidePanel === "reports"
                  ? "bg-white text-blue-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <span>📋</span>
              <span className="hidden sm:inline">Reportes</span>
              {activeReports > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {activeReports}
                </span>
              )}
            </button>

            {/* Report button */}
            <button
              onClick={toggleReportingMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                reportingMode
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-white text-blue-700 hover:bg-blue-50"
              }`}
            >
              <span>{reportingMode ? "✕" : "⚠️"}</span>
              <span>{reportingMode ? "Cancelar" : "Reportar"}</span>
            </button>

            {/* Auth */}
            {user && profile ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                  <span className="text-sm">👤</span>
                  <span className="text-white text-xs font-medium">{profile.nombre}</span>
                </div>
                <button
                  onClick={signOut}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full transition-all"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="bg-white text-blue-700 hover:bg-blue-50 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              >
                Iniciar sesión
              </button>
            )}
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
            reports={reports}
            onSelectSource={handleSelectSource}
            selectedSource={selectedSource}
            onMapClick={handleMapClick}
            reportingMode={reportingMode}
          />
        </div>

        {/* Side panel */}
        {sidePanel === "quality" && selectedSource && (
          <div className="w-80 flex-shrink-0 shadow-xl z-10 border-l border-gray-200 overflow-hidden">
            <WaterQualityPanel source={selectedSource} onClose={() => { setSidePanel(null); setSelectedSource(null); }} />
          </div>
        )}

        {sidePanel === "reports" && (
          <div className="w-80 flex-shrink-0 shadow-xl z-10 border-l border-gray-200 overflow-hidden">
            <ReportsPanel reports={reports} onRefresh={fetchReports} />
          </div>
        )}

        {/* Hint */}
        {!sidePanel && !reportingMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-800/80 text-white text-xs px-4 py-2 rounded-full backdrop-blur pointer-events-none z-[500]">
            Haz clic en un marcador para ver la calidad · ⚠️ Reportar para agregar un problema
          </div>
        )}
      </div>

      {/* Auth modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Report modal */}
      {pendingReport && (
        <ReportModal
          lat={pendingReport.lat}
          lng={pendingReport.lng}
          profile={profile}
          onClose={() => setPendingReport(null)}
          onNeedAuth={() => { setPendingReport(null); setShowAuth(true); }}
          onSuccess={() => {
            setPendingReport(null);
            fetchReports();
            showToast("✅ ¡Reporte enviado! Gracias por contribuir.");
            setSidePanel("reports");
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white text-sm px-5 py-3 rounded-full shadow-xl z-[3000] transition-all">
          {toast}
        </div>
      )}
    </div>
  );
}
