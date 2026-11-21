import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { NewCaseForm } from "@/components/new-case-form";
import { serverApi } from "@/lib/api";
import type { OfficerListDto, PersonDetail } from "@/lib/types";

export const metadata = { title: "Log missing person" };

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>;
}) {
  const { personId } = await searchParams;

  const [officers, person] = await Promise.all([
    serverApi<OfficerListDto>("/api/officers"),
    personId
      ? serverApi<PersonDetail>(`/api/persons/${personId}`).catch(() => null)
      : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="New report"
        title={person ? "Log a new missing episode" : "Log a missing person"}
        description={
          person
            ? "A new enquiry will be linked to the person's existing record. Their history, associates and places of interest carry over automatically."
            : "Record the initial report, assess risk and create the enquiry. The person record is kept separately so repeat episodes never need re-keying."
        }
        actions={
          <Button variant="outline" render={<Link href={person ? `/people/${person.id}` : "/cases"} />}>
            <ArrowLeft className="size-4" />
            Cancel
          </Button>
        }
      />

      <NewCaseForm officers={officers.items} initialPerson={person} />
    </>
  );
}
