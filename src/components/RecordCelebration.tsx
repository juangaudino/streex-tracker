import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface CelebrationData {
  id: string;
  type: "day-record" | "weekday-record" | "week-record" | "milestone";
  title: string;
  subtitle?: string;
  value?: string;
  icon?: string;
}

let _celebrationListeners: Array<(d: CelebrationData) => void> = [];

export function triggerCelebration(data: CelebrationData) {
  _celebrationListeners.forEach((fn) => fn(data));
}

function CelebrationOverlay({ data, onDone }: { data: CelebrationData; onDone: (id: string) => void }) {
  const [phase, setPhase] = useState<"pause" | "burst" | "toast" | "exit">("pause");

  useEffect(() => {
    // Micro pause
    const t1 = setTimeout(() => setPhase("burst"), 250);
    const t2 = setTimeout(() => setPhase("toast"), 600);
    const t3 = setTimeout(() => setPhase("exit"), 4500);
    const t4 = setTimeout(() => onDone(data.id), 5000);
    if (navigator.vibrate) navigator.vibrate([40, 60, 80]);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [data.id, onDone]);

  return (
    <>
      {/* Screen flash */}
      <div className={cn(
        "fixed inset-0 z-[300] pointer-events-none transition-opacity duration-300",
        phase === "burst" ? "opacity-100" : "opacity-0",
      )} style={{ background: "radial-gradient(circle at center, rgba(251,191,36,0.12) 0%, transparent 70%)" }} />

      {/* Gold shimmer particles */}
      {(phase === "burst" || phase === "toast") && (
        <div className="fixed inset-0 z-[301] pointer-events-none overflow-hidden celebration-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full animate-celebration-particle"
              style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${20 + Math.random() * 30}%`,
                background: `hsl(${40 + Math.random() * 20}, 90%, ${60 + Math.random() * 25}%)`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1.5 + Math.random() * 1.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Premium toast */}
      <div className={cn(
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[302] pointer-events-none",
        "transition-all duration-500 ease-out",
        phase === "toast" && "opacity-100 scale-100",
        phase === "exit" && "opacity-0 scale-95 -translate-y-[calc(50%+20px)]",
        (phase === "pause" || phase === "burst") && "opacity-0 scale-90",
      )}>
        <div className="bg-card/95 backdrop-blur-xl border border-gold/40 rounded-2xl px-8 py-6 text-center shadow-[0_0_60px_-10px_rgba(251,191,36,0.35)] max-w-xs">
          <div className="absolute -top-0.5 left-6 right-6 h-[2px] rounded-full bg-gradient-to-r from-transparent via-gold to-transparent" />
          <span className="text-4xl block mb-2">{data.icon || "🏆"}</span>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold/80 mb-1">Record Broken</p>
          <p className="text-lg font-bold text-foreground">{data.title}</p>
          {data.value && (
            <p className="text-2xl font-bold font-mono text-gold mt-1">{data.value}</p>
          )}
          {data.subtitle && (
            <p className="text-xs text-muted-foreground mt-2">{data.subtitle}</p>
          )}
        </div>
      </div>
    </>
  );
}

export function CelebrationContainer() {
  const [queue, setQueue] = useState<CelebrationData[]>([]);

  useEffect(() => {
    const handler = (d: CelebrationData) => setQueue((q) => [...q, d]);
    _celebrationListeners.push(handler);
    return () => { _celebrationListeners = _celebrationListeners.filter((fn) => fn !== handler); };
  }, []);

  const handleDone = useCallback((id: string) => {
    setQueue((q) => q.filter((d) => d.id !== id));
  }, []);

  if (queue.length === 0) return null;
  const current = queue[0];
  return <CelebrationOverlay key={current.id} data={current} onDone={handleDone} />;
}