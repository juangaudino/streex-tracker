import { useMemo, useState } from "react";
import type { WeekRecord } from "@/lib/types";
import type { AchievementState } from "@/lib/achievements";
import { buildShareCards, categoryLabel, groupByCategory, type ShareCategory } from "@/lib/shareCards";
import ShareCard, { type ShareCardData } from "./ShareCard";
import ShareCardModal from "./ShareCardModal";
import { Sparkles } from "lucide-react";

interface Props {
  weeks: WeekRecord[];
  achievements: AchievementState[];
  sym: string;
}

const ORDER: ShareCategory[] = [
  "weekly-highlights",
  "monthly-highlights",
  "milestones",
  "career-moments",
  "letter-cards",
];

export default function ShareCenter({ weeks, achievements, sym }: Props) {
  const items = useMemo(
    () => buildShareCards(weeks, achievements, sym),
    [weeks, achievements, sym],
  );
  const grouped = useMemo(() => groupByCategory(items), [items]);
  const [previewCard, setPreviewCard] = useState<ShareCardData | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center space-y-2">
        <Sparkles className="h-6 w-6 text-primary/60 mx-auto" />
        <p className="text-sm font-semibold">Your next story is still being written.</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Close a week, hit a milestone, or complete a month — and shareable moments will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {ORDER.map((cat) => {
        const list = grouped[cat];
        if (!list || list.length === 0) return null;
        return (
          <section key={cat} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold tracking-tight">{categoryLabel(cat)}</h2>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                {list.length}
              </span>
            </div>
            <ul className="grid grid-cols-2 gap-3">
              {list.map((it) => (
                <li key={it.id}>
                  <button
                    onClick={() => setPreviewCard(it.card)}
                    className="block w-full text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-2xl"
                    aria-label={`Preview ${it.card.title}`}
                  >
                    <ShareCard card={it.card} aspect="1:1" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {previewCard && (
        <ShareCardModal
          open={!!previewCard}
          onOpenChange={(v) => !v && setPreviewCard(null)}
          card={previewCard}
        />
      )}
    </div>
  );
}