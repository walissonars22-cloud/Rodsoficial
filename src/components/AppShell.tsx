import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { BarChart3, Package, Receipt, PieChart, Target, FlaskConical, Menu, X, Upload, Megaphone, TrendingUp, LogOut } from "lucide-react";
import { useFinance } from "@/lib/store";
import { useAuth } from "@/lib/local-auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/importar", label: "Importar vendas", icon: Upload },
  { to: "/produtos", label: "Produtos e preços", icon: Package },
  { to: "/custos", label: "Custos fixos", icon: Receipt },
  { to: "/ads", label: "Mercado Ads", icon: Megaphone },
  { to: "/resultado", label: "Resultado do período", icon: BarChart3 },
  { to: "/evolucao", label: "Evolução financeira", icon: TrendingUp },
  { to: "/mix", label: "Margem ponderada", icon: PieChart },
  { to: "/equilibrio", label: "Ponto de equilíbrio", icon: Target },
  { to: "/simulador", label: "Simulador", icon: FlaskConical },
] as const;

export function AppShell({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { storageError } = useFinance();
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen lg:flex">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-7">
          <div className="space-y-2">
            <div className="lior-wordmark" aria-label="LIOR">LIOR</div>
            <div className="lior-tracking text-sidebar-foreground/70">Gestão de Marketplaces</div>
            <span className="lior-accent-line" />
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu"><X className="size-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to as "/"} onClick={() => setOpen(false)} activeOptions={{ exact: true }}
              className="lior-nav-link flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground border-l-[#3085ff]" }}>
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="m-3 space-y-3 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3 text-xs">
          <p className="break-all text-sidebar-foreground/80">{user?.email}</p>
          <Button type="button" variant="outline" size="sm" className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-white" onClick={logout}><LogOut className="size-3.5" /> Sair da conta</Button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}
      <main className="min-w-0 flex-1 bg-background">
        <header className="flex flex-wrap items-center gap-3 border-b bg-card px-5 py-5 lg:px-9 lg:py-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></Button>
          <div className="flex-1">
            <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.22em] text-primary">LIOR / PAINEL FINANCEIRO</div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </header>
        {storageError && <p role="alert" className="m-4 rounded-md border border-destructive p-3 text-sm text-destructive">{storageError}</p>}
        <div className="space-y-6 p-4 lg:p-9">{children}</div>
      </main>
    </div>
  );
}

export function Kpi({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: "default" | "positive" | "negative" }) {
  const color = tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-[0_3px_14px_rgba(6,22,51,0.04)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.07em] text-muted-foreground">{label}</div>
      <div className={`num mt-2 text-2xl font-bold ${color}`}>{value}</div>
      {hint && <p className="mt-1 text-xs leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Panel({ title, hint, children, className = "" }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border/80 bg-card p-6 shadow-[0_3px_14px_rgba(6,22,51,0.04)] ${className}`}>
      <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
      {hint && <p className="mb-4 text-xs text-muted-foreground">{hint}</p>}
      {!hint && <div className="mb-4" />}
      {children}
    </section>
  );
}

export function Alert({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "info" }) {
  return (
    <div className={`rounded-md border-l-4 bg-card p-3 text-sm ${tone === "warning" ? "border-warning" : "border-primary"}`}>{children}</div>
  );
}
