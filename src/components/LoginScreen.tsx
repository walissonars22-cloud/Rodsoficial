import { useState, type FormEvent } from "react";
import { useAuth, passwordValid } from "@/lib/local-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") await signup(email, password);
      else await login(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-5 rounded-xl border bg-card p-7 shadow-sm">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">RODS</p>
          <h1 className="mt-1 text-2xl font-bold">RODSOFICIAL</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sua gestão financeira de marketplaces</p>
        </div>
        <div className="flex gap-2 rounded-lg bg-muted p-1">
          <Button type="button" className="flex-1" variant={mode === "login" ? "default" : "ghost"} onClick={() => { setMode("login"); setError(""); }}>Entrar</Button>
          <Button type="button" className="flex-1" variant={mode === "signup" ? "default" : "ghost"} onClick={() => { setMode("signup"); setError(""); }}>Criar conta</Button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1 text-sm font-medium">
            <span>E-mail</span>
            <Input type="email" placeholder="seuemail@exemplo.com" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            <span>Senha</span>
            <Input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 6 : undefined} value={password} onChange={event => setPassword(event.target.value)} />
          </label>
          {mode === "signup" && <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres com pelo menos uma letra e um número. Exemplo: rods123.</p>}
          {error && <p role="alert" className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy || (mode === "signup" && !passwordValid(password))}>{busy ? "Verificando..." : mode === "signup" ? "Cadastrar e entrar" : "Entrar"}</Button>
        </form>
        <p className="rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
          Versão de testes: contas e informações ficam somente neste navegador. O acesso não é sincronizado entre dispositivos nem recomendado para dados sigilosos.
        </p>
      </div>
    </div>
  );
}
