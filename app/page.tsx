"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { WaterSource } from "@/types/water";
import { waterRoutes } from "@/data/waterSources";
import { mapPozosToSources, mapZonasToSources } from "@/lib/mappers";
import WaterQualityPanel from "@/components/WaterQualityPanel";
import StatsBar from "@/components/StatsBar";
import ReportModal from "@/components/ReportModal";
import ReportsPanel from "@/components/ReportsPanel";
import { supabase, Report } from "@/lib/supabase";
import { fetchPozos, fetchResumenCalidadZonas } from "@/lib/dbQueries";
import ChatBot from "@/components/ChatBot";
import { ZoneData } from "@/components/WaterMap";
import AuthGuard, { LogoutButton } from "@/components/AuthGuard";

const WaterMap = dynamic(() => import("@/components/WaterMap"), { ssr: false });

const ZONE_COORDS: Record<string, [number, number]> = {
  "Centro Histórico":       [20.5881, -100.3899],
  "Jurica":                 [20.7001, -100.4512],
  "San Pedro Mártir":       [20.5612, -100.3721],
  "Villa Corregidora":      [20.5214, -100.3672],
  "Lomas de Querétaro":     [20.6102, -100.4231],
  "Amazcala":               [20.7234, -100.2345],
  "Chichimequillas":        [20.6891, -100.2012],
  "Tierra Blanca":          [20.6543, -100.1987],
  "San Juan del Río Centro":[20.3889, -99.9976],
  "La Llave":               [20.4123, -99.9512],
  "El Marqués Centro":      [20.6331, -100.1853],
  "Zibatá":                 [20.6721, -100.3124],
};

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

function MapPage({ userName, userRole }: { userName: string; userRole: "admin" | "user" }) {
  const isAdmin = userRole === "admin";

  const [selectedSource, setSelectedSource] = useState<WaterSource | null>(null);
  const [filter, setFilter] = useState("all");
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [reportingMode, setReportingMode] = useState(false);
  const [pendingReport, setPendingReport] = useState<{ lat: number; lng: number } | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [waterSources, setWaterSources] = useState<WaterSource[]>([]);
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const filteredSources = useMemo(() => {
    if (filter === "all") return waterSources;
    if (["excelente", "buena", "regular", "mala"].includes(filter))
      return waterSources.filter((s) => s.qualityLevel === filter);
    if (["pozo", "presa", "manantial"].includes(filter))
      return waterSources.filter((s) => s.type === filter);
    return waterSources;
  }, [filter, waterSources]);

  useEffect(() => {
    Promise.all([fetchPozos(), fetchResumenCalidadZonas()]).then(([pozos, zonas]) => {
      setWaterSources([...mapPozosToSources(pozos), ...mapZonasToSources(zonas)]);
      setZones(
        zonas
          .filter((z) => ZONE_COORDS[z.zona])
          .map((z) => ({
            zona: z.zona,
            clasificacion: z.clasificacion,
            lat: ZONE_COORDS[z.zona]![0],
            lng: ZONE_COORDS[z.zona]![1],
          }))
      );
    });
  }, []);

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

  function toggleReportsPanel() {
    setSidePanel((v) => (v === "reports" ? null : "reports"));
    setSelectedSource(null);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const activeReports = reports.filter((r) => r.status !== "resuelto").length;
  const alertZones = zones.filter((z) => z.clasificacion === "Mala" || z.clasificacion === "Regular");

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
            {/* Admin-only nav */}
            {isAdmin && (
              <>
                <Link href="/dashboard" className="hidden sm:flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full transition-all">
                  📊 Dashboard
                </Link>
                <Link href="/admin" className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full transition-all">
                  ⚙️ <span className="hidden sm:inline">Admin</span>
                </Link>
              </>
            )}

            {/* Reports panel button */}
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

            {/* Report button — only for users */}
            {!isAdmin && (
              <button
                onClick={() => {
                  setReportingMode((v) => !v);
                  setSelectedSource(null);
                  setSidePanel(null);
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                  reportingMode ? "bg-red-500 text-white animate-pulse" : "bg-white text-blue-700 hover:bg-blue-50"
                }`}
              >
                <span>{reportingMode ? "✕" : "⚠️"}</span>
                <span>{reportingMode ? "Cancelar" : "Reportar"}</span>
              </button>
            )}

            <LogoutButton name={userName} role={userRole} />
          </div>
        </div>
      </header>

      {/* Stats & Filters */}
      <StatsBar sources={waterSources} filter={filter} onFilterChange={setFilter} />

      {/* Zone alerts banner */}
      {!alertDismissed && alertZones.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-3 flex-shrink-0">
          <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-amber-800 text-xs font-semibold">Alertas de calidad del agua</p>
            <p className="text-amber-700 text-xs mt-0.5">
              {alertZones.filter(z => z.clasificacion === "Mala").length > 0 && (
                <span className="text-red-600 font-semibold">
                  Mala: {alertZones.filter(z => z.clasificacion === "Mala").map(z => z.zona).join(", ")}.{" "}
                </span>
              )}
              {alertZones.filter(z => z.clasificacion === "Regular").length > 0 && (
                <span>Regular: {alertZones.filter(z => z.clasificacion === "Regular").map(z => z.zona).join(", ")}.</span>
              )}
            </p>
          </div>
          <button onClick={() => setAlertDismissed(true)} className="text-amber-500 hover:text-amber-700 text-sm flex-shrink-0 mt-0.5">✕</button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1">
          <WaterMap
            sources={filteredSources}
            routes={waterRoutes}
            reports={reports}
            zones={zones}
            onSelectSource={handleSelectSource}
            selectedSource={selectedSource}
            onMapClick={handleMapClick}
            reportingMode={reportingMode}
            panelOpen={sidePanel !== null}
          />
        </div>

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
            {isAdmin ? "Toca un marcador para ver calidad" : "Toca un marcador para ver calidad · ⚠️ Reportar un problema"}
          </div>
        )}
      </div>

      {!isAdmin && pendingReport && (
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

      {/* ChatBot — only for regular users */}
      {!isAdmin && <ChatBot />}
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      {(user) => <MapPage userName={user.name} userRole={user.role} />}
    </AuthGuard>
  );
}
