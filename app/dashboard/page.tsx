"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const REPORT_COLORS: Record<string, string> = {
  sin_agua: "#ef4444", fuga: "#3b82f6", contaminacion: "#f59e0b",
  baja_presion: "#f97316", otro: "#6b7280",
};
const QUALITY_COLORS: Record<string, string> = {
  Excelente: "#22c55e", Buena: "#84cc16", Regular: "#f59e0b", Mala: "#ef4444",
};
const REPORT_LABELS: Record<string, string> = {
  sin_agua: "Sin agua", fuga: "Fuga", contaminacion: "Contaminación",
  baja_presion: "Baja presión", otro: "Otro",
};

export default function DashboardPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [calidad, setCalidad] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("reports").select("*").order("created_at", { ascending: true }),
      supabase.from("resumen_calidad_zona").select("*"),
    ]).then(([r, c]) => {
      setReports(r.data ?? []);
      setCalidad(c.data ?? []);
      setLoading(false);
    });
  }, []);

  // Reports by type
  const byType = Object.entries(
    reports.reduce((acc: Record<string, number>, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1; return acc;
    }, {})
  ).map(([type, count]) => ({ name: REPORT_LABELS[type] ?? type, count, color: REPORT_COLORS[type] }));

  // Reports by municipality
  const byMuni = Object.entries(
    reports.reduce((acc: Record<string, number>, r) => {
      acc[r.municipality] = (acc[r.municipality] || 0) + 1; return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Reports by status
  const byStatus = [
    { name: "Activos", value: reports.filter(r => r.status === "activo").length, color: "#ef4444" },
    { name: "En revisión", value: reports.filter(r => r.status === "en_revision").length, color: "#f59e0b" },
    { name: "Resueltos", value: reports.filter(r => r.status === "resuelto").length, color: "#22c55e" },
  ].filter(s => s.value > 0);

  // Quality distribution
  const qualityDist = Object.entries(
    calidad.reduce((acc: Record<string, number>, z) => {
      if (z.clasificacion) { acc[z.clasificacion] = (acc[z.clasificacion] || 0) + 1; }
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value, color: QUALITY_COLORS[name] ?? "#6b7280" }));

  // Reports over time (by day)
  const byDay = Object.entries(
    reports.reduce((acc: Record<string, number>, r) => {
      const day = r.created_at?.split("T")[0] ?? "N/D";
      acc[day] = (acc[day] || 0) + 1; return acc;
    }, {})
  ).slice(-14).map(([date, count]) => ({ date: date.slice(5), count }));

  const totalVotes = reports.reduce((s, r) => s + (r.votes || 0), 0);
  const topReport = [...reports].sort((a, b) => b.votes - a.votes)[0];

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">💧</div>
        <p className="text-gray-500">Cargando estadísticas...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💧</span>
            <div>
              <h1 className="text-xl font-bold">AcuAura — Dashboard</h1>
              <p className="text-xs text-blue-200">Estadísticas de monitoreo hídrico</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-full transition-all">← Mapa</Link>
            <Link href="/admin" className="bg-white text-blue-700 hover:bg-blue-50 text-sm font-semibold px-4 py-2 rounded-full transition-all">⚙️ Admin</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total reportes", value: reports.length, icon: "📋", color: "bg-blue-50 text-blue-700" },
            { label: "Reportes activos", value: reports.filter(r => r.status === "activo").length, icon: "🔴", color: "bg-red-50 text-red-700" },
            { label: "Resueltos", value: reports.filter(r => r.status === "resuelto").length, icon: "✅", color: "bg-green-50 text-green-700" },
            { label: "Confirmaciones", value: totalVotes, icon: "👍", color: "bg-amber-50 text-amber-700" },
          ].map((kpi) => (
            <div key={kpi.label} className={`${kpi.color} rounded-2xl p-4 shadow-sm`}>
              <div className="text-2xl mb-1">{kpi.icon}</div>
              <div className="text-3xl font-bold">{kpi.value}</div>
              <div className="text-xs font-medium opacity-80 mt-0.5">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Calidad + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-4">Calidad del agua por zona</h2>
            {qualityDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={qualityDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {qualityDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm text-center py-8">Sin datos de calidad</p>}
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-4">Estado de reportes</h2>
            {byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {byStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm text-center py-8">Sin reportes aún</p>}
          </div>
        </div>

        {/* Reports by type */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-4">Reportes por tipo</h2>
          {byType.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byType}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {byType.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-8">Sin reportes aún</p>}
        </div>

        {/* Reports over time */}
        {byDay.length > 1 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-4">Reportes en el tiempo (últimos 14 días)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Reportes" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By municipality */}
        {byMuni.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-4">Zonas con más reportes</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byMuni} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} name="Reportes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Calidad por zona table */}
        {calidad.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-4">Detalle de calidad por colonia</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Colonia", "Clasificación", "pH", "Turbidez", "Cloro", "Coliformes", "Fuente", "Última muestra"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calidad.map((z, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-800">{z.zona}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          z.clasificacion === "Excelente" ? "bg-green-100 text-green-700" :
                          z.clasificacion === "Buena" ? "bg-lime-100 text-lime-700" :
                          z.clasificacion === "Regular" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>{z.clasificacion ?? "N/D"}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-600">{z.ph ?? "—"}</td>
                      <td className="py-2 px-3 text-gray-600">{z.turbiedad_ntu ?? "—"} NTU</td>
                      <td className="py-2 px-3 text-gray-600">{z.cloro_residual_libre_mg_l ?? "—"} mg/L</td>
                      <td className="py-2 px-3 text-gray-600">{(z.coliformes_fecales_100ml ?? 0) + (z.coliformes_totales_100ml ?? 0)}</td>
                      <td className="py-2 px-3 text-gray-600 text-xs">{z.fuente ?? "—"}</td>
                      <td className="py-2 px-3 text-gray-400 text-xs">{z.ultima_fecha ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
