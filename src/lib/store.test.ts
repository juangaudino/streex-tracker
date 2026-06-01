import { describe, expect, it } from "vitest";
import { formatDate } from "./store";

describe("store date helpers", () => {
  it("formats dates from local calendar parts", () => {
    expect(formatDate(new Date(2026, 4, 31, 23, 30))).toBe("2026-05-31");
  });
});
