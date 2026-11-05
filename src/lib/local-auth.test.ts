import { describe, expect, it } from "vitest";
import { financeKeyForAccount, passwordValid } from "./local-auth";

describe("Acesso local para protótipo", () => {
  it("exige pelo menos seis caracteres, uma letra e um número", () => {
    expect(passwordValid("rods123")).toBe(true);
    expect(passwordValid("abc123")).toBe(true);
    expect(passwordValid("123456")).toBe(false);
    expect(passwordValid("abcdef")).toBe(false);
    expect(passwordValid("rod1")).toBe(false);
  });
  it("usa áreas de armazenamento diferentes por conta", () => {
    expect(financeKeyForAccount("conta-a")).not.toBe(financeKeyForAccount("conta-b"));
  });
});
