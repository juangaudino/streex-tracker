import { Check, ChevronRight, Circle, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OnboardingState } from "@/lib/onboarding";

interface OnboardingChecklistProps {
  state: OnboardingState;
  onSetup: () => void;
  onCreateWeek: () => void;
  onTrack: () => void;
  onDismiss: () => void;
}

function ChecklistRow({
  complete,
  title,
  copy,
  action,
  onClick,
}: {
  complete: boolean;
  title: string;
  copy: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/55 px-3 py-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/5"
    >
      <span className={complete ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/35 text-primary"}>
        {complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{copy}</span>
      </span>
      {!complete && <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">{action}<ChevronRight className="h-3.5 w-3.5" /></span>}
    </button>
  );
}

export default function OnboardingChecklist({ state, onSetup, onCreateWeek, onTrack, onDismiss }: OnboardingChecklistProps) {
  return (
    <section className="rounded-2xl border border-primary/25 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary"><Compass className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Getting started</p>
          <h2 className="mt-0.5 text-lg font-bold">Your first week, one step at a time</h2>
          <p className="mt-1 text-sm text-muted-foreground">Set the basics, create a week, then track your first real activity. Streex will introduce deeper tools only when they can use your data.</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <ChecklistRow
          complete={Boolean(state.setupCompletedAt)}
          title="Set your baseline"
          copy="Review your weekly goal, currency, and the apps you use."
          action="Settings"
          onClick={onSetup}
        />
        <ChecklistRow
          complete={Boolean(state.firstWeekCompletedAt)}
          title="Create your first week"
          copy="This gives your shifts, earnings, rides, and mileage a home."
          action="Create"
          onClick={onCreateWeek}
        />
        <ChecklistRow
          complete={Boolean(state.firstActivityCompletedAt)}
          title="Track your first activity"
          copy="Start a shift or log the first earnings you have today."
          action="Track"
          onClick={onTrack}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>Hide for now</Button>
      </div>
    </section>
  );
}
