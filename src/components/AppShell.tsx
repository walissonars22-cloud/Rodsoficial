import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { BarChart3, Package, Receipt, PieChart, Target, FlaskConical, Menu, X, Upload, Megaphone, TrendingUp } from "lucide-react";
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
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/60">RODS</div>
            <div className="text-lg font-bold text-sidebar-primary">Financeiro</div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu"><X className="size-5" /></button>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to as "/"} onClick={() => setOpen(false)} activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="m-3 space-y-2 rounded-lg border border-sidebar-border p-3 text-xs">
          <p className="break-all text-sidebar-foreground/80">{user?.email}</p>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={logout}>Sair da conta</Button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}
      <main className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-4 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu /></Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </header>
        {storageError && <p role="alert" className="m-4 rounded-md border border-destructive p-3 text-sm text-destructive">{storageError}</p>}
        <div className="space-y-6 p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

export function Kpi({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: "default" | "positive" | "negative" }) {
  const color = tone === "positive" ? "text-success" : tone === "negative" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`num mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      {hint && <p className="mt-1 text-xs leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Panel({ title, hint, children, className = "" }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border bg-card p-5 ${className}`}>
      <h2 className="font-semibold">{title}</h2>
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
