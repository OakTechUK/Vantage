import Link from "next/link";
import { Users } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { RiskBadge, StatusBadge } from "@/components/status-badges";
import { formatDate } from "@/lib/format";
import type { PersonSummary } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function PeopleTable({ people }: { people: PersonSummary[] }) {
  if (people.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No people found"
        description="Try a different search, or log a new missing person report."
        className="py-14"
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5">Person</TableHead>
          <TableHead>Date of birth</TableHead>
          <TableHead>Latest episode</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead className="pr-5 text-right">Episodes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {people.map((person) => (
          <TableRow key={person.id} className="group">
            <TableCell className="pl-5">
              <Link href={`/people/${person.id}`} className="flex items-center gap-3">
                <PersonAvatar personId={person.id} name={person.fullName} imageId={person.primaryImageId} size="sm" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium group-hover:underline">{person.fullName}</span>
                    {person.isRepeatMissing && (
                      <Badge variant="outline" className="border-violet-200 bg-violet-50 px-1 text-[9px] text-violet-700">
                        Repeat
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {person.age != null ? `${person.age} yrs` : "Age unknown"} · {person.sex}
                  </div>
                </div>
              </Link>
            </TableCell>
            <TableCell className="text-[12px]">{formatDate(person.dateOfBirth)}</TableCell>
            <TableCell>
              {person.latestStatus ? (
                <div className="flex items-center gap-2">
                  <StatusBadge value={person.latestStatus} />
                  <span className="text-[11px] text-muted-foreground">{formatDate(person.latestReportedAt)}</span>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">No episodes</span>
              )}
            </TableCell>
            <TableCell>{person.latestRisk ? <RiskBadge value={person.latestRisk} /> : "—"}</TableCell>
            <TableCell className="pr-5 text-right text-[12px] tabular">{person.episodeCount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
