"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PeopleFilters({ initialSearch }: { initialSearch: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        router.replace(search ? `/people?search=${encodeURIComponent(search)}` : "/people");
      });
    }, 280);
    return () => clearTimeout(timer);
  }, [search, router]);

  return (
    <div className="relative max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search people by name…"
        className="h-9 bg-background pl-9"
      />
    </div>
  );
}
