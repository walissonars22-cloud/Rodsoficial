import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppShell, Kpi, Panel, Alert } from "@/components/AppShell";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFinance } from "@/lib/store";
import { fmtBRL, fmtNum, fmtPct, summary, unitMargin } from "@/lib/finance";
import { summarizeMonth } from "@/lib/report-finance";

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
  const { products, costs, sales, adSpends } = useFinance();
  const s = summary(products, costs);
  const latestMonth = [...new Set(sales.map(r => r.month))].sort().at(-1);
  const reported = latestMonth ? summarizeMonth(latestMonth, sales, products, adSpends, costs) : null;
  const { mix, breakeven: be } = s;
  // Quando há importação, o ponto de equilíbrio usa o repasse efetivo (já líquido das tarifas ML).
  // Sem importação, mantém a projeção do catálogo, onde as tarifas ML já integram o custo variável.
  const revenue = reported ? reported.revenue : mix.revenue;
  const contribution = reported ? reported.contribution : mix.mcTotal;
  const fixed = reported ? reported.fixed : s.fixed;
  const operating = reported ? reported.operating : s.operating;
  const weightedPct = reported ? reported.contributionPct / 100 : mix.weightedPct;
  const feasible = reported ? revenue > 0 && weightedPct > 0 && reported.pending === 0 : be.feasible;
  const equilibriumRevenue = reported ? (feasible ? reported.breakeven ?? 0 : 0) : be.revenue;
  const avgUnitMc = reported && reported.units > 0 ? contribution / reported.units : mix.avgUnitMc;
  const equilibriumUnits = reported ? (feasible && avgUnitMc > 0 ? Math.ceil(fixed / avgUnitMc - 1e-9) : 0) : be.units;
  const progress = feasible && equilibriumRevenue > 0 ? Math.min(999, revenue / equilibriumRevenue * 100) : 0;
  const safetyMargin = feasible && revenue > 0 ? (revenue - equilibriumRevenue) / revenue * 100 : null;
  const missingR = Math.max(0, equilibriumRevenue - revenue);
  const missingU = Math.max(0, equilibriumUnits - (reported ? reported.units : mix.units));
  const platformCosts = reported
    ? reported.payout - reported.revenue
    : -mix.rows.reduce((total, row) => {
        const p = row.product;
        return total + row.qty * (p.salePrice * p.commissionPct / 100 + p.fixedFee + p.subsidizedFreight);
      }, 0);
  const ordinaryVariable = reported
    ? -(reported.cmv + reported.otherVariable + reported.ads)
    : -mix.variableTotal - platformCosts;
  const payout = reported ? reported.payout : revenue + platformCosts;
  const flow = [
    { l: "Vendas", v: revenue },
    { l: "Custos ML e ajustes", v: platformCosts },
    { l: "Repasse ML", v: payout },
    { l: "Custos variáveis", v: ordinaryVariable },
    { l: "Margem de contribuição", v: contribution },
    { l: "Custos fixos", v: -fixed },
    { l: "Resultado operacional", v: operating },
  ];
  return (
    <AppShell title="Ponto de equilíbrio" subtitle={reported ? `Valores reais importados de ${latestMonth} — tarifas ML descontadas no repasse` : "Estimado com o mix de vendas atual — taxas ML incluídas"}>
      {reported && reported.pending > 0 && <Alert>Há {reported.pending} venda(s) sem custo do produto confirmado. Informe os custos para calcular um ponto de equilíbrio confiável.</Alert>}
      {!feasible && !reported?.pending && <Alert>Sem margem ponderada positiva não há ponto de equilíbrio. Revise preços, custos ou quantidades.</Alert>}
      {reported && reported.discrepancies > 0 && <Alert>Há {reported.discrepancies} divergência(s) entre receita, taxas e repasse. O cálculo considera o repasse informado; confira os ajustes no relatório.</Alert>}
      <Panel title="Do faturamento ao lucro">
        <div className="flex flex-wrap items-center gap-2">
          {flow.map((f, i) => (
            <div key={f.l} className="flex items-center gap-2">
              <div className={`rounded-md border px-4 py-3 ${i === flow.length - 1 ? (f.v >= 0 ? "border-success bg-success/10" : "border-destructive bg-destructive/10") : "bg-muted"}`}>
                <div className="text-xs text-muted-foreground">{f.l}</div>
                <div className={`num font-semibold ${f.v < 0 ? "text-destructive" : ""}`}>{fmtBRL(f.v)}</div>
              </div>
              {i < flow.length - 1 && <ArrowRight className="size-4 text-muted-foreground" />}
            </div>
          ))}
        </div>
        <div className="mt-6">
          <div className="mb-1 flex justify-between text-sm"><span>Meta de equilíbrio alcançada</span><b className="num">{fmtPct(progress)}</b></div>
          <Progress value={Math.min(100, progress)} />
          <div className="num mt-1 flex justify-between text-xs text-muted-foreground"><span>R$ 0</span><span>Equilíbrio: {feasible ? fmtBRL(equilibriumRevenue) : "—"}</span></div>
        </div>
      </Panel>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Faturamento de equilíbrio" value={fmtBRL(be.revenue)} hint="Custos fixos ÷ MC ponderada." />
        <Kpi label="Unidades necessárias" value={feasible ? fmtNum(equilibriumUnits) : "—"} hint="Custos fixos ÷ MC média por unidade (arredondado para cima)." />
        <Kpi label="MC necessária" value={fmtBRL(fixed)} hint="Igual aos custos fixos." />
        <Kpi label="Margem de segurança" value={safetyMargin === null ? "—" : fmtPct(safetyMargin)} tone={(safetyMargin ?? 0) >= 0 ? "positive" : "negative"} hint="Negativa = abaixo do equilíbrio." />
        <Kpi label="Falta faturar" value={feasible ? fmtBRL(missingR) : "—"} tone={missingR > 0 ? "negative" : "positive"} />
        <Kpi label="Faltam unidades" value={feasible ? fmtNum(missingU) : "—"} tone={missingU > 0 ? "negative" : "positive"} />
        <Kpi label="Lucro acima do equilíbrio" value={fmtBRL(Math.max(0, operating))} tone="positive" />
        <Kpi label="Resultado operacional" value={fmtBRL(operating)} tone={operating >= 0 ? "positive" : "negative"} />
      </div>
      {reported && <Panel title="Composição do resultado importado" hint="As tarifas e eventuais ajustes já estão dentro do repasse; não são deduzidos novamente.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi label="Vendas brutas" value={fmtBRL(reported.revenue)} />
          <Kpi label="Repasse do Mercado Livre" value={fmtBRL(reported.payout)} hint="Entrada efetiva antes do custo dos produtos." />
          <Kpi label="Tarifas ML e ajustes" value={fmtBRL(platformCosts)} />
          <Kpi label="CMV + outros variáveis + ADS" value={fmtBRL(-ordinaryVariable)} />
          <Kpi label="Margem de contribuição" value={fmtBRL(reported.contribution)} />
          <Kpi label="Custos fixos" value={fmtBRL(reported.fixed)} />
        </div>
      </Panel>}
      {!reported && be.feasible && (
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
