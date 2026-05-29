export type SupportedCurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "MXN" | "COP" | "ARS";

export interface CurrencyConfig {
  code: SupportedCurrencyCode;
  label: string;
  locale: string;
  symbol: string;
  fractionDigits: number;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: "USD", label: "US Dollar", locale: "en-US", symbol: "$", fractionDigits: 2 },
  { code: "EUR", label: "Euro", locale: "de-DE", symbol: "€", fractionDigits: 2 },
  { code: "GBP", label: "British Pound", locale: "en-GB", symbol: "£", fractionDigits: 2 },
  { code: "CAD", label: "Canadian Dollar", locale: "en-CA", symbol: "CA$", fractionDigits: 2 },
  { code: "MXN", label: "Mexican Peso", locale: "es-MX", symbol: "MX$", fractionDigits: 2 },
  { code: "COP", label: "Colombian Peso", locale: "es-CO", symbol: "COP", fractionDigits: 0 },
  { code: "ARS", label: "Argentine Peso", locale: "es-AR", symbol: "ARS", fractionDigits: 0 },
];

const LEGACY_SYMBOL_TO_CODE: Record<string, SupportedCurrencyCode> = {
  "$": "USD",
  "US$": "USD",
  "€": "EUR",
  "£": "GBP",
  "CA$": "CAD",
  "MX$": "MXN",
  "COP": "COP",
  "ARS": "ARS",
};

export function getCurrencyConfig(value?: string | null): CurrencyConfig {
  const normalized = (value || "USD").trim().toUpperCase();
  const code = (SUPPORTED_CURRENCIES.some((c) => c.code === normalized)
    ? normalized
    : LEGACY_SYMBOL_TO_CODE[value?.trim() || "$"] || "USD") as SupportedCurrencyCode;
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0];
}

export function getCurrencyCode(value?: string | null): SupportedCurrencyCode {
  return getCurrencyConfig(value).code;
}

export function formatCurrencyAmount(value: number, currency?: string | null): string {
  const config = getCurrencyConfig(currency);
  const amount = Number.isFinite(value) ? value : 0;

  if (config.code === "COP" || config.code === "ARS") {
    const formatted = new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: config.fractionDigits,
      maximumFractionDigits: config.fractionDigits,
    }).format(amount);
    return `${config.code} ${formatted}`;
  }

  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: config.fractionDigits,
    maximumFractionDigits: config.fractionDigits,
  }).format(amount);
}

export function formatDateRegional(date: string | Date, currency?: string | null): string {
  const config = getCurrencyConfig(currency);
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  if (Number.isNaN(d.getTime())) return String(date);
  return new Intl.DateTimeFormat(config.locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
