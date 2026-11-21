import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PeopleFilters } from "@/components/people-filters";
import { PeopleTable } from "@/components/people-table";
import { serverApi } from "@/lib/api";
import type { PagedResult, PersonSummary } from "@/lib/types";

export const metadata = { title: "People" };

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const query = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (params.search) query.set("search", params.search);

  const result = await serverApi<PagedResult<PersonSummary>>(`/api/persons?${query}`);

  function pageHref(target: number) {
    const next = new URLSearchParams(query);
    next.set("page", String(target));
    return `/people?${next}`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Person records"
        title="People"
        description="The enduring person record. Repeat missing episodes are linked automatically so officers never re-key a person's history."
        actions={
          <Button render={<Link href="/cases/new" />}>
            <Plus className="size-4" />
            Log missing person
          </Button>
        }
      />

      <Card className="card-shadow mb-4 border-border/70 py-3">
        <CardContent className="px-4">
          <PeopleFilters initialSearch={params.search ?? ""} />
        </CardContent>
      </Card>

      <Card className="card-shadow overflow-hidden border-border/70 py-0">
        <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4 text-muted-foreground" />
            {result.total} {result.total === 1 ? "person" : "people"}
          </div>
          <span className="text-[11px] text-muted-foreground">Page {result.page} of {Math.max(1, result.totalPages)}</span>
        </CardHeader>
        <PeopleTable people={result.items} />
        {result.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
            <span className="text-[11px] text-muted-foreground">
              Showing {(result.page - 1) * result.pageSize + 1}–{Math.min(result.page * result.pageSize, result.total)} of {result.total}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} render={page > 1 ? <Link href={pageHref(page - 1)} /> : undefined}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= result.totalPages} render={page < result.totalPages ? <Link href={pageHref(page + 1)} /> : undefined}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
