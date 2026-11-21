import { notFound } from "next/navigation";
import { CaseWorkspace } from "@/components/case-workspace";
import { serverApi, getSession } from "@/lib/api";
import type { CaseDetail, OfficerListDto } from "@/lib/types";

export const metadata = { title: "Enquiry" };

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detail: CaseDetail;
  try {
    detail = await serverApi<CaseDetail>(`/api/cases/${id}`);
  } catch {
    notFound();
  }

  const [officers, officer] = await Promise.all([
    serverApi<OfficerListDto>("/api/officers"),
    getSession(),
  ]);

  return (
    <CaseWorkspace
      detail={detail}
      officers={officers.items}
      canReview={officer?.role !== "Officer"}
    />
  );
}
