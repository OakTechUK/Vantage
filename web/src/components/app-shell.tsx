import Link from "next/link";
import { ScanEye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { OfficerProfile } from "@/lib/types";
import { initials } from "@/lib/format";
import { AppNavLinks } from "@/components/app-nav-links";
import { MobileNavLinks } from "@/components/mobile-nav-links";
import { SignOutButton } from "@/components/sign-out-button";

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/25">
        <ScanEye className="size-5" strokeWidth={2.2} />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">Vantage</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/50">
          Missing persons ops
        </div>
      </div>
    </Link>
  );
}

export function AppShell({
  officer,
  children,
}: {
  officer: OfficerProfile;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-sidebar px-4 py-5 lg:flex">
        <Brand />

        <div className="mt-8 flex-1">
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">
            Operations
          </div>
          <AppNavLinks />
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
            <div className="flex items-center gap-2.5">
              <Avatar className="size-9 border border-white/10">
                <AvatarFallback className="bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary">
                  {initials(officer.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-sidebar-foreground">
                  {officer.displayName}
                </div>
                <div className="truncate text-[11px] text-sidebar-foreground/55">
                  {officer.rank} · {officer.collarNumber}
                </div>
              </div>
            </div>
            <Separator className="my-3 bg-sidebar-border" />
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="outline"
                className="border-white/10 bg-white/5 text-[10px] font-medium text-sidebar-foreground/70"
              >
                {officer.tenantCode}
              </Badge>
              <SignOutButton className="text-sidebar-foreground/55 hover:text-sidebar-foreground" />
            </div>
          </div>
          <p className="px-1 text-[10px] leading-relaxed text-sidebar-foreground/35">
            {officer.tenantName}
            <br />
            Prototype environment · synthetic data
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md lg:hidden">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon" className="size-9" />}>
              <ScanEye className="size-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-sidebar p-5 text-sidebar-foreground">
              <SheetTitle className="sr-only">Vantage navigation</SheetTitle>
              <Brand />
              <div className="mt-8">
                <MobileNavLinks />
              </div>
              <div className="absolute inset-x-4 bottom-5">
                <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
                  <div className="text-[13px] font-medium">{officer.displayName}</div>
                  <div className="text-[11px] text-sidebar-foreground/55">
                    {officer.rank} · {officer.tenantCode}
                  </div>
                  <SignOutButton className="mt-3 text-sidebar-foreground/70 hover:text-sidebar-foreground" />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ScanEye className="size-3.5" />
            </div>
            <span className="text-sm font-semibold">Vantage</span>
          </div>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {officer.tenantCode}
          </Badge>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
