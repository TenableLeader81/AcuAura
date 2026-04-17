"use client";

import { Report, supabase } from "@/lib/supabase";
import { useState } from "react";

interface ReportsPanelProps {
  reports: Report[];
  onRefresh: () => void;
}

const typeConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  sin_agua:     { label: "Sin agua",      icon: "🚱", color: "text-red-600",    bg: "bg-red-50" },
  fuga:         { label: "Fuga",          icon: "💦", color: "text-blue-600",   bg: "bg-blue-50" },
  contaminacion:{ label: "Contaminación", icon: "⚠️", color: "text-yellow-600", bg: "bg-yellow-50" },
  baja_presion: { label: "Baja presión",  icon: "📉", color: "text-orange-600", bg: "bg-orange-50" },
  otro:         { label: "Otro",          icon: "📝", color: "text-gray-600",   bg: "bg-gray-50" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  activo:      { label: "Activo",      color: "bg-red-100 text-red-700" },
  en_revision: { label: "En revisión", color: "bg-yellow-100 text-yellow-700" },
  resuelto:    { label: "Resuelto",    color: "bg-green-100 text-green-700" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function ReportsPanel({ reports, onRefresh }: ReportsPanelProps) {
  const [filter, setFilter] = useState("all");
  const [voting, setVoting] = useState<string | null>(null);

  const typeCounts = reports.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = filter === "all" ? reports : reports.filter((r) => r.type === filter);

  async function handleVote(report: Report) {
    if (voting) return;
    setVoting(report.id);
    await supabase.from("reports").update({ votes: report.votes + 1 }).eq("id", report.id);
    onRefresh();
    setVoting(null);
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">Reportes comunitarios</h2>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{reports.length} total</span>
        </div>

        {/* Summary chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${filter === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Todos
          </button>
          {Object.entries(typeConfig).map(([key, cfg]) => (
            typeCounts[key] ? (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${filter === key ? cfg.bg + " " + cfg.color + " ring-1 ring-current" : "bg-gray-100 text-gray-600"}`}
              >
                {cfg.icon} {typeCounts[key]}
              </button>
            ) : null
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
            <span className="text-3xl mb-2">📭</span>
            No hay reportes todavía.<br />¡Sé el primero en reportar!
          </div>
        )}
        {filtered.map((report) => {
          const cfg = typeConfig[report.type] || typeConfig.otro;
          const st = statusConfig[report.status] || statusConfig.activo;
          return (
            <div key={report.id} className={`p-3 hover:bg-gray-50 transition-colors`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${cfg.bg}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    📍 {report.municipality}
                    {report.address && ` · ${report.address}`}
                  </p>
                  {report.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-1">{report.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs text-gray-400">👤</span>
                    <span className="text-xs text-gray-500 font-medium">{(report as any).user_name || "Anónimo"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{timeAgo(report.created_at)}</span>
                    <button
                      onClick={() => handleVote(report)}
                      disabled={voting === report.id}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50"
                    >
                      <span>👍</span>
                      <span>{report.votes}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
