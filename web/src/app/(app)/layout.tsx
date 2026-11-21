import { redirect } from "next/navigation";
import { getSession } from "@/lib/api";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const officer = await getSession();
  if (!officer) redirect("/login");

  return <AppShell officer={officer}>{children}</AppShell>;
}
