import { describe, expect, it } from "vitest";
import { formatCurrencyAmount, formatDateRegional, getCurrencyCode, getCurrencyConfig } from "./currency";

describe("currency formatting", () => {
  it("maps legacy symbols to supported currency codes", () => {
    expect(getCurrencyCode("$")).toBe("USD");
    expect(getCurrencyCode("€")).toBe("EUR");
    expect(getCurrencyConfig("COP").fractionDigits).toBe(0);
  });

  it("formats display-only currency without converting numeric values", () => {
    expect(formatCurrencyAmount(1500, "USD")).toBe("$1,500.00");
    expect(formatCurrencyAmount(1500, "EUR")).toBe("1.500,00\u00a0€");
    expect(formatCurrencyAmount(1500000, "COP")).toBe("COP 1.500.000");
    expect(formatCurrencyAmount(1500000, "ARS")).toBe("ARS 1.500.000");
  });

  it("formats dates using the selected currency region", () => {
    expect(formatDateRegional("2026-05-29", "USD")).toContain("May");
    expect(formatDateRegional("2026-05-29", "COP")).toContain("2026");
  });
});
