import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell, Kpi, Panel, Alert } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinance } from "@/lib/store";
import { computeMix, fmtBRL, fmtNum, fmtPct, unitMargin } from "@/lib/finance";

export const Route = createFileRoute("/mix")({
  head: () => ({
    meta: [
      { title: "Margem de contribuição ponderada — Gestão E-commerce" },
      { name: "description", content: "Calcule a margem ponderada pelo mix real ou projetado de vendas de cada produto." },
      { property: "og:title", content: "Margem de contribuição ponderada — Gestão E-commerce" },
      { property: "og:description", content: "Margem ponderada pelo mix de vendas de cada produto." },
    ],
  }),
  component: MixPage,
});

function MixPage() {
  const { products, setProducts } = useFinance();
  const mix = computeMix(products);
  const active = products.filter((p) => p.active);
  const simpleAvg = active.length ? active.reduce((s, p) => s + unitMargin(p).mcPct, 0) / active.length : 0;
  const byId = new Map(mix.rows.map((r) => [r.product.id, r]));

  return (
    <AppShell title="Margem de contribuição ponderada" subtitle="Informe quanto vende (ou prevê vender) de cada produto por mês. O mix é uma hipótese: mudá-lo muda o ponto de equilíbrio.">
      {mix.units === 0 && <Alert>Nenhuma quantidade informada — não é possível determinar o mix.</Alert>}
      {mix.units > 0 && mix.mcTotal <= 0 && <Alert>A margem ponderada é zero ou negativa: as vendas não pagam nem os custos variáveis. Não existe ponto de equilíbrio.</Alert>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Faturamento total" value={fmtBRL(mix.revenue)} />
        <Kpi label="MC total" value={fmtBRL(mix.mcTotal)} tone={mix.mcTotal >= 0 ? "default" : "negative"} />
        <Kpi label="MC ponderada" value={fmtPct(mix.weightedPct * 100)} hint={`Média simples seria ${fmtPct(simpleAvg)} — não use ela.`} />
        <Kpi label="MC média por unidade" value={fmtBRL(mix.avgUnitMc)} hint={`${fmtNum(mix.units)} unidades no mês`} />
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Produto</TableHead><TableHead className="w-32">Qtd/mês</TableHead><TableHead className="text-right">% volume</TableHead><TableHead className="text-right">% faturamento</TableHead>
            <TableHead className="text-right">MC unit.</TableHead><TableHead className="text-right">MC total</TableHead><TableHead className="text-right">% da MC</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {active.map((p) => {
              const r = byId.get(p.id);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Input type="number" min={0} className="num h-8" value={p.monthlyQty}
                    onChange={(e) => setProducts((a) => a.map((x) => (x.id === p.id ? { ...x, monthlyQty: Math.max(0, Math.round(+e.target.value || 0)) } : x)))} /></TableCell>
                  <TableCell className="num text-right">{fmtPct((r?.volumeShare ?? 0) * 100)}</TableCell>
                  <TableCell className="num text-right">{fmtPct((r?.revenueShare ?? 0) * 100)}</TableCell>
                  <TableCell className="num text-right">{fmtBRL(unitMargin(p).mc)}</TableCell>
                  <TableCell className="num text-right font-semibold">{fmtBRL(r?.mcTotal ?? 0)}</TableCell>
                  <TableCell className="num text-right">{fmtPct((r?.mcShare ?? 0) * 100)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Panel title="Quanto cada produto contribui" hint="Margem de contribuição total gerada no mês, em reais.">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={mix.rows.map((r) => ({ name: r.product.name, mc: r.mcTotal }))}>
            <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} />
            <Bar dataKey="mc" name="MC total" radius={[4, 4, 0, 0]}>{mix.rows.map((r) => <Cell key={r.product.id} fill={r.mcTotal >= 0 ? "var(--chart-1)" : "var(--destructive)"} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </AppShell>
  );
}
