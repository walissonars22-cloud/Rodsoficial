import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppShell, Kpi, Panel, Alert } from "@/components/AppShell";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinance } from "@/lib/store";
import { fmtBRL, fmtNum, fmtPct, summary, unitMargin } from "@/lib/finance";

export const Route = createFileRoute("/equilibrio")({
  head: () => ({
    meta: [
      { title: "Ponto de equilíbrio — Gestão E-commerce" },
      { name: "description", content: "Quanto faturar e quantas unidades de cada produto vender para cobrir todos os custos." },
      { property: "og:title", content: "Ponto de equilíbrio — Gestão E-commerce" },
      { property: "og:description", content: "Quanto faturar para cobrir todos os custos." },
    ],
  }),
  component: Equilibrio,
});

function Equilibrio() {
  const { products, costs } = useFinance();
  const s = summary(products, costs);
  const { mix, breakeven: be } = s;
  const missingR = Math.max(0, be.revenue - mix.revenue);
  const missingU = Math.max(0, be.units - mix.units);
  const flow = [
    { l: "Vendas", v: mix.revenue },
    { l: "Custos variáveis", v: -mix.variableTotal },
    { l: "Margem de contribuição", v: mix.mcTotal },
    { l: "Custos fixos", v: -s.fixed },
    { l: s.operating >= 0 ? "Lucro" : "Prejuízo", v: s.operating },
  ];
  return (
    <AppShell title="Ponto de equilíbrio" subtitle="Estimado com o mix de vendas atual">
      {!be.feasible && <Alert>Sem margem ponderada positiva não há ponto de equilíbrio. Revise preços, custos ou quantidades.</Alert>}
      <Panel title="Do faturamento ao lucro">
        <div className="flex flex-wrap items-center gap-2">
          {flow.map((f, i) => (
            <div key={f.l} className="flex items-center gap-2">
              <div className={`rounded-md border px-4 py-3 ${i === 4 ? (f.v >= 0 ? "border-success bg-success/10" : "border-destructive bg-destructive/10") : "bg-muted"}`}>
                <div className="text-xs text-muted-foreground">{f.l}</div>
                <div className={`num font-semibold ${f.v < 0 ? "text-destructive" : ""}`}>{fmtBRL(f.v)}</div>
              </div>
              {i < 4 && <ArrowRight className="size-4 text-muted-foreground" />}
            </div>
          ))}
        </div>
        <div className="mt-6">
          <div className="mb-1 flex justify-between text-sm"><span>Meta de equilíbrio alcançada</span><b className="num">{fmtPct(s.progress)}</b></div>
          <Progress value={Math.min(100, s.progress)} />
          <div className="num mt-1 flex justify-between text-xs text-muted-foreground"><span>R$ 0</span><span>Equilíbrio: {fmtBRL(be.revenue)}</span></div>
        </div>
      </Panel>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Faturamento de equilíbrio" value={fmtBRL(be.revenue)} hint="Custos fixos ÷ MC ponderada." />
        <Kpi label="Unidades necessárias" value={fmtNum(be.units)} hint="Custos fixos ÷ MC média por unidade (arredondado para cima)." />
        <Kpi label="MC necessária" value={fmtBRL(be.mcNeeded)} hint="Igual aos custos fixos." />
        <Kpi label="Margem de segurança" value={s.safetyMargin === null ? "—" : fmtPct(s.safetyMargin)} tone={(s.safetyMargin ?? 0) >= 0 ? "positive" : "negative"} hint="Negativa = abaixo do equilíbrio." />
        <Kpi label="Falta faturar" value={fmtBRL(missingR)} tone={missingR > 0 ? "negative" : "positive"} />
        <Kpi label="Faltam unidades" value={fmtNum(missingU)} tone={missingU > 0 ? "negative" : "positive"} />
        <Kpi label="Lucro acima do equilíbrio" value={fmtBRL(Math.max(0, s.operating))} tone="positive" />
        <Kpi label="Resultado operacional" value={fmtBRL(s.operating)} tone={s.operating >= 0 ? "positive" : "negative"} />
      </div>
      {be.feasible && (
        <Panel title="Quanto vender de cada produto" hint="Distribuição estimada respeitando o mix atual.">
          {be.adjusted && <div className="mb-3"><Alert>O arredondamento não cobria os custos fixos; acrescentamos unidades do produto de maior margem.</Alert></div>}
          <Table>
            <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Unidades</TableHead><TableHead className="text-right">Faturamento</TableHead><TableHead className="text-right">MC gerada</TableHead></TableRow></TableHeader>
            <TableBody>
              {be.perProduct.map((x) => (
                <TableRow key={x.product.id}><TableCell>{x.product.name}</TableCell><TableCell className="num text-right">{fmtNum(x.qty)}</TableCell>
                  <TableCell className="num text-right">{fmtBRL(x.qty * x.product.salePrice)}</TableCell><TableCell className="num text-right">{fmtBRL(x.qty * unitMargin(x.product).mc)}</TableCell></TableRow>
              ))}
              <TableRow className="font-semibold"><TableCell>Total</TableCell><TableCell className="num text-right">{fmtNum(be.distributedUnits)}</TableCell>
                <TableCell className="num text-right">{fmtBRL(be.distributedRevenue)}</TableCell><TableCell className="num text-right">{fmtBRL(be.distributedMc)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </Panel>
      )}
    </AppShell>
  );
}
