export type Role = "admin" | "user";

export interface AuthUser {
  username: string;
  name: string;
  role: Role;
}

const USERS: Array<AuthUser & { password: string }> = [
  { username: "admin",   password: "acuaura2024", role: "admin", name: "Administrador" },
  { username: "edgar",   password: "edgar123",    role: "user",  name: "Edgar" },
  { username: "usuario", password: "agua123",     role: "user",  name: "Usuario Demo" },
];

const STORAGE_KEY = "acuaura_session";

export function login(username: string, password: string): AuthUser | null {
  const match = USERS.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  if (!match) return null;
  const { password: _pw, ...user } = match;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
  return user;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}
