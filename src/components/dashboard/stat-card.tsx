import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: LucideIcon;
  accent?: "primary" | "amber" | "sage" | "destructive";
  className?: string;
}

const accents: Record<NonNullable<Props["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-accent/30 text-foreground",
  sage: "bg-chart-4/15 text-chart-4",
  destructive: "bg-destructive/10 text-destructive",
};

export function StatCard({
  label,
  value,
  delta,
  trend = "flat",
  icon: Icon,
  accent = "primary",
  className,
}: Props) {
  return (
    <Card className={cn("p-5 rounded-xl", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {delta && (
            <p
              className={cn(
                "text-xs font-medium",
                trend === "up" && "text-chart-4",
                trend === "down" && "text-destructive",
                trend === "flat" && "text-muted-foreground",
              )}
            >
              {delta}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("h-10 w-10 rounded-lg grid place-items-center", accents[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
