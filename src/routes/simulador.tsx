import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { AppShell, Kpi, Panel, Alert } from "@/components/AppShell";
import { NumField } from "@/components/NumField";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinance } from "@/lib/store";
import { fmtBRL, fmtNum, fmtPct, summary, totalFixed, unitMargin, type Product } from "@/lib/finance";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de cenários e lucro — Gestão E-commerce" },
      { name: "description", content: "Simule preços, custos e volumes e descubra quanto vender para atingir sua meta de lucro." },
      { property: "og:title", content: "Simulador de cenários e lucro — Gestão E-commerce" },
      { property: "og:description", content: "Simule preços, custos e volumes e a meta de lucro." },
    ],
  }),
  component: Simulador,
});

const SCEN = [
  { k: "Conservador", qty: 0.8, price: 0.97 },
  { k: "Realista", qty: 1, price: 1 },
  { k: "Otimista", qty: 1.2, price: 1.03 },
];

function Simulador() {
  const { products, costs, profitGoal, setProfitGoal, setProducts } = useFinance();
  const [sim, setSim] = useState<Product[]>(products);
  const [fixed, setFixed] = useState(totalFixed(costs));
  const [goal, setGoal] = useState(profitGoal);
  useEffect(() => { setSim(products); setFixed(totalFixed(costs)); setGoal(profitGoal); }, [products, costs, profitGoal]);

  const set = (id: string, patch: Partial<Product>) => setSim((a) => a.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const cur = summary(products, costs, profitGoal);
  const s = summary(sim, costs, goal, fixed);
  const dirty = JSON.stringify(sim) !== JSON.stringify(products) || goal !== profitGoal;

  const scenarios = [
    ...SCEN.map((c) => ({ k: c.k, r: summary(sim.map((p) => ({ ...p, monthlyQty: Math.round(p.monthlyQty * c.qty), salePrice: p.salePrice * c.price })), costs, goal, fixed) })),
    { k: "Personalizado", r: s },
  ];

  return (
    <AppShell title="Simulador de cenários e lucro" subtitle="Resultados simulados — nada muda no cadastro até você salvar"
      actions={<div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => { setSim(products); setFixed(totalFixed(costs)); setGoal(profitGoal); }}><RotateCcw /> Descartar</Button>
        <Button size="sm" disabled={!dirty} onClick={() => { setProducts(() => sim); setProfitGoal(goal); }}><Save /> Salvar no cadastro</Button>
      </div>}>
      {fixed !== totalFixed(costs) && <Alert tone="info">Custos fixos simulados ({fmtBRL(fixed)}) não são salvos — altere-os na aba Custos fixos.</Alert>}
      <div className="grid gap-4 md:grid-cols-3">
        <NumField label="Meta de lucro mensal" suffix="R$" value={goal} onChange={setGoal} />
        <NumField label="Custos fixos mensais (simulação)" suffix="R$" value={fixed} onChange={setFixed} />
      </div>
      <div className="rounded-lg bg-primary p-6 text-primary-foreground">
        <div className="text-sm opacity-80">Para lucrar {fmtBRL(goal)} por mês você precisa faturar</div>
        <div className="num text-4xl font-bold">{s.goal.feasible ? fmtBRL(s.goal.revenue) : "—"}</div>
        <div className="mt-1 text-sm opacity-90">≈ {fmtNum(s.goal.units)} unidades: {s.goal.perProduct.map((x) => `${fmtNum(x.qty)} ${x.product.name}`).join(" · ")}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Lucro operacional simulado" value={fmtBRL(s.operating)} tone={s.operating >= 0 ? "positive" : "negative"} hint={`Atual: ${fmtBRL(cur.operating)}`} />
        <Kpi label="Margem operacional" value={fmtPct(s.operatingMarginPct)} hint={`Atual: ${fmtPct(cur.operatingMarginPct)}`} />
        <Kpi label="MC ponderada" value={fmtPct(s.mix.weightedPct * 100)} hint={`Atual: ${fmtPct(cur.mix.weightedPct * 100)}`} />
        <Kpi label="Equilíbrio" value={fmtBRL(s.breakeven.revenue)} hint={`Atual: ${fmtBRL(cur.breakeven.revenue)}`} />
      </div>

      <Panel title="Ajuste por produto">
        <div className="space-y-3">
          {sim.filter((p) => p.active).map((p) => {
            const m = unitMargin(p);
            return (
              <div key={p.id} className="grid items-end gap-2 rounded-md border p-3 sm:grid-cols-4 lg:grid-cols-8">
                <div className="sm:col-span-4 lg:col-span-2"><div className="font-medium">{p.name}</div>
                  <div className={`num text-xs ${m.mc < 0 ? "text-destructive" : "text-muted-foreground"}`}>MC {fmtBRL(m.mc)} ({fmtPct(m.mcPct)}) · total {fmtBRL(m.mc * p.monthlyQty)}</div></div>
                <NumField label="Preço venda" value={p.salePrice} onChange={(v) => set(p.id, { salePrice: v })} />
                <NumField label="Preço compra" value={p.purchasePrice} onChange={(v) => set(p.id, { purchasePrice: v })} />
                <NumField label="Comissão %" value={p.commissionPct} onChange={(v) => set(p.id, { commissionPct: v })} />
                <NumField label="Imposto %" value={p.taxPct} onChange={(v) => set(p.id, { taxPct: v })} />
                <NumField label={p.adsMode === "pct" ? "ADS %" : "ADS R$"} value={p.adsValue} onChange={(v) => set(p.id, { adsValue: v })} />
                <NumField label="Qtd/mês" value={p.monthlyQty} onChange={(v) => set(p.id, { monthlyQty: Math.round(v) })} />
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Comparação de cenários" hint="Conservador: −20% volume e −3% preço. Otimista: +20% volume e +3% preço. Personalizado: seus ajustes.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Cenário</TableHead><TableHead className="text-right">Faturamento</TableHead><TableHead className="text-right">Margem contrib.</TableHead><TableHead className="text-right">Custos fixos</TableHead><TableHead className="text-right">Equilíbrio</TableHead><TableHead className="text-right">Lucro operacional</TableHead></TableRow></TableHeader>
            <TableBody>
              {scenarios.map(({ k, r }) => (
                <TableRow key={k}><TableCell className="font-medium">{k}</TableCell>
                  <TableCell className="num text-right">{fmtBRL(r.mix.revenue)}</TableCell><TableCell className="num text-right">{fmtBRL(r.mix.mcTotal)}</TableCell>
                  <TableCell className="num text-right">{fmtBRL(r.fixed)}</TableCell><TableCell className="num text-right">{r.breakeven.feasible ? fmtBRL(r.breakeven.revenue) : "—"}</TableCell>
                  <TableCell className={`num text-right font-semibold ${r.operating >= 0 ? "text-success" : "text-destructive"}`}>{fmtBRL(r.operating)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </AppShell>
  );
}
