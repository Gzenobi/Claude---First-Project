import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendTone?: "positive" | "negative" | "neutral";
  accent?: boolean;
}

export function KpiCard({ label, value, icon: Icon, trend, trendTone = "neutral", accent }: KpiCardProps) {
  return (
    <Card className={cn(accent && "border-akzo-blue/30 bg-gradient-to-br from-white to-accent")}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold text-akzo-blue-dark">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trendTone === "positive" && "text-emerald-600",
                trendTone === "negative" && "text-rose-600",
                trendTone === "neutral" && "text-muted-foreground",
              )}
            >
              {trend}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-akzo-blue/10 text-akzo-blue">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
