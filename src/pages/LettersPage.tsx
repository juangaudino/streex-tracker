import { useOutletContext } from "react-router-dom";
import { useMemo, useState } from "react";
import type { StoreContext } from "./types";
import { syncStoredLetters, type StoredLetter } from "@/lib/letterStore";
import WeeklyLetterCard from "@/components/WeeklyLetterCard";
import { BookOpen, ChevronDown } from "lucide-react";

function formatRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const sm = s.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const em = e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${sm} – ${em}`;
  } catch {
    return `${start} → ${end}`;
  }
}

export default function LettersPage() {
  const { weeks, settings } = useOutletContext<StoreContext>();
  const letters = useMemo(
    () => syncStoredLetters(weeks, settings.currencySymbol),
    [weeks, settings.currencySymbol],
  );
  const [openId, setOpenId] = useState<string | null>(null);

  if (letters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4 text-center">
        <BookOpen className="h-10 w-10 text-primary opacity-50" />
        <h2 className="text-2xl font-bold">Your library starts here</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Each closed week becomes a letter — a calm reflection on what really happened.
          Close your first week to begin the archive.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary flex items-center gap-1.5">
          <BookOpen className="h-3 w-3" /> Career Archive
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Letters</h1>
        <p className="text-sm text-muted-foreground">
          {letters.length} {letters.length === 1 ? "chapter" : "chapters"} written by your weeks so far.
        </p>
      </header>

      <ul className="space-y-2.5">
        {letters.map((l) => (
          <LetterRow
            key={l.weekId}
            stored={l}
            open={openId === l.weekId}
            onToggle={() => setOpenId((id) => (id === l.weekId ? null : l.weekId))}
          />
        ))}
      </ul>
    </div>
  );
}

function LetterRow({
  stored,
  open,
  onToggle,
}: {
  stored: StoredLetter;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-sm font-semibold truncate">{stored.letter.title}</h3>
            <p className="text-[10px] font-mono text-muted-foreground/70 ml-auto shrink-0">
              {formatRange(stored.weekStart, stored.weekEnd)}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            <span className="text-primary/80 font-medium">{stored.emotionalTag}</span>
            {stored.weekTotal > 0 && (
              <span className="text-muted-foreground/60"> · {stored.weekTotalFormatted}</span>
            )}
          </p>
          <p className="text-xs text-foreground/70 line-clamp-1">
            {stored.letter.paragraphs[0]}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <WeeklyLetterCard letter={stored.letter} variant="embedded" />
        </div>
      )}
    </li>
  );
}