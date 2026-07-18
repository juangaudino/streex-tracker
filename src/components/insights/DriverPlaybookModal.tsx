import { useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import type { OperationalExplorerData } from "@/lib/operationalExplorer";
import { exportNodesAsJpegs, renderNodeAsImage, shareNodesAsJpegs } from "@/lib/shareExport";
import { formatCurrency } from "@/lib/store";

export interface DriverPlaybookData {
  scope: string;
  app: string;
  weekdays: string[];
  operational: OperationalExplorerData;
  currencySymbol: string;
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.05] ${compact ? "p-4" : "p-5"}`}>
      <p className={`${compact ? "text-[9px]" : "text-[11px]"} font-black uppercase tracking-[0.18em] text-white/45`}>{label}</p>
      <p className={`${compact ? "mt-1.5 text-2xl" : "mt-2 text-3xl"} whitespace-nowrap font-mono font-black leading-none text-white`}>{value}</p>
    </div>
  );
}

function CardShell({ page, title, subtitle, children }: { page: number; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <article className="relative flex h-[960px] w-[540px] shrink-0 flex-col overflow-hidden bg-[#080A09] p-10 text-white" style={{ backgroundImage: "radial-gradient(circle at 100% 0%, rgba(230,206,32,.22), transparent 30%), linear-gradient(160deg,#080A09,#111411 55%,#080A09)" }}>
      <div className="flex shrink-0 items-center justify-between"><span className="text-2xl font-black tracking-tight">STREE<span className="text-[#E6CE20]">X</span></span><span className="font-mono text-xs text-white/40">0{page}/03</span></div>
      <div className="mt-10 shrink-0"><p className="text-xs font-black uppercase tracking-[0.3em] text-[#E6CE20]">Driver Playbook</p><h2 className="mt-3 text-[44px] font-black leading-[0.95] tracking-tight">{title}</h2><p className="mt-3 max-w-[430px] text-[15px] leading-relaxed text-white/55">{subtitle}</p></div>
      <div className="mt-7 min-h-0 flex-1 overflow-hidden">{children}</div>
      <div className="mt-5 shrink-0 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/40">Personal observed patterns — not an earnings guarantee.</div>
    </article>
  );
}

export default function DriverPlaybookModal({ data, onClose }: { data: DriverPlaybookData; onClose: () => void }) {
  const refs = useRef<Array<HTMLElement | null>>([]);
  const [busy, setBusy] = useState(false);
  const op = data.operational;
  const metric = (value: number | null, suffix = "") => value == null ? "—" : `${value.toFixed(2)}${suffix}`;
  const weekdays = data.weekdays.length ? data.weekdays.join(" · ") : "All weekdays";
  const strongestDays = op.heatmap.flatMap((day) => {
    const best = [...day.hours].filter((hour) => hour.rate !== null).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];
    return best ? [{ dayName: day.dayName, rate: best.rate, hour: best.hour }] : [];
  }).slice(0, 5);
  const nodes = () => refs.current.filter((node): node is HTMLElement => Boolean(node));

  async function saveAll() { setBusy(true); await exportNodesAsJpegs(nodes()); setBusy(false); }
  async function shareAll() { setBusy(true); await shareNodesAsJpegs(nodes()); setBusy(false); }
  async function saveOne(index: number) {
    const node = refs.current[index];
    if (!node) return;
    setBusy(true);
    const blob = await renderNodeAsImage(node, { format: "jpeg", quality: 0.94, backgroundColor: "#080A09", scale: 2 });
    if (blob) {
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `streex-driver-playbook-${index + 1}.jpg`; a.click(); URL.revokeObjectURL(url);
    }
    setBusy(false);
  }

  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-4 backdrop-blur-md">
    <div className="mx-auto max-w-[1780px]">
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#080A09]/95 p-4 text-white">
        <div><h2 className="text-lg font-black">Driver Playbook preview</h2><p className="text-xs text-white/50">Three anonymous 9:16 JPG cards · 1080×1920</p></div>
        <div className="flex gap-2"><button disabled={busy} onClick={saveAll} className="rounded-xl bg-[#E6CE20] px-4 py-2 text-sm font-black text-black"><Download className="mr-2 inline h-4 w-4" />Save all</button><button disabled={busy} onClick={shareAll} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold"><Share2 className="mr-2 inline h-4 w-4" />Share</button><button onClick={onClose} className="rounded-xl border border-white/15 p-2"><X className="h-5 w-5" /></button></div>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-8">
        <div><div ref={(node) => { refs.current[0] = node; }}><CardShell page={1} title="Your operating profile" subtitle={`${data.scope} · ${data.app} · ${weekdays} · ${op.windowLabel}`}><div className="grid grid-cols-2 gap-3"><Metric label="Earnings / hour" value={op.totals.earningsPerHour == null ? "—" : `${formatCurrency(op.totals.earningsPerHour, data.currencySymbol)}/hr`} /><Metric label="Rides / hour" value={metric(op.totals.ridesPerHour)} /><Metric label="Miles / hour" value={metric(op.totals.milesPerHour)} /><Metric label="Earnings / mile" value={op.totals.earningsPerMile == null ? "—" : `${formatCurrency(op.totals.earningsPerMile, data.currencySymbol)}/mi`} /></div><div className="mt-5 rounded-2xl bg-[#E6CE20] p-5 text-black"><p className="text-xs font-black uppercase tracking-widest">Data confidence</p><p className="mt-2 text-3xl font-black">{op.sampleLabel}</p><p className="mt-2 text-sm">{op.totals.days} days · {op.totals.shifts} shifts · {op.totals.hours.toFixed(1)} hours · {op.source}</p></div></CardShell></div><button onClick={() => saveOne(0)} className="mt-2 w-full rounded-xl bg-white/10 py-2 text-sm font-bold text-white">Save card 1</button></div>
        <div><div ref={(node) => { refs.current[1] = node; }}><CardShell page={2} title="Best times" subtitle="The strongest repeatable windows inside the selected operating scope."><div className="space-y-2">{op.bestWindows.slice(0, 4).map((row, index) => <div key={row.hour} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-[#E6CE20]">#{index + 1} window</p><p className="mt-0.5 text-xl font-black leading-none">{row.label}</p><p className="mt-1 text-[10px] text-white/45">{row.hours.toFixed(1)} worked hours · {row.source}</p></div><p className="whitespace-nowrap font-mono text-lg font-black">{row.earningsPerHour == null ? "—" : `${formatCurrency(row.earningsPerHour, data.currencySymbol)}/hr`}</p></div>)}</div><div className="mt-4 grid grid-cols-2 gap-2">{strongestDays.slice(0, 4).map((day) => <Metric compact key={day.dayName} label={`${day.dayName} · ${new Date(2020, 0, 1, day.hour).toLocaleTimeString("en-US", { hour: "numeric" })}`} value={day.rate == null ? "—" : `${formatCurrency(day.rate, data.currencySymbol)}/hr`} />)}</div></CardShell></div><button onClick={() => saveOne(1)} className="mt-2 w-full rounded-xl bg-white/10 py-2 text-sm font-bold text-white">Save card 2</button></div>
        <div><div ref={(node) => { refs.current[2] = node; }}><CardShell page={3} title="Operating playbook" subtitle="A compact field guide built from the patterns in this filtered view."><div className="space-y-3">{op.observations.map((observation, index) => <div key={observation} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E6CE20]">Signal 0{index + 1}</p><p className="mt-2 text-[17px] font-bold leading-snug">{observation}</p></div>)}</div><div className="mt-4 grid grid-cols-2 gap-2"><Metric compact label="Miles / ride" value={metric(op.totals.milesPerRide)} /><Metric compact label="Minutes / ride" value={metric(op.totals.minutesPerRide)} /><Metric compact label="Earnings / ride" value={op.totals.earningsPerRide == null ? "—" : formatCurrency(op.totals.earningsPerRide, data.currencySymbol)} /><Metric compact label="Observed coverage" value={`${op.coverage.toFixed(0)}%`} /></div></CardShell></div><button onClick={() => saveOne(2)} className="mt-2 w-full rounded-xl bg-white/10 py-2 text-sm font-bold text-white">Save card 3</button></div>
      </div>
    </div>
  </div>;
}
