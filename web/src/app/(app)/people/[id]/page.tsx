import { notFound } from "next/navigation";
import { PersonFile } from "@/components/person-file";
import { serverApi } from "@/lib/api";
import type { PersonDetail } from "@/lib/types";

export const metadata = { title: "Person file" };

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let person: PersonDetail;
  try {
    person = await serverApi<PersonDetail>(`/api/persons/${id}`);
  } catch {
    notFound();
  }

  return <PersonFile person={person} />;
}
