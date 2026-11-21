import { CawnWorkspace } from "@/components/cawn-workspace";
import { serverApi } from "@/lib/api";
import type { Cawn, PagedResult } from "@/lib/types";

export const metadata = { title: "Warning notices" };

export default async function CawnPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams({ pageSize: "100" });
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.search) query.set("search", params.search);

  const result = await serverApi<PagedResult<Cawn>>(`/api/cawns?${query}`);

  return (
    <CawnWorkspace
      result={result}
      initialStatus={params.status ?? "all"}
      initialSearch={params.search ?? ""}
      now={new Date().toISOString()}
    />
  );
}
