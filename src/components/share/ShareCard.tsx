import { Sparkles, Trophy, Crown, Flame, CalendarRange, Quote, Medal } from "lucide-react";
import StreexLogo from "@/components/StreexLogo";

export type ShareCardKind =
  | "weekly-letter"
  | "weekly-highlight"
  | "best-day"
  | "new-record"
  | "strongest-week"
  | "monthly-milestone"
  | "milestone-poster"
  | "monthly-flex"
  | "letter-excerpt";

export type ShareCardAspect = "9:16" | "1:1" | "16:9";

export interface ShareCardData {
  kind: ShareCardKind;
  title: string;
  subtitle?: string;
  body?: string;
  footer?: string;
  footerLabel?: string;
  /** Optional secondary stats rendered in a small grid (Monthly Flex). */
  stats?: { label: string; value: string }[];
  /** Mark as legendary for premium glow treatment. */
  legendary?: boolean;
}

const kindMeta: Record<ShareCardKind, { tag: string; icon: React.ReactNode; accent: string }> = {
  "weekly-letter": { tag: "Weekly Letter", icon: <Sparkles className="h-3.5 w-3.5" />, accent: "text-primary" },
  "weekly-highlight": { tag: "Week Highlight", icon: <Sparkles className="h-3.5 w-3.5" />, accent: "text-primary" },
  "best-day": { tag: "Best Day", icon: <Trophy className="h-3.5 w-3.5" />, accent: "text-gold" },
  "new-record": { tag: "New Record", icon: <Crown className="h-3.5 w-3.5" />, accent: "text-gold" },
  "strongest-week": { tag: "Strongest Week", icon: <Flame className="h-3.5 w-3.5" />, accent: "text-warning" },
  "monthly-milestone": { tag: "Monthly Milestone", icon: <CalendarRange className="h-3.5 w-3.5" />, accent: "text-primary" },
  "milestone-poster": { tag: "Milestone", icon: <Medal className="h-3.5 w-3.5" />, accent: "text-gold" },
  "monthly-flex": { tag: "Month in Review", icon: <CalendarRange className="h-3.5 w-3.5" />, accent: "text-primary" },
  "letter-excerpt": { tag: "From the Letter", icon: <Quote className="h-3.5 w-3.5" />, accent: "text-primary" },
};

const aspectClasses: Record<ShareCardAspect, string> = {
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
  "16:9": "aspect-[16/9]",
};

/**
 * Reusable narrative share card. Foundation for future export/social system.
 * Renders at the chosen aspect (9:16 portrait, 1:1 square, 16:9 landscape).
 * Premium minimal style; safe margins; readable typography across formats.
 */
export default function ShareCard({
  card,
  aspect = "9:16",
}: {
  card: ShareCardData;
  aspect?: ShareCardAspect;
}) {
  const meta = kindMeta[card.kind];
  const isLandscape = aspect === "16:9";
  const legendary = !!card.legendary;
  return (
    <div
      data-share-card
      className={`relative w-full ${aspectClasses[aspect]} rounded-2xl overflow-hidden bg-gradient-to-br from-card via-card to-background border ${
        legendary ? "border-gold/40 shadow-[0_0_60px_-15px_hsl(var(--gold)/0.4)]" : "border-border shadow-xl"
      }`}
    >
      {/* Background atmospheres */}
      <div className={`absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl pointer-events-none ${legendary ? "bg-gold/20" : "bg-primary/10"}`} />
      <div className={`absolute -bottom-24 -left-16 w-72 h-72 rounded-full blur-3xl pointer-events-none ${legendary ? "bg-gold/15" : "bg-gold/10"}`} />

      <div className={`relative h-full w-full ${isLandscape ? "p-5" : "p-6"} flex flex-col justify-between`}>
        {/* Top: brand + tag */}
        <div className="flex items-center justify-between">
          <StreexLogo className="h-10 opacity-90" />
          <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] ${meta.accent}`}>
            {meta.icon}
            {meta.tag}
          </div>
        </div>

        {/* Middle: title + body */}
        <div className={`space-y-3 ${isLandscape ? "max-w-[70%]" : ""}`}>
          <h2 className={`font-bold tracking-tight leading-tight ${
            card.kind === "letter-excerpt"
              ? "text-xl sm:text-2xl italic font-serif"
              : isLandscape
                ? "text-xl sm:text-2xl"
                : "text-2xl sm:text-3xl"
          }`}>
            {card.title}
          </h2>
          {card.subtitle && (
            <p className="text-xs font-mono text-muted-foreground/70">{card.subtitle}</p>
          )}
          {card.body && (
            <p className={`text-sm sm:text-base text-foreground/85 leading-relaxed ${isLandscape ? "line-clamp-2" : "line-clamp-4"}`}>
              {card.body}
            </p>
          )}
          {card.stats && card.stats.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {card.stats.slice(0, 3).map((s, i) => (
                <div key={i} className="space-y-0.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 truncate">{s.label}</p>
                  <p className={`text-sm font-bold font-mono ${meta.accent}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: footer stat */}
        <div className="flex items-end justify-between pt-4 border-t border-border/40">
          <div>
            {card.footerLabel && (
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {card.footerLabel}
              </p>
            )}
            {card.footer && (
              <p className={`text-xl font-bold font-mono ${meta.accent}`}>{card.footer}</p>
            )}
          </div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50">streex</p>
        </div>
      </div>
    </div>
  );
}
