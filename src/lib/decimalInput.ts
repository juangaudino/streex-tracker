export function normalizeDecimalDraft(value: string, fractionDigits = 2): string | null {
  const normalized = value.replace(",", ".");
  const pattern = new RegExp(`^\\d*(?:\\.\\d{0,${fractionDigits}})?$`);
  return pattern.test(normalized) ? normalized : null;
}

export function parseDecimalDraft(value: string): number | null {
  if (value === "" || value === ".") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
