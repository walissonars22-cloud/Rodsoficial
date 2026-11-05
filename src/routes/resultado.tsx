import {createFileRoute,Link} from "@tanstack/react-router";
import {useState} from "react";
import {AppShell,Kpi,Panel,Alert} from "@/components/AppShell";
import {useFinance} from "@/lib/store";
import {summarizeMonth} from "@/lib/report-finance";
import {fmtBRL,fmtPct} from "@/lib/finance";
export const Route=createFileRoute("/resultado")({component:Resultado});
function Resultado(){
 const {sales,products,adSpends,costs,monthCloses}=useFinance();
 const months=[...new Set(sales.map(x=>x.month))].sort().reverse();
 const [current,setCurrent]=useState("");
 const month=current&&months.includes(current)?current:months[0];
 const s=month?summarizeMonth(month,sales,products,adSpends,costs):null;
 const frozen=monthCloses.find(x=>x.month===month);
 return <AppShell title="Resultado do período" subtitle="Rentabilidade calculada pelas vendas importadas, custos cadastrados e investimento em ADS.">
  {!month&&<Alert tone="info">Nenhum relatório importado. <Link to="/importar" className="underline">Importar vendas</Link></Alert>}
  {s&&<>
   <div className="flex flex-wrap items-center gap-3"><label className="text-sm">Mês <select className="ml-2 rounded-md border bg-background p-2" value={month} onChange={e=>setCurrent(e.target.value)}>{months.map(m=><option key={m}>{m}</option>)}</select></label>
   <span className="text-sm text-muted-foreground">{frozen?"Mês consolidado":"Resultados provisórios"}</span></div>
   {(s.pending>0||s.provisional>0||s.discrepancies>0||s.cancelled>0)&&<Alert>Confira {s.pending} venda(s) sem CMV confirmado, {s.provisional} pendente(s) de conclusão, {s.discrepancies} divergência(s) financeiras e {s.cancelled} cancelamento(s)/devolução(ões). Os resultados são preliminares.</Alert>}
   <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <Kpi label="Receita dos produtos" value={fmtBRL(s.revenue)}/>
    <Kpi label="Tarifa de venda Mercado Livre" value={fmtBRL(s.saleFees)}/>
    <Kpi label="Tarifa de envio" value={fmtBRL(s.shippingFees)}/>
    <Kpi label="Repasse do Mercado Livre" value={fmtBRL(s.payout)} hint="Não representa lucro."/>
    <Kpi label="CMV" value={fmtBRL(s.cmv)}/>
    <Kpi label="Mercado Ads" value={fmtBRL(s.ads)}/>
    <Kpi label="Margem contribuição após ADS" value={fmtBRL(s.contribution)} tone={s.contribution>=0?"positive":"negative"}/>
    <Kpi label="Margem ponderada" value={fmtPct(s.contributionPct)}/>
    <Kpi label="Custos fixos" value={fmtBRL(s.fixed)}/>
    <Kpi label="Resultado operacional" value={fmtBRL(s.operating)} tone={s.operating>=0?"positive":"negative"}/>
    <Kpi label="Ponto de equilíbrio" value={s.breakeven===null?"—":fmtBRL(s.breakeven)}/>
    <Kpi label="Pedidos / unidades" value={s.orders+" / "+s.units}/>
   </div>
   <Panel title="Rentabilidade por SKU" hint="A margem dos itens ainda não inclui o ADS global; ele é deduzido no resultado da operação.">
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">SKU</th><th className="p-2">Produto</th><th className="p-2">Qtd.</th><th className="p-2">Receita</th><th className="p-2">Repasse</th><th className="p-2">CMV + custos extras</th><th className="p-2">MC R$ antes ADS</th><th className="p-2">MC %</th><th className="p-2">Situação</th></tr></thead>
    <tbody>{s.rows.map(r=><tr key={r.sku||r.name} className="border-b"><td className="p-2">{r.sku||"Sem SKU"}</td><td className="p-2">{r.name}</td><td className="p-2">{r.qty}</td><td className="p-2">{fmtBRL(r.revenue)}</td><td className="p-2">{fmtBRL(r.payout)}</td><td className="p-2">{fmtBRL(r.cost)}</td><td className="p-2">{fmtBRL(r.contribution)}</td><td className="p-2">{fmtPct(r.mcPct)}</td><td className="p-2">{r.pending?<Link to="/produtos" className="font-semibold text-destructive underline">Informar CMV</Link>:"Confirmado"}</td></tr>)}</tbody></table></div>
   </Panel>
   <Alert tone="info">O resultado operacional é uma análise gerencial: custos fixos atuais e dados importados. O histórico definitivo deve ser consolidado na aba Evolução financeira.</Alert>
  </>}
 </AppShell>;
}