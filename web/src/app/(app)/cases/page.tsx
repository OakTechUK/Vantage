import Link from "next/link";
import { FolderSearch, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { CaseFilters } from "@/components/case-filters";
import { CaseTable } from "@/components/case-table";
import { serverApi } from "@/lib/api";
import type { CaseSummary, PagedResult } from "@/lib/types";

export const metadata = { title: "Enquiries" };

type SearchParams = {
  search?: string;
  status?: string;
  risk?: string;
  review?: string;
  page?: string;
};

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const query = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (params.search) query.set("search", params.search);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.risk && params.risk !== "all") query.set("risk", params.risk);
  if (params.review && params.review !== "all") query.set("review", params.review);

  const result = await serverApi<PagedResult<CaseSummary>>(`/api/cases?${query}`);

  function pageHref(target: number) {
    const next = new URLSearchParams(query);
    next.set("page", String(target));
    return `/cases?${next}`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Case management"
        title="Missing person enquiries"
        description="Every stage of an enquiry, from initial report through investigation to closure, with review status and task ownership at a glance."
        actions={
          <Button render={<Link href="/cases/new" />}>
            <Plus className="size-4" />
            Log missing person
          </Button>
        }
      />

      <Card className="card-shadow mb-4 border-border/70 py-3">
        <CardContent className="px-4">
          <CaseFilters
            initial={{
              search: params.search ?? "",
              status: params.status ?? "all",
              risk: params.risk ?? "all",
              review: params.review ?? "all",
            }}
          />
        </CardContent>
      </Card>

      <Card className="card-shadow overflow-hidden border-border/70 py-0">
        <CardHeader className="flex-row items-center justify-between border-b border-border/60 px-5 py-3.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FolderSearch className="size-4 text-muted-foreground" />
            {result.total} {result.total === 1 ? "enquiry" : "enquiries"}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Page {result.page} of {Math.max(1, result.totalPages)}
          </span>
        </CardHeader>
        <CaseTable
          cases={result.items}
          emptyTitle="No enquiries match these filters"
          emptyDescription="Try clearing the search or filters, or log a new missing person report."
        />
        {result.totalPages > 1 && (
          <CardFooter className="justify-between border-t border-border/60 px-5 py-3">
            <span className="text-[11px] text-muted-foreground">
              Showing {(result.page - 1) * result.pageSize + 1}–
              {Math.min(result.page * result.pageSize, result.total)} of {result.total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                render={page > 1 ? <Link href={pageHref(page - 1)} /> : undefined}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= result.totalPages}
                render={page < result.totalPages ? <Link href={pageHref(page + 1)} /> : undefined}
              >
                Next
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </>
  );
}
