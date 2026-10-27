import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { FixedCost, MarginThresholds, Product } from "./finance";

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
}

interface Ctx extends State {
  ready: boolean;
  setProducts: (f: (p: Product[]) => Product[]) => void;
  setCosts: (f: (c: FixedCost[]) => FixedCost[]) => void;
  setThresholds: (t: MarginThresholds) => void;
  setProfitGoal: (v: number) => void;
  clearDemo: () => void;
  loadDemo: () => void;
}

const KEY = "gestao-fin-v1";
const initial: State = { products: demoProducts, costs: demoCosts, thresholds: { low: 15 }, profitGoal: 5000 };
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
