"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, logout, AuthUser, Role } from "@/lib/auth";

interface AuthGuardProps {
  children: (user: AuthUser) => React.ReactNode;
  /** If provided, only users with this role can access the page */
  role?: Role;
}

export default function AuthGuard({ children, role }: AuthGuardProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null | "loading">("loading");

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    if (role && u.role !== role) {
      // Wrong role — redirect to their home
      router.replace(u.role === "admin" ? "/admin" : "/");
      return;
    }
    setUser(u);
  }, [router, role]);

  if (user === "loading" || user === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">💧</div>
          <p className="text-gray-400 text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return <>{children(user)}</>;
}

/** Header logout button — reusable across pages */
export function LogoutButton({ name, role }: { name: string; role: Role }) {
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/80 bg-white/20 px-3 py-1.5 rounded-full">
        <span>{role === "admin" ? "⚙️" : "👤"}</span>
        <span className="font-medium">{name}</span>
        <span className="opacity-60 capitalize">({role})</span>
      </span>
      <button
        onClick={handleLogout}
        className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
      >
        Salir
      </button>
    </div>
  );
}
