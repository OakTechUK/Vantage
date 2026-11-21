import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  Baby,
  ClipboardList,
  Clock3,
  FolderSearch,
  MapPin,
  Plus,
  Repeat2,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader, EmptyState } from "@/components/page-header";
import { StatCard, MiniStat } from "@/components/stat-card";
import { CaseTable } from "@/components/case-table";
import { RiskBadge } from "@/components/status-badges";
import { serverApi, getSession } from "@/lib/api";
import { formatDateTime, titleCase } from "@/lib/format";
import type { Dashboard, RiskLevel } from "@/lib/types";

const riskOrder: RiskLevel[] = ["Critical", "High", "Medium", "Low"];
const riskBar: Record<RiskLevel, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-400",
  Medium: "bg-amber-400",
  Low: "bg-slate-300",
};

export default async function DashboardPage() {
  const [dashboard, officer] = await Promise.all([
    serverApi<Dashboard>("/api/reports/dashboard"),
    getSession(),
  ]);

  const { stats } = dashboard;
  const activeRiskTotal = dashboard.riskBreakdown.reduce((sum, item) => sum + item.count, 0);
  const firstName = officer
    ? titleCase(officer.email.split("@")[0].split(".")[0])
    : "Officer";

  return (
    <>
      <PageHeader
        eyebrow="Operational overview"
        title={`Welcome back, ${firstName}`}
        description={
          <span>
            Live picture across {officer?.tenantName}. Dashboard refreshed {formatDateTime(dashboard.generatedAt)}.
          </span>
        }
        actions={
          <>
            <Button variant="outline" render={<Link href="/cases" />}>
              <FolderSearch className="size-4" />
              All enquiries
            </Button>
            <Button render={<Link href="/cases/new" />}>
              <Plus className="size-4" />
              Log missing person
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active enquiries"
          value={stats.activeCases}
          hint={`${stats.reportedLast30Days} reported in the last 30 days`}
          icon={FolderSearch}
          tone="info"
        />
        <StatCard
          label="High & critical risk"
          value={stats.highRiskCases}
          hint="Open cases requiring close supervision"
          icon={ShieldAlert}
          tone="danger"
        />
        <StatCard
          label="Reviews overdue"
          value={stats.overdueReviews}
          hint={stats.dueSoonReviews > 0 ? `${stats.dueSoonReviews} more due within 24 hours` : "No reviews due soon"}
          icon={AlertTriangle}
          tone={stats.overdueReviews > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Open tasks"
          value={stats.openTasks}
          hint="Outstanding enquiry actions across all cases"
          icon={ClipboardList}
          tone="warn"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label="Children missing" value={stats.childrenMissing} icon={Baby} />
        <MiniStat label="Repeat missing people" value={stats.repeatMissingPersons} icon={Repeat2} />
        <MiniStat label="Reviews due soon" value={stats.dueSoonReviews} icon={CalendarClock} />
        <MiniStat label="Last 30 days" value={stats.reportedLast30Days} icon={Activity} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card className="card-shadow overflow-hidden border-border/70 py-0">
            <CardHeader className="border-b border-border/60 px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                Review queue
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  {dashboard.reviewQueue.length}
                </Badge>
              </CardTitle>
              <CardDescription>Priority ordering by next supervisory review.</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" render={<Link href="/cases?review=Overdue" />}>
                  View overdue
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </CardAction>
            </CardHeader>
            <CaseTable
              cases={dashboard.reviewQueue}
              emptyTitle="Review queue is clear"
              emptyDescription="No open enquiries are due or overdue for review."
            />
          </Card>

          <Card className="card-shadow overflow-hidden border-border/70 py-0">
            <CardHeader className="border-b border-border/60 px-5 py-4">
              <CardTitle className="text-[15px]">Recent enquiries</CardTitle>
              <CardDescription>Latest reports recorded by your force.</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm" render={<Link href="/cases" />}>
                  All enquiries
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </CardAction>
            </CardHeader>
            <CaseTable cases={dashboard.recentCases} compact />
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="card-shadow border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Risk profile</CardTitle>
              <CardDescription>Open enquiries by assessed risk.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {riskOrder.map((risk) => {
                const count = dashboard.riskBreakdown.find((item) => item.risk === risk)?.count ?? 0;
                const percentage = activeRiskTotal === 0 ? 0 : Math.round((count / activeRiskTotal) * 100);
                return (
                  <div key={risk} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2 font-medium">
                        <span className={`size-2 rounded-full ${riskBar[risk]}`} />
                        {risk}
                      </span>
                      <span className="tabular text-muted-foreground">
                        {count} · {percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${riskBar[risk]}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
              <Separator />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Review compliance</span>
                <span className="font-semibold text-emerald-600">
                  {stats.activeCases === 0
                    ? "—"
                    : `${Math.round(((stats.activeCases - stats.overdueReviews) / stats.activeCases) * 100)}%`}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Repeat2 className="size-4 text-violet-500" />
                Repeat missing people
              </CardTitle>
              <CardDescription>People with more than one recorded episode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {dashboard.repeatPersons.length === 0 ? (
                <EmptyState icon={Repeat2} title="No repeat individuals" className="py-6" />
              ) : (
                dashboard.repeatPersons.map((person) => (
                  <Link
                    key={person.personId}
                    href={`/people/${person.personId}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium">{person.fullName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {person.episodeCount} episodes · {person.latestLocation ?? "location unknown"}
                      </div>
                    </div>
                    <RiskBadge value={person.latestRisk} />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="card-shadow border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <MapPin className="size-4 text-sky-500" />
                Location hotspots
              </CardTitle>
              <CardDescription>Open enquiries by last seen location.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.topLocations.length === 0 ? (
                <EmptyState icon={MapPin} title="No locations recorded" className="py-6" />
              ) : (
                dashboard.topLocations.slice(0, 5).map((location, index) => (
                  <div key={location.location} className="flex items-center gap-3">
                    <div className="tabular flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">{location.location}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {location.caseCount} {location.caseCount === 1 ? "case" : "cases"} · {location.repeatCount} repeat · {location.childCount} {location.childCount === 1 ? "child" : "children"}
                      </div>
                    </div>
                    <Clock3 className="size-3.5 text-muted-foreground/60" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
