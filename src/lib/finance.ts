// Motor de cálculo financeiro. Valores internos sem arredondamento; arredondar só na exibição.

export type Marketplace = "Mercado Livre" | "Shopee" | "Amazon" | "Magalu" | "Site próprio" | "Outros";
export const MARKETPLACES: Marketplace[] = ["Mercado Livre", "Shopee", "Amazon", "Magalu", "Site próprio", "Outros"];

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  marketplace: Marketplace;
  active: boolean;
  purchasePrice: number;
  acquisitionFreight: number;
  packaging: number;
  otherProductCosts: number;
  salePrice: number;
  commissionPct: number;
  fixedFee: number;
  subsidizedFreight: number;
  taxPct: number;
  adsMode: "pct" | "unit";
  adsValue: number;
  otherSellingCosts: number;
  monthlyQty: number;
  demo?: boolean;
  costConfirmed?: boolean;
}

export type Frequency = "mensal" | "trimestral" | "anual";
export interface FixedCost {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: Frequency;
  startDate: string;
  active: boolean;
  notes: string;
  demo?: boolean;
}

export interface MarginThresholds {
  low: number; // MC% abaixo disso = baixa
}

const n = (v: number) => (Number.isFinite(v) ? v : 0);

export function cmv(p: Product) {
  return n(p.purchasePrice) + n(p.acquisitionFreight);
}

export function variableBreakdown(p: Product) {
  const price = n(p.salePrice);
  const commission = (price * n(p.commissionPct)) / 100;
  const tax = (price * n(p.taxPct)) / 100;
  const ads = p.adsMode === "pct" ? (price * n(p.adsValue)) / 100 : n(p.adsValue);
  return {
    cmv: cmv(p),
    packaging: n(p.packaging),
    otherProduct: n(p.otherProductCosts),
    commission,
    fixedFee: n(p.fixedFee),
    subsidizedFreight: n(p.subsidizedFreight),
    tax,
    ads,
    otherSelling: n(p.otherSellingCosts),
  };
}

export function variableCost(p: Product) {
  return Object.values(variableBreakdown(p)).reduce((a, b) => a + b, 0);
}

export function unitMargin(p: Product) {
  const vc = variableCost(p);
  const mc = n(p.salePrice) - vc;
  const mcPct = p.salePrice > 0 ? (mc / p.salePrice) * 100 : 0;
  const markup = cmv(p) > 0 ? p.salePrice / cmv(p) : 0; // markup sobre o CMV
  return { variableCost: vc, mc, mcPct, markup };
}

export function monthlyEquivalent(c: FixedCost) {
  const a = Math.max(0, n(c.amount));
  if (c.frequency === "trimestral") return a / 3;
  if (c.frequency === "anual") return a / 12;
  return a;
}

export function totalFixed(costs: FixedCost[]) {
  return costs.filter((c) => c.active).reduce((s, c) => s + monthlyEquivalent(c), 0);
}

export interface MixRow {
  product: Product;
  qty: number;
  revenue: number;
  variableTotal: number;
  mcUnit: number;
  mcTotal: number;
  volumeShare: number;
  revenueShare: number;
  mcShare: number;
}

export interface Mix {
  rows: MixRow[];
  revenue: number;
  variableTotal: number;
  mcTotal: number;
  units: number;
  weightedPct: number; // decimal 0..1
  avgUnitMc: number;
  valid: boolean;
}

export function computeMix(products: Product[]): Mix {
  const base = products
    .filter((p) => p.active && p.monthlyQty > 0)
    .map((p) => {
      const { mc, variableCost: vc } = unitMargin(p);
      const qty = Math.max(0, n(p.monthlyQty));
      return { product: p, qty, revenue: p.salePrice * qty, variableTotal: vc * qty, mcUnit: mc, mcTotal: mc * qty };
    });
  const revenue = base.reduce((s, r) => s + r.revenue, 0);
  const variableTotal = base.reduce((s, r) => s + r.variableTotal, 0);
  const mcTotal = base.reduce((s, r) => s + r.mcTotal, 0);
  const units = base.reduce((s, r) => s + r.qty, 0);
  const rows: MixRow[] = base.map((r) => ({
    ...r,
    volumeShare: units > 0 ? r.qty / units : 0,
    revenueShare: revenue > 0 ? r.revenue / revenue : 0,
    mcShare: mcTotal !== 0 ? r.mcTotal / mcTotal : 0,
  }));
  const weightedPct = revenue > 0 ? mcTotal / revenue : 0;
  const avgUnitMc = units > 0 ? mcTotal / units : 0;
  return { rows, revenue, variableTotal, mcTotal, units, weightedPct, avgUnitMc, valid: units > 0 && mcTotal > 0 };
}

export interface Target {
  feasible: boolean;
  revenue: number;
  units: number; // simplificado, arredondado para cima
  mcNeeded: number;
  perProduct: { product: Product; qty: number }[];
  distributedUnits: number;
  distributedRevenue: number;
  distributedMc: number;
  adjusted: boolean;
}

/** Faturamento/unidades necessários para que a MC cubra fixos + lucro desejado, mantendo o mix. */
export function computeTarget(mix: Mix, fixed: number, profit = 0): Target {
  const mcNeeded = Math.max(0, fixed + profit);
  if (!mix.valid || mix.weightedPct <= 0 || mix.avgUnitMc <= 0) {
    return { feasible: false, revenue: 0, units: 0, mcNeeded, perProduct: [], distributedUnits: 0, distributedRevenue: 0, distributedMc: 0, adjusted: false };
  }
  const revenue = mcNeeded / mix.weightedPct;
  const exactUnits = mcNeeded / mix.avgUnitMc;
  const units = Math.ceil(exactUnits - 1e-9);
  const perProduct = mix.rows.map((r) => ({ product: r.product, qty: Math.ceil(exactUnits * r.volumeShare - 1e-9) }));
  const mcOf = () => perProduct.reduce((s, x) => s + x.qty * unitMargin(x.product).mc, 0);
  let adjusted = false;
  // Se o arredondamento não cobrir (ex.: produtos com MC negativa), adicionar unidades do melhor produto.
  const best = perProduct.reduce((b, x) => (unitMargin(x.product).mc > unitMargin(b.product).mc ? x : b), perProduct[0]);
  let guard = 0;
  while (mcOf() + 1e-6 < mcNeeded && unitMargin(best.product).mc > 0 && guard++ < 100000) {
    best.qty += 1;
    adjusted = true;
  }
  return {
    feasible: true,
    revenue,
    units,
    mcNeeded,
    perProduct,
    distributedUnits: perProduct.reduce((s, x) => s + x.qty, 0),
    distributedRevenue: perProduct.reduce((s, x) => s + x.qty * x.product.salePrice, 0),
    distributedMc: mcOf(),
    adjusted,
  };
}

export function summary(products: Product[], costs: FixedCost[], profitGoal = 0, fixedOverride?: number) {
  const mix = computeMix(products);
  const fixed = fixedOverride ?? totalFixed(costs);
  const breakeven = computeTarget(mix, fixed, 0);
  const goal = computeTarget(mix, fixed, profitGoal);
  const operating = mix.mcTotal - fixed;
  const safetyMargin = mix.revenue > 0 && breakeven.feasible ? ((mix.revenue - breakeven.revenue) / mix.revenue) * 100 : null;
  const operatingMarginPct = mix.revenue > 0 ? (operating / mix.revenue) * 100 : 0;
  const progress = breakeven.feasible && breakeven.revenue > 0 ? Math.min(999, (mix.revenue / breakeven.revenue) * 100) : 0;
  return { mix, fixed, breakeven, goal, operating, operatingMarginPct, safetyMargin, progress };
}

export function marginLevel(mcPct: number, t: MarginThresholds): "negative" | "low" | "healthy" {
  if (mcPct <= 0) return "negative";
  if (mcPct < t.low) return "low";
  return "healthy";
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const num = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtBRL = (v: number) => brl.format(Number.isFinite(v) ? v : 0);
export const fmtNum = (v: number) => num.format(Number.isFinite(v) ? v : 0);
export const fmtPct = (v: number) => `${pct.format(Number.isFinite(v) ? v : 0)}%`;
