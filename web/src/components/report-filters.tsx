"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const minEpisodeItems = [
  { value: "2", label: "2 or more" },
  { value: "3", label: "3 or more" },
  { value: "4", label: "4 or more" },
];

export function ReportFilters({
  initial,
}: {
  initial: { from: string; to: string; location: string; minEpisodes: string };
}) {
  const router = useRouter();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [location, setLocation] = useState(initial.location);
  const [minEpisodes, setMinEpisodes] = useState(initial.minEpisodes);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
      if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
      if (location) params.set("location", location);
      if (minEpisodes !== "2") params.set("minEpisodes", minEpisodes);
      startTransition(() => router.replace(`/reports${params.size ? `?${params}` : ""}`));
    }, 300);
    return () => clearTimeout(timer);
  }, [from, to, location, minEpisodes, router]);

  function reset() {
    setFrom("");
    setTo("");
    setLocation("");
    setMinEpisodes("2");
  }

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
      <div className="grid flex-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">From</Label>
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 bg-background" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">To</Label>
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9 bg-background" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Location contains</Label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Riverside" className="h-9 bg-background pl-8" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Repeat threshold</Label>
          <Select items={minEpisodeItems} value={minEpisodes} onValueChange={(value) => setMinEpisodes(String(value))}>
            <SelectTrigger className="h-9 w-[130px] bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {minEpisodeItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="sm" onClick={reset} className="mt-5">
          <RotateCcw className="size-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}
