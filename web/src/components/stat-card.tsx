import type { LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";

type Tone = "default" | "danger" | "warn" | "success" | "info";

const tones: Record<Tone, { icon: string; value: string; ring: string }> = {
  default: { icon: "bg-primary/8 text-primary", value: "text-foreground", ring: "hover:border-primary/25" },
  danger: { icon: "bg-red-50 text-red-600", value: "text-red-700", ring: "hover:border-red-200" },
  warn: { icon: "bg-amber-50 text-amber-600", value: "text-amber-700", ring: "hover:border-amber-200" },
  success: { icon: "bg-emerald-50 text-emerald-600", value: "text-emerald-700", ring: "hover:border-emerald-200" },
  info: { icon: "bg-sky-50 text-sky-600", value: "text-sky-700", ring: "hover:border-sky-200" },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  const style = tones[tone];
  return (
    <Card className={cn("card-shadow gap-0 border-border/70 py-0 transition-colors", style.ring, className)}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className={cn("tabular text-3xl font-semibold leading-none tracking-tight", style.value)}>
            {value}
          </p>
          {hint && <p className="pt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", style.icon)}>
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MiniStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
      <Icon className="size-4 text-muted-foreground" />
      <div className="min-w-0">
        <div className="tabular text-sm font-semibold leading-none">{value}</div>
        <div className="mt-1 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}
