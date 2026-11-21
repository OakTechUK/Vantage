import Link from "next/link";
import { FolderSearch } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RiskBadge, ReviewBadge, StatusBadge } from "@/components/status-badges";
import { PersonAvatar } from "@/components/person-avatar";
import { EmptyState } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import type { CaseSummary } from "@/lib/types";

export function CaseTable({
  cases,
  emptyTitle = "No enquiries",
  emptyDescription,
  compact = false,
}: {
  cases: CaseSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
  compact?: boolean;
}) {
  if (cases.length === 0) {
    return <EmptyState icon={FolderSearch} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5">Person</TableHead>
          <TableHead>Enquiry</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead>Review</TableHead>
          {!compact && <TableHead>Last seen</TableHead>}
          <TableHead>Status</TableHead>
          {!compact && <TableHead className="pr-5 text-right">Tasks</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {cases.map((item) => (
          <TableRow key={item.id} className="group">
            <TableCell className="pl-5">
              <Link href={`/cases/${item.id}`} className="flex items-center gap-3">
                <PersonAvatar
                  personId={item.personId}
                  name={item.personName}
                  imageId={item.primaryImageId}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium group-hover:underline">
                      {item.personName}
                    </span>
                    {item.isChild && (
                      <span className="rounded border border-sky-200 bg-sky-50 px-1 text-[9px] font-semibold uppercase text-sky-700">
                        Child
                      </span>
                    )}
                    {item.isRepeat && (
                      <span className="rounded border border-violet-200 bg-violet-50 px-1 text-[9px] font-semibold uppercase text-violet-700">
                        Repeat
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {item.personAge != null ? `${item.personAge} yrs` : "Age unknown"} · {item.sex}
                  </div>
                </div>
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/cases/${item.id}`} className="font-mono text-[11px] font-medium text-primary hover:underline">
                {item.caseNumber}
              </Link>
              <div className="text-[11px] text-muted-foreground">{formatDate(item.reportedAt)}</div>
            </TableCell>
            <TableCell>
              <RiskBadge value={item.riskLevel} />
            </TableCell>
            <TableCell>
              <ReviewBadge status={item.reviewStatus} dueAt={item.nextReviewDueAt} />
            </TableCell>
            {!compact && (
              <TableCell>
                <div className="max-w-[180px] truncate text-[12px]">{item.lastSeenLocation ?? "—"}</div>
                <div className="text-[10px] text-muted-foreground">{item.category}</div>
              </TableCell>
            )}
            <TableCell>
              <StatusBadge value={item.status} />
            </TableCell>
            {!compact && (
              <TableCell className="pr-5 text-right">
                <span className="tabular inline-flex min-w-6 justify-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {item.openTaskCount}
                </span>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
