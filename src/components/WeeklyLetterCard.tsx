import { Sparkles, Share2 } from "lucide-react";
import { useState } from "react";
import type { WeeklyLetter } from "@/lib/weeklyLetter";
import ShareCardModal from "@/components/share/ShareCardModal";

interface Props {
  letter: WeeklyLetter;
  variant?: "card" | "embedded";
  showShare?: boolean;
}

/**
 * Premium narrative card displaying a Weekly Letter.
 * Calm spacing, soft gradient, fade-in. Used in Journey, Recap, Closing flows.
 */
export default function WeeklyLetterCard({ letter, variant = "card", showShare = true }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const isEmbedded = variant === "embedded";

  return (
    <>
      <article
        className={`relative overflow-hidden ${
          isEmbedded
            ? "bg-card/40 border border-border/60 rounded-xl p-4"
            : "bg-gradient-to-br from-card via-card to-background border border-primary/15 rounded-2xl p-6"
        } space-y-4 animate-in fade-in duration-700`}
      >
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

        <header className="relative space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary/80 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Weekly Letter
          </p>
          <h3 className={`font-bold tracking-tight ${isEmbedded ? "text-lg" : "text-2xl"}`}>
            {letter.title}
          </h3>
          <p className="text-[11px] font-mono text-muted-foreground/70">{letter.weekRange}</p>
        </header>

        <div className="relative space-y-3">
          {letter.paragraphs.map((p, i) => (
            <p
              key={i}
              className={`${isEmbedded ? "text-sm" : "text-[15px]"} leading-relaxed text-foreground/90`}
            >
              {p}
            </p>
          ))}
        </div>

        <div className="relative pt-3 border-t border-border/40 flex items-center gap-3">
          <p className="text-sm italic text-muted-foreground flex-1 leading-relaxed">
            {letter.closing}
          </p>
          {showShare && (
            <button
              onClick={() => setShareOpen(true)}
              className="shrink-0 p-2 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-colors"
              aria-label="Share this letter"
              title="Preview share card"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </article>

      {showShare && (
        <ShareCardModal
          open={shareOpen}
          onOpenChange={setShareOpen}
          card={{
            kind: "weekly-letter",
            title: letter.title,
            subtitle: letter.weekRange,
            body: letter.paragraphs[0] || "",
            footer: letter.highlight?.value,
            footerLabel: letter.highlight?.label,
          }}
        />
      )}
    </>
  );
}