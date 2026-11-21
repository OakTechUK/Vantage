"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Filters = {
  search: string;
  status: string;
  risk: string;
  review: string;
};

const statusItems = [
  { value: "all", label: "All statuses" },
  { value: "Reported", label: "Reported" },
  { value: "Active", label: "Active" },
  { value: "Located", label: "Located" },
  { value: "Closed", label: "Closed" },
];

const riskItems = [
  { value: "all", label: "All risk levels" },
  { value: "Critical", label: "Critical" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const reviewItems = [
  { value: "all", label: "All reviews" },
  { value: "Overdue", label: "Overdue" },
  { value: "DueSoon", label: "Due soon" },
  { value: "OnTrack", label: "On track" },
  { value: "NotScheduled", label: "Not scheduled" },
];

export function CaseFilters({ initial }: { initial: Filters }) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.risk !== "all") params.set("risk", filters.risk);
      if (filters.review !== "all") params.set("review", filters.review);
      startTransition(() => {
        router.replace(`/cases${params.size ? `?${params}` : ""}`);
      });
    }, 280);
    return () => clearTimeout(timer);
  }, [filters, router]);

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    setFilters({ search: "", status: "all", risk: "all", review: "all" });
  }

  const dirty =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.risk !== "all" ||
    filters.review !== "all";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(event) => update("search", event.target.value)}
          placeholder="Search name or case number…"
          className="h-9 bg-background pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={statusItems}
          value={filters.status}
          onValueChange={(value) => update("status", String(value ?? "all"))}
        >
          <SelectTrigger className="h-9 min-w-[135px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={riskItems}
          value={filters.risk}
          onValueChange={(value) => update("risk", String(value ?? "all"))}
        >
          <SelectTrigger className="h-9 min-w-[135px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {riskItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={reviewItems}
          value={filters.review}
          onValueChange={(value) => update("review", String(value ?? "all"))}
        >
          <SelectTrigger className="h-9 min-w-[135px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {reviewItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {dirty && (
          <Button variant="ghost" size="sm" onClick={reset} disabled={pending} className="h-9">
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
