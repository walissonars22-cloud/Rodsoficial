import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Kpi, Panel, Alert } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/lib/store";
import { csvMatrix, parseSalesTable, type SaleRecord } from "@/lib/market-report";
import { fmtBRL } from "@/lib/finance";

export const Route = createFileRoute("/importar")({component: Importar});
function Importar() {
  const {sales,importSales,products}=useFinance();
  const [parsed,setParsed]=useState<SaleRecord[]>([]);
  const [warnings,setWarnings]=useState<string[]>([]);
  const [error,setError]=useState("");
  const [filename,setFilename]=useState("");
  const [busy,setBusy]=useState(false);
  async function load(file:File){
    setBusy(true);setError("");setParsed([]);setFilename(file.name);
    try {
      let matrix:unknown[][];
      if (/\.csv$/i.test(file.name)) matrix=csvMatrix(await file.text());
      else if (/\.xlsx$/i.test(file.name)) {
        const {default:readXlsxFile}=await import("read-excel-file");
        matrix=await readXlsxFile(file) as unknown[][];
      } else throw new Error("Formato não suportado. Use .csv ou .xlsx.");
      const result=parseSalesTable(matrix);
      if(!result.records.length) throw new Error("Nenhuma venda válida encontrada no arquivo.");
      setParsed(result.records);
      setWarnings(result.warnings);
    } catch(e){setError(e instanceof Error?e.message:"Não foi possível ler o arquivo.");}
    finally{setBusy(false);}
  }
  const existing=new Set(sales.map(x=>x.key));
  const newCount=parsed.filter(x=>!existing.has(x.key)).length;
  const skuNew=new Set(parsed.filter(x=>x.sku && !products.some(p=>p.sku===x.sku&&p.marketplace==="Mercado Livre")).map(x=>x.sku));
  return <AppShell title="Importar vendas" subtitle="Importe o relatório detalhado de vendas do Mercado Livre; não armazenamos dados do comprador">
    <Panel title="1. Selecionar relatório" hint="Aceita CSV e Excel XLSX. O relatório deve conter as colunas N.º de venda, SKU, unidades, receita e tarifas.">
      <input type="file" accept=".csv,.xlsx" disabled={busy} onChange={e=>e.target.files?.[0]&&void load(e.target.files[0])} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"/>
      {busy&&<p className="mt-3 text-sm">Lendo arquivo...</p>}
      {error&&<div className="mt-3"><Alert>{error}</Alert></div>}
      {filename&&<p className="mt-2 text-xs text-muted-foreground">Arquivo selecionado: {filename}</p>}
    </Panel>
    {parsed.length>0&&<>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Linhas identificadas" value={String(parsed.length)}/>
        <Kpi label="Vendas novas" value={String(newCount)}/>
        <Kpi label="Novos SKUs" value={String(skuNew.size)}/>
      </div>
      <Panel title="2. Conferir prévia" hint="As tarifas são mantidas com os sinais do Mercado Livre; o repasse não é lucro.">
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Venda</th><th className="p-2">SKU</th><th className="p-2">Data</th><th className="p-2">Receita dos produtos</th><th className="p-2">Tarifa de venda Mercado Livre</th><th className="p-2">Tarifa de envio</th><th className="p-2">Repasse do Mercado Livre</th></tr></thead>
          <tbody>{parsed.slice(0,30).map((s,i)=><tr key={s.key+i} className="border-b"><td className="p-2">{s.saleId}</td><td className="p-2">{s.sku||"Sem SKU"}</td><td className="p-2">{s.date}</td><td className="p-2">{fmtBRL(s.revenue)}</td><td className="p-2">{fmtBRL(s.saleFee)}</td><td className="p-2">{fmtBRL(s.shippingFee)}</td><td className="p-2">{fmtBRL(s.payout)}</td></tr>)}</tbody></table>
        </div>
        {parsed.length>30&&<p className="mt-2 text-xs text-muted-foreground">Exibindo apenas as primeiras 30 linhas.</p>}
        {warnings.map((w,i)=><div className="mt-2" key={i}><Alert>{w}</Alert></div>)}
        {parsed.some(x=>x.cancelled)&&<Alert>As linhas canceladas/devolvidas serão excluídas da análise operacional preliminar até conferência dos estornos.</Alert>}
        <div className="mt-4 flex gap-3"><Button onClick={()=>{importSales(parsed);setParsed([]);}} disabled={!parsed.length}>3. Confirmar importação</Button><Button variant="outline" onClick={()=>setParsed([])}>Cancelar</Button></div>
      </Panel>
    </>}
    <Panel title="Relatórios já importados" hint="A importação de um mesmo item atualiza seus dados em vez de duplicá-lo.">
      <p className="text-sm">{sales.length} linhas armazenadas em {new Set(sales.map(x=>x.month)).size} meses.</p>
      <p className="mt-2 text-sm">Após importar, confira os custos dos produtos em <Link to="/produtos" className="font-semibold underline">Produtos e preços</Link> e registre os investimentos em <Link to="/ads" className="font-semibold underline">Mercado Ads</Link>.</p>
    </Panel>
  </AppShell>;
}