import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { AppShell, Alert } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance, emptyCost } from "@/lib/store";
import { fmtBRL, monthlyEquivalent, totalFixed, type FixedCost, type Frequency } from "@/lib/finance";

export const Route = createFileRoute("/custos")({
  head: () => ({
    meta: [
      { title: "Custos fixos — Gestão E-commerce" },
      { name: "description", content: "Cadastre aluguel, salários, pró-labore e demais despesas fixas mensais da operação." },
      { property: "og:title", content: "Custos fixos — Gestão E-commerce" },
      { property: "og:description", content: "Cadastre as despesas fixas mensais da operação." },
    ],
  }),
  component: Custos,
});

const CATS = ["Aluguel", "Salários e encargos", "Pró-labore", "Contabilidade", "Sistema ERP", "Internet e telefone", "Software e assinaturas", "Estrutura administrativa", "Marketing fixo", "Energia elétrica e água", "Outras despesas administrativas"];

function Custos() {
  const { costs, setCosts } = useFinance();
  const upd = (id: string, patch: Partial<FixedCost>) => setCosts((all) => all.map((c) => (c.id === id ? { ...c, ...patch, demo: false } : c)));
  return (
    <AppShell title="Custos fixos da empresa" subtitle="Despesas que existem mesmo sem nenhuma venda"
      actions={<Button size="sm" onClick={() => setCosts((a) => [...a, emptyCost()])}><Plus /> Nova despesa</Button>}>
      <div className="rounded-lg bg-primary p-6 text-primary-foreground">
        <div className="text-sm opacity-80">TOTAL DE CUSTOS FIXOS MENSAIS</div>
        <div className="num text-4xl font-bold">{fmtBRL(totalFixed(costs))}</div>
      </div>
      <Alert tone="info">Não cadastre aqui o que já está no produto (comissão, frete, embalagem, ADS por venda) — senão o custo é contado duas vezes.</Alert>
      <div className="space-y-3">
        {costs.map((c) => (
          <div key={c.id} className={`grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-12 ${c.active ? "" : "opacity-60"}`}>
            <Input className="md:col-span-3" placeholder="Nome da despesa" value={c.name} onChange={(e) => upd(c.id, { name: e.target.value })} />
            <div className="md:col-span-3">
              <Select value={c.category} onValueChange={(v) => upd(c.id, { category: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[...new Set([...CATS, c.category])].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
            </div>
            <Input className="num md:col-span-2" type="number" min={0} step="0.01" value={c.amount} onChange={(e) => upd(c.id, { amount: Math.max(0, parseFloat(e.target.value) || 0) })} />
            <div className="md:col-span-2">
              <Select value={c.frequency} onValueChange={(v) => upd(c.id, { frequency: v as Frequency })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="mensal">Mensal</SelectItem><SelectItem value="trimestral">Trimestral</SelectItem><SelectItem value="anual">Anual</SelectItem></SelectContent></Select>
            </div>
            <div className="flex items-center justify-end gap-2 md:col-span-2">
              <Switch checked={c.active} onCheckedChange={(v) => upd(c.id, { active: v })} aria-label="Ativo" />
              <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => setCosts((a) => a.filter((x) => x.id !== c.id))}><Trash2 /></Button>
            </div>
            <Input className="md:col-span-2" type="date" value={c.startDate} onChange={(e) => upd(c.id, { startDate: e.target.value })} />
            <Input className="md:col-span-2" placeholder="Categoria personalizada" value={c.category} onChange={e=>upd(c.id,{category:e.target.value})}/>
            <Input className="md:col-span-5" placeholder="Observações" value={c.notes} onChange={(e) => upd(c.id, { notes: e.target.value })} />
            <div className="num flex items-center justify-end gap-2 text-sm text-muted-foreground md:col-span-3">
              {c.demo && <Badge variant="secondary">exemplo</Badge>}≈ {fmtBRL(monthlyEquivalent(c))}/mês
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
