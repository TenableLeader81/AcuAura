"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const user = login(username.trim(), password);
    setLoading(false);

    if (!user) {
      setError("Usuario o contraseña incorrectos");
      return;
    }

    // Redirect based on role
    router.replace(user.role === "admin" ? "/admin" : "/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 via-cyan-600 to-blue-500 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">💧</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">AcuAura</h1>
          <p className="text-blue-200 text-sm mt-1">Monitoreo Hídrico Comunitario — Querétaro</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6 text-center">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu nombre de usuario"
                autoFocus
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center font-medium mb-2">Cuentas de prueba</p>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                <span className="font-medium">admin</span>
                <span>acuaura2024</span>
                <span className="text-blue-600 font-semibold">Admin</span>
              </div>
              <div className="flex justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                <span className="font-medium">usuario</span>
                <span>agua123</span>
                <span className="text-green-600 font-semibold">Usuario</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
