import { describe, expect, it } from "vitest";
import { passwordValid } from "./auth";
import { blankFinance } from "./finance-cloud";

describe("Cadastro e isolamento de contas", () => {
  it("aceita senha simples contendo letras e números", () => {
    expect(passwordValid("rods123")).toBe(true);
    expect(passwordValid("RodS2026")).toBe(true);
  });
  it("rejeita senhas sem letras, números ou tamanho mínimo", () => {
    expect(passwordValid("123456")).toBe(false);
    expect(passwordValid("abcdef")).toBe(false);
    expect(passwordValid("rod1")).toBe(false);
  });
  it("cada nova conta começa com os números zerados e listas vazias", () => {
    const a = blankFinance();
    const b = blankFinance();
    expect(a.products).toEqual([]);
    expect(a.costs).toEqual([]);
    expect(a.sales).toEqual([]);
    expect(a.adSpends).toEqual([]);
    expect(a.monthCloses).toEqual([]);
    expect(a.profitGoal).toBe(0);
    a.products.push({} as never);
    expect(b.products).toEqual([]);
  });
});
