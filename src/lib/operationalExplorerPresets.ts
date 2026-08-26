import type { DeepInsightsFilters } from "./deepInsights";
import type { OperationalExplorerFilters } from "./operationalExplorer";

export interface OperationalExplorerPreset {
  id: string;
  label: string;
  createdAt: string;
  globalFilters: DeepInsightsFilters;
  operationalFilters: OperationalExplorerFilters;
}

const STORAGE_PREFIX = "streex-operational-explorer-presets";
const MAX_PRESETS = 12;
const TIME_PRESETS = new Set<DeepInsightsFilters["timePreset"]>(["all", "this-week", "last-7-days", "last-30-days", "last-3-months", "last-6-months", "this-year", "last-12-months", "custom"]);
const WINDOW_PRESETS = new Set<OperationalExplorerFilters["windowPreset"]>(["all", "morning", "afternoon", "evening", "late-night", "custom"]);

function storageKey(userId?: string | null) {
  return `${STORAGE_PREFIX}:${userId || "local"}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeOperationalExplorerPreset(value: unknown): OperationalExplorerPreset | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.label !== "string" || !isRecord(value.globalFilters) || !isRecord(value.operationalFilters)) return null;
  const weekdays = Array.isArray(value.globalFilters.weekdays)
    ? value.globalFilters.weekdays.filter((day): day is string => typeof day === "string")
    : [];
  const candidateTimePreset = typeof value.globalFilters.timePreset === "string" ? value.globalFilters.timePreset : "all";
  const app = typeof value.globalFilters.app === "string" ? value.globalFilters.app : "all";
  const candidateWindowPreset = typeof value.operationalFilters.windowPreset === "string" ? value.operationalFilters.windowPreset : "all";
  const timePreset = TIME_PRESETS.has(candidateTimePreset as DeepInsightsFilters["timePreset"]) ? candidateTimePreset as DeepInsightsFilters["timePreset"] : "all";
  const windowPreset = WINDOW_PRESETS.has(candidateWindowPreset as OperationalExplorerFilters["windowPreset"]) ? candidateWindowPreset as OperationalExplorerFilters["windowPreset"] : "all";
  if (!value.id.trim() || !value.label.trim()) return null;
  return {
    id: value.id,
    label: value.label.trim().slice(0, 48),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString(),
    globalFilters: {
      timePreset,
      app,
      weekdays,
      customStart: typeof value.globalFilters.customStart === "string" ? value.globalFilters.customStart : undefined,
      customEnd: typeof value.globalFilters.customEnd === "string" ? value.globalFilters.customEnd : undefined,
    },
    operationalFilters: {
      windowPreset,
      windowStart: typeof value.operationalFilters.windowStart === "string" ? value.operationalFilters.windowStart : undefined,
      windowEnd: typeof value.operationalFilters.windowEnd === "string" ? value.operationalFilters.windowEnd : undefined,
    },
  };
}

export function readOperationalExplorerPresets(userId?: string | null): OperationalExplorerPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map(normalizeOperationalExplorerPreset).filter((preset): preset is OperationalExplorerPreset => preset !== null).slice(0, MAX_PRESETS)
      : [];
  } catch {
    return [];
  }
}

export function writeOperationalExplorerPresets(userId: string | null | undefined, presets: OperationalExplorerPreset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(presets.slice(0, MAX_PRESETS)));
  } catch {
    // Browser storage is a convenience only. Insights continue to work without it.
  }
}

export function createOperationalExplorerPreset(input: Omit<OperationalExplorerPreset, "id" | "createdAt">): OperationalExplorerPreset {
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    ...input,
    id,
    createdAt: new Date().toISOString(),
    label: input.label.trim().slice(0, 48),
  };
}

export function addOperationalExplorerPreset(current: OperationalExplorerPreset[], preset: OperationalExplorerPreset) {
  return [preset, ...current.filter((item) => item.label.toLocaleLowerCase() !== preset.label.toLocaleLowerCase())].slice(0, MAX_PRESETS);
}
