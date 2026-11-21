import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import { relativeTime } from "@/lib/format";
import type {
  CaseTaskStatus,
  CawnStatus,
  EpisodeStatus,
  IfindStatus,
  MissingCategory,
  ReviewStatus,
  RiskLevel,
  TaskPriority,
} from "@/lib/types";

const riskStyles: Record<RiskLevel, string> = {
  Low: "border-slate-200 bg-slate-50 text-slate-600",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  High: "border-orange-200 bg-orange-50 text-orange-700",
  Critical: "border-red-200 bg-red-50 text-red-700",
};

const reviewStyles: Record<ReviewStatus, { className: string; dot: string }> = {
  NotScheduled: { className: "border-slate-200 bg-slate-50 text-slate-500", dot: "bg-slate-400" },
  OnTrack: { className: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  DueSoon: { className: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  Overdue: { className: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500 animate-pulse" },
};

const statusStyles: Record<EpisodeStatus, string> = {
  Reported: "border-sky-200 bg-sky-50 text-sky-700",
  Active: "border-blue-200 bg-blue-50 text-blue-700",
  Located: "border-teal-200 bg-teal-50 text-teal-700",
  Closed: "border-slate-200 bg-slate-100 text-slate-500",
};

const reviewLabel: Record<ReviewStatus, string> = {
  NotScheduled: "No review",
  OnTrack: "On track",
  DueSoon: "Due soon",
  Overdue: "Overdue",
};

export function RiskBadge({ value, className }: { value: RiskLevel; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5", riskStyles[value], className)}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {value}
    </Badge>
  );
}

export function ReviewBadge({
  status,
  dueAt,
  showTime = true,
}: {
  status: ReviewStatus;
  dueAt?: string | null;
  showTime?: boolean;
}) {
  const style = reviewStyles[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5", style.className)}>
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {reviewLabel[status]}
      {showTime && dueAt && status !== "NotScheduled" && (
        <span className="font-normal opacity-70">· {relativeTime(dueAt)}</span>
      )}
    </Badge>
  );
}

export function StatusBadge({ value, className }: { value: EpisodeStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(statusStyles[value], className)}>
      {value}
    </Badge>
  );
}

export function CategoryBadge({ value }: { value: MissingCategory }) {
  return (
    <Badge variant="outline" className="border-border bg-background text-muted-foreground">
      {value}
    </Badge>
  );
}

export function PriorityBadge({ value }: { value: TaskPriority }) {
  const styles: Record<TaskPriority, string> = {
    Low: "border-slate-200 bg-slate-50 text-slate-500",
    Normal: "border-slate-200 bg-slate-50 text-slate-600",
    High: "border-orange-200 bg-orange-50 text-orange-700",
    Urgent: "border-red-200 bg-red-50 text-red-700",
  };
  return <Badge variant="outline" className={styles[value]}>{value}</Badge>;
}

export function TaskStatusBadge({ value }: { value: CaseTaskStatus }) {
  const styles: Record<CaseTaskStatus, string> = {
    Open: "border-sky-200 bg-sky-50 text-sky-700",
    InProgress: "border-indigo-200 bg-indigo-50 text-indigo-700",
    Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Cancelled: "border-slate-200 bg-slate-50 text-slate-400 line-through",
  };
  return <Badge variant="outline" className={styles[value]}>{value === "InProgress" ? "In progress" : value}</Badge>;
}

export function IfindStatusBadge({ value }: { value: IfindStatus }) {
  const styles: Record<IfindStatus, string> = {
    NotStarted: "border-slate-200 bg-slate-50 text-slate-500",
    InProgress: "border-indigo-200 bg-indigo-50 text-indigo-700",
    Done: "border-emerald-200 bg-emerald-50 text-emerald-700",
    NotApplicable: "border-slate-200 bg-slate-50 text-slate-400",
  };
  const labels: Record<IfindStatus, string> = {
    NotStarted: "Not started",
    InProgress: "In progress",
    Done: "Done",
    NotApplicable: "N/A",
  };
  return <Badge variant="outline" className={styles[value]}>{labels[value]}</Badge>;
}

export function CawnStatusBadge({ value }: { value: CawnStatus }) {
  const styles: Record<CawnStatus, string> = {
    Active: "border-red-200 bg-red-50 text-red-700",
    Expired: "border-slate-200 bg-slate-50 text-slate-500",
    Revoked: "border-slate-200 bg-slate-50 text-slate-400 line-through",
  };
  return <Badge variant="outline" className={styles[value]}>{value}</Badge>;
}
