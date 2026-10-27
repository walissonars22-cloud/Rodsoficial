import { describe, it, expect } from "vitest";
import { computeMix, computeTarget, monthlyEquivalent, summary, unitMargin, type Product, type FixedCost } from "./finance";

const prod = (o: Partial<Product>): Product => ({
  id: Math.random().toString(), name: "P", sku: "", category: "", marketplace: "Mercado Livre", active: true,
  purchasePrice: 0, acquisitionFreight: 0, packaging: 0, otherProductCosts: 0, salePrice: 0, commissionPct: 0,
  fixedFee: 0, subsidizedFreight: 0, taxPct: 0, adsMode: "pct", adsValue: 0, otherSellingCosts: 0, monthlyQty: 0, ...o,
});
const cost = (amount: number, frequency: FixedCost["frequency"] = "mensal"): FixedCost => ({
  id: "c", name: "c", category: "", amount, frequency, startDate: "", active: true, notes: "",
});

describe("margem unitária", () => {
  it("abate todos os custos variáveis do preço", () => {
    // 100 venda; 40 compra; 5 frete; 2 emb; 12% comissão; 6 tarifa; 10% imposto; 5% ads
    const p = prod({ salePrice: 100, purchasePrice: 40, acquisitionFreight: 5, packaging: 2, commissionPct: 12, fixedFee: 6, taxPct: 10, adsValue: 5 });
    const m = unitMargin(p);
    expect(m.variableCost).toBeCloseTo(80);
    expect(m.mc).toBeCloseTo(20);
    expect(m.mcPct).toBeCloseTo(20);
    expect(m.markup).toBeCloseTo(100 / 45);
  });
  it("ADS em R$ por unidade", () => {
    expect(unitMargin(prod({ salePrice: 50, adsMode: "unit", adsValue: 3 })).mc).toBeCloseTo(47);
  });
});

describe("custos fixos", () => {
  it("converte trimestral e anual para mensal", () => {
    expect(monthlyEquivalent(cost(300, "trimestral"))).toBe(100);
    expect(monthlyEquivalent(cost(1200, "anual"))).toBe(100);
  });
});

describe("mix ponderado e ponto de equilíbrio", () => {
  // A: preço 100, MC 40, qtd 10 → fat 1000, MC 400
  // B: preço 50, MC 10, qtd 30 → fat 1500, MC 300
  const A = prod({ salePrice: 100, purchasePrice: 60, monthlyQty: 10 });
  const B = prod({ salePrice: 50, purchasePrice: 40, monthlyQty: 30 });
  it("usa MC ponderada, não média simples", () => {
    const mix = computeMix([A, B]);
    expect(mix.revenue).toBe(2500);
    expect(mix.mcTotal).toBe(700);
    expect(mix.weightedPct).toBeCloseTo(0.28); // média simples seria 30%
    expect(mix.avgUnitMc).toBeCloseTo(17.5);
  });
  it("PE em R$ e unidades", () => {
    const t = computeTarget(computeMix([A, B]), 1400);
    expect(t.revenue).toBeCloseTo(5000);
    expect(t.units).toBe(80);
    expect(t.distributedMc).toBeGreaterThanOrEqual(1400);
  });
  it("meta de lucro", () => {
    const t = computeTarget(computeMix([A, B]), 1400, 700);
    expect(t.revenue).toBeCloseTo(7500);
  });
  it("margem de segurança negativa abaixo do PE", () => {
    const s = summary([A, B], [cost(1400)]);
    expect(s.operating).toBe(-700);
    expect(s.safetyMargin).toBeCloseTo(-100);
  });
  it("inviável quando MC ponderada <= 0", () => {
    const t = computeTarget(computeMix([prod({ salePrice: 10, purchasePrice: 20, monthlyQty: 5 })]), 100);
    expect(t.feasible).toBe(false);
  });
});
