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
  success: "border-success/30",
  warning: "border-warning/30",
  gold: "border-gold/30",
  purple: "border-beast-purple/30",
  primary: "border-primary/30",
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
        "bg-card rounded-xl border p-4 flex flex-col gap-1",
        variantStyles[variant],
        className
      )}
    >
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <span className={cn("text-2xl font-bold font-mono", valueStyles[variant])}>
        {value}
      </span>
      {sub && (
        <span className="text-xs text-muted-foreground">{sub}</span>
      )}
    </div>
  );
}