"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface AuthModalProps {
  onClose: () => void;
}

type Mode = "login" | "register";

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { signIn, signUp } = useAuth();

  function reset() {
    setError("");
    setSuccess("");
    setNombre("");
    setApellidos("");
    setEmail("");
    setPassword("");
  }

  function switchMode(m: Mode) {
    reset();
    setMode(m);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "login") {
        await signIn(email, password);
        onClose();
      } else {
        if (!nombre.trim() || !apellidos.trim()) {
          setError("Nombre y apellidos son requeridos.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres.");
          setLoading(false);
          return;
        }
        const result = await signUp(email, password, nombre.trim(), apellidos.trim());
        if (result === "logged_in") { onClose(); return; }
        setSuccess("¡Cuenta creada! Revisa tu correo para confirmar tu cuenta.");
      }
    } catch (err: any) {
      const msg = err?.message || "Error inesperado.";
      if (msg.includes("Invalid login credentials")) setError("Correo o contraseña incorrectos.");
      else if (msg.includes("already registered")) setError("Este correo ya está registrado.");
      else if (msg.includes("Email not confirmed")) setError("Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.");
      else setError(msg);
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-cyan-500 px-6 py-5 text-center relative">
          <button onClick={onClose} className="absolute right-4 top-4 text-white/70 hover:text-white text-xl">✕</button>
          <div className="text-4xl mb-1">💧</div>
          <h2 className="text-white font-bold text-lg">AcuAura</h2>
          <p className="text-blue-100 text-xs">Monitoreo Hídrico Comunitario</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => switchMode("login")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === "login" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"}`}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => switchMode("register")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${mode === "register" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"}`}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Register-only fields */}
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Juan"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Apellidos *</label>
                <input
                  type="text"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="García López"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Correo electrónico *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@ejemplo.com"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Contraseña *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Mínimo 6 caracteres" : "••••••••"}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {!success ? (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {loading ? "Cargando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
            </button>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-5xl">📧</div>
              <div>
                <p className="font-bold text-gray-800 text-base">¡Revisa tu correo!</p>
                <p className="text-sm text-gray-500 mt-1">
                  Enviamos un enlace de confirmación a
                </p>
                <p className="text-sm font-semibold text-blue-600 mt-0.5">{email}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Confirma tu cuenta y luego inicia sesión aquí.
                </p>
              </div>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm hover:opacity-90"
              >
                Ya confirmé — Iniciar sesión
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
