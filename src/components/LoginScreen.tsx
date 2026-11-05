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
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="order-2 flex items-center justify-center px-5 py-12 lg:order-1 lg:px-14">
      <div className="w-full max-w-md space-y-7 rounded-2xl border border-border bg-card p-7 shadow-[0_18px_50px_rgba(6,22,51,0.07)] sm:p-9">
        <div className="space-y-2">
          <p className="lior-tracking text-primary">Acesso à plataforma</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{mode === "signup" ? "Crie sua conta." : "Bem-vindo de volta."}</h1>
          <p className="text-sm text-muted-foreground">Gestão estratégica, clareza nos números e crescimento real.</p>
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
    <div className="lior-hero order-1 flex min-h-[280px] flex-col items-center justify-center gap-5 px-8 py-12 text-center lg:order-2 lg:min-h-screen">
      <div className="lior-wordmark lior-wordmark--large">LIOR</div>
      <span className="lior-accent-line" />
      <div className="max-w-md space-y-2">
        <p className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">Gestão estratégica.<br/><span className="text-[#67a9ff]">Crescimento real.</span><br/>Performance que se sustenta.</p>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Clareza que gera crescimento</p>
      </div>
    </div>
    </div>
  );
}
