import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { AppShell, Kpi, Panel, Alert } from "@/components/AppShell";
import { useFinance } from "@/lib/store";
import { fmtBRL, fmtNum, fmtPct } from "@/lib/finance";
import { summarizeAllPeriods } from "@/lib/report-finance";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Financeiro — LIOR" },
      { name: "description", content: "Faturamento, margem de contribuição, ponto de equilíbrio e lucro do seu e-commerce em um painel." },
      { property: "og:title", content: "Dashboard Financeiro — LIOR" },
      { property: "og:description", content: "Faturamento, margem de contribuição, ponto de equilíbrio e lucro do seu e-commerce em um painel." },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const tip = (v: number) => fmtBRL(v);

// Exibe apenas as duas primeiras palavras no eixo, preservando o nome completo no tooltip.
const shortProductName = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(" ").toUpperCase();

const revenueLabel = (product: { sku?: string; name: string }) =>
  product.sku?.trim() || shortProductName(product.name);

function Dashboard() {
  const { products, costs, sales, adSpends } = useFinance();
  const s = summarizeAllPeriods(sales, products, adSpends, costs);
  const pos = s.operating >= 0;
  const percentageOfRevenue = (value: number) => fmtPct(s.revenue > 0 ? value / s.revenue * 100 : 0);
  const financialValue = (value: number) => `${fmtBRL(value)} · ${percentageOfRevenue(value)}`;
  const variable = s.revenue - s.contribution;
  const avgRevenuePerUnit = s.units > 0 ? s.revenue / s.units : 0;
  const avgVariablePerUnit = s.units > 0 ? variable / s.units : 0;
  const avgContributionPerUnit = s.units > 0 ? s.contribution / s.units : 0;
  const beUnits = s.monthlyBreakeven !== null && avgContributionPerUnit > 0 ? Math.ceil(s.averageMonthlyFixed / avgContributionPerUnit) : 0;

  const maxU = Math.max(beUnits * 2, s.units / Math.max(s.count, 1) * 1.2, 10);
  const steps = 24;
  const beData = Array.from({ length: steps + 1 }, (_, i) => {
    const u = Math.round((maxU / steps) * i);
    return { u, faturamento: u * avgRevenuePerUnit, custoTotal: s.averageMonthlyFixed + u * avgVariablePerUnit, mcAcumulada: u * avgContributionPerUnit, custosFixos: s.averageMonthlyFixed };
  });
  const contrib = [...s.rows].sort((a, b) => b.contribution - a.contribution).map((r) => ({
    name: shortProductName(r.name), fullName: r.name, mc: r.contribution,
  }));
  const share = s.rows.map((r) => ({
    name: revenueLabel(r), fullName: r.name, value: r.revenue,
  }));
  const result = [
    { name: "Vendas", v: s.revenue, c: "var(--chart-1)" },
    { name: "Custos ML e ajustes", v: s.payout - s.revenue, c: "var(--destructive)" },
    { name: "Demais variáveis", v: -(s.cmv + s.otherVariable + s.ads), c: "var(--destructive)" },
    { name: "Margem contrib.", v: s.contribution, c: "var(--chart-3)" },
    { name: "Custos fixos", v: -s.fixed, c: "var(--destructive)" },
    { name: "Resultado", v: s.operating, c: pos ? "var(--success)" : "var(--destructive)" },
  ];

  return (
    <AppShell title="Dashboard financeiro" subtitle={s.count ? `Consolidado de todos os ${s.count} períodos importados · ${s.months[0]} a ${s.months.at(-1)}` : "Consolidado de todos os períodos importados"}>
      {s.count === 0 && <Alert tone="info">Nenhuma venda importada ainda. <Link to="/importar" className="font-semibold underline">Importe o relatório do Mercado Livre</Link> para preencher os indicadores. Os valores começam em zero.</Alert>}
      {s.count > 0 && (s.pending > 0 || s.provisional > 0 || s.discrepancies > 0) && <Alert>Consolidado preliminar: {s.pending} venda(s) sem custo confirmado, {s.provisional} venda(s) ainda provisória(s) e {s.discrepancies} divergência(s) de repasse. Revise os dados antes de interpretar o lucro.</Alert>}
      <div className="lior-hero relative overflow-hidden rounded-2xl px-7 py-8 shadow-[0_10px_32px_rgba(6,22,51,0.15)] sm:px-9">
        <div className="lior-tracking mb-3 text-white/60">Inteligência financeira · RODS</div>
        <span className="lior-accent-line mb-4" />
        <div className="text-sm text-white/80">Resultado acumulado · todos os períodos</div>
        <div className="num mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">{fmtBRL(s.operating)}</div>
        <div className="mt-2 text-lg font-semibold text-white/90">{fmtPct(s.operatingPct)} do faturamento bruto</div>
        <div className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Vendas de <b>{fmtBRL(s.revenue)}</b> · repasse ML de <b>{fmtBRL(s.payout)}</b> · margem de contribuição de <b>{fmtBRL(s.contribution)}</b> após ADS e custos variáveis · custos fixos acumulados de <b>{fmtBRL(s.fixed)}</b>.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Kpi label="Vendas acumuladas" value={fmtBRL(s.revenue)} hint="Receita bruta de todos os períodos · 100% de referência." />
        <Kpi label="Custos ML e ajustes" value={fmtBRL(s.revenue - s.payout)} hint="Diferença entre vendas brutas e repasse real (inclui ajustes)." />
        <Kpi label="Repasse do Mercado Livre" value={fmtBRL(s.payout)} hint="Valor líquido repassado pela plataforma, ainda não é lucro." />
        <Kpi label="Custos variáveis restantes" value={fmtBRL(s.cmv + s.otherVariable + s.ads)} hint="CMV, custos extras e ADS. Não repete as tarifas ML." />
        <Kpi label="Margem de contribuição" value={financialValue(s.contribution)} tone={s.contribution >= 0 ? "default" : "negative"} hint="Repasse menos os custos variáveis restantes." />
        <Kpi label="Custos fixos acumulados" value={fmtBRL(s.fixed)} hint="Custos fixos mensais considerados em cada período importado." />
        <Kpi label="Resultado" value={financialValue(s.operating)} tone={pos ? "positive" : "negative"} hint="Margem de contribuição menos custos fixos · percentual sobre vendas brutas." />
        <Kpi label="Equilíbrio mensal estimado" value={s.monthlyBreakeven === null ? "—" : fmtBRL(s.monthlyBreakeven)} hint="Custo fixo mensal médio ÷ margem ponderada consolidada." />
        <Kpi label="Equilíbrio mensal (unid.)" value={s.monthlyBreakeven === null ? "—" : fmtNum(beUnits)} hint="Estimativa baseada na contribuição média por unidade vendida." />
        <Kpi label="Pedidos / unidades" value={`${fmtNum(s.orders)} / ${fmtNum(s.units)}`} hint="Somatório de todos os meses importados." />
        <Kpi label="Períodos importados" value={fmtNum(s.count)} hint="Meses distintos com relatórios de vendas." />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Ponto de equilíbrio mensal estimado" hint="Projeção mensal com base na margem consolidada dos períodos importados.">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={beData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="u" fontSize={11} label={{ value: "unidades", position: "insideBottom", offset: -2, fontSize: 11 }} />
              <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={tip} labelFormatter={(l) => `${l} unidades`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {s.monthlyBreakeven !== null && <ReferenceArea x1={0} x2={beUnits} fill="var(--destructive)" fillOpacity={0.06} />}
              {s.monthlyBreakeven !== null && <ReferenceArea x1={beUnits} x2={beData.at(-1)!.u} fill="var(--success)" fillOpacity={0.08} />}
              {s.monthlyBreakeven !== null && <ReferenceLine x={beUnits} stroke="var(--primary)" strokeDasharray="4 4" label={{ value: "Equilíbrio", fontSize: 11, position: "top" }} />}
              {s.count > 0 && s.units > 0 && <ReferenceLine x={s.units / s.count} stroke="var(--chart-4)" label={{ value: "Atual", fontSize: 11, position: "insideTopRight" }} />}
              <Line dataKey="faturamento" name="Faturamento" stroke="var(--chart-1)" dot={false} strokeWidth={2} />
              <Line dataKey="custoTotal" name="Custo total" stroke="var(--destructive)" dot={false} strokeWidth={2} />
              <Line dataKey="mcAcumulada" name="MC acumulada" stroke="var(--chart-2)" dot={false} strokeWidth={2} />
              <Line dataKey="custosFixos" name="Custos fixos" stroke="var(--chart-5)" dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Resultado acumulado" hint="Todos os meses: vendas, custos ML, demais custos e resultado operacional.">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={result}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={tip} />
              <Bar dataKey="v" name="Valor" radius={[4, 4, 0, 0]}>{result.map((r) => <Cell key={r.name} fill={r.c} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Contribuição por produto" hint="Acumulado por produto de todos os períodos importados, antes do ADS global.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={contrib} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <YAxis type="category" dataKey="name" width={130} fontSize={11} />
              <Tooltip formatter={tip} labelFormatter={(_, items) => String(items?.[0]?.payload?.fullName ?? "")} />
              <Bar dataKey="mc" name="MC total" radius={[0, 4, 4, 0]}>{contrib.map((c) => <Cell key={c.name} fill={c.mc >= 0 ? "var(--chart-1)" : "var(--destructive)"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Composição do faturamento" hint="Participação de cada SKU nas vendas de todos os períodos.">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={share} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                {share.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={tip} labelFormatter={(_, items) => String(items?.[0]?.payload?.fullName ?? "")} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </AppShell>
  );
}
