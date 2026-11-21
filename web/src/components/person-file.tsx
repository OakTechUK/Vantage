/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  FileText,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Repeat2,
  ShieldAlert,
  Sparkles,
  Upload,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonAvatar } from "@/components/person-avatar";
import { EmptyState } from "@/components/page-header";
import { RiskBadge, StatusBadge } from "@/components/status-badges";
import { cn } from "cn";
import { formatDate, formatDateTime } from "@/lib/format";
import type {
  NoteCategory,
  PersonDetail,
  PlaceCategory,
  SearchPriority,
} from "@/lib/types";

const placeCategoryItems: { value: PlaceCategory; label: string }[] = [
  { value: "Home", label: "Home" },
  { value: "Family", label: "Family" },
  { value: "Friend", label: "Friend" },
  { value: "Work", label: "Work" },
  { value: "School", label: "School" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Social", label: "Social" },
  { value: "Transport", label: "Transport" },
  { value: "Other", label: "Other" },
];

const priorityItems: { value: SearchPriority; label: string }[] = [
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

async function postJson(path: string, body: unknown) {
  const response = await fetch(`/api/backend${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as { detail?: string }).detail ?? "Request failed");
  }
  return response.json();
}

export function PersonFile({ person }: { person: PersonDetail }) {
  const router = useRouter();
  const [associateOpen, setAssociateOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  const primaryImage = person.images.find((image) => image.isPrimary) ?? person.images[0];
  const latest = person.episodes[0];
  const vulnerabilities = vulnerabilityLabels(person);

  return (
    <>
      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <PersonAvatar personId={person.id} name={person.fullName} imageId={primaryImage?.id} size="xl" />
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {person.isRepeatMissing && (
                <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                  <Repeat2 className="size-3" /> Repeat missing person
                </Badge>
              )}
              {latest && <StatusBadge value={latest.status} />}
              {latest && <RiskBadge value={latest.riskLevel} />}
              <Badge variant="outline" className="text-muted-foreground">{person.episodes.length} {person.episodes.length === 1 ? "episode" : "episodes"}</Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{person.fullName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {person.age != null ? `${person.age} years old` : "Age unknown"} · {person.sex} · DOB {formatDate(person.dateOfBirth)}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              {person.ethnicity && <span>Ethnicity: {person.ethnicity}</span>}
              {person.heightCm && <span>Height: {person.heightCm}cm</span>}
              {person.hairColour && <span>Hair: {person.hairColour}</span>}
              {person.eyeColour && <span>Eyes: {person.eyeColour}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href={`/people/${person.id}/intelligence`} />}>
            <Sparkles className="size-4" />
            Intelligence report
          </Button>
          <Button render={<Link href={`/cases/new?personId=${person.id}`} />}>
            <Plus className="size-4" />
            Log missing episode
          </Button>
        </div>
      </div>

      {person.vulnerabilities.summary && (
        <Card className="card-shadow mb-5 border-rose-200 bg-rose-50/50 py-0">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-600" />
            <div>
              <div className="text-[12px] font-semibold text-rose-900">Vulnerability summary</div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-rose-800/80">{person.vulnerabilities.summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="mb-5 w-full justify-start gap-1 overflow-x-auto border-b border-border pb-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="episodes">Episode history</TabsTrigger>
          <TabsTrigger value="people">People & places</TabsTrigger>
          <TabsTrigger value="notes">Notes & intelligence</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
            <div className="space-y-5">
              <Card className="card-shadow border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px]">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/85">
                    {person.description || "No description recorded."}
                  </p>
                </CardContent>
              </Card>

              <Card className="card-shadow border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px]">Physical description</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  <FieldBlock label="Height" value={person.heightCm ? `${person.heightCm} cm` : null} />
                  <FieldBlock label="Build" value={person.build} />
                  <FieldBlock label="Hair" value={person.hairColour} />
                  <FieldBlock label="Eyes" value={person.eyeColour} />
                  <FieldBlock label="Nationality" value={person.nationality} />
                  <FieldBlock label="Languages" value={person.languages} />
                  <div className="sm:col-span-3">
                    <FieldBlock label="Distinguishing features" value={person.distinguishingFeatures} />
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px]">Latest episode</CardTitle>
                </CardHeader>
                <CardContent>
                  {latest ? (
                    <Link href={`/cases/${latest.id}`} className="block rounded-lg border border-border/60 p-4 transition-colors hover:bg-muted/40">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] font-medium text-primary">{latest.caseNumber}</span>
                        <StatusBadge value={latest.status} />
                        <RiskBadge value={latest.riskLevel} />
                        <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(latest.reportedAt)}</span>
                      </div>
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        Last seen: {latest.lastSeenLocation ?? "unknown"} · {latest.openTaskCount} open tasks
                      </p>
                    </Link>
                  ) : (
                    <EmptyState icon={CalendarDays} title="No missing episodes" description="Log an episode when this person is reported missing." />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5">
              <Card className="card-shadow border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px]">Risk indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {vulnerabilities.length === 0 ? (
                    <p className="text-[12px] text-muted-foreground">No vulnerability indicators recorded.</p>
                  ) : (
                    vulnerabilities.map((label) => (
                      <div key={label} className="flex items-center gap-2 rounded-md bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-800">
                        <ShieldAlert className="size-3.5" />
                        {label}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px]">File summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-[12px]">
                  <SummaryRow label="Episodes" value={person.episodes.length} />
                  <SummaryRow label="Associates" value={person.associates.length} />
                  <SummaryRow label="Places of interest" value={person.placesOfInterest.length} />
                  <SummaryRow label="Intelligence notes" value={person.notes.length} />
                  <SummaryRow label="Images on file" value={person.images.length} />
                  <Separator />
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Record created</span>
                    <span className="font-medium">{formatDate(person.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>

              {primaryImage && (
                <Card className="card-shadow overflow-hidden border-border/70 py-0">
                  <img
                    src={`/api/backend/persons/${person.id}/images/${primaryImage.id}/content`}
                    alt={person.fullName}
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <div className="px-3 py-2 text-[10px] text-muted-foreground">
                    {primaryImage.caption ?? "Primary photograph"}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="episodes">
          <Card className="card-shadow border-border/70">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[15px]">Missing episode history</CardTitle>
                <CardDescription>The full history stays with the person, reducing re-keying and improving risk assessment.</CardDescription>
              </div>
              <Button size="sm" render={<Link href={`/cases/new?personId=${person.id}`} />}>
                <Plus className="size-3.5" /> New episode
              </Button>
            </CardHeader>
            <CardContent>
              {person.episodes.length === 0 ? (
                <EmptyState icon={CalendarDays} title="No episodes recorded" className="py-10" />
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {person.episodes.map((episode) => (
                    <li key={episode.id} className="relative">
                      <span className={cn(
                        "absolute -left-[26px] top-2 size-2 rounded-full border-2 border-background",
                        episode.status === "Active" ? "bg-blue-500" : episode.status === "Located" ? "bg-teal-500" : "bg-slate-300",
                      )} />
                      <Link href={`/cases/${episode.id}`} className="block rounded-lg border border-border/60 p-3.5 transition-colors hover:bg-muted/40">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[12px] font-medium text-primary">{episode.caseNumber}</span>
                          <StatusBadge value={episode.status} />
                          <RiskBadge value={episode.riskLevel} />
                          {episode.isRepeat && (
                            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-[9px] text-violet-700">Repeat</Badge>
                          )}
                          <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(episode.reportedAt)}</span>
                        </div>
                        <div className="mt-1.5 text-[11px] text-muted-foreground">
                          {episode.category} · Last seen {episode.lastSeenLocation ?? "unknown"} · {episode.openTaskCount} open tasks
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="people">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="card-shadow border-border/70">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[15px]">Associates</CardTitle>
                  <CardDescription>Family, friends and people of interest.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAssociateOpen(true)}>
                  <Plus className="size-3.5" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {person.associates.length === 0 ? (
                  <EmptyState icon={Users} title="No associates recorded" className="py-8" />
                ) : (
                  person.associates.map((associate) => (
                    <div key={associate.id} className="rounded-lg border border-border/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium">{associate.name}</span>
                        {associate.isSignificantRisk && (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-[9px] text-red-700">Significant risk</Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {associate.relationship ?? "Relationship unknown"}
                        {associate.phone ? ` · ${associate.phone}` : ""}
                      </div>
                      {associate.address && <div className="mt-0.5 text-[11px] text-muted-foreground">{associate.address}</div>}
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
                  <CardDescription>Addresses and areas to search if the person goes missing.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setPlaceOpen(true)}>
                  <Plus className="size-3.5" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {person.placesOfInterest.length === 0 ? (
                  <EmptyState icon={MapPin} title="No places recorded" className="py-8" />
                ) : (
                  person.placesOfInterest.map((place) => (
                    <div key={place.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium">{place.label}</div>
                        <div className="text-[11px] text-muted-foreground">{place.category}{place.address ? ` · ${place.address}` : ""}</div>
                        {place.notes && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{place.notes}</p>}
                      </div>
                      <Badge variant="outline" className={cn("shrink-0", place.searchPriority === "High" && "border-orange-200 bg-orange-50 text-orange-700")}>
                        {place.searchPriority}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="card-shadow border-border/70">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[15px]">Notes & intelligence</CardTitle>
                <CardDescription>Friends, family, health, risk and exploitation information.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setNoteOpen(true)}>
                <Plus className="size-3.5" /> Add note
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {person.notes.length === 0 ? (
                <EmptyState icon={FileText} title="No notes on file" className="py-10" />
              ) : (
                person.notes.map((note) => (
                  <div key={note.id} className={cn("rounded-lg border p-4", note.isSensitive ? "border-rose-200 bg-rose-50/40" : "border-border/60")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium">{note.title}</span>
                      <Badge variant="outline" className="text-[9px]">{note.category}</Badge>
                      {note.isSensitive && <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[9px] text-rose-700">Sensitive</Badge>}
                      <span className="ml-auto text-[10px] text-muted-foreground">{formatDateTime(note.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/80">{note.body}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card className="card-shadow border-border/70">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-[15px]">Photographs</CardTitle>
                <CardDescription>Recent images help officers and the public identify the person quickly.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setImageOpen(true)}>
                <Upload className="size-3.5" /> Upload image
              </Button>
            </CardHeader>
            <CardContent>
              {person.images.length === 0 ? (
                <EmptyState
                  icon={Camera}
                  title="No images on file"
                  description="Upload a recent photograph, ideally full face in neutral lighting."
                  action={<Button size="sm" onClick={() => setImageOpen(true)}>Upload image</Button>}
                  className="py-12"
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {person.images.map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-xl border border-border/60">
                      <img
                        src={`/api/backend/persons/${person.id}/images/${image.id}/content`}
                        alt={image.caption ?? image.fileName}
                        className="aspect-[4/5] w-full object-cover"
                      />
                      <div className="space-y-1 p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[11px] font-medium">{image.caption ?? image.fileName}</span>
                          {image.isPrimary && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[8px] text-emerald-700">Primary</Badge>}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{formatDate(image.createdAt)} · {Math.round(image.sizeBytes / 1024)} KB</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssociateDialog
        open={associateOpen}
        onOpenChange={setAssociateOpen}
        onSubmit={async (payload) => {
          await postJson(`/persons/${person.id}/associates`, payload);
          toast.success("Associate added");
          setAssociateOpen(false);
          router.refresh();
        }}
      />

      <PlaceDialog
        open={placeOpen}
        onOpenChange={setPlaceOpen}
        onSubmit={async (payload) => {
          await postJson(`/persons/${person.id}/places`, payload);
          toast.success("Place added");
          setPlaceOpen(false);
          router.refresh();
        }}
      />

      <PersonNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        onSubmit={async (payload) => {
          await postJson(`/persons/${person.id}/notes`, payload);
          toast.success("Note added");
          setNoteOpen(false);
          router.refresh();
        }}
      />

      <ImageDialog
        open={imageOpen}
        onOpenChange={setImageOpen}
        personId={person.id}
        hasImages={person.images.length > 0}
        onUploaded={() => {
          toast.success("Image uploaded");
          setImageOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function FieldBlock({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[12px]">{value || "—"}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-semibold">{value}</span>
    </div>
  );
}

function vulnerabilityLabels(person: PersonDetail) {
  const flags = person.vulnerabilities;
  const labels: string[] = [];
  if (flags.isLookedAfterChild) labels.push("Looked-after child");
  if (flags.hasLearningDifficulty) labels.push("Learning difficulty");
  if (flags.hasMentalHealthConcerns) labels.push("Mental health concerns");
  if (flags.isKnownSubstanceUser) labels.push("Known substance use");
  if (flags.isAtRiskOfExploitation) labels.push("At risk of exploitation");
  return labels;
}

function AssociateDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    name: string;
    relationship: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    isSignificantRisk: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [significant, setSignificant] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        relationship: relationship.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        isSignificantRisk: significant,
      });
      setName(""); setRelationship(""); setPhone(""); setEmail(""); setAddress(""); setNotes(""); setSignificant(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add associate");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add associate</DialogTitle>
            <DialogDescription>Record a person of interest, family member or friend linked to this file.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-background" /></div>
              <div className="space-y-1.5"><Label>Relationship</Label><Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Friend, mother, associate…" className="bg-background" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-background" /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background" /></div>
            </div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} className="bg-background" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20 bg-background" /></div>
            <label className="flex cursor-pointer items-center gap-2 text-[12px]">
              <Checkbox checked={significant} onCheckedChange={(checked) => setSignificant(Boolean(checked))} />
              Significant risk / person of specific interest
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Add associate</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlaceDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    label: string;
    category: PlaceCategory;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    searchPriority: SearchPriority;
    notes: string | null;
  }) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("Other");
  const [address, setAddress] = useState("");
  const [priority, setPriority] = useState<SearchPriority>("Normal");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim()) {
      setError("A label is required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        label: label.trim(),
        category,
        address: address.trim() || null,
        latitude: null,
        longitude: null,
        searchPriority: priority,
        notes: notes.trim() || null,
      });
      setLabel(""); setAddress(""); setNotes(""); setPriority("Normal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add place");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add place of interest</DialogTitle>
            <DialogDescription>Locations officers should search or visit if this person goes missing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            <div className="space-y-1.5"><Label>Label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Canal towpath" className="bg-background" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select items={placeCategoryItems} value={category} onValueChange={(value) => setCategory(String(value) as PlaceCategory)}>
                  <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{placeCategoryItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Search priority</Label>
                <Select items={priorityItems} value={priority} onValueChange={(value) => setPriority(String(value) as SearchPriority)}>
                  <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{priorityItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} className="bg-background" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why is this place relevant?" className="min-h-20 bg-background" /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Add place</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PersonNoteDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { title: string; category: NoteCategory; body: string; isSensitive: boolean; episodeId: null }) => Promise<void>;
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
      setError("A title and body are required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit({ title: title.trim(), category, body: body.trim(), isSensitive: sensitive, episodeId: null });
      setTitle(""); setBody(""); setSensitive(false);
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
            <DialogTitle>Add note to person file</DialogTitle>
            <DialogDescription>This note will be available across every future missing episode.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background" /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select items={noteCategoryItems} value={category} onValueChange={(value) => setCategory(String(value) as NoteCategory)}>
                <SelectTrigger className="w-full bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{noteCategoryItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Note</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-28 bg-background" /></div>
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

function ImageDialog({
  open,
  onOpenChange,
  personId,
  hasImages,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  hasImages: boolean;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [primary, setPrimary] = useState(!hasImages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose an image file.");
      return;
    }
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    if (caption.trim()) formData.set("caption", caption.trim());
    formData.set("isPrimary", String(primary));

    try {
      const response = await fetch(`/api/backend/persons/${personId}/images`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? "Upload failed");
      }
      setFile(null);
      setCaption("");
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Upload photograph</DialogTitle>
            <DialogDescription>JPEG, PNG or WebP up to 10MB. Files are stored outside the database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center hover:bg-muted/50">
              <ImagePlus className="mb-2 size-6 text-muted-foreground" />
              <span className="text-[12px] font-medium">{file ? file.name : "Choose an image"}</span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">
                {file ? `${Math.round(file.size / 1024)} KB` : "Click to browse"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="space-y-1.5"><Label>Caption</Label><Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Photograph from 12 November 2026" className="bg-background" /></div>
            <label className="flex cursor-pointer items-center gap-2 text-[12px]">
              <Checkbox checked={primary} onCheckedChange={(checked) => setPrimary(Boolean(checked))} />
              Use as primary photograph
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}Upload</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
