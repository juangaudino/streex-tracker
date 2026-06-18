import { describe, expect, it } from "vitest";
import { normalizeDecimalDraft, parseDecimalDraft } from "./decimalInput";

describe("decimal input drafts", () => {
  it("preserves intermediate decimal states while typing", () => {
    expect(normalizeDecimalDraft("12.")).toBe("12.");
    expect(normalizeDecimalDraft("0.75")).toBe("0.75");
    expect(normalizeDecimalDraft(".5")).toBe(".5");
  });

  it("normalizes locale decimal commas", () => {
    expect(normalizeDecimalDraft("48,75")).toBe("48.75");
  });

  it("rejects invalid money drafts and excess precision", () => {
    expect(normalizeDecimalDraft("12.345")).toBeNull();
    expect(normalizeDecimalDraft("12..5")).toBeNull();
    expect(normalizeDecimalDraft("$12.50")).toBeNull();
  });

  it("parses only complete non-negative numeric values", () => {
    expect(parseDecimalDraft("12.50")).toBe(12.5);
    expect(parseDecimalDraft(".75")).toBe(0.75);
    expect(parseDecimalDraft("12.")).toBe(12);
    expect(parseDecimalDraft("")).toBeNull();
    expect(parseDecimalDraft(".")).toBeNull();
    expect(parseDecimalDraft("-1")).toBeNull();
  });
});
