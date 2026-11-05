import {describe,it,expect} from "vitest";
import {csvMatrix,parseSalesTable} from "./market-report";
import {summarizeMonth} from "./report-finance";
import {emptyProduct} from "./store";
describe("Importação Mercado Livre",()=>{
 it("reconhece cabeçalho N.º de venda usado pelo Excel do ML",()=>{ const input=["N.º de venda","Data de venda","Unidades","Receita por produtos (BRL)","Tarifa de venda e impostos (BRL)","Tarifas de envio (BRL)","Total (BRL)","SKU"]; const value=["2000015798208491","31 de outubro de 2026 17:57 hs.",2,39.98,-4.8,-13.71,21.47,"AP1222"]; expect(parseSalesTable([["Vendas","Publicidade"],input,value]).records[0]?.payout).toBe(21.47); });
 const header=["N.º de venda","Data de venda","Estado","Unidades","Receita por produtos (BRL)","Tarifa de venda e impostos (BRL)","Tarifas de envio (BRL)","Total (BRL)","SKU","# de anúncio","Título do anúncio"];
 const row=["2000015798208491","31 de outubro de 2026 17:57 hs.","A caminho",2,"39,98","-4,8","-13,71","21,47","AP1222","MLB5070721919","Difusor Painel Corsa"];
 it("interpreta data brasileira, tarifa e repasse sem confundir com lucro",()=>{
  const parsed=parseSalesTable([["Vendas","Publicidade"],header,row]);
  expect(parsed.records).toHaveLength(1);
  expect(parsed.records[0]).toMatchObject({month:"2026-10",sku:"AP1222",qty:2,revenue:39.98,saleFee:-4.8,shippingFee:-13.71,payout:21.47,provisional:true,discrepancy:0});
 });
 it("não duplica linhas idênticas na mesma importação",()=>{
  const r=parseSalesTable([header,row,row]);
  expect(r.records).toHaveLength(1);
 });
 it("calcula CMV separado do repasse e subtrai ADS uma só vez",()=>{
  const sale=parseSalesTable([header,row]).records[0]!;
  const product={...emptyProduct(),sku:"AP1222",purchasePrice:6,costConfirmed:true};
  const s=summarizeMonth("2026-10",[sale],[product],[{id:"a",month:"2026-10",name:"Campanha",amount:2}],[]);
  expect(s.payout).toBeCloseTo(21.47);
  expect(s.cmv).toBe(12);
  expect(s.contribution).toBeCloseTo(7.47);
  expect(s.operating).toBeCloseTo(7.47);
  expect(s.provisional).toBe(1);
 });
 it("lê CSV com aspas",()=>{
  expect(csvMatrix('SKU;Título do anúncio\nAP1222;"Difusor; Corsa"')[1]?.[1]).toBe("Difusor; Corsa");
 });
});