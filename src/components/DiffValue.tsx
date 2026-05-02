import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/store";

export default function DiffValue({
  value,
  symbol = "$",
  showPercent,
  percent,
  className,
}: {
  value: number;
  symbol?: string;
  showPercent?: boolean;
  percent?: number;
  className?: string;
}) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus;
  const color = isPositive
    ? "text-success"
    : isNegative
    ? "text-warning"
    : "text-muted-foreground";

  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-sm font-semibold", color, className)}>
      <Icon className="h-3.5 w-3.5" />
      {formatCurrency(Math.abs(value), symbol)}
      {showPercent && percent !== undefined && (
        <span className="text-xs">({percent > 0 ? "+" : ""}{percent.toFixed(1)}%)</span>
      )}
    </span>
  );
}