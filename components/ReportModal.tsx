"use client";

import { useState } from "react";
import { supabase, ReportType } from "@/lib/supabase";
import { Profile } from "@/hooks/useAuth";

interface ReportModalProps {
  lat: number;
  lng: number;
  profile: Profile | null;
  onClose: () => void;
  onSuccess: () => void;
  onNeedAuth: () => void;
}

const reportTypes: { value: ReportType; label: string; icon: string; color: string }[] = [
  { value: "sin_agua", label: "Sin agua", icon: "🚱", color: "bg-red-100 border-red-400 text-red-700" },
  { value: "fuga", label: "Fuga de agua", icon: "💦", color: "bg-blue-100 border-blue-400 text-blue-700" },
  { value: "contaminacion", label: "Contaminación", icon: "⚠️", color: "bg-yellow-100 border-yellow-400 text-yellow-700" },
  { value: "baja_presion", label: "Baja presión", icon: "📉", color: "bg-orange-100 border-orange-400 text-orange-700" },
  { value: "otro", label: "Otro", icon: "📝", color: "bg-gray-100 border-gray-400 text-gray-700" },
];

function getMunicipality(lat: number, lng: number): string {
  if (lat > 21.0) return "Jalpan de Serra";
  if (lng < -100.5) return "Amealco";
  if (lat > 20.75) return "San Juan del Río";
  if (lng > -100.1) return "Tequisquiapan";
  if (lat > 20.68) return "El Marqués";
  if (lat > 20.62 && lng < -100.35) return "Querétaro";
  if (lat < 20.55) return "Corregidora";
  return "Querétaro";
}

export default function ReportModal({ lat, lng, profile, onClose, onSuccess, onNeedAuth }: ReportModalProps) {
  const [type, setType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) { setError("Selecciona el tipo de reporte."); return; }
    setLoading(true);
    setError("");

    const { error: dbError } = await supabase.from("reports").insert({
      type,
      description,
      lat,
      lng,
      municipality: getMunicipality(lat, lng),
      address,
      user_id: profile?.id ?? null,
      user_name: profile ? `${profile.nombre} ${profile.apellidos}` : "Anónimo",
    });

    setLoading(false);
    if (dbError) { setError("Error al enviar el reporte. Intenta de nuevo."); return; }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">Nuevo Reporte</h2>
            <p className="text-blue-100 text-xs">
              📍 {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl font-light">✕</button>
        </div>

        {/* Auth notice */}
        {!profile && (
          <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-blue-700">Reportando como <b>Anónimo</b></p>
            <button type="button" onClick={onNeedAuth} className="text-xs text-blue-600 font-semibold underline whitespace-nowrap">
              Iniciar sesión
            </button>
          </div>
        )}
        {profile && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-green-600 text-lg">👤</span>
            <p className="text-xs text-green-700">Reportando como <b>{profile.nombre} {profile.apellidos}</b></p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type selector */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">¿Qué problema encontraste?</label>
            <div className="grid grid-cols-2 gap-2">
              {reportTypes.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setType(rt.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    type === rt.value
                      ? rt.color + " border-current scale-105 shadow-sm"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-lg">{rt.icon}</span>
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Calle o referencia (opcional)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: Av. Constituyentes #123"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cuéntanos más sobre el problema..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
            />
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {loading ? "Enviando..." : "Enviar reporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
