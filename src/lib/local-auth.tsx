import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Acesso LOCAL para protótipo. Não é autenticação segura para dados sensíveis.
 * Contas e informações ficam exclusivamente neste navegador.
 */
const ACCOUNTS_KEY = "rods-local-accounts-v1";
const SESSION_KEY = "rods-local-session-v1";
export const financeKeyForAccount = (id: string) => "rods-finance-account-v1:" + id;

export interface LocalUser { id: string; email: string; }
interface Account extends LocalUser { salt: string; passwordHash: string; }
interface AuthContextValue {
  user: LocalUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const passwordValid = (password: string) =>
  password.length >= 6 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);

function loadAccounts(): Account[] {
  try {
    const value = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function bytesToHex(input: Uint8Array): string {
  return Array.from(input, byte => byte.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) throw new Error("Cadastro local inválido.");
  return new Uint8Array(hex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
}
async function hashPassword(password: string, saltHex: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Este navegador não permite cadastro seguro de senha nesta página. Use HTTPS.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: Uint8Array.from(hexToBytes(saltHex)), iterations: 150000, hash: "SHA-256" },
    key, 256,
  );
  return bytesToHex(new Uint8Array(derived));
}
function getSession(): LocalUser | null {
  try {
    const id = sessionStorage.getItem(SESSION_KEY);
    if (!id) return null;
    const account = loadAccounts().find(a => a.id === id);
    return account ? { id: account.id, email: account.email } : null;
  } catch { return null; }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  useEffect(() => { setUser(getSession()); }, []);

  const login = async (emailInput: string, password: string) => {
    const email = emailInput.trim().toLowerCase();
    const account = loadAccounts().find(a => a.email === email);
    // Mensagem genérica para usuário ou senha incorretos.
    if (!account || await hashPassword(password, account.salt) !== account.passwordHash) {
      throw new Error("E-mail ou senha incorretos.");
    }
    try { sessionStorage.setItem(SESSION_KEY, account.id); }
    catch { throw new Error("Seu navegador bloqueou o armazenamento da sessão."); }
    setUser({ id: account.id, email: account.email });
  };

  const signup = async (emailInput: string, password: string) => {
    const email = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
    if (!passwordValid(password)) throw new Error("Use pelo menos 6 caracteres, com letras e números.");
    const accounts = loadAccounts();
    if (accounts.some(a => a.email === email)) throw new Error("Este e-mail já foi cadastrado neste navegador.");
    const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const account: Account = {
      id: crypto.randomUUID(), email, salt, passwordHash: await hashPassword(password, salt),
    };
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
      sessionStorage.setItem(SESSION_KEY, account.id);
    } catch { throw new Error("Armazenamento indisponível. Verifique as configurações do navegador."); }
    setUser({ id: account.id, email: account.email });
  };

  const logout = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignora bloqueio de storage */ }
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth deve ser utilizado dentro de AuthProvider.");
  return value;
}
