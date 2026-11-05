import type { Product, FixedCost } from "./finance";
import { totalFixed, unitMargin } from "./finance";
import type { SaleRecord, AdSpend, MonthClose } from "./market-report";
export interface MonthSummary {
  month: string; orders: number; units: number; revenue: number; payout: number; saleFees: number; shippingFees: number;
  adjustments: number; cmv: number; otherVariable: number; ads: number; fixed: number; contribution: number;
  contributionPct: number; operating: number; breakeven: number | null; pending: number; provisional: number;
  discrepancies: number; cancelled: number; rows: ProductSummary[];
}
export interface ProductSummary {
  sku: string; name: string; qty: number; revenue: number; payout: number; cost: number; contribution: number;
  mcPct: number; pending: boolean;
}
export function summarizeMonth(month: string, sales: SaleRecord[], products: Product[], ads: AdSpend[], costs: FixedCost[]): MonthSummary {
  const monthly = sales.filter(r => r.month === month);
  const valid = monthly.filter(r => !r.cancelled);
  const productsBySku = new Map(products.filter(p => p.marketplace === "Mercado Livre").map(p => [p.sku, p]));
  const rowsMap = new Map<string, ProductSummary>();
  let revenue=0,payout=0,saleFees=0,shippingFees=0,adjustments=0,cmv=0,otherVariable=0,pending=0,provisional=0,discrepancies=0,units=0;
  for (const r of valid) {
    revenue+=r.revenue; payout+=r.payout; saleFees+=r.saleFee; shippingFees+=r.shippingFee; adjustments+=r.adjustments; units+=r.qty;
    if (r.provisional) provisional++;
    if (Math.abs(r.discrepancy)>0.02) discrepancies++;
    const p=productsBySku.get(r.sku);
    // Custo zero é válido, mas sem custo informado exige confirmação.
    const missing=!r.sku || !p || !("costConfirmed" in p && p.costConfirmed === true);
    if (missing) pending++;
    const unitCost=p ? p.purchasePrice + p.acquisitionFreight : 0;
    const extra=p ? p.packaging + p.otherProductCosts + p.otherSellingCosts : 0;
    const cost=unitCost*r.qty, other=extra*r.qty;
    cmv+=cost;otherVariable+=other;
    const key=r.sku || "sem-sku:"+r.listing;
    const existing=rowsMap.get(key) ?? {sku:r.sku,name:r.name,qty:0,revenue:0,payout:0,cost:0,contribution:0,mcPct:0,pending:false};
    existing.qty+=r.qty;existing.revenue+=r.revenue;existing.payout+=r.payout;existing.cost+=cost+other;
    existing.contribution+=r.revenue+r.saleFee+r.shippingFee+r.adjustments-cost-other;
    existing.pending ||= missing;
    existing.mcPct=existing.revenue ? existing.contribution/existing.revenue*100 : 0;
    rowsMap.set(key,existing);
  }
  const adsTotal=ads.filter(a=>a.month===month).reduce((sum,a)=>sum+a.amount,0);
  const fixed=totalFixed(costs); // previsão mensal corrente; valor oficial fica congelado no fechamento.
  const contribution=revenue+saleFees+shippingFees+adjustments-cmv-otherVariable-adsTotal;
  const contributionPct=revenue ? contribution/revenue*100 : 0;
  return {month,orders:new Set(valid.map(x=>x.saleId)).size,units,revenue,payout,saleFees,shippingFees,adjustments,
    cmv,otherVariable,ads:adsTotal,fixed,contribution,contributionPct,
    operating:contribution-fixed,breakeven:contributionPct>0 ? fixed/(contributionPct/100) : null,
    pending,provisional,discrepancies,cancelled:monthly.length-valid.length,
    rows:[...rowsMap.values()].sort((a,b)=>b.revenue-a.revenue)};
}
export function snapshotMonth(r: MonthSummary): MonthClose {
  return {month:r.month,closedAt:new Date().toISOString(),revenue:r.revenue,payout:r.payout,cmv:r.cmv,
    variableCosts:-(r.saleFees+r.shippingFees+r.adjustments)+r.otherVariable,
    ads:r.ads,fixed:r.fixed,contribution:r.contribution,operating:r.operating,orders:r.orders,units:r.units,pending:r.pending};
}
