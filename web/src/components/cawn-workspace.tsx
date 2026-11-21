"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileWarning, Loader2, Plus, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PersonAvatar } from "@/components/person-avatar";
import { CawnStatusBadge } from "@/components/status-badges";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Cawn, PagedResult, PersonSummary } from "@/lib/types";

const statusItems = [
  { value: "all", label: "All notices" },
  { value: "Active", label: "Active" },
  { value: "Expired", label: "Expired" },
  { value: "Revoked", label: "Revoked" },
];

export function CawnWorkspace({
  result,
  initialStatus,
  initialSearch,
  now,
}: {
  result: PagedResult<Cawn>;
  initialStatus: string;
  initialSearch: string;
  now: string;
}) {
  const nowMs = new Date(now).getTime();
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [, startTransition] = useTransition();
  const [issueOpen, setIssueOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Cawn | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      startTransition(() => router.replace(`/cawns${params.size ? `?${params}` : ""}`));
    }, 280);
    return () => clearTimeout(timer);
  }, [status, search, router]);

  async function revoke(notice: Cawn, reason: string) {
    setBusy(notice.id);
    try {
      const response = await fetch(`/api/backend/cawns/${notice.id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? "Could not revoke notice");
      }
      toast.success("Notice revoked");
      setRevokeTarget(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Revoke failed");
    } finally {
      setBusy(null);
    }
  }

  const activeCount = result.items.filter(
    (notice) => notice.status === "Active" && new Date(notice.expiresAt).getTime() > nowMs,
  ).length;
  const expiringSoon = result.items.filter((notice) => {
    const expires = new Date(notice.expiresAt).getTime();
    const inThirtyDays = nowMs + 30 * 24 * 60 * 60 * 1000;
    return notice.status === "Active" && expires > nowMs && expires <= inThirtyDays;
  }).length;

  return (
    <>
      <PageHeader
        eyebrow="Safeguarding"
        title="Child abduction warning notices"
        description="Issue, monitor and revoke child abduction warning notices. Notices are linked to the child's person file and every action is audited."
        actions={
          <Button onClick={() => setIssueOpen(true)}>
            <Plus className="size-4" />
            Issue notice
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="border-border/70 py-3">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-50 text-red-600"><ShieldAlert className="size-4" /></div>
            <div><div className="tabular text-lg font-semibold">{activeCount}</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Active on this page</div></div>
          </CardContent>
        </Card>
        <Card className="border-border/70 py-3">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><FileWarning className="size-4" /></div>
            <div><div className="tabular text-lg font-semibold">{result.total}</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total notices</div></div>
          </CardContent>
        </Card>
        <Card className="border-border/70 py-3">
          <CardContent className="flex items-center gap-3 px-4">
            <div className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><ShieldAlert className="size-4" /></div>
            <div><div className="tabular text-lg font-semibold">{expiringSoon}</div><div className="text-[10px] uppercase tracking-wide text-muted-foreground">Expiring in 30 days</div></div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-shadow overflow-hidden border-border/70 py-0">
        <CardHeader className="flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">Notice register</div>
            <CardDescription>Only active notices carry legal effect; expired notices should be reviewed.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reference or subject…" className="h-8 w-[220px] bg-background pl-8 text-[12px]" />
            </div>
            <Select items={statusItems} value={status} onValueChange={(value) => setStatus(String(value ?? "all"))}>
              <SelectTrigger className="h-8 w-[130px] bg-background text-[12px]"><SelectValue /></SelectTrigger>
              <SelectContent>{statusItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>

        {result.items.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No warning notices"
            description="Issue a notice where a child is at risk of abduction or association with a person of concern."
            action={<Button size="sm" onClick={() => setIssueOpen(true)}>Issue notice</Button>}
            className="py-14"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Reference</TableHead>
                <TableHead>Child</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((notice) => {
                const effectivelyExpired = notice.status === "Active" && new Date(notice.expiresAt).getTime() < nowMs;
                return (
                  <TableRow key={notice.id}>
                    <TableCell className="pl-5 font-mono text-[11px]">{notice.reference}</TableCell>
                    <TableCell>
                      <Link href={`/people/${notice.childPersonId}`} className="flex items-center gap-2 hover:underline">
                        <PersonAvatar personId={notice.childPersonId} name={notice.childName} size="sm" />
                        <span className="text-[12px] font-medium">{notice.childName}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-[12px]">{notice.subjectName}</div>
                      {notice.subjectDateOfBirth && <div className="text-[10px] text-muted-foreground">DOB {formatDate(notice.subjectDateOfBirth)}</div>}
                    </TableCell>
                    <TableCell className="text-[11px]">{formatDate(notice.issuedAt)}</TableCell>
                    <TableCell className="text-[11px]">{formatDate(notice.expiresAt)}</TableCell>
                    <TableCell><CawnStatusBadge value={effectivelyExpired ? "Expired" : notice.status} /></TableCell>
                    <TableCell className="pr-5 text-right">
                      {notice.status === "Active" && !effectivelyExpired ? (
                        <Button variant="outline" size="xs" onClick={() => setRevokeTarget(notice)}>Revoke</Button>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">{formatDateTime(notice.revokedAt ?? notice.expiresAt)}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <IssueCawnDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        onIssued={() => {
          toast.success("Warning notice issued");
          setIssueOpen(false);
          router.refresh();
        }}
      />

      <RevokeCawnDialog
        notice={revokeTarget}
        busy={busy === revokeTarget?.id}
        onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}
        onSubmit={async (reason) => { if (revokeTarget) await revoke(revokeTarget, reason); }}
      />
    </>
  );
}

function IssueCawnDialog({
  open,
  onOpenChange,
  onIssued,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssued: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PersonSummary[]>([]);
  const [child, setChild] = useState<PersonSummary | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectDob, setSubjectDob] = useState("");
  const [expiry, setExpiry] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  });
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || child || search.trim().length < 2) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/backend/persons?search=${encodeURIComponent(search)}&pageSize=6`);
        if (response.ok) {
          const data = (await response.json()) as PagedResult<PersonSummary>;
          setResults(data.items.filter((person) => person.age != null && person.age < 18));
        }
      } catch {
        // ignore
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [search, open, child]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!child) return setError("Select the child the notice relates to.");
    if (!subjectName.trim()) return setError("The subject's name is required.");
    if (!reason.trim()) return setError("Record the reason for the notice.");

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/backend/cawns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childPersonId: child.id,
          subjectAssociateId: null,
          subjectName: subjectName.trim(),
          subjectDateOfBirth: subjectDob || null,
          expiresAt: new Date(`${expiry}T23:59:59`).toISOString(),
          reason: reason.trim(),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? "Could not issue notice");
      }
      onIssued();
      setChild(null); setSearch(""); setSubjectName(""); setSubjectDob(""); setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue notice");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[580px]">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Issue child abduction warning notice</DialogTitle>
            <DialogDescription>Only children under 18 are eligible. The notice is linked to the child&apos;s person file.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}

            <div className="space-y-1.5">
              <Label>Child</Label>
              {child ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/[0.03] p-2.5">
                  <PersonAvatar personId={child.id} name={child.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium">{child.fullName}</div>
                    <div className="text-[10px] text-muted-foreground">{child.age} yrs · {child.sex}</div>
                  </div>
                  <Button type="button" variant="ghost" size="xs" onClick={() => setChild(null)}>Change</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search for the child by name…" className="bg-background pl-8" />
                  </div>
                  {search.trim().length >= 2 && results.length > 0 && (
                    <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border">
                      {results.map((person) => (
                        <button key={person.id} type="button" onClick={() => { setChild(person); setSubjectName(""); }} className="flex w-full items-center gap-2 bg-card px-3 py-2 text-left hover:bg-muted/50">
                          <PersonAvatar personId={person.id} name={person.fullName} size="sm" />
                          <div>
                            <div className="text-[12px] font-medium">{person.fullName}</div>
                            <div className="text-[10px] text-muted-foreground">{person.age} yrs · {person.sex}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Subject name</Label><Input value={subjectName} onChange={(event) => setSubjectName(event.target.value)} className="bg-background" /></div>
              <div className="space-y-1.5"><Label>Subject date of birth</Label><Input type="date" value={subjectDob} onChange={(event) => setSubjectDob(event.target.value)} className="bg-background" /></div>
            </div>
            <div className="space-y-1.5"><Label>Expiry date</Label><Input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} className="bg-background" /></div>
            <div className="space-y-1.5"><Label>Reason / intelligence</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is the notice necessary? Include relevant intelligence and safeguarding context." className="min-h-24 bg-background" /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Issue notice</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RevokeCawnDialog({
  notice,
  busy,
  onOpenChange,
  onSubmit,
}: {
  notice: Cawn | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={notice !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke warning notice</DialogTitle>
          <DialogDescription>
            {notice ? `${notice.reference} relating to ${notice.childName}.` : ""} Revocation is permanent and audited.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-4">
          <Label>Revocation reason</Label>
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-24 bg-background" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => onSubmit(reason.trim())}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Revoke notice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
