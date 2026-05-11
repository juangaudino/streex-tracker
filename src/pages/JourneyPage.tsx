import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAchievements } from "@/hooks/useAchievements";
import { buildJourneyEvents, JourneyEvent } from "@/lib/journey";
import type { StoreContext } from "./types";
import { Sparkles, Crown } from "lucide-react";

const toneClasses: Record<string, { ring: string; text: string; bg: string }> = {
  milestone: { ring: "ring-primary/30", text: "text-primary", bg: "bg-primary/10" },
  record: { ring: "ring-gold/30", text: "text-gold", bg: "bg-gold/10" },
  streak: { ring: "ring-warning/30", text: "text-warning", bg: "bg-warning/10" },
  achievement: { ring: "ring-beast-purple/30", text: "text-beast-purple", bg: "bg-beast-purple/10" },
  goal: { ring: "ring-success/30", text: "text-success", bg: "bg-success/10" },
  comeback: { ring: "ring-primary/30", text: "text-primary", bg: "bg-primary/10" },
};

export default function JourneyPage() {
  const { weeks, settings } = useOutletContext<StoreContext>();
  const { user } = useAuth();
  const { achievements } = useAchievements(user, weeks);
  const events = buildJourneyEvents(weeks, achievements, settings.currencySymbol);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4 text-center">
        <Crown className="h-10 w-10 text-gold opacity-60" />
        <h2 className="text-2xl font-bold">Your story starts here</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Log your first earnings to begin building your journey.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Career Timeline
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Your Journey</h1>
        <p className="text-sm text-muted-foreground">Every milestone, record, and chapter so far.</p>
      </div>

      <div className="relative space-y-4 pl-6">
        <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-primary/30 via-border to-transparent" />
        {events.map((e) => (
          <JourneyCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

function JourneyCard({ event: e }: { event: JourneyEvent }) {
  const tone = toneClasses[e.tone] || toneClasses.milestone;
  return (
    <div className="relative">
      <div className={`absolute -left-[22px] top-3 h-4 w-4 rounded-full ${tone.bg} ring-2 ${tone.ring} flex items-center justify-center text-[10px]`}>
        <span aria-hidden>•</span>
      </div>
      <div className="bg-card border border-border rounded-xl p-3 flex items-start gap-3 hover:border-border/80 transition-colors">
        <div className={`shrink-0 h-9 w-9 rounded-lg ${tone.bg} ${tone.text} flex items-center justify-center text-lg`}>
          <span>{e.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-sm font-semibold truncate">{e.title}</p>
            <p className="text-[10px] font-mono text-muted-foreground/70 ml-auto shrink-0">{e.date}</p>
          </div>
          {e.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{e.subtitle}</p>}
          {e.value && <p className={`text-sm font-bold font-mono mt-1 ${tone.text}`}>{e.value}</p>}
        </div>
      </div>
    </div>
  );
}