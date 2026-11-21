import Link from "next/link";
import { ArrowLeft, ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge, StatusBadge } from "@/components/status-badges";
import { PrintButton } from "@/components/print-button";
import { serverApi, getSession } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import type { IntelligenceReport } from "@/lib/types";

export const metadata = { title: "Intelligence report" };

export default async function IntelligencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let report: IntelligenceReport;
  try {
    report = await serverApi<IntelligenceReport>(`/api/persons/${id}/intelligence-report`);
  } catch {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">Intelligence report unavailable.</div>
    );
  }

  const officer = await getSession();
  const { person } = report;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
        <Button variant="outline" render={<Link href={`/people/${person.id}`} />}>
          <ArrowLeft className="size-4" />
          Back to person file
        </Button>
        <PrintButton />
      </div>

      <Card className="card-shadow overflow-hidden border-border/70 print:border-0 print:shadow-none">
        <div className="border-b border-border bg-sidebar px-6 py-5 text-sidebar-foreground">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-primary">
              <Sparkles className="size-4" />
              Individual intelligence report
            </div>
            <Badge variant="outline" className="border-white/15 bg-white/5 text-[9px] text-sidebar-foreground/70">
              PROTECTIVE MARKING · OFFICIAL-SENSITIVE
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{person.fullName}</h1>
          <p className="mt-1 text-[12px] text-sidebar-foreground/60">
            Generated {formatDateTime(report.generatedAt)} by {officer?.displayName ?? "Vantage"} · {officer?.tenantName}
          </p>
        </div>

        <CardContent className="space-y-6 p-6">
          <section className="grid gap-4 sm:grid-cols-4">
            <Fact label="Age" value={person.age != null ? `${person.age}` : "Unknown"} />
            <Fact label="Sex" value={person.sex} />
            <Fact label="DOB" value={formatDate(person.dateOfBirth)} />
            <Fact label="Episodes" value={String(person.episodes.length)} />
          </section>

          <Section title="Risk factors">
            {report.riskFactors.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No specific risk factors recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {report.riskFactors.map((factor) => (
                  <Badge key={factor} variant="outline" className="border-rose-200 bg-rose-50 text-rose-800">
                    <ShieldAlert className="size-3" />
                    {factor}
                  </Badge>
                ))}
              </div>
            )}
          </Section>

          <Section title="Key people">
            {report.keyPeople.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No significant-risk associates recorded.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {report.keyPeople.map((associate) => (
                  <div key={associate.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium">{associate.name}</span>
                      <Badge variant="outline" className="border-red-200 bg-red-50 text-[8px] text-red-700">Risk</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{associate.relationship ?? "Relationship unknown"}</div>
                    {associate.address && <div className="mt-1 text-[10px] text-muted-foreground">{associate.address}</div>}
                    {associate.notes && <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{associate.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Key locations">
            {report.keyLocations.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No priority locations recorded.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {report.keyLocations.map((place) => (
                  <div key={place.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium">{place.label}</span>
                      <Badge variant="outline" className="text-[8px]">{place.searchPriority} priority</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{place.category}{place.address ? ` · ${place.address}` : ""}</div>
                    {place.notes && <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{place.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Intelligence notes">
            {report.intelligence.length === 0 ? (
              <p className="text-[12px] text-muted-foreground">No intelligence-categorised notes on file.</p>
            ) : (
              <div className="space-y-2">
                {report.intelligence.map((note) => (
                  <div key={note.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium">{note.title}</span>
                      <Badge variant="outline" className="text-[8px]">{note.category}</Badge>
                      {note.isSensitive && <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[8px] text-rose-700">Sensitive</Badge>}
                      <span className="ml-auto text-[9px] text-muted-foreground">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{note.body}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Missing episode history">
            <div className="overflow-hidden rounded-lg border border-border/60">
              {report.episodes.map((episode) => (
                <div key={episode.id} className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2 last:border-0">
                  <span className="font-mono text-[10px] text-primary">{episode.caseNumber}</span>
                  <StatusBadge value={episode.status} />
                  <RiskBadge value={episode.riskLevel} />
                  <span className="text-[10px] text-muted-foreground">{formatDate(episode.reportedAt)}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{episode.lastSeenLocation ?? "Location unknown"}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Recommended search considerations">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {report.searchConsiderations.map((consideration) => (
                <div key={consideration} className="flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px]">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/50" />
                  {consideration}
                </div>
              ))}
            </div>
          </Section>

          <p className="border-t border-border pt-4 text-[9px] leading-relaxed text-muted-foreground">
            This report is generated from information recorded on the person file and should be treated as
            intelligence, not evidence. Handle in accordance with force information management policies.
            Prototype environment — synthetic data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[13px] font-medium">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
