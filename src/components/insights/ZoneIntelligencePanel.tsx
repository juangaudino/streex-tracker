import { AlertTriangle, CircleDollarSign, Layers3, MapPinned, Route, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/store";
import { type ZoneIntelligenceData, type ZoneIntelligenceMode } from "@/lib/zoneIntelligence";
import { suggestBroadZoneLabel } from "@/lib/zoneLabelSuggestion";
import type { ZoneLabel } from "@/lib/types";
import InteractiveZoneMap from "@/components/insights/InteractiveZoneMap";

interface ZoneIntelligencePanelProps {
  data: ZoneIntelligenceData;
  currencySymbol: string;
  mode: ZoneIntelligenceMode;
  selectedZoneKey?: string | null;
  isDark: boolean;
  zoneLabels: ZoneLabel[];
  onModeChange: (mode: ZoneIntelligenceMode) => void;
  onSelectZone: (zoneKey: string) => void;
  onSaveZoneLabel: (draft: { zoneKey: string; label: string; source?: "user" | "suggested" }) => Promise<boolean>;
}

function fallbackZoneName(index: number) {
  return `Approximate zone ${index + 1}`;
}

function percentage(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

export default function ZoneIntelligencePanel({ data, currencySymbol, mode, selectedZoneKey, isDark, zoneLabels, onModeChange, onSelectZone, onSaveZoneLabel }: ZoneIntelligencePanelProps) {
  const selected = data.zones.find((zone) => zone.zoneKey === selectedZoneKey) ?? data.zones[0] ?? null;
  const selectedIndex = selected ? data.zones.findIndex((zone) => zone.zoneKey === selected.zoneKey) : -1;
  const flows = selected ? data.flows.filter((flow) => flow.fromZoneKey === selected.zoneKey) : [];
  const zoneByKey = new Map(data.zones.map((zone, index) => [zone.zoneKey, { zone, index }]));
  const labelByKey = useMemo(() => new Map(zoneLabels.map((item) => [item.zoneKey, item.label])), [zoneLabels]);
  const zoneName = (zoneKey: string, index?: number) => labelByKey.get(zoneKey) ?? fallbackZoneName(index ?? data.zones.findIndex((zone) => zone.zoneKey === zoneKey));
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [savingLabel, setSavingLabel] = useState(false);
  const pickupCoverage = percentage(data.pickupCaptured, data.completedRides);

  useEffect(() => {
    if (!selected || labelByKey.has(selected.zoneKey)) { setSuggestion(null); setLabelDraft(selected ? labelByKey.get(selected.zoneKey) ?? "" : ""); return; }
    let current = true;
    setSuggestion(null); setLabelDraft(""); setSuggesting(true);
    void suggestBroadZoneLabel(selected.zoneKey).then((next) => {
      if (!current) return;
      setSuggestion(next);
      setLabelDraft(next ?? "");
      setSuggesting(false);
    }).catch(() => { if (current) setSuggesting(false); });
    return () => { current = false; };
  }, [labelByKey, selected]);

  if (!data.completedRides) {
    return (
      <section className={cn("rounded-2xl border p-5", isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-white")}> 
        <div className="flex items-center gap-3"><MapPinned className="h-5 w-5 text-[#E6CE20]" /><div><h2 className="font-bold">Zone Intelligence</h2><p className="text-sm text-muted-foreground">Building evidence starts with a foreground Start ride and Finish ride.</p></div></div>
        <p className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No completed Movement rides match these filters yet. Streex will never infer a past zone from a daily total, note, or address.</p>
      </section>
    );
  }

  return (
    <section className={cn("rounded-2xl border p-4 sm:p-5", isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-white")}> 
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-[#E6CE20]" /><h2 className="text-lg font-black">Zone Intelligence</h2></div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Private approximate zone cells from rides you intentionally captured. No routes, addresses, or background tracking.</p>
        </div>
        <div className="grid grid-cols-3 rounded-xl border border-border p-1 text-xs font-bold">
          {(["coverage", "earnings", "flow"] as const).map((item) => <button key={item} type="button" onClick={() => onModeChange(item)} className={cn("rounded-lg px-3 py-2 capitalize transition", mode === item ? "bg-[#E6CE20] text-slate-950" : "text-muted-foreground hover:bg-muted")}>{item === "earnings" ? "Pickup earnings" : item === "flow" ? "Destination flow" : "Coverage"}</button>)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[
          ["Completed", data.completedRides, Layers3], ["Pickup captured", data.pickupCaptured, MapPinned], ["Dropoff captured", data.dropoffCaptured, Route],
          ["Single linked", data.singleLinked, ShieldCheck], ["Batch linked", data.batchLinked, Layers3], ["Unlinked", data.unlinked, AlertTriangle], ["Eligible rides", data.eligibleRideCount, CircleDollarSign],
        ].map(([label, value, Icon]) => {
          const MetricIcon = Icon as typeof Layers3;
          return <div key={String(label)} className="rounded-xl border border-border bg-muted/25 p-3"><MetricIcon className="h-4 w-4 text-[#E6CE20]" /><p className="mt-2 font-mono text-xl font-black">{value as number}</p><p className="text-[11px] font-semibold text-muted-foreground">{String(label)}</p></div>;
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(290px,.7fr)]">
        <div className="rounded-2xl border border-border bg-muted/15 p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">Approximate zone map</h3><p className="text-xs text-muted-foreground">{mode === "earnings" ? "Color shows only verified pickup earnings." : mode === "flow" ? "Select a pickup zone to inspect aggregate destinations." : "Color shows captured pickup and dropoff activity."}</p></div><span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground">Pickup coverage {pickupCoverage}%</span></div>
          <InteractiveZoneMap zones={data.zones} flows={flows} mode={mode} selectedZoneKey={selected?.zoneKey} labelFor={zoneName} onSelectZone={onSelectZone} />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">The base map is interactive and shows only approximate cells. It does not show routes, addresses, raw GPS, or background location history.</p>
        </div>

        {selected && <aside className="rounded-2xl border border-[#E6CE20]/35 bg-[#E6CE20]/[0.05] p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#B9A400]">Selected zone</p><h3 className="mt-1 text-xl font-black">{zoneName(selected.zoneKey, selectedIndex)}</h3></div><span className="rounded-full border border-[#E6CE20]/35 px-2.5 py-1 text-[11px] font-bold text-[#B9A400]">Approximate</span></div>
          <div className="mt-3 rounded-xl border border-border bg-background/60 p-3"><p className="text-xs font-semibold text-muted-foreground">Place label</p><p className="mt-1 text-xs text-muted-foreground">{suggesting ? "Finding a broad place suggestion from this approximate cell…" : suggestion ? "Suggested from the approximate cell. Confirm or edit it before saving." : "Name this approximate zone yourself."}</p><div className="mt-2 flex gap-2"><input className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm" value={labelDraft} onChange={(event) => setLabelDraft(event.target.value)} placeholder="e.g. Salt Lake City" maxLength={80} /><button type="button" className="rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50" disabled={!labelDraft.trim() || savingLabel} onClick={async () => { setSavingLabel(true); try { await onSaveZoneLabel({ zoneKey: selected.zoneKey, label: labelDraft, source: suggestion === labelDraft ? "suggested" : "user" }); } finally { setSavingLabel(false); } }}>{savingLabel ? "Saving…" : "Save"}</button></div></div>
          <div className="mt-4 rounded-xl border border-border bg-background/60 p-3"><p className="text-xs font-semibold text-muted-foreground">Eligible pickup earnings</p><p className="mt-1 font-mono text-3xl font-black text-[#D8B800]">{formatCurrency(selected.eligibleEarnings, currencySymbol)}</p><div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm"><div><p className="font-mono text-lg font-black">{selected.eligibleRideCount}</p><p className="text-[11px] text-muted-foreground">eligible rides</p></div><div><p className="font-mono text-lg font-black">{selected.eligibleRideCount ? formatCurrency(selected.eligibleEarnings / selected.eligibleRideCount, currencySymbol) : "—"}</p><p className="text-[11px] text-muted-foreground">avg / eligible ride</p></div></div></div>
          <div className="mt-3 space-y-2 text-sm"><p className="rounded-lg border border-border bg-background/50 p-2.5"><span className="font-semibold">Coverage</span> · {selected.pickupCount} pickups · {selected.dropoffCount} dropoffs</p><p className="rounded-lg border border-border bg-background/50 p-2.5"><span className="font-semibold">Evidence</span> · {selected.singleLinkedCount} single · {selected.batchLinkedCount} batch · {selected.unlinkedCount} unlinked</p>{selected.lateTips > 0 && <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-300"><span className="font-semibold">Late tips</span> +{formatCurrency(selected.lateTips, currencySymbol)}</p>}</div>
          <div className="mt-4 border-t border-border pt-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Top destination zones</p>{flows.length ? <div className="mt-2 space-y-2">{flows.slice(0, 4).map((flow) => { const destination = zoneByKey.get(flow.toZoneKey); return <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2 text-sm" key={`${flow.fromZoneKey}-${flow.toZoneKey}`}><span>{destination ? zoneName(destination.zone.zoneKey, destination.index) : "Approximate destination"}</span><span className="font-mono font-bold">{flow.rides} rides</span></div>; })}</div> : <p className="mt-2 text-sm text-muted-foreground">No captured destinations from this zone in the selected period.</p>}</div>
          <p className="mt-4 rounded-lg border border-dashed border-[#E6CE20]/35 p-3 text-xs leading-relaxed text-muted-foreground">{data.sampleReady ? `Sample ready: ${data.eligibleRideCount} eligible rides across ${data.distinctEligibleDays} days.` : `Building evidence: ${data.eligibleRideCount} of 8 eligible rides across ${data.distinctEligibleDays} of 3 days. Rankings stay hidden until the sample is ready.`}</p>
        </aside>}
      </div>
    </section>
  );
}
