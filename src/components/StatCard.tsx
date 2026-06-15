import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  variant?: "default" | "success" | "warning" | "gold" | "purple" | "primary";
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "border-border",
  success: "border-success/30 bg-gradient-to-br from-success/[0.04] to-transparent",
  warning: "border-warning/30 bg-gradient-to-br from-warning/[0.04] to-transparent",
  gold: "border-gold/30 bg-gradient-to-br from-gold/[0.05] to-transparent",
  purple: "border-beast-purple/30 bg-gradient-to-br from-beast-purple/[0.05] to-transparent",
  primary: "border-primary/30 bg-gradient-to-br from-primary/[0.05] to-transparent",
};

const valueStyles: Record<string, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  gold: "text-gold",
  purple: "text-beast-purple",
  primary: "text-primary",
};

export default function StatCard({
  label,
  value,
  sub,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl border p-4 flex flex-col gap-1 streex-card-hover",
        variantStyles[variant],
        className
      )}
    >
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl sm:text-[1.7rem] font-bold font-mono leading-tight tracking-tight",
          valueStyles[variant],
        )}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[11px] text-muted-foreground leading-snug">{sub}</span>
      )}
    </div>
  );
}
