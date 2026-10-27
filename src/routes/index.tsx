import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { AppShell, Kpi, Panel, Alert } from "@/components/AppShell";
import { useFinance } from "@/lib/store";
import { fmtBRL, fmtNum, fmtPct, summary } from "@/lib/finance";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard financeiro — Gestão E-commerce" },
      { name: "description", content: "Faturamento, margem de contribuição, ponto de equilíbrio e lucro do seu e-commerce em um painel." },
      { property: "og:title", content: "Dashboard financeiro — Gestão E-commerce" },
      { property: "og:description", content: "Faturamento, margem de contribuição, ponto de equilíbrio e lucro do seu e-commerce em um painel." },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const tip = (v: number) => fmtBRL(v);

function Dashboard() {
  const { products, costs, profitGoal } = useFinance();
  const s = summary(products, costs, profitGoal);
  const { mix, breakeven } = s;
  const pos = s.operating >= 0;

  const maxU = Math.max(breakeven.units * 2, mix.units * 1.2, 10);
  const steps = 24;
  const beData = Array.from({ length: steps + 1 }, (_, i) => {
    const u = Math.round((maxU / steps) * i);
    return { u, faturamento: u * (mix.units ? mix.revenue / mix.units : 0), custoTotal: s.fixed + u * (mix.units ? mix.variableTotal / mix.units : 0), mcAcumulada: u * mix.avgUnitMc, custosFixos: s.fixed };
  });
  const contrib = [...mix.rows].sort((a, b) => b.mcTotal - a.mcTotal).map((r) => ({ name: r.product.name, mc: r.mcTotal }));
  const share = mix.rows.map((r) => ({ name: r.product.name, value: r.revenue }));
  const result = [
    { name: "Faturamento", v: mix.revenue, c: "var(--chart-1)" },
    { name: "Custos variáveis", v: -mix.variableTotal, c: "var(--destructive)" },
    { name: "Margem contrib.", v: mix.mcTotal, c: "var(--chart-3)" },
    { name: "Custos fixos", v: -s.fixed, c: "var(--destructive)" },
    { name: pos ? "Lucro" : "Prejuízo", v: s.operating, c: pos ? "var(--success)" : "var(--destructive)" },
  ];

  return (
    <AppShell title="Dashboard financeiro" subtitle="Resultado projetado com base nas quantidades mensais cadastradas">
      {!mix.valid && <Alert>Informe preço, custos e quantidade mensal de ao menos um produto com margem positiva em <Link to="/produtos" className="font-semibold underline">Produtos</Link> para ver o ponto de equilíbrio.</Alert>}

      <div className={`rounded-lg p-6 ${pos ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
        <div className="text-sm opacity-80">Para pagar todos os custos você precisa faturar por mês</div>
        <div className="num mt-1 text-4xl font-bold">{breakeven.feasible ? fmtBRL(breakeven.revenue) : "—"}</div>
        <div className="mt-2 text-sm opacity-90">
          ≈ {fmtNum(breakeven.units)} unidades no mix atual. Hoje você fatura {fmtBRL(mix.revenue)} e tem {pos ? "lucro" : "prejuízo"} operacional de <b className="num">{fmtBRL(s.operating)}</b>.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Faturamento mensal" value={fmtBRL(mix.revenue)} hint="Preço × quantidade de todos os produtos." />
        <Kpi label="Custos variáveis" value={fmtBRL(mix.variableTotal)} hint="Mercadoria, taxas, frete, impostos e anúncios." />
        <Kpi label="Margem de contribuição" value={fmtBRL(mix.mcTotal)} hint="O que sobra das vendas para pagar os custos fixos." tone={mix.mcTotal >= 0 ? "default" : "negative"} />
        <Kpi label="MC ponderada" value={fmtPct(mix.weightedPct * 100)} hint="De cada R$ 100 vendidos, quanto sobra." />
        <Kpi label="Custos fixos" value={fmtBRL(s.fixed)} hint="Despesas mensais que existem mesmo sem vender." />
        <Kpi label="Resultado operacional" value={fmtBRL(s.operating)} tone={pos ? "positive" : "negative"} hint="Margem de contribuição − custos fixos." />
        <Kpi label="Equilíbrio (R$)" value={breakeven.feasible ? fmtBRL(breakeven.revenue) : "—"} hint="Faturamento em que o lucro é zero." />
        <Kpi label="Equilíbrio (unid.)" value={breakeven.feasible ? fmtNum(breakeven.units) : "—"} hint="Unidades totais no mix atual." />
        <Kpi label="Margem de segurança" value={s.safetyMargin === null ? "—" : fmtPct(s.safetyMargin)} tone={(s.safetyMargin ?? 0) >= 0 ? "positive" : "negative"} hint="Quanto as vendas podem cair antes do prejuízo." />
        <Kpi label={`Unid. p/ lucro de ${fmtBRL(profitGoal)}`} value={s.goal.feasible ? fmtNum(s.goal.units) : "—"} hint="Ajuste a meta no Simulador." />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Ponto de equilíbrio" hint="Vermelho: prejuízo. Verde: lucro. A linha marca o equilíbrio.">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={beData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="u" fontSize={11} label={{ value: "unidades", position: "insideBottom", offset: -2, fontSize: 11 }} />
              <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={tip} labelFormatter={(l) => `${l} unidades`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {breakeven.feasible && <ReferenceArea x1={0} x2={breakeven.units} fill="var(--destructive)" fillOpacity={0.06} />}
              {breakeven.feasible && <ReferenceArea x1={breakeven.units} x2={beData.at(-1)!.u} fill="var(--success)" fillOpacity={0.08} />}
              {breakeven.feasible && <ReferenceLine x={breakeven.units} stroke="var(--primary)" strokeDasharray="4 4" label={{ value: "Equilíbrio", fontSize: 11, position: "top" }} />}
              {mix.units > 0 && <ReferenceLine x={mix.units} stroke="var(--chart-4)" label={{ value: "Atual", fontSize: 11, position: "insideTopRight" }} />}
              <Line dataKey="faturamento" name="Faturamento" stroke="var(--chart-1)" dot={false} strokeWidth={2} />
              <Line dataKey="custoTotal" name="Custo total" stroke="var(--destructive)" dot={false} strokeWidth={2} />
              <Line dataKey="mcAcumulada" name="MC acumulada" stroke="var(--chart-2)" dot={false} strokeWidth={2} />
              <Line dataKey="custosFixos" name="Custos fixos" stroke="var(--chart-5)" dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Resultado mensal" hint="Das vendas ao lucro: cada etapa abate custos.">
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
        <Panel title="Contribuição por produto" hint="Quanto cada produto gera, em reais, para pagar os custos fixos.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={contrib} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <YAxis type="category" dataKey="name" width={130} fontSize={11} />
              <Tooltip formatter={tip} />
              <Bar dataKey="mc" name="MC total" radius={[0, 4, 4, 0]}>{contrib.map((c) => <Cell key={c.name} fill={c.mc >= 0 ? "var(--chart-1)" : "var(--destructive)"} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Composição do faturamento" hint="Participação de cada produto nas vendas.">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={share} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                {share.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </AppShell>
  );
}
