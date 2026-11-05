/** Importador de relatórios de vendas do Mercado Livre. Não persiste dados pessoais. */
export interface SaleRecord {
  key: string; saleId: string; date: string; month: string; sku: string; listing: string;
  name: string; qty: number; revenue: number; saleFee: number; shippingFee: number;
  adjustments: number; payout: number; status: string; cancelled: boolean;
  provisional: boolean; discrepancy: number;
}
export interface AdSpend { id: string; month: string; name: string; amount: number; }
export interface MonthClose {
  month: string; closedAt: string; revenue: number; payout: number; cmv: number;
  variableCosts: number; ads: number; fixed: number; contribution: number;
  operating: number; orders: number; units: number; pending: number;
}
export const money = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").replace(/[^\d,.-]/g, "").trim();
  if (!s) return 0;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(normalized) || 0;
};
export const normal = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9#]+/g, " ").trim();
export const dateISO = (v: unknown): string => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 25000 && v < 90000) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const br = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (br) return [br[3], br[2].padStart(2, "0"), br[1].padStart(2, "0")].join("-");
  const written = normal(s).match(/^(\d{1,2}) de ([a-z]+) de (\d{4})/);
  const months: Record<string, string> = { janeiro:"01",fevereiro:"02",marco:"03",abril:"04",maio:"05",junho:"06",julho:"07",agosto:"08",setembro:"09",outubro:"10",novembro:"11",dezembro:"12" };
  if (written && months[written[2]]) return written[3] + "-" + months[written[2]] + "-" + written[1].padStart(2, "0");
  return "";
};
const names: Record<string, string[]> = {
  saleId:["n de venda","numero de venda","n venda"],
  date:["data de venda"],
  sku:["sku"],
  listing:["# de anuncio","numero de anuncio"],
  name:["titulo do anuncio"],
  qty:["unidades"],
  revenue:["receita por produtos brl","receita por produtos"],
  saleFee:["tarifa de venda e impostos brl","tarifa de venda e impostos"],
  shippingFee:["tarifas de envio brl","tarifas de envio"],
  payout:["total brl","total"],
  status:["estado"],
  refunds:["cancelamentos e reembolsos brl","cancelamentos e reembolsos"],
  shippingRevenue:["receita por envio brl","receita por envio"],
  surcharge:["receita por acrescimo no preco pago pelo comprador"],
  surchargeFee:["taxa de parcelamento equivalente ao acrescimo"],
  discounts:["descontos e bonus"]
};
export interface ParseResult { records: SaleRecord[]; warnings: string[]; rejected: number; }
function headerIndex(cells: unknown[]): Record<string, number> {
  const h = cells.map(normal), found: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(names)) {
    const indexes = h.flatMap((x,i) => aliases.includes(x) ? [i] : []);
    // "Unidades" pode se repetir nas seções de devoluções e reclamações: usar a primeira.
    if (indexes.length) found[key] = indexes[0];
  }
  return found;
}
export function parseSalesTable(rows: unknown[][]): ParseResult {
  const warnings: string[] = [];
  const headerRow = rows.findIndex(r => {
    const m = headerIndex(r);
    return m.saleId !== undefined && m.date !== undefined && m.revenue !== undefined && m.sku !== undefined;
  });
  if (headerRow < 0) throw new Error("Cabeçalho não reconhecido. Exporte o relatório detalhado de vendas do Mercado Livre.");
  const idx = headerIndex(rows[headerRow]);
  for (const required of ["saleId","date","sku","qty","revenue","saleFee","shippingFee","payout"]) {
    if (idx[required] === undefined) throw new Error("Coluna obrigatória ausente: " + required);
  }
  const out: SaleRecord[] = [], seen = new Set<string>();
  let rejected=0;
  for (const row of rows.slice(headerRow + 1)) {
    const get = (name: string): unknown => idx[name] === undefined ? "" : row[idx[name]];
    const saleId=String(get("saleId") ?? "").trim();
    const date=dateISO(get("date"));
    if (!saleId || !date) { if (row.some(v => String(v ?? "").trim())) rejected++; continue; }
    const sku=String(get("sku") ?? "").trim();
    const listing=String(get("listing") ?? "").trim();
    const qty=money(get("qty"));
    const name=String(get("name") ?? "").trim();
    const revenue=money(get("revenue"));
    const saleFee=money(get("saleFee"));
    const shippingFee=money(get("shippingFee"));
    const payout=money(get("payout"));
    const adjustments=money(get("refunds"))+money(get("shippingRevenue"))+money(get("surcharge"))+money(get("surchargeFee"))+money(get("discounts"));
    const status=String(get("status") ?? "");
    const cancelled=/cancelad|devolvid|reembolsad/i.test(normal(status));
    const key=[saleId,sku || listing,name,qty].join("|");
    if (seen.has(key)) { rejected++; continue; }
    seen.add(key);
    const discrepancy=+(payout-revenue-saleFee-shippingFee-adjustments).toFixed(2);
    out.push({key,saleId,date,month:date.slice(0,7),sku,listing,name,qty,revenue,saleFee,shippingFee,adjustments,payout,status,cancelled,provisional:!cancelled && !/entregue|concluid|finalizad/i.test(normal(status)),discrepancy});
  }
  if (rejected) warnings.push(rejected+" linhas ignoradas (vazias, inválidas ou duplicadas no arquivo).");
  const diffs=out.filter(x=>Math.abs(x.discrepancy)>0.02).length;
  if (diffs) warnings.push(diffs+" linhas não conciliam com o Repasse do Mercado Livre; confira outros ajustes do relatório.");
  if (out.some(x=>!x.sku)) warnings.push("Há vendas sem SKU. Elas exigem vinculação manual antes de calcular o CMV.");
  if (out.some(x=>x.cancelled)) warnings.push("Vendas canceladas/devolvidas requerem conferência dos estornos antes do fechamento.");
  return {records:out,warnings,rejected};
}
/** CSV respeitando aspas e quebras de linha, inclusive delimitador interno. */
export function csvMatrix(text: string): string[][] {
  const first=text.replace(/^\uFEFF/,"").split(/\r?\n/,1)[0] || "";
  const sep=(first.match(/;/g)||[]).length >= (first.match(/,/g)||[]).length ? ";" : ",";
  const rows:string[][]=[];let row:string[]=[], cell="",quote=false;
  for(let i=0;i<text.length;i++){
    const c=text[i]; if(c==='"'){if(quote && text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}
    else if(c===sep&&!quote){row.push(cell);cell="";}
    else if((c==="\n"||c==="\r")&&!quote){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell="";}
    else cell+=c;
  }
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}
