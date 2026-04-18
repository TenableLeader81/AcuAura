export type Role = "admin" | "user";

export interface AuthUser {
  username: string;
  name: string;
  role: Role;
}

// Built-in accounts (cannot be overwritten by registration)
const BUILTIN_USERS: Array<AuthUser & { password: string }> = [
  { username: "admin",   password: "acuaura2024", role: "admin", name: "Administrador" },
  { username: "edgar",   password: "edgar123",    role: "user",  name: "Edgar" },
  { username: "usuario", password: "agua123",     role: "user",  name: "Usuario Demo" },
];

const SESSION_KEY  = "acuaura_session";
const REGISTRY_KEY = "acuaura_users";

function getRegistered(): Array<AuthUser & { password: string }> {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? "[]");
  } catch { return []; }
}

function allUsers() {
  return [...BUILTIN_USERS, ...getRegistered()];
}

export function login(username: string, password: string): AuthUser | null {
  const match = allUsers().find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  if (!match) return null;
  const { password: _pw, ...user } = match;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export type RegisterError = "username_taken" | "invalid";

export function register(
  username: string,
  name: string,
  password: string
): AuthUser | RegisterError {
  if (!username.trim() || !name.trim() || password.length < 6) return "invalid";
  const exists = allUsers().some(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );
  if (exists) return "username_taken";

  const newUser: AuthUser & { password: string } = {
    username: username.trim().toLowerCase(),
    name: name.trim(),
    password,
    role: "user",
  };
  const registered = getRegistered();
  registered.push(newUser);
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registered));

  const { password: _pw, ...user } = newUser;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}
