import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { FixedCost, MarginThresholds, Product } from "./finance";
import type { SaleRecord, AdSpend, MonthClose } from "./market-report";
import { useAuth } from "./local-auth";

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
  storageError: string | null;
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

const initial = (): State => ({ products: [], costs: [], thresholds: { low: 15 }, profitGoal: 0, sales: [], adSpends: [], monthCloses: [] });
const FinanceCtx = createContext<Ctx | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const accountId = user?.id ?? null;
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const key = accountId ? "rods-finance-account-v1:" + accountId : null;

  useEffect(() => {
    setReady(false);
    setStorageError(null);
    if (!key) {
      setState(initial());
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const incoming = JSON.parse(raw) as Partial<State>;
        const zero = initial();
        setState({
          products: Array.isArray(incoming.products) ? incoming.products : [],
          costs: Array.isArray(incoming.costs) ? incoming.costs : [],
          thresholds: incoming.thresholds ?? zero.thresholds,
          profitGoal: Number.isFinite(incoming.profitGoal) ? incoming.profitGoal! : 0,
          sales: Array.isArray(incoming.sales) ? incoming.sales : [],
          adSpends: Array.isArray(incoming.adSpends) ? incoming.adSpends : [],
          monthCloses: Array.isArray(incoming.monthCloses) ? incoming.monthCloses : [],
        });
      } else setState(initial());
      setReady(true);
    } catch {
      setStorageError("Não foi possível carregar os dados desta conta. Verifique o armazenamento do navegador.");
      setReady(false);
    }
  }, [key]);

  useEffect(() => {
    if (!key || !ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
      setStorageError(null);
    } catch {
      setStorageError("Não foi possível salvar. O armazenamento deste navegador pode estar cheio ou bloqueado.");
    }
  }, [key, ready, state]);

  const value: Ctx = {
    ...state,
    ready,
    storageError,
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
    loadDemo: () => {},
  };
  return <FinanceCtx.Provider value={value}>{children}</FinanceCtx.Provider>;
}

export function useFinance() {
  const c = useContext(FinanceCtx);
  if (!c) throw new Error("useFinance fora do FinanceProvider");
  return c;
}
