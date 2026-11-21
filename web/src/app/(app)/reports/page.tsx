import Link from "next/link";
import {
  BarChart3,
  CalendarRange,
  Baby,
  Download,
  FolderSearch,
  MapPin,
  Repeat2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ReportFilters } from "@/components/report-filters";
import { RiskBadge } from "@/components/status-badges";
import { serverApi } from "@/lib/api";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import type { ReportsOverview, RiskLevel } from "@/lib/types";

const riskColors: Record<RiskLevel, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-400",
  Medium: "bg-amber-400",
  Low: "bg-slate-300",
};

export const metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; location?: string; minEpisodes?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.location) query.set("location", params.location);
  if (params.minEpisodes) query.set("minEpisodes", params.minEpisodes);

  const overview = await serverApi<ReportsOverview>(`/api/reports/overview?${query}`);
  const { stats } = overview;
  const trendMax = Math.max(1, ...stats.monthlyTrend.flatMap((month) => [month.reported, month.located]));
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;

  return (
    <>
      <PageHeader
        eyebrow="Analysis & statutory returns"
        title="Reports"
        description="Force-level statistics, repeat missing person analysis and location hotspots. The same building blocks generate the UK Missing Persons Bureau quarterly return."
        actions={
          <>
            <Button variant="outline" render={<a href={`/api/backend/reports/mpb-return?year=${now.getFullYear()}&quarter=${quarter}`} />}>
              <Download className="size-4" />
              MPB return Q{quarter}
            </Button>
          </>
        }
      />

      <Card className="card-shadow mb-5 border-border/70 py-4">
        <CardContent className="px-4">
          <ReportFilters
            initial={{
              from: params.from ? new Date(params.from).toISOString().slice(0, 10) : "",
              to: params.to ? new Date(params.to).toISOString().slice(0, 10) : "",
              location: params.location ?? "",
              minEpisodes: params.minEpisodes ?? "2",
            }}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Enquiries in range" value={stats.totalCases} hint={`${stats.activeCases} still active`} icon={FolderSearch} tone="info" />
        <StatCard label="Repeat missing people" value={stats.repeatPersons} hint={`${stats.repeatCases} repeat episodes`} icon={Repeat2} tone="warn" />
        <StatCard label="Children involved" value={stats.childCases} hint="Cases where the person was under 18 at report" icon={Baby} />
        <StatCard label="Closed enquiries" value={stats.closedCases} hint={`${stats.locatedCases} currently marked located`} icon={CalendarRange} tone="success" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="card-shadow border-border/70 xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <BarChart3 className="size-4 text-sky-500" />
              Six-month reporting trend
            </CardTitle>
            <CardDescription>Reports and locations recorded by calendar month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end justify-between gap-3 sm:gap-5">
              {stats.monthlyTrend.map((month) => (
                <div key={month.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-36 w-full items-end justify-center gap-1">
                    <div className="group relative w-4 rounded-t bg-chart-2 sm:w-6" style={{ height: `${Math.max(4, (month.reported / trendMax) * 100)}%` }}>
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">{month.reported}</span>
                    </div>
                    <div className="group relative w-4 rounded-t bg-chart-1 sm:w-6" style={{ height: `${Math.max(4, (month.located / trendMax) * 100)}%` }}>
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">{month.located}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-medium text-muted-foreground">{month.month.split(" ")[0]}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-chart-2" /> Reported</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-chart-1" /> Located</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow border-border/70">
          <CardHeader>
            <CardTitle className="text-[15px]">Risk & outcome profile</CardTitle>
            <CardDescription>Distribution across the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {stats.riskBreakdown.map((item) => {
                const percentage = stats.totalCases === 0 ? 0 : Math.round((item.count / stats.totalCases) * 100);
                return (
                  <div key={item.risk}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span>{item.risk}</span>
                      <span className="tabular text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full ${riskColors[item.risk]}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border pt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Outcomes</div>
              {stats.outcomes.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No outcomes recorded in this period.</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.outcomes.map((outcome) => (
                    <div key={outcome.outcome} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{titleCase(outcome.outcome)}</span>
                      <span className="tabular font-medium">{outcome.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="card-shadow overflow-hidden border-border/70 py-0">
          <CardHeader className="border-b border-border/60 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <Repeat2 className="size-4 text-violet-500" />
              Repeat missing persons
            </CardTitle>
            <CardDescription>People meeting the repeat threshold in the selected range.</CardDescription>
          </CardHeader>
          {overview.repeatPersons.length === 0 ? (
            <EmptyState icon={Repeat2} title="No repeat missing people" description="Adjust the date range or lower the repeat threshold." />
          ) : (
            <div className="divide-y divide-border/50">
              {overview.repeatPersons.map((person) => (
                <Link key={person.personId} href={`/people/${person.personId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                  <div className="flex size-8 items-center justify-center rounded-full bg-violet-50 text-[10px] font-semibold text-violet-700">
                    {person.episodeCount}×
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium">{person.fullName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {person.age != null ? `${person.age} yrs` : "Age unknown"} · last reported {formatDate(person.lastReportedAt)} · {person.latestLocation ?? "location unknown"}
                    </div>
                  </div>
                  <RiskBadge value={person.latestRisk} />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="card-shadow overflow-hidden border-border/70 py-0">
          <CardHeader className="border-b border-border/60 px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <MapPin className="size-4 text-sky-500" />
              Location hotspots
            </CardTitle>
            <CardDescription>Last seen locations in the selected period.</CardDescription>
          </CardHeader>
          {overview.locations.length === 0 ? (
            <EmptyState icon={MapPin} title="No locations in range" />
          ) : (
            <div className="divide-y divide-border/50">
              {overview.locations.map((location, index) => (
                <div key={location.location} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium">{location.location}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {location.repeatCount} repeat · {location.childCount} {location.childCount === 1 ? "child" : "children"}
                    </div>
                  </div>
                  <Badge variant="secondary" className="tabular">{location.caseCount}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="card-shadow mt-5 border-dashed border-border/80 bg-muted/20">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[12px] font-semibold">UK Missing Persons Bureau quarterly return</div>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
              Generated by an exporter behind an interface, currently in CSV format for prototyping.
              Replace the implementation with the national submission format without changing the API or UI.
            </p>
          </div>
          <Button variant="outline" render={<a href={`/api/backend/reports/mpb-return?year=${now.getFullYear()}&quarter=${quarter}`} />}>
            <Download className="size-4" />
            Download Q{quarter} {now.getFullYear()}
          </Button>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-[10px] text-muted-foreground">
        Report generated {formatDateTime(stats.generatedAt)} · synthetic prototype data
      </p>
    </>
  );
}
