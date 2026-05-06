import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

export interface AchievementToastData {
  id: string;
  icon: string;
  title: string;
  description?: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";
}

const RARITY_CONFIG: Record<string, { label: string; bg: string; border: string; glow: string; text: string }> = {
  common: {
    label: "Common",
    bg: "bg-blue-500/10",
    border: "border-blue-400/30",
    glow: "shadow-[0_0_20px_-4px_rgba(96,165,250,0.3)]",
    text: "text-blue-400",
  },
  rare: {
    label: "Rare",
    bg: "bg-cyan-500/10",
    border: "border-cyan-400/30",
    glow: "shadow-[0_0_24px_-4px_rgba(34,211,238,0.35)]",
    text: "text-cyan-400",
  },
  epic: {
    label: "Epic",
    bg: "bg-purple-500/10",
    border: "border-purple-400/30",
    glow: "shadow-[0_0_28px_-4px_rgba(192,132,252,0.4)]",
    text: "text-purple-400",
  },
  legendary: {
    label: "Legendary",
    bg: "bg-amber-500/10",
    border: "border-amber-400/30",
    glow: "shadow-[0_0_32px_-4px_rgba(251,191,36,0.45)]",
    text: "text-amber-400",
  },
  mythic: {
    label: "Mythic",
    bg: "bg-gradient-to-r from-rose-500/10 via-violet-500/10 to-cyan-500/10",
    border: "border-rose-400/30",
    glow: "shadow-[0_0_40px_-4px_rgba(244,114,182,0.5)]",
    text: "text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-violet-400 to-cyan-400",
  },
};

interface ToastItemProps {
  toast: AchievementToastData;
  onDone: (id: string) => void;
}

function ToastItem({ toast, onDone }: ToastItemProps) {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");
  const cfg = RARITY_CONFIG[toast.rarity] || RARITY_CONFIG.common;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("visible"), 50);
    const t2 = setTimeout(() => setPhase("exit"), 4000);
    const t3 = setTimeout(() => onDone(toast.id), 4400);
    // Vibration
    if (navigator.vibrate) {
      navigator.vibrate(toast.rarity === "mythic" ? [50, 30, 80] : toast.rarity === "legendary" ? [50, 30, 50] : [30]);
    }
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [toast.id, toast.rarity, onDone]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border px-4 py-3 backdrop-blur-md transition-all duration-400 ease-out",
        cfg.border, cfg.glow,
        phase === "enter" && "opacity-0 translate-y-4 scale-95",
        phase === "visible" && "opacity-100 translate-y-0 scale-100",
        phase === "exit" && "opacity-0 -translate-y-2 scale-95",
      )}
      style={{
        background: "hsl(var(--card) / 0.92)",
      }}
    >
      {/* Rarity glow bar at top */}
      <div className={cn(
        "absolute top-0 left-3 right-3 h-[2px] rounded-full",
        toast.rarity === "mythic"
          ? "bg-gradient-to-r from-rose-400 via-violet-400 to-cyan-400"
          : toast.rarity === "legendary"
          ? "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400"
          : toast.rarity === "epic"
          ? "bg-gradient-to-r from-purple-400 to-pink-400"
          : toast.rarity === "rare"
          ? "bg-cyan-400"
          : "bg-blue-400",
      )} />

      <div className="flex items-center gap-3">
        <span className="text-2xl">{toast.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              🏆 Achievement Unlocked
            </span>
          </div>
          <p className="font-semibold text-sm text-foreground mt-0.5">{toast.title}</p>
          {toast.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{toast.description}</p>
          )}
          <span className={cn("text-[9px] font-bold uppercase tracking-widest mt-1 inline-block", cfg.text)}>
            {cfg.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Global toast queue ──
let _listeners: Array<(t: AchievementToastData) => void> = [];

export function triggerAchievementToast(data: AchievementToastData) {
  _listeners.forEach((fn) => fn(data));
}

export function AchievementToastContainer() {
  const [queue, setQueue] = useState<AchievementToastData[]>([]);

  useEffect(() => {
    const handler = (t: AchievementToastData) => {
      setQueue((q) => [...q, t]);
    };
    _listeners.push(handler);
    return () => {
      _listeners = _listeners.filter((fn) => fn !== handler);
    };
  }, []);

  const handleDone = useCallback((id: string) => {
    setQueue((q) => q.filter((t) => t.id !== id));
  }, []);

  if (queue.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90vw] max-w-sm space-y-2 pointer-events-none">
      {queue.slice(0, 3).map((t) => (
        <ToastItem key={t.id} toast={t} onDone={handleDone} />
      ))}
    </div>
  );
}