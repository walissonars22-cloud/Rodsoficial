import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const baseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
const SESSION_KEY = "rods-auth-session-v1";
export const authConfigured = Boolean(baseUrl && anonKey && /^https:\/\//i.test(baseUrl));
export const passwordValid = (password: string) =>
  password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password);

interface User { id: string; email?: string; }
interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  user?: User;
}
interface AuthState {
  loading: boolean;
  user: User | null;
  accessToken: string | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<"logged_in" | "confirmation_required">;
  logout: () => Promise<void>;
}
const Context = createContext<AuthState | null>(null);

function message(json: Record<string, unknown>, status: number) {
  const raw = String(json.msg ?? json.error_description ?? json.message ?? json.error ?? "");
  if (status === 429) return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (/invalid login credentials/i.test(raw)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(raw)) return "Confirme seu e-mail antes de entrar.";
  if (/user already registered/i.test(raw)) return "Este e-mail já possui cadastro.";
  return raw || "Não foi possível concluir a solicitação.";
}
async function request(path: string, options: RequestInit = {}, token?: string) {
  if (!authConfigured) throw new Error("A autenticação ainda não foi configurada.");
  const response = await fetch(baseUrl + "/auth/v1" + path, {
    ...options,
    headers: { apikey: anonKey, "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...options.headers },
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(message(body, response.status));
  return body;
}
const readSession = (): AuthTokens | null => {
  try {
    const json = localStorage.getItem(SESSION_KEY);
    return json ? JSON.parse(json) as AuthTokens : null;
  } catch { return null; }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthTokens | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assign = (next: AuthTokens | null) => {
    setSession(next);
    try {
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* navegador pode bloquear armazenamento */ }
  };

  useEffect(() => {
    let active = true;
    async function restore() {
      if (!authConfigured) { setLoading(false); return; }
      const saved = readSession();
      if (!saved?.refresh_token) { setLoading(false); return; }
      try {
        const fresh = await request("/token?grant_type=refresh_token", {
          method: "POST", body: JSON.stringify({ refresh_token: saved.refresh_token }),
        }) as unknown as AuthTokens;
        const user = await request("/user", {}, fresh.access_token) as unknown as User;
        if (active) assign({ ...fresh, user, expires_at: Date.now() + fresh.expires_in * 1000 });
      } catch {
        if (active) assign(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    void restore();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session?.refresh_token) return;
    let alive = true;
    const refresh = async () => {
      if (!alive) return;
      const saved = readSession();
      if (!saved?.refresh_token || !saved.user) return;
      if ((saved.expires_at ?? 0) - Date.now() > 3 * 60 * 1000) return;
      try {
        const fresh = await request("/token?grant_type=refresh_token", {
          method: "POST", body: JSON.stringify({ refresh_token: saved.refresh_token }),
        }) as unknown as AuthTokens;
        if (alive) assign({ ...fresh, user: saved.user, expires_at: Date.now() + fresh.expires_in * 1000 });
      } catch {
        if (alive) { assign(null); setError("Sua sessão expirou. Entre novamente."); }
      }
    };
    const interval = window.setInterval(() => void refresh(), 60000);
    return () => { alive = false; window.clearInterval(interval); };
  }, [session?.user?.id]);

  const login = async (email: string, password: string) => {
    setError(null);
    const result = await request("/token?grant_type=password", {
      method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    }) as unknown as AuthTokens;
    const user = await request("/user", {}, result.access_token) as unknown as User;
    assign({ ...result, user, expires_at: Date.now() + result.expires_in * 1000 });
  };
  const signup = async (email: string, password: string): Promise<"logged_in" | "confirmation_required"> => {
    if (!passwordValid(password)) throw new Error("A senha deve ter pelo menos 6 caracteres, incluindo letras e números.");
    setError(null);
    const result = await request("/signup", {
      method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    if (result.access_token && result.refresh_token) {
      const auth = result as unknown as AuthTokens;
      const user = await request("/user", {}, auth.access_token) as unknown as User;
      assign({ ...auth, user, expires_at: Date.now() + auth.expires_in * 1000 });
      return "logged_in";
    }
    return "confirmation_required";
  };
  const logout = async () => {
    const token = session?.access_token;
    // Revogar a sessão do provedor quando possível; limpar sempre o estado local.
    try { if (token) await request("/logout", { method: "POST" }, token); }
    finally { assign(null); }
  };
  return <Context.Provider value={{
    loading, user: session?.user ?? null, accessToken: session?.access_token ?? null,
    error, login, signup, logout,
  }}>{children}</Context.Provider>;
}
export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error("AuthProvider obrigatório.");
  return auth;
}
export function databaseConfig() {
  if (!authConfigured) throw new Error("Banco de dados não configurado.");
  return { baseUrl, anonKey };
}