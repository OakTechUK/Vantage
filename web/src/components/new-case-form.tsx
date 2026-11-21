"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  Repeat2,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PersonAvatar } from "@/components/person-avatar";
import { RiskBadge } from "@/components/status-badges";
import { cn } from "cn";
import type {
  MissingCategory,
  OfficerSummary,
  PersonDetail,
  PersonSummary,
  PagedResult,
  RiskLevel,
  Sex,
  CaseDetail,
} from "@/lib/types";

const sexItems = [
  { value: "Unknown", label: "Not recorded" },
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
  { value: "Other", label: "Other" },
];

const categoryItems = [
  { value: "Missing", label: "Missing — concern for welfare" },
  { value: "Absent", label: "Absent — whereabouts unknown, no immediate concern" },
];

const riskItems = [
  { value: "Critical", label: "Critical — immediate risk to life" },
  { value: "High", label: "High — significant concern" },
  { value: "Medium", label: "Medium — moderate concern" },
  { value: "Low", label: "Low — limited concern" },
];

const riskGuidance: Record<RiskLevel, string> = {
  Critical: "Review within 8 hours. Consider immediate specialist resources, media appeal and supervisory oversight.",
  High: "Review within 24 hours. Prioritise location searches, CCTV and known associates.",
  Medium: "Review within 72 hours. Structured enquiries and regular welfare checks.",
  Low: "Review within 7 days. Maintain contact with family and monitor for changes.",
};

type PersonChoice = {
  id: string;
  fullName: string;
  age: number | null;
  sex: Sex;
  isRepeatMissing: boolean;
  episodeCount: number;
  primaryImageId: string | null;
};

export function NewCaseForm({
  officers,
  initialPerson,
}: {
  officers: OfficerSummary[];
  initialPerson: PersonDetail | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "existing">(initialPerson ? "existing" : "new");
  const [selected, setSelected] = useState<PersonChoice | null>(
    initialPerson
      ? {
          id: initialPerson.id,
          fullName: initialPerson.fullName,
          age: initialPerson.age,
          sex: initialPerson.sex,
          isRepeatMissing: initialPerson.isRepeatMissing,
          episodeCount: initialPerson.episodes.length,
          primaryImageId: initialPerson.images.find((image) => image.isPrimary)?.id ?? initialPerson.images[0]?.id ?? null,
        }
      : null,
  );
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PersonSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [middleNames, setMiddleNames] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<Sex>("Unknown");
  const [description, setDescription] = useState("");
  const [flags, setFlags] = useState({
    lookedAfter: false,
    learning: false,
    mentalHealth: false,
    substance: false,
    exploitation: false,
  });

  const [category, setCategory] = useState<MissingCategory>("Missing");
  const [risk, setRisk] = useState<RiskLevel>("Medium");
  const [circumstances, setCircumstances] = useState("");
  const [lastSeenAt, setLastSeenAt] = useState("");
  const [lastSeenLocation, setLastSeenLocation] = useState("");
  const [lastSeenWearing, setLastSeenWearing] = useState("");
  const [assignedTo, setAssignedTo] = useState("none");

  const officerItems = useMemo(
    () => [
      { value: "none", label: "Unassigned" },
      ...officers.map((officer) => ({
        value: officer.id,
        label: `${officer.displayName} · ${officer.rank}`,
      })),
    ],
    [officers],
  );

  useEffect(() => {
    if (mode !== "existing" || initialPerson || search.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/backend/persons?search=${encodeURIComponent(search.trim())}&pageSize=8`,
          { signal: controller.signal },
        );
        if (response.ok) {
          const data = (await response.json()) as PagedResult<PersonSummary>;
          setResults(data.items);
        }
      } catch {
        // Aborted or unavailable; keep the previous results.
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, mode, initialPerson]);

  function toggleFlag(key: keyof typeof flags) {
    setFlags((current) => ({ ...current, [key]: !current[key] }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selected && (!firstName.trim() || !lastName.trim())) {
      setError("A first name and last name are required for a new person.");
      return;
    }
    if (!circumstances.trim()) {
      setError("Record the circumstances of the report.");
      return;
    }

    setSubmitting(true);
    const payload = {
      personId: selected?.id ?? null,
      person: selected
        ? null
        : {
            firstName: firstName.trim(),
            middleNames: middleNames.trim() || null,
            lastName: lastName.trim(),
            dateOfBirth: dateOfBirth || null,
            sex,
            ethnicity: null,
            nationality: null,
            languages: null,
            heightCm: null,
            build: null,
            hairColour: null,
            eyeColour: null,
            distinguishingFeatures: null,
            description: description.trim() || null,
            isLookedAfterChild: flags.lookedAfter,
            hasLearningDifficulty: flags.learning,
            hasMentalHealthConcerns: flags.mentalHealth,
            isKnownSubstanceUser: flags.substance,
            isAtRiskOfExploitation: flags.exploitation,
            vulnerabilitySummary: null,
          },
      category,
      riskLevel: risk,
      circumstances: circumstances.trim(),
      lastSeenAt: lastSeenAt ? new Date(lastSeenAt).toISOString() : null,
      lastSeenLocation: lastSeenLocation.trim() || null,
      lastSeenWearing: lastSeenWearing.trim() || null,
      lastSeenWith: null,
      assignedOfficerId: assignedTo === "none" ? null : assignedTo,
    };

    try {
      const response = await fetch("/api/backend/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.detail ?? "The enquiry could not be created.");
        setSubmitting(false);
        return;
      }

      router.push(`/cases/${(body as CaseDetail).id}`);
      router.refresh();
    } catch {
      setError("The Vantage API could not be reached.");
      setSubmitting(false);
    }
  }

  return (
    <form id="new-case-form" onSubmit={submit}>
      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-[12px]">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="card-shadow border-border/70">
            <CardHeader>
              <CardTitle className="text-[15px]">Person details</CardTitle>
              <CardDescription>
                Search for an existing record or create a new person. Repeat missing people keep their full history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {initialPerson ? (
                <SelectedPerson person={selected!} locked />
              ) : selected ? (
                <SelectedPerson person={selected} onChange={() => setSelected(null)} />
              ) : (
                <>
                  <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setMode("existing")}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        mode === "existing" ? "bg-background shadow-sm" : "text-muted-foreground",
                      )}
                    >
                      Existing person
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("new")}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        mode === "new" ? "bg-background shadow-sm" : "text-muted-foreground",
                      )}
                    >
                      New person
                    </button>
                  </div>

                  {mode === "existing" ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search by name to find an existing person…"
                          className="h-10 bg-background pl-9"
                          autoFocus
                        />
                        {searching && (
                          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      {search.trim().length >= 2 && !searching && results.length === 0 && (
                        <p className="px-1 text-[11px] text-muted-foreground">
                          No matching people. Switch to “New person” to create a record.
                        </p>
                      )}
                      {results.length > 0 && (
                        <div className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border">
                          {results.map((person) => (
                            <button
                              key={person.id}
                              type="button"
                              onClick={() => setSelected(person)}
                              className="flex w-full items-center gap-3 bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                            >
                              <PersonAvatar
                                personId={person.id}
                                name={person.fullName}
                                imageId={person.primaryImageId}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 text-[13px] font-medium">
                                  {person.fullName}
                                  {person.isRepeatMissing && (
                                    <Repeat2 className="size-3 text-violet-500" />
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {person.age != null ? `${person.age} yrs` : "Age unknown"} · {person.sex} · {person.episodeCount} previous {person.episodeCount === 1 ? "episode" : "episodes"}
                                </div>
                              </div>
                              <ArrowRight className="size-3.5 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="First name" required>
                          <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-9 bg-background" />
                        </Field>
                        <Field label="Last name" required>
                          <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-9 bg-background" />
                        </Field>
                        <Field label="Middle names">
                          <Input value={middleNames} onChange={(event) => setMiddleNames(event.target.value)} className="h-9 bg-background" />
                        </Field>
                        <Field label="Date of birth">
                          <Input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} className="h-9 bg-background" />
                        </Field>
                        <Field label="Sex">
                          <Select items={sexItems} value={sex} onValueChange={(value) => setSex(String(value) as Sex)}>
                            <SelectTrigger className="h-9 w-full bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {sexItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>

                      <Field label="Description">
                        <Textarea
                          value={description}
                          onChange={(event) => setDescription(event.target.value)}
                          placeholder="Physical description, clothing, distinguishing features, GP or school details…"
                          className="min-h-24 bg-background"
                        />
                      </Field>

                      <div>
                        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Vulnerability indicators</Label>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {[
                            { key: "lookedAfter" as const, label: "Looked-after child" },
                            { key: "learning" as const, label: "Learning difficulty" },
                            { key: "mentalHealth" as const, label: "Mental health concerns" },
                            { key: "substance" as const, label: "Known substance use" },
                            { key: "exploitation" as const, label: "Risk of exploitation" },
                          ].map((flag) => (
                            <label key={flag.key} className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-2.5 py-2 text-[12px] hover:bg-muted/40">
                              <Checkbox checked={flags[flag.key]} onCheckedChange={() => toggleFlag(flag.key)} />
                              {flag.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="card-shadow border-border/70">
            <CardHeader>
              <CardTitle className="text-[15px]">Report details</CardTitle>
              <CardDescription>Record what is known at the point of reporting. This can be updated as the enquiry develops.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <Select items={categoryItems} value={category} onValueChange={(value) => setCategory(String(value) as MissingCategory)}>
                    <SelectTrigger className="h-9 w-full bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categoryItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Risk assessment">
                  <Select items={riskItems} value={risk} onValueChange={(value) => setRisk(String(value) as RiskLevel)}>
                    <SelectTrigger className="h-9 w-full bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {riskItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Circumstances" required>
                <Textarea
                  value={circumstances}
                  onChange={(event) => setCircumstances(event.target.value)}
                  placeholder="Why is this person missing? What has been done so far? Who reported it?"
                  className="min-h-32 bg-background"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Last seen">
                  <Input type="datetime-local" value={lastSeenAt} onChange={(event) => setLastSeenAt(event.target.value)} className="h-9 bg-background" />
                </Field>
                <Field label="Last seen location">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={lastSeenLocation} onChange={(event) => setLastSeenLocation(event.target.value)} placeholder="Address or place" className="h-9 bg-background pl-9" />
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Last seen wearing">
                  <Input value={lastSeenWearing} onChange={(event) => setLastSeenWearing(event.target.value)} placeholder="Clothing and distinguishing items" className="h-9 bg-background" />
                </Field>
                <Field label="Assign to officer">
                  <Select items={officerItems} value={assignedTo} onValueChange={(value) => setAssignedTo(String(value ?? "none"))}>
                    <SelectTrigger className="h-9 w-full bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {officerItems.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="card-shadow sticky top-6 border-border/70">
            <CardHeader>
              <CardTitle className="text-[15px]">Report summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {selected ? (
                  <PersonAvatar personId={selected.id} name={selected.fullName} imageId={selected.primaryImageId} size="lg" />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-border bg-muted/40">
                    <UserRound className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {selected ? selected.fullName : mode === "new" ? `${firstName || "New"} ${lastName || "person"}`.trim() : "No person selected"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {selected
                      ? `${selected.episodeCount} previous ${selected.episodeCount === 1 ? "episode" : "episodes"}`
                      : "A new person record will be created"}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Risk</span>
                <RiskBadge value={risk} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{category}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Repeat</span>
                <span className="font-medium">{selected?.isRepeatMissing ? "Yes" : "No"}</span>
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <span className="mb-1 block font-semibold text-foreground">Review guidance</span>
                {riskGuidance[risk]}
              </div>

              <Button type="submit" className="w-full" disabled={submitting || (!selected && mode === "existing")}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {submitting ? "Creating enquiry…" : "Create enquiry"}
              </Button>
              <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
                A case reference is generated automatically. If the person is a child and the force
                is configured for it, the local authority will be notified.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SelectedPerson({
  person,
  locked,
  onChange,
}: {
  person: PersonChoice;
  locked?: boolean;
  onChange?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-primary/[0.03] p-3">
      <PersonAvatar personId={person.id} name={person.fullName} imageId={person.primaryImageId} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link href={`/people/${person.id}`} className="truncate text-sm font-medium hover:underline" target="_blank">
            {person.fullName}
          </Link>
          {person.isRepeatMissing && (
            <span className="rounded border border-violet-200 bg-violet-50 px-1 text-[9px] font-semibold uppercase text-violet-700">
              Repeat
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {person.age != null ? `${person.age} yrs` : "Age unknown"} · {person.sex} · {person.episodeCount} previous {person.episodeCount === 1 ? "episode" : "episodes"}
        </div>
      </div>
      {!locked && (
        <Button type="button" variant="ghost" size="icon-sm" onClick={onChange}>
          <X className="size-3.5" />
        </Button>
      )}
      {locked && (
        <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
          Existing record
        </span>
      )}
    </div>
  );
}
