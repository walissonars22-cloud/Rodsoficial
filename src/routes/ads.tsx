import {createFileRoute} from "@tanstack/react-router";
import {useState} from "react";
import {AppShell,Kpi,Panel,Alert} from "@/components/AppShell";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {useFinance,uid} from "@/lib/store";
import {fmtBRL} from "@/lib/finance";
export const Route=createFileRoute("/ads")({component:Ads});
function Ads(){
 const {adSpends,setAdSpends,sales}=useFinance();
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
 const [name,setName]=useState("Mercado Ads");
 const [amount,setAmount]=useState("");
 const spent=adSpends.filter(a=>a.month===month).reduce((s,a)=>s+a.amount,0);
 const revenue=sales.filter(x=>x.month===month&&!x.cancelled).reduce((s,x)=>s+x.revenue,0);
 return <AppShell title="Mercado Ads" subtitle="Informe o investimento real de publicidade por mês; não confunda com tarifa de venda.">
  <div className="grid gap-3 sm:grid-cols-3"><Kpi label="ADS no mês" value={fmtBRL(spent)}/><Kpi label="Receita no mês" value={fmtBRL(revenue)}/><Kpi label="ADS sobre receita" value={revenue?(spent/revenue*100).toFixed(1)+"%":"—"}/></div>
  <Panel title="Adicionar investimento" hint="Lance apenas valores ainda não incluídos nos custos dos produtos.">
   <div className="grid gap-3 sm:grid-cols-4">
    <label className="text-sm">Mês de referência<Input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>
    <label className="text-sm">Campanha / descrição<Input value={name} onChange={e=>setName(e.target.value)}/></label>
    <label className="text-sm">Investimento (R$)<Input type="number" step=".01" min="0" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    <div className="flex items-end"><Button disabled={!month||!Number.isFinite(Number(amount))||Number(amount)<=0} onClick={()=>{setAdSpends(s=>[...s,{id:uid(),month,name,amount:Number(amount)}]);setAmount("");}}>Salvar investimento</Button></div>
   </div>
  </Panel>
  <Panel title="Lançamentos salvos">
   {adSpends.length===0?<p className="text-sm text-muted-foreground">Nenhum investimento registrado.</p>:<div className="space-y-2">{[...adSpends].sort((a,b)=>b.month.localeCompare(a.month)).map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm"><span>{a.month} · {a.name}</span><div className="flex items-center gap-2"><b>{fmtBRL(a.amount)}</b><Button variant="outline" size="sm" onClick={()=>{const v=prompt("Novo valor em R$",String(a.amount));if(v===null)return;const num=Number(v.replace(",","."));if(!Number.isFinite(num)||num<0)return;setAdSpends(s=>s.map(x=>x.id===a.id?{...x,amount:num}:x));}}>Editar</Button><Button variant="ghost" size="sm" onClick={()=>{if(confirm("Excluir investimento?"))setAdSpends(s=>s.filter(x=>x.id!==a.id));}}>Excluir</Button></div></div>)}</div>}
  </Panel>
  <Alert tone="info">ROAS e ACOS não são calculados somente com faturamento total; será necessário importar a receita atribuída aos anúncios.</Alert>
 </AppShell>;
}