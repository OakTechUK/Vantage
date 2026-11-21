"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Fingerprint,
  History,
  Loader2,
  MapPin,
  Plus,
  Repeat2,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CategoryBadge,
  IfindStatusBadge,
  PriorityBadge,
  RiskBadge,
  ReviewBadge,
  StatusBadge,
  TaskStatusBadge,
} from "@/components/status-badges";
import { PersonAvatar } from "@/components/person-avatar";
import { EmptyState } from "@/components/page-header";
import { cn } from "cn";
import { formatDate, formatDateTime, relativeTime, titleCase } from "@/lib/format";
import type {
  CaseDetail,
  CaseTask,
  IfindItem,
  IfindStatus,
  NoteCategory,
  OfficerSummary,
  OutcomeType,
  RiskLevel,
  TaskCategory,
  TaskDuplicateMatch,
  TaskPriority,
} from "@/lib/types";

const riskItems = [
  { value: "Critical", label: "Critical" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const categoryItems = [
  { value: "Enquiry", label: "Enquiry" },
  { value: "HouseToHouse", label: "House to house" },
  { value: "Cctv", label: "CCTV" },
  { value: "SocialMedia", label: "Social media" },
  { value: "Hospital", label: "Hospital / health" },
  { value: "School", label: "School / education" },
  { value: "Transport", label: "Transport" },
  { value: "Digital", label: "Digital / phone" },
  { value: "Forensic", label: "Forensic" },
  { value: "Other", label: "Other" },
];

const priorityItems = [
  { value: "Urgent", label: "Urgent" },
  { value: "High", label: "High" },
  { value: "Normal", label: "Normal" },
  { value: "Low", label: "Low" },
];

const noteCategoryItems: { value: NoteCategory; label: string }[] = [
  { value: "General", label: "General" },
  { value: "Background", label: "Background" },
  { value: "Family", label: "Family" },
  { value: "Health", label: "Health" },
  { value: "Risk", label: "Risk" },
  { value: "Intelligence", label: "Intelligence" },
  { value: "Exploitation", label: "Exploitation" },
];

const outcomeItems: { value: OutcomeType; label: string }[] = [
  { value: "LocatedSafe", label: "Located safe and well" },
  { value: "ReturnedVoluntarily", label: "Returned voluntarily" },
  { value: "FoundDeceased", label: "Found deceased" },
  { value: "Arrested", label: "Arrested" },
  { value: "NotLocated", label: "Not located — case closed" },
];

const ifindStatusItems: { value: IfindStatus; label: string }[] = [
  { value: "NotStarted", label: "Not started" },
  { value: "InProgress", label: "In progress" },
  { value: "Done", label: "Done" },
  { value: "NotApplicable", label: "Not applicable" },
];

function localNow() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

async function readError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return {
    message: (body as { detail?: string }).detail ?? "The request could not be completed.",
    duplicates: (body as { duplicates?: TaskDuplicateMatch[] }).duplicates ?? [],
  };
}

export function CaseWorkspace({
  detail,
  officers,
  canReview = true,
}: {
  detail: CaseDetail;
  officers: OfficerSummary[];
  canReview?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState<string | null>(null);

  const officerName = useMemo(() => {
    const map = new Map(officers.map((officer) => [officer.id, officer]));
    return (id: string | null) => (id ? map.get(id)?.displayName ?? "Unknown officer" : "Unassigned");
  }, [officers]);

  const isOpen = detail.status === "Reported" || detail.status === "Active";
  const openTasks = detail.tasks.filter((task) => task.status === "Open" || task.status === "InProgress");
  const completedIfind = detail.ifind.filter((item) => item.status === "Done" || item.status === "NotApplicable").length;
  const ifindProgress = detail.ifind.length === 0 ? 0 : Math.round((completedIfind / detail.ifind.length) * 100);
  const primaryImage = detail.person.images.find((image) => image.isPrimary) ?? detail.person.images[0];

  const [reviewOpen, setReviewOpen] = useState(false);
  const [locateOpen, setLocateOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [ifindOpen, setIfindOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  async function post<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
    const response = await fetch(`/api/backend${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await readError(response);
      throw Object.assign(new Error(error.message), { duplicates: error.duplicates });
    }
    return response.json() as Promise<T>;
  }

  async function completeTask(task: CaseTask) {
    setBusy(task.id);
    try {
      await post(`/tasks/${task.id}/status`, { status: "Completed", outcome: task.outcome ?? "Completed via case workspace." }, "PATCH");
      toast.success("Task completed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update task");
    } finally {
      setBusy(null);
    }
  }

  async function startTask(task: CaseTask) {
    setBusy(task.id);
    try {
      await post(`/tasks/${task.id}/status`, { status: "InProgress", outcome: null }, "PATCH");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update task");
    } finally {
      setBusy(null);
    }
  }

  async function notifyLocalAuthority() {
    setBusy("la");
    try {
      await post(`/cases/${detail.id}/notify-local-authority`);
      toast.success("Local authority notified");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Notification failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Link href="/cases" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="size-3" />
          Enquiries
        </Link>
        <span>/</span>
        <span className="font-mono text-foreground">{detail.caseNumber}</span>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <PersonAvatar
            personId={detail.person.id}
            name={detail.person.fullName}
            imageId={primaryImage?.id}
            size="xl"
            className="hidden sm:flex"
          />
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <StatusBadge value={detail.status} />
              <RiskBadge value={detail.riskLevel} />
              <CategoryBadge value={detail.category} />
              <ReviewBadge status={detail.reviewStatus} dueAt={detail.nextReviewDueAt} />
              {detail.isRepeatAtReport && (
                <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                  <Repeat2 className="size-3" /> Repeat missing
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
              {detail.person.fullName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {detail.person.age != null ? `${detail.person.age} years old` : "Age unknown"} · {detail.person.sex}
              {detail.lastSeenLocation ? ` · Last seen at ${detail.lastSeenLocation}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">{detail.caseNumber}</span>
              <span>·</span>
              <span>Reported {formatDateTime(detail.reportedAt)}</span>
              <span>·</span>
              <span>{officerName(detail.reportedByOfficerId)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" render={<Link href={`/people/${detail.person.id}`} />}>
            <FileText className="size-4" />
            Person file
          </Button>
          {isOpen && (
            <>
              <Button variant="outline" onClick={() => setTaskOpen(true)}>
                <Plus className="size-4" />
                Task
              </Button>
              {canReview && (
                <Button onClick={() => setReviewOpen(true)}>
                  <ShieldCheck className="size-4" />
                  Conduct review
                </Button>
              )}
            </>
          )}
          {isOpen && (
            <Select
              items={[
                { value: "locate", label: "Mark as located" },
                { value: "close", label: "Close enquiry" },
              ]}
              value={null}
              onValueChange={(value) => {
                if (value === "locate") setLocateOpen(true);
                if (value === "close") setCloseOpen(true);
              }}
            >
              <SelectTrigger className="h-8 min-w-[150px] bg-background">
                <SelectValue placeholder="More actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="locate">Mark as located</SelectItem>
                <SelectItem value="close">Close enquiry</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {detail.reviewStatus === "Overdue" && isOpen && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600" />
            <div>
              <p className="text-[13px] font-semibold text-red-800">Supervisory review overdue</p>
              <p className="text-[11px] text-red-700/80">
                This {detail.riskLevel.toLowerCase()} risk enquiry was due for review {relativeTime(detail.nextReviewDueAt)}.
              </p>
            </div>
          </div>
          {canReview ? (
            <Button size="sm" variant="destructive" onClick={() => setReviewOpen(true)}>
              Review now
            </Button>
          ) : (
            <span className="text-[11px] font-medium text-red-700">Awaiting supervisory review</span>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
        <TabsList variant="line" className="mb-5 w-full justify-start gap-1 overflow-x-auto border-b border-border pb-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
            {openTasks.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                {openTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="people">People & places</TabsTrigger>
          <TabsTrigger value="ifind">Search considerations</TabsTrigger>
          <TabsTrigger value="notes">
            Notes
            {detail.notes.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{detail.notes.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
            <div className="space-y-5">
              <Card className="card-shadow border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px]">Circumstances of report</CardTitle>
                  <CardDescription>
                    Recorded by {officerName(detail.reportedByOfficerId)} on {formatDateTime(detail.reportedAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/85">
                    {detail.circumstances}
                  </p>
                </CardContent>
              </Card>

              <Card className="card-shadow border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px]">Last seen</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Detail label="When" value={formatDateTime(detail.lastSeenAt)} icon={Clock3} />
                  <Detail label="Where" value={detail.lastSeenLocation} icon={MapPin} />
                  <Detail label="Wearing" value={detail.lastSeenWearing} icon={Fingerprint} />
                  <Detail label="With" value={detail.lastSeenWith} icon={Users} />
                </CardContent>
              </Card>

              <Card className="card-shadow border-border/70">
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-[15px]">Open tasks</CardTitle>
                    <CardDescription>{openTasks.length} outstanding actions on this enquiry.</CardDescription>
                  </div>
                  {isOpen && (
                    <Button variant="outline" size="sm" onClick={() => setTaskOpen(true)}>
                      <Plus className="size-3.5" />
                      Add
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {openTasks.length === 0 ? (
                    <EmptyState icon={ClipboardList} title="No open tasks" className="py-6" />
                  ) : (
                    openTasks.slice(0, 5).map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        officerName={officerName(task.assignedToOfficerId)}
                        busy={busy === task.id}
                        onComplete={() => completeTask(task)}
                        onStart={() => startTask(task)}
                      />
                    ))
                  )}
                  {openTasks.length > 5 && (
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setTab("tasks")}>
                      View all {openTasks.length} open tasks
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px]">Review history</CardTitle>
                  <CardDescription>Supervisory reviews and risk decisions.</CardDescription>
                </CardHeader>
                <CardContent>
                  {detail.reviews.length === 0 ? (
                    <EmptyState icon={ShieldCheck} title="No reviews recorded" className="py-6" />
                  ) : (
                    <ol className="relative space-y-4 border-l border-border pl-5">
                      {detail.reviews.map((review) => (
                        <li key={review.id} className="relative">
                          <span className="absolute -left-[26px] top-1 size-2 rounded-full border-2 border-background bg-primary" />
                          <div className="flex flex-wrap items-center gap-2 text-[12px]">
                            <span className="font-medium">{formatDateTime(review.reviewedAt)}</span>
                            <RiskBadge value={review.riskLevelAtReview} />
                            <span className="text-muted-foreground">by {officerName(review.reviewedByOfficerId)}</span>
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{review.notes}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            Next review due {formatDateTime(review.nextReviewDueAt)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5">
              <Card className="card-shadow border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px]">Person snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <PersonAvatar personId={detail.person.id} name={detail.person.fullName} imageId={primaryImage?.id} size="lg" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/people/${detail.person.id}`} className="truncate text-sm font-medium hover:underline">
                          {detail.person.fullName}
                        </Link>
                        {detail.person.isRepeatMissing && <Repeat2 className="size-3 text-violet-500" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        DOB {formatDate(detail.person.dateOfBirth)} · {detail.person.age ?? "?"} yrs
                      </div>
                    </div>
                  </div>
                  {detail.person.description && (
                    <p className="text-[12px] leading-relaxed text-muted-foreground">{detail.person.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <Fact label="Height" value={detail.person.heightCm ? `${detail.person.heightCm} cm` : "—"} />
                    <Fact label="Build" value={detail.person.build ?? "—"} />
                    <Fact label="Hair" value={detail.person.hairColour ?? "—"} />
                    <Fact label="Eyes" value={detail.person.eyeColour ?? "—"} />
                  </div>
                  <Separator />
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vulnerabilities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {vulnerabilityLabels(detail.person.vulnerabilities).length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">None recorded</span>
                      ) : (
                        vulnerabilityLabels(detail.person.vulnerabilities).map((label) => (
                          <Badge key={label} variant="outline" className="border-rose-200 bg-rose-50 text-[10px] text-rose-700">
                            {label}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" render={<Link href={`/people/${detail.person.id}`} />}>
                    Open full person file
                    <ArrowUpRight className="size-3.5" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="card-shadow border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px]">Enquiry facts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-[12px]">
                  <FactRow label="Case reference" value={<span className="font-mono">{detail.caseNumber}</span>} />
                  <FactRow label="Reported" value={formatDateTime(detail.reportedAt)} />
                  <FactRow label="Reported by" value={officerName(detail.reportedByOfficerId)} />
                  <FactRow label="Assigned to" value={officerName(detail.assignedOfficerId)} />
                  <FactRow label="Last reviewed" value={formatDateTime(detail.lastReviewedAt)} />
                  <FactRow label="Next review" value={formatDateTime(detail.nextReviewDueAt)} />
                  <FactRow
                    label="Local authority"
                    value={
                      detail.isChildAtReport ? (
                        detail.localAuthorityNotified ? (
                          <span className="text-emerald-700">Notified {formatDate(detail.localAuthorityNotifiedAt)}</span>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={notifyLocalAuthority}
                            disabled={busy === "la"}
                          >
                            {busy === "la" ? "Notifying…" : "Notify now"}
                          </Button>
                        )
                      ) : (
                        "Not applicable"
                      )
                    }
                  />
                  {detail.locatedAt && (
                    <>
                      <Separator className="my-1" />
                      <FactRow label="Located" value={formatDateTime(detail.locatedAt)} />
                      <FactRow label="Location" value={detail.locatedLocation ?? "—"} />
                      <FactRow label="Outcome" value={titleCase(detail.outcome)} />
                    </>
                  )}
                  {detail.closedAt && (
                    <>
                      <Separator className="my-1" />
                      <FactRow label="Closed" value={formatDateTime(detail.closedAt)} />
                      {detail.closureNotes && <p className="text-[11px] leading-relaxed text-muted-foreground">{detail.closureNotes}</p>}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px]">iFIND search progress</CardTitle>
                  <CardDescription>
                    {completedIfind} of {detail.ifind.length} considerations complete.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={ifindProgress} className="h-1.5" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{ifindProgress}% complete</span>
                    <Button variant="ghost" size="sm" onClick={() => setTab("ifind")}>
                      View checklist
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="card-shadow border-border/70">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[15px]">Enquiry tasks</CardTitle>
                <CardDescription>Duplicate checking runs against every task on this enquiry, including typos.</CardDescription>
              </div>
              {isOpen && (
                <Button onClick={() => setTaskOpen(true)}>
                  <Plus className="size-4" />
                  Add task
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.tasks.length === 0 ? (
                <EmptyState icon={ClipboardList} title="No tasks yet" description="Add search actions, enquiries and specialist checks." />
              ) : (
                detail.tasks
                  .slice()
                  .sort((a, b) => Number(a.status === "Completed" || a.status === "Cancelled") - Number(b.status === "Completed" || b.status === "Cancelled"))
                  .map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      officerName={officerName(task.assignedToOfficerId)}
                      busy={busy === task.id}
                      onComplete={() => completeTask(task)}
                      onStart={() => startTask(task)}
                      detailed
                    />
                  ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="people">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="card-shadow border-border/70">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[15px]">People of interest</CardTitle>
                  <CardDescription>Family, friends and associates linked to the person file.</CardDescription>
                </div>
                <Button variant="outline" size="sm" render={<Link href={`/people/${detail.person.id}`} />}>
                  Manage
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {detail.person.associates.length === 0 ? (
                  <EmptyState icon={Users} title="No associates recorded" className="py-8" />
                ) : (
                  detail.person.associates.map((associate) => (
                    <div key={associate.id} className="rounded-lg border border-border/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium">{associate.name}</span>
                        {associate.isSignificantRisk && (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-[9px] text-red-700">
                            Significant risk
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {associate.relationship ?? "Relationship unknown"}
                        {associate.address ? ` · ${associate.address}` : ""}
                      </div>
                      {associate.notes && <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{associate.notes}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="card-shadow border-border/70">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[15px]">Places of interest</CardTitle>
                  <CardDescription>Priority search locations and known addresses.</CardDescription>
                </div>
                <Button variant="outline" size="sm" render={<Link href={`/people/${detail.person.id}`} />}>
                  Manage
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {detail.person.placesOfInterest.length === 0 ? (
                  <EmptyState icon={MapPin} title="No places recorded" className="py-8" />
                ) : (
                  detail.person.placesOfInterest.map((place) => (
                    <div key={place.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium">{place.label}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {place.category} {place.address ? `· ${place.address}` : ""}
                        </div>
                        {place.notes && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{place.notes}</p>}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0",
                          place.searchPriority === "High" && "border-orange-200 bg-orange-50 text-orange-700",
                        )}
                      >
                        {place.searchPriority} priority
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ifind">
          <Card className="card-shadow border-border/70">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[15px]">iFIND-style search considerations</CardTitle>
                <CardDescription>
                  National search checklist filtered by age and risk. {completedIfind}/{detail.ifind.length} complete.
                </CardDescription>
              </div>
              {isOpen && (
                <Button onClick={() => setIfindOpen(true)}>
                  <Plus className="size-4" />
                  Add consideration
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.ifind.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No search considerations attached"
                  description="Add the national checklist items relevant to this person and risk level."
                  action={isOpen ? <Button onClick={() => setIfindOpen(true)}>Add first item</Button> : undefined}
                  className="py-10"
                />
              ) : (
                detail.ifind.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium">{item.title}</span>
                        <Badge variant="outline" className="text-[9px]">{item.category}</Badge>
                        {item.status === "Done" && <CheckCircle2 className="size-3.5 text-emerald-500" />}
                      </div>
                      {item.notes && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.notes}</p>}
                      {item.completedAt && <p className="mt-1 text-[10px] text-muted-foreground">Completed {formatDate(item.completedAt)}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <IfindStatusBadge value={item.status} />
                      {isOpen && (
                        <Select
                          items={ifindStatusItems}
                          value={item.status}
                          onValueChange={async (value) => {
                            try {
                              await post(`/cases/${detail.id}/ifind/${item.id}`, { status: String(value), notes: item.notes }, "PATCH");
                              router.refresh();
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Update failed");
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 w-[125px] bg-background text-[11px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ifindStatusItems.map((status) => (
                              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="card-shadow border-border/70">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[15px]">Enquiry notes</CardTitle>
                <CardDescription>Intelligence, background and welfare information.</CardDescription>
              </div>
              <Button onClick={() => setNoteOpen(true)}>
                <Plus className="size-4" />
                Add note
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.notes.length === 0 ? (
                <EmptyState icon={FileText} title="No notes on this enquiry" className="py-8" />
              ) : (
                detail.notes.map((note) => (
                  <div key={note.id} className={cn("rounded-lg border p-4", note.isSensitive ? "border-rose-200 bg-rose-50/40" : "border-border/60")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium">{note.title}</span>
                      <Badge variant="outline" className="text-[9px]">{note.category}</Badge>
                      {note.isSensitive && (
                        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[9px] text-rose-700">Sensitive</Badge>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground">{formatDateTime(note.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/80">{note.body}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="card-shadow border-border/70">
            <CardHeader>
              <CardTitle className="text-[15px]">Audit trail</CardTitle>
              <CardDescription>Immutable record of activity on this enquiry, attributed to the officer and device.</CardDescription>
            </CardHeader>
            <CardContent>
              {detail.audit.length === 0 ? (
                <EmptyState icon={History} title="No audit entries" className="py-8" />
              ) : (
                <div className="space-y-0">
                  {detail.audit.map((entry, index) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1.5 size-1.5 rounded-full bg-primary/60" />
                        {index < detail.audit.length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
                      </div>
                      <div className="pb-4">
                        <div className="text-[12px] font-medium">{formatAuditAction(entry.action)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDateTime(entry.occurredAt)} · {entry.actorOfficerId ? officerName(entry.actorOfficerId) : "System"}
                        </div>
                        {entry.details && (
                          <code className="mt-1 block break-all rounded bg-muted/60 px-2 py-1 text-[10px] text-muted-foreground">
                            {entry.details}
                          </code>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        currentRisk={detail.riskLevel}
        onSubmit={async (payload) => {
          await post(`/cases/${detail.id}/reviews`, payload);
          toast.success("Review recorded");
          setReviewOpen(false);
          router.refresh();
        }}
      />

      <LocateDialog
        open={locateOpen}
        onOpenChange={setLocateOpen}
        onSubmit={async (payload) => {
          await post(`/cases/${detail.id}/locate`, payload);
          toast.success("Enquiry marked as located");
          setLocateOpen(false);
          router.refresh();
        }}
      />

      <CloseDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        onSubmit={async (payload) => {
          await post(`/cases/${detail.id}/close`, payload);
          toast.success("Enquiry closed");
          setCloseOpen(false);
          router.refresh();
        }}
      />

      <TaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        officers={officers}
        onCreate={async (payload, allowDuplicate) => {
          const created = await post<CaseTask>(`/cases/${detail.id}/tasks`, { ...payload, allowDuplicate });
          toast.success("Task added");
          setTaskOpen(false);
          router.refresh();
          return created;
        }}
      />

      <IfindDialog
        open={ifindOpen}
        onOpenChange={setIfindOpen}
        detail={detail}
        onAdd={async (item) => {
          await post(`/cases/${detail.id}/ifind`, { ifindItemId: item.id });
          toast.success("Search consideration added");
          router.refresh();
        }}
      />

      <NoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        onSubmit={async (payload) => {
          await post(`/persons/${detail.person.id}/notes`, { ...payload, episodeId: detail.id });
          toast.success("Note added");
          setNoteOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function Detail({ label, value, icon: Icon }: { label: string; value: string | null; icon: typeof Clock3 }) {
  return (
    <div className="flex gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-[12px]">{value || "Not recorded"}</div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-[11px]">{value}</div>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function TaskRow({
  task,
  officerName,
  busy,
  onComplete,
  onStart,
  detailed,
}: {
  task: CaseTask;
  officerName: string;
  busy: boolean;
  onComplete: () => void;
  onStart: () => void;
  detailed?: boolean;
}) {
  const done = task.status === "Completed" || task.status === "Cancelled";
  return (
    <div className={cn("rounded-lg border border-border/60 p-3", done && "bg-muted/20 opacity-80")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("text-[13px] font-medium", done && "line-through text-muted-foreground")}>{task.title}</span>
            <PriorityBadge value={task.priority} />
            <TaskStatusBadge value={task.status} />
          </div>
          {detailed && task.description && (
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{task.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
            <span>{task.category}</span>
            <span>·</span>
            <span>{officerName}</span>
            {task.dueAt && (
              <>
                <span>·</span>
                <span className={cn(task.status !== "Completed" && new Date(task.dueAt) < new Date() && "font-medium text-red-600")}>
                  Due {formatDateTime(task.dueAt)}
                </span>
              </>
            )}
            {task.locationText && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5"><MapPin className="size-2.5" />{task.locationText}</span>
              </>
            )}
          </div>
          {task.outcome && <p className="mt-1.5 text-[11px] text-muted-foreground">Outcome: {task.outcome}</p>}
        </div>
        {!done && (
          <div className="flex shrink-0 gap-1.5">
            {task.status === "Open" && (
              <Button variant="outline" size="xs" onClick={onStart} disabled={busy}>
                Start
              </Button>
            )}
            <Button variant="outline" size="xs" onClick={onComplete} disabled={busy}>
              {busy ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
              Complete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function vulnerabilityLabels(vulnerabilities: CaseDetail["person"]["vulnerabilities"]) {
  const labels: string[] = [];
  if (vulnerabilities.isLookedAfterChild) labels.push("Looked-after child");
  if (vulnerabilities.hasLearningDifficulty) labels.push("Learning difficulty");
  if (vulnerabilities.hasMentalHealthConcerns) labels.push("Mental health");
  if (vulnerabilities.isKnownSubstanceUser) labels.push("Substance use");
  if (vulnerabilities.isAtRiskOfExploitation) labels.push("Exploitation risk");
  return labels;
}

function formatAuditAction(action: string) {
  const [entity, ...rest] = action.split(".");
  return `${titleCase(entity)} ${rest.join(" ").replace(/-/g, " ")}`.replace(/\s+/g, " ").trim();
}

/* ----------------------------- Dialogs ----------------------------- */

function ReviewDialog({
  open,
  onOpenChange,
  currentRisk,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRisk: RiskLevel;
  onSubmit: (payload: { riskLevel: RiskLevel; notes: string; nextReviewDueAt: string | null }) => Promise<void>;
}) {
  const [risk, setRisk] = useState<RiskLevel>(currentRisk);
  const [notes, setNotes] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!notes.trim()) {
      setError("Record the review rationale.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        riskLevel: risk,
        notes: notes.trim(),
        nextReviewDueAt: nextDue ? new Date(nextDue).toISOString() : null,
      });
      setNotes("");
      setNextDue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Conduct supervisory review</DialogTitle>
            <DialogDescription>
              Record the current risk assessment, decisions made and when the next review is due.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}
            <div className="space-y-1.5">
              <Label>Risk level</Label>
              <Select items={riskItems} value={risk} onValueChange={(value) => setRisk(String(value) as RiskLevel)}>
                <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {riskItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Review notes</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Enquiries completed, intelligence developed, risk rationale and actions agreed…"
                className="min-h-28 bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Next review due</Label>
              <Input type="datetime-local" value={nextDue} onChange={(event) => setNextDue(event.target.value)} className="bg-background" />
              <p className="text-[10px] text-muted-foreground">Leave blank to use the force review interval for this risk level.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Record review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LocateDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { locatedAt: string; location: string | null; outcome: OutcomeType }) => Promise<void>;
}) {
  const [locatedAt, setLocatedAt] = useState(localNow());
  const [location, setLocation] = useState("");
  const [outcome, setOutcome] = useState<OutcomeType>("LocatedSafe");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        locatedAt: new Date(locatedAt).toISOString(),
        location: location.trim() || null,
        outcome,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark as located");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Mark as located</DialogTitle>
            <DialogDescription>The enquiry remains open until it is formally closed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            <div className="space-y-1.5">
              <Label>Located at</Label>
              <Input type="datetime-local" value={locatedAt} onChange={(event) => setLocatedAt(event.target.value)} required className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Where was the person found?" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Select items={outcomeItems} value={outcome} onValueChange={(value) => setOutcome(String(value) as OutcomeType)}>
                <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {outcomeItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Mark located</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { outcome: OutcomeType; notes: string | null }) => Promise<void>;
}) {
  const [outcome, setOutcome] = useState<OutcomeType>("LocatedSafe");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit({ outcome, notes: notes.trim() || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close enquiry");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Close enquiry</DialogTitle>
            <DialogDescription>Closure is an auditable decision and cannot be edited afterwards.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Select items={outcomeItems} value={outcome} onValueChange={(value) => setOutcome(String(value) as OutcomeType)}>
                <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {outcomeItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Closure notes</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Summarise the outcome and any safeguarding or referral actions." className="min-h-24 bg-background" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Close enquiry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({
  open,
  onOpenChange,
  officers,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  officers: OfficerSummary[];
  onCreate: (payload: Record<string, unknown>, allowDuplicate: boolean) => Promise<CaseTask>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TaskCategory>("Enquiry");
  const [priority, setPriority] = useState<TaskPriority>("Normal");
  const [assignedTo, setAssignedTo] = useState("none");
  const [dueAt, setDueAt] = useState("");
  const [location, setLocation] = useState("");
  const [pending, setPending] = useState(false);
  const [duplicates, setDuplicates] = useState<TaskDuplicateMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const officerItems = useMemo(
    () => [{ value: "none", label: "Unassigned" }, ...officers.map((officer) => ({ value: officer.id, label: `${officer.displayName} · ${officer.rank}` }))],
    [officers],
  );

  function payload() {
    return {
      title: title.trim(),
      description: description.trim() || null,
      category,
      priority,
      assignedToOfficerId: assignedTo === "none" ? null : assignedTo,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      placeOfInterestId: null,
      associateId: null,
      locationText: location.trim() || null,
    };
  }

  async function submit(event: React.FormEvent, allowDuplicate = false) {
    event.preventDefault();
    if (!title.trim()) {
      setError("A task title is required.");
      return;
    }
    setPending(true);
    setError(null);
    setDuplicates([]);
    try {
      await onCreate(payload(), allowDuplicate);
      setTitle("");
      setDescription("");
      setLocation("");
      setDueAt("");
    } catch (err) {
      const error = err as Error & { duplicates?: TaskDuplicateMatch[] };
      const matches = error.duplicates ?? [];
      setDuplicates(matches);
      setError(matches.length > 0 ? null : error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <form onSubmit={(event) => submit(event)}>
          <DialogHeader>
            <DialogTitle>Add enquiry task</DialogTitle>
            <DialogDescription>
              Tasks on this enquiry are checked for duplicates using typo-tolerant matching.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

            {duplicates.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-amber-900">Possible duplicate task</p>
                    <p className="text-[11px] text-amber-800/80">
                      These existing tasks look very similar. Add anyway only if this is a genuinely separate action.
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {duplicates.map((match) => (
                        <div key={match.taskId} className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-white/70 px-2.5 py-1.5">
                          <span className="truncate text-[11px] font-medium text-amber-900">{match.title}</span>
                          <span className="shrink-0 text-[10px] text-amber-700">{Math.round(match.similarity * 100)}% match</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                      disabled={pending}
                      onClick={(event) => submit(event, true)}
                    >
                      Add anyway
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Task title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Review CCTV at Riverside Retail Park" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What needs to be done and what should be recorded?" className="min-h-20 bg-background" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select items={categoryItems} value={category} onValueChange={(value) => setCategory(String(value) as TaskCategory)}>
                  <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select items={priorityItems} value={priority} onValueChange={(value) => setPriority(String(value) as TaskPriority)}>
                  <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorityItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assign to</Label>
                <Select items={officerItems} value={assignedTo} onValueChange={(value) => setAssignedTo(String(value ?? "none"))}>
                  <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {officerItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due</Label>
                <Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="bg-background" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location (optional)</Label>
              <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location linked to this task" className="bg-background" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || duplicates.length > 0}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Add task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IfindDialog({
  open,
  onOpenChange,
  detail,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: CaseDetail;
  onAdd: (item: IfindItem) => Promise<void>;
}) {
  const [items, setItems] = useState<IfindItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  const attached = detail.ifind.map((entry) => entry.ifindItemId).filter(Boolean) as string[];
  const isChild = detail.isChildAtReport;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let active = true;
    fetch(`/api/backend/ifind?forChild=${isChild}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: IfindItem[]) => { if (active) setItems(data); })
      .catch(() => { if (active) toast.error("Could not load the iFIND catalogue"); })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      controller.abort();
    };
  }, [open, isChild]);

  async function add(item: IfindItem) {
    setPending(item.id);
    try {
      await onAdd(item);
      setAdded((current) => [...current, item.id]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add item");
    } finally {
      setPending(null);
    }
  }

  const grouped = items.reduce<Record<string, IfindItem[]>>((groups, item) => {
    (groups[item.category] ??= []).push(item);
    return groups;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Add search considerations</DialogTitle>
          <DialogDescription>
            iFIND-style national checklist items filtered for {isChild ? "a child" : "an adult"}. Already-attached items are disabled.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading catalogue…
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, categoryItems]) => (
                <div key={category}>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{category}</div>
                  <div className="space-y-1">
                    {categoryItems.map((item) => {
                      const isAttached = attached.includes(item.id) || added.includes(item.id);
                      return (
                        <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium">{item.title}</div>
                            <div className="text-[10px] leading-relaxed text-muted-foreground">{item.description}</div>
                          </div>
                          {isAttached ? (
                            <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-[9px] text-emerald-700">Added</Badge>
                          ) : (
                            <Button
                              size="xs"
                              variant="outline"
                              className="shrink-0"
                              disabled={pending === item.id}
                              onClick={() => add(item)}
                            >
                              {pending === item.id ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                              Add
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { title: string; category: NoteCategory; body: string; isSensitive: boolean }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<NoteCategory>("General");
  const [body, setBody] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("A title and note body are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit({ title: title.trim(), category, body: body.trim(), isSensitive: sensitive });
      setTitle("");
      setBody("");
      setSensitive(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add note");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add enquiry note</DialogTitle>
            <DialogDescription>Record intelligence, background or welfare information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                items={noteCategoryItems}
                value={category}
                onValueChange={(value) => setCategory(String(value) as NoteCategory)}
              >
                <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {noteCategoryItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-28 bg-background" />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[12px]">
              <Checkbox checked={sensitive} onCheckedChange={(checked) => setSensitive(Boolean(checked))} />
              Mark as sensitive intelligence
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Add note</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
