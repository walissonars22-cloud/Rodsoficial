import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { FixedCost, MarginThresholds, Product } from "./finance";
import type { SaleRecord, AdSpend, MonthClose } from "./market-report";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const emptyProduct = (): Product => ({
  id: uid(), name: "", sku: "", category: "", marketplace: "Mercado Livre", active: true,
  purchasePrice: 0, acquisitionFreight: 0, packaging: 0, otherProductCosts: 0, salePrice: 0,
  commissionPct: 0, fixedFee: 0, subsidizedFreight: 0, taxPct: 0, adsMode: "pct", adsValue: 0,
  otherSellingCosts: 0, monthlyQty: 0,
});

export const emptyCost = (): FixedCost => ({
  id: uid(), name: "", category: "Outras despesas administrativas", amount: 0, frequency: "mensal",
  startDate: new Date().toISOString().slice(0, 10), active: true, notes: "",
});

const demoProducts: Product[] = [
  { ...emptyProduct(), id: "d1", demo: true, name: "Fone Bluetooth X2", sku: "FON-X2", category: "Eletrônicos", purchasePrice: 38, acquisitionFreight: 3, packaging: 2.5, salePrice: 119.9, commissionPct: 14, fixedFee: 0, subsidizedFreight: 12, taxPct: 8, adsValue: 5, monthlyQty: 120 },
  { ...emptyProduct(), id: "d2", demo: true, name: "Capinha Silicone", sku: "CAP-SIL", category: "Acessórios", marketplace: "Shopee", purchasePrice: 4.2, acquisitionFreight: 0.5, packaging: 0.8, salePrice: 29.9, commissionPct: 20, fixedFee: 4, taxPct: 8, adsValue: 3, monthlyQty: 300 },
  { ...emptyProduct(), id: "d3", demo: true, name: "Carregador Turbo 30W", sku: "CAR-30W", category: "Eletrônicos", purchasePrice: 22, acquisitionFreight: 2, packaging: 1.5, salePrice: 69.9, commissionPct: 14, fixedFee: 6.75, taxPct: 8, adsValue: 6, monthlyQty: 150 },
  { ...emptyProduct(), id: "d4", demo: true, name: "Smartwatch Fit", sku: "SMW-FIT", category: "Eletrônicos", marketplace: "Amazon", purchasePrice: 95, acquisitionFreight: 6, packaging: 3, salePrice: 249.9, commissionPct: 13, subsidizedFreight: 18, taxPct: 8, adsMode: "unit", adsValue: 10, monthlyQty: 40 },
];

const demoCosts: FixedCost[] = [
  { ...emptyCost(), id: "c1", demo: true, name: "Aluguel do galpão", category: "Aluguel", amount: 2500 },
  { ...emptyCost(), id: "c2", demo: true, name: "Pró-labore", category: "Pró-labore", amount: 4000 },
  { ...emptyCost(), id: "c3", demo: true, name: "Contabilidade", category: "Contabilidade", amount: 600 },
  { ...emptyCost(), id: "c4", demo: true, name: "ERP", category: "Sistema ERP", amount: 250 },
  { ...emptyCost(), id: "c5", demo: true, name: "Certificado digital", category: "Software e assinaturas", amount: 240, frequency: "anual" },
];

interface State {
  products: Product[];
  costs: FixedCost[];
  thresholds: MarginThresholds;
  profitGoal: number;
  sales: SaleRecord[];
  adSpends: AdSpend[];
  monthCloses: MonthClose[];
}

interface Ctx extends State {
  ready: boolean;
  importSales: (incoming: SaleRecord[]) => void;
  setAdSpends: (f: (rows: AdSpend[]) => AdSpend[]) => void;
  closeMonth: (snapshot: MonthClose) => void;
  reopenMonth: (month: string) => void;
  setProducts: (f: (p: Product[]) => Product[]) => void;
  setCosts: (f: (c: FixedCost[]) => FixedCost[]) => void;
  setThresholds: (t: MarginThresholds) => void;
  setProfitGoal: (v: number) => void;
  clearDemo: () => void;
  loadDemo: () => void;
}

const KEY = "gestao-fin-v1";
const initial: State = { products: demoProducts, costs: demoCosts, thresholds: { low: 15 }, profitGoal: 5000, sales: [], adSpends: [], monthCloses: [] };
const FinanceCtx = createContext<Ctx | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);

  const value: Ctx = {
    ...state,
    ready,
    importSales: (incoming) => setState(s => {
      const byKey = new Map(s.sales.map(r => [r.key, r]));
      for (const item of incoming) byKey.set(item.key, item);
      const products = [...s.products];
      const allSales = [...byKey.values()];
      const latestMonth = allSales.reduce((best, r) => r.month > best ? r.month : best, "");
      const active = allSales.filter(r => r.month === latestMonth && !r.cancelled && r.sku);
      const skus = new Set(allSales.filter(r => r.sku).map(r => r.sku));
      for (const sku of skus) {
        const line = allSales.find(r => r.sku === sku)!;
        let product = products.find(p => p.sku === sku && p.marketplace === "Mercado Livre");
        if (!product) {
          product = { ...emptyProduct(), sku, name: line.name || sku };
          products.push(product);
        }
        const salesForSku = active.filter(r => r.sku === sku);
        const qty = salesForSku.reduce((sum, r) => sum + r.qty, 0);
        const revenue = salesForSku.reduce((sum, r) => sum + r.revenue, 0);
        if (qty > 0) {
          product.monthlyQty = qty;
          product.salePrice = revenue / qty;
        }
      }
      return { ...s, sales: allSales, products };
    }),
    setAdSpends: f => setState(s => ({ ...s, adSpends: f(s.adSpends) })),
    closeMonth: snapshot => setState(s => ({ ...s, monthCloses: [...s.monthCloses.filter(x => x.month !== snapshot.month), snapshot] })),
    reopenMonth: month => setState(s => ({ ...s, monthCloses: s.monthCloses.filter(x => x.month !== month) })),
    setProducts: (f) => setState((s) => ({ ...s, products: f(s.products) })),
    setCosts: (f) => setState((s) => ({ ...s, costs: f(s.costs) })),
    setThresholds: (thresholds) => setState((s) => ({ ...s, thresholds })),
    setProfitGoal: (profitGoal) => setState((s) => ({ ...s, profitGoal })),
    clearDemo: () => setState((s) => ({ ...s, products: s.products.filter((p) => !p.demo), costs: s.costs.filter((c) => !c.demo) })),
    loadDemo: () => setState((s) => ({ ...s, products: [...s.products.filter((p) => !p.demo), ...demoProducts], costs: [...s.costs.filter((c) => !c.demo), ...demoCosts] })),
  };
  return <FinanceCtx.Provider value={value}>{children}</FinanceCtx.Provider>;
}

export function useFinance() {
  const c = useContext(FinanceCtx);
  if (!c) throw new Error("useFinance fora do FinanceProvider");
  return c;
}
