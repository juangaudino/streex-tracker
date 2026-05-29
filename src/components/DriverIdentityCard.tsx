import { BadgeCheck, Flame, Gauge, Shield, Sparkles, Trophy } from "lucide-react";
import { formatCurrency } from "@/lib/store";
import type { DriverIdentitySummary } from "@/lib/driverIdentity";

interface DriverIdentityCardProps {
  identity: DriverIdentitySummary;
  currencySymbol: string;
  loading?: boolean;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">{label}</p>
      <p className="text-sm font-bold font-mono truncate">{value}</p>
    </div>
  );
}

export default function DriverIdentityCard({
  identity,
  currencySymbol,
  loading,
}: DriverIdentityCardProps) {
  const { level } = identity;

  return (
    <section className="bg-card rounded-xl border border-border p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Driver Identity
            </p>
          </div>
          <h2 className="text-xl font-bold mt-1 truncate">{level.currentLevel}</h2>
          <p className="text-xs text-muted-foreground">
            {level.nextLevel
              ? `${level.xpToNext.toLocaleString()} XP to ${level.nextLevel}`
              : "Highest level reached"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold font-mono text-primary">{identity.totalXp.toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total XP</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${level.progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{level.currentThreshold.toLocaleString()} XP</span>
          <span>{level.nextThreshold ? `${level.nextThreshold.toLocaleString()} XP` : "Legend"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Metric label="Consistency" value={`${identity.consistencyXp.toLocaleString()} XP`} />
        <Metric label="Performance" value={`${identity.performanceXp.toLocaleString()} XP`} />
        <Metric
          label="Archetype"
          value={identity.primaryArchetype?.name ?? (identity.archetypeLocked ? "Unlocking" : "Forming")}
        />
        <Metric
          label="Worked Pace"
          value={identity.adaptivePace?.workedDays ? formatCurrency(identity.adaptivePace.workedDayPace, currencySymbol) : "—"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded-lg bg-accent/40 border border-border px-3 py-2">
          <p className="text-xs font-bold flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {identity.primaryArchetype?.name ?? "Keep tracking to unlock your driver identity"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {identity.primaryArchetype?.reason ?? "A few more worked days will make this feel more accurate."}
          </p>
        </div>

        <div className="rounded-lg bg-accent/40 border border-border px-3 py-2">
          <p className="text-xs font-bold flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-gold" />
            {identity.historicalRanking?.label ?? "History is building"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {identity.historicalRanking
              ? identity.historicalRanking.tone
              : "Rankings appear once there is enough same-weekday history."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {identity.rival && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 font-medium">
            <Flame className="h-3.5 w-3.5" />
            {identity.rival.label}: {identity.rival.detail}
          </span>
        )}
        {identity.idealWeek && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 text-gold px-2.5 py-1 font-medium">
            <BadgeCheck className="h-3.5 w-3.5" />
            Ideal week {formatCurrency(identity.idealWeek.idealWeekTotal, currencySymbol)}
          </span>
        )}
        {identity.adaptivePace && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground px-2.5 py-1 font-medium">
            <Gauge className="h-3.5 w-3.5" />
            Calendar pace {formatCurrency(identity.adaptivePace.calendarPace, currencySymbol)}
          </span>
        )}
      </div>

      {(identity.dayOffCopy || loading) && (
        <p className="text-xs text-muted-foreground">
          {loading ? "Syncing driver identity..." : identity.dayOffCopy}
        </p>
      )}
    </section>
  );
}
