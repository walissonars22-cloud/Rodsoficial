import {createFileRoute,Link} from "@tanstack/react-router";
import {useState} from "react";
import {AppShell,Kpi,Panel,Alert} from "@/components/AppShell";
import {Button} from "@/components/ui/button";
import {useFinance} from "@/lib/store";
import {fmtBRL,fmtPct} from "@/lib/finance";
import {snapshotMonth,summarizeMonth} from "@/lib/report-finance";
export const Route=createFileRoute("/evolucao")({component:Evolucao});
function Evolucao(){
 const {sales,products,costs,adSpends,monthCloses,closeMonth,reopenMonth}=useFinance();
 const months=[...new Set([...sales.map(x=>x.month),...monthCloses.map(x=>x.month)])].sort().reverse();
 const [selected,setSelected]=useState("");
 const month=selected&&months.includes(selected)?selected:months[0];
 const active=month?summarizeMonth(month,sales,products,adSpends,costs):null;
 const closed=monthCloses.find(x=>x.month===month);
 const result=closed||active;
 return <AppShell title="Evolução financeira" subtitle="Compare os resultados mensais e consolide cada mês com seus custos registrados.">
  {!month&&<Alert tone="info">Importe um relatório de vendas para começar. <Link to="/importar" className="underline">Importar vendas</Link>.</Alert>}
  {month&&<Panel title="Fechamento do mês">
   <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Mês <select className="ml-2 rounded-md border bg-background p-2" value={month} onChange={e=>setSelected(e.target.value)}>{months.map(m=><option key={m}>{m}</option>)}</select></label><span className="text-sm">{closed?"Consolidado em "+closed.closedAt.slice(0,10):"Em andamento"}</span>
   {closed?<Button variant="outline" onClick={()=>{if(confirm("Reabrir mês? A consolidação será removida e os cálculos voltarão a ser dinâmicos."))reopenMonth(month);}}>Reabrir mês</Button>:<Button disabled={!active||active.pending>0||active.provisional>0||active.discrepancies>0||active.cancelled>0} onClick={()=>active&&closeMonth(snapshotMonth(active))}>Consolidar mês</Button>}</div>
   {active&&!closed&&(active.pending>0||active.provisional>0||active.discrepancies>0||active.cancelled>0)&&<div className="mt-3"><Alert>Fechamento bloqueado: {active.pending} vendas sem custo confirmado, {active.provisional} vendas ainda não concluídas, {active.discrepancies} divergências e {active.cancelled} cancelamentos/devoluções a conferir.</Alert></div>}
  </Panel>}
  {result&&<div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Kpi label="Receita" value={fmtBRL(result.revenue)}/><Kpi label="Repasse Mercado Livre" value={fmtBRL(result.payout)}/><Kpi label="CMV" value={fmtBRL(result.cmv)}/><Kpi label="ADS" value={fmtBRL(result.ads)}/><Kpi label="Custos fixos" value={fmtBRL(result.fixed)}/><Kpi label="Margem de contribuição" value={fmtBRL(result.contribution)}/><Kpi label="Resultado operacional" value={fmtBRL(result.operating)} tone={result.operating>=0?"positive":"negative"}/><Kpi label="Pedidos" value={String(result.orders)}/></div>}
  <Panel title="Histórico por período" hint="Meses consolidados usam os valores congelados; os demais usam custos cadastrados hoje e são provisórios.">
    <div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Mês</th><th className="p-2">Situação</th><th className="p-2">Receita</th><th className="p-2">CMV</th><th className="p-2">ADS</th><th className="p-2">Margem</th><th className="p-2">Fixos</th><th className="p-2">Resultado</th><th className="p-2">Variação da receita</th></tr></thead>
    <tbody>{months.map((m,i)=>{const s=monthCloses.find(x=>x.month===m)||summarizeMonth(m,sales,products,adSpends,costs);const prev=months[i+1];const last=prev&&(monthCloses.find(x=>x.month===prev)||summarizeMonth(prev,sales,products,adSpends,costs));return <tr className="border-b" key={m}><td className="p-2">{m}</td><td className="p-2">{monthCloses.some(x=>x.month===m)?"Consolidado":"Provisório"}</td><td className="p-2">{fmtBRL(s.revenue)}</td><td className="p-2">{fmtBRL(s.cmv)}</td><td className="p-2">{fmtBRL(s.ads)}</td><td className="p-2">{fmtBRL(s.contribution)}</td><td className="p-2">{fmtBRL(s.fixed)}</td><td className="p-2">{fmtBRL(s.operating)}</td><td className="p-2">{last&&last.revenue?fmtPct((s.revenue/last.revenue-1)*100):"—"}</td></tr>})}</tbody></table></div>
  </Panel>
 </AppShell>;
}