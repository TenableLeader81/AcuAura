"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_PASSWORD = "acuaura2024";

const STATUS_LABELS: Record<string, string> = {
  activo: "Activo", en_revision: "En revisión", resuelto: "Resuelto",
};
const STATUS_COLORS: Record<string, string> = {
  activo: "bg-red-100 text-red-700",
  en_revision: "bg-amber-100 text-amber-700",
  resuelto: "bg-green-100 text-green-700",
};
const TYPE_LABELS: Record<string, string> = {
  sin_agua: "Sin agua", fuga: "Fuga", contaminacion: "Contaminación",
  baja_presion: "Baja presión", otro: "Otro",
};

interface Report {
  id: string; type: string; description: string;
  lat: number; lng: number; municipality: string;
  address?: string; status: string; votes: number;
  user_name: string; created_at: string;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [notifMsg, setNotifMsg] = useState<Record<string, string>>({});

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    setReports((data as Report[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) fetchReports();
  }, [authed, fetchReports]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError("");
    } else {
      setPwError("Contraseña incorrecta");
    }
  }

  async function deleteReport(id: string) {
    if (!confirm("¿Eliminar este reporte permanentemente?")) return;
    setDeleting(id);
    const { error } = await supabase.from("reports").delete().eq("id", id);
    setDeleting(null);
    if (error) { showToast("Error al eliminar reporte", false); return; }
    setReports((prev) => prev.filter((r) => r.id !== id));
    showToast("Reporte eliminado");
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) { showToast("Error al actualizar estado", false); return; }
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    if (status === "resuelto") {
      showToast("✅ Reporte marcado como resuelto");
    } else {
      showToast(`Estado actualizado: ${STATUS_LABELS[status]}`);
    }
  }

  async function sendNotification(id: string) {
    const msg = notifMsg[id]?.trim();
    if (!msg) { showToast("Escribe un mensaje de notificación", false); return; }
    const { error } = await supabase.from("reports").update({
      status: "resuelto",
      description: reports.find(r => r.id === id)?.description + `\n\n[Admin: ${msg}]`,
    }).eq("id", id);
    if (error) { showToast("Error al enviar notificación", false); return; }
    setReports((prev) => prev.map((r) =>
      r.id === id ? { ...r, status: "resuelto", description: r.description + `\n\n[Admin: ${msg}]` } : r
    ));
    setNotifMsg((prev) => { const n = { ...prev }; delete n[id]; return n; });
    showToast("✅ Notificación enviada y reporte resuelto");
  }

  const filtered = reports.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.municipality?.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.user_name?.toLowerCase().includes(q);
    }
    return true;
  });

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-700 to-cyan-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-xl font-bold text-gray-800">Panel Administrador</h1>
            <p className="text-sm text-gray-500 mt-1">AcuAura — Acceso restringido</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="••••••••"
                autoFocus
              />
              {pwError && <p className="text-red-500 text-xs mt-1">{pwError}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-cyan-600 text-white px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            <div>
              <h1 className="text-xl font-bold">AcuAura — Admin</h1>
              <p className="text-xs text-blue-200">Panel de administración de reportes</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-full transition-all">📊 Dashboard</Link>
            <Link href="/" className="bg-white text-blue-700 hover:bg-blue-50 text-sm font-semibold px-4 py-2 rounded-full transition-all">← Mapa</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: reports.length, color: "text-blue-700 bg-blue-50" },
            { label: "Activos", value: reports.filter(r => r.status === "activo").length, color: "text-red-700 bg-red-50" },
            { label: "En revisión", value: reports.filter(r => r.status === "en_revision").length, color: "text-amber-700 bg-amber-50" },
            { label: "Resueltos", value: reports.filter(r => r.status === "resuelto").length, color: "text-green-700 bg-green-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-xl p-3 shadow-sm`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs font-medium opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Buscar por zona, tipo, usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="flex gap-2 flex-wrap">
            {["all", "activo", "en_revision", "resuelto"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === s ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s === "all" ? "Todos" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <button
            onClick={fetchReports}
            className="bg-white border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition-all"
          >
            🔄 Actualizar
          </button>
        </div>

        {/* Reports list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Cargando reportes...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No hay reportes con este filtro.</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                      <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                        {TYPE_LABELS[r.type] ?? r.type}
                      </span>
                      <span className="text-xs text-gray-400">👍 {r.votes}</span>
                      <span className="text-xs text-gray-400 ml-auto">{r.created_at?.split("T")[0]}</span>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm">{r.municipality}{r.address ? ` — ${r.address}` : ""}</p>
                    {r.description && (
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">{r.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Por: {r.user_name || "Anónimo"} · {r.lat.toFixed(4)}, {r.lng.toFixed(4)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 sm:min-w-[200px]">
                    {/* Status selector */}
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="activo">Activo</option>
                      <option value="en_revision">En revisión</option>
                      <option value="resuelto">Resuelto</option>
                    </select>

                    {/* Notification */}
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Mensaje al usuario..."
                        value={notifMsg[r.id] ?? ""}
                        onChange={(e) => setNotifMsg((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                      />
                      <button
                        onClick={() => sendNotification(r.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        title="Resolver y notificar"
                      >
                        ✓
                      </button>
                    </div>

                    <button
                      onClick={() => deleteReport(r.id)}
                      disabled={deleting === r.id}
                      className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deleting === r.id ? "Eliminando..." : "🗑 Eliminar"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-sm px-5 py-3 rounded-full shadow-xl z-[3000] transition-all ${
          toast.ok ? "bg-green-600" : "bg-red-500"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
