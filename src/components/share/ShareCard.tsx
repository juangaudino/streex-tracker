import { Sparkles, Trophy, Crown, Flame, CalendarRange } from "lucide-react";
import streexLogo from "@/assets/streex-logo.png";

export type ShareCardKind =
  | "weekly-letter"
  | "weekly-highlight"
  | "best-day"
  | "new-record"
  | "strongest-week"
  | "monthly-milestone";

export interface ShareCardData {
  kind: ShareCardKind;
  title: string;
  subtitle?: string;
  body?: string;
  footer?: string;
  footerLabel?: string;
}

const kindMeta: Record<ShareCardKind, { tag: string; icon: React.ReactNode; accent: string }> = {
  "weekly-letter": { tag: "Weekly Letter", icon: <Sparkles className="h-3.5 w-3.5" />, accent: "text-primary" },
  "weekly-highlight": { tag: "Week Highlight", icon: <Sparkles className="h-3.5 w-3.5" />, accent: "text-primary" },
  "best-day": { tag: "Best Day", icon: <Trophy className="h-3.5 w-3.5" />, accent: "text-gold" },
  "new-record": { tag: "New Record", icon: <Crown className="h-3.5 w-3.5" />, accent: "text-gold" },
  "strongest-week": { tag: "Strongest Week", icon: <Flame className="h-3.5 w-3.5" />, accent: "text-warning" },
  "monthly-milestone": { tag: "Monthly Milestone", icon: <CalendarRange className="h-3.5 w-3.5" />, accent: "text-primary" },
};

/**
 * Reusable narrative share card. Foundation for future export/social system.
 * Renders at a fixed-ish 9:16 friendly aspect, premium minimal style.
 */
export default function ShareCard({ card }: { card: ShareCardData }) {
  const meta = kindMeta[card.kind];
  return (
    <div
      data-share-card
      className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-to-br from-card via-card to-background border border-border shadow-xl"
    >
      {/* Background atmospheres */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative h-full w-full p-6 flex flex-col justify-between">
        {/* Top: brand + tag */}
        <div className="flex items-center justify-between">
          <img src={streexLogo} alt="Streex" className="h-10 w-auto object-contain opacity-90" />
          <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] ${meta.accent}`}>
            {meta.icon}
            {meta.tag}
          </div>
        </div>

        {/* Middle: title + body */}
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
            {card.title}
          </h2>
          {card.subtitle && (
            <p className="text-xs font-mono text-muted-foreground/70">{card.subtitle}</p>
          )}
          {card.body && (
            <p className="text-sm sm:text-base text-foreground/85 leading-relaxed line-clamp-4">
              {card.body}
            </p>
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