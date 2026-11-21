import { ScanEye, ShieldCheck, Network, ClipboardCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { apiBaseUrl } from "@/lib/api";
import type { TenantLookup } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadTenants(): Promise<TenantLookup[]> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/auth/tenants`, { cache: "no-store" });
    if (!response.ok) return [];
    return (await response.json()) as TenantLookup[];
  } catch {
    return [];
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [tenants, params] = await Promise.all([loadTenants(), searchParams]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sidebar px-12 py-10 lg:flex lg:flex-col">
        <div className="texture-grid absolute inset-0 opacity-40" />
        <div className="absolute -left-28 top-1/3 size-[420px] rounded-full bg-sidebar-primary/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 size-[360px] rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-xl shadow-black/30">
            <ScanEye className="size-6" strokeWidth={2.1} />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-sidebar-foreground">Vantage</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-sidebar-foreground/45">
              Missing persons operations
            </div>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-sidebar-foreground/70">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Multi-force operational platform
          </div>
          <h1 className="text-[42px] font-semibold leading-[1.08] tracking-tight text-sidebar-foreground">
            Every missing person.
            <br />
            <span className="text-sidebar-primary">One operational picture.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-sidebar-foreground/60">
            Record, investigate and close missing person enquiries with structured reviews,
            intelligence summaries and force-level reporting — built for the realities of
            operational policing.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {[
              { icon: Network, title: "Multi-force by design", text: "Strict tenant isolation and per-force configuration." },
              { icon: ClipboardCheck, title: "Review assurance", text: "Risk-based review windows with overdue escalation." },
              { icon: ShieldCheck, title: "Auditable by default", text: "Every change captured against the officer and record." },
              { icon: ScanEye, title: "Intelligence-led", text: "People, places and search considerations in one file." },
            ].map((feature) => (
              <div key={feature.title} className="rounded-xl border border-white/8 bg-white/[0.035] p-3.5">
                <feature.icon className="mb-2 size-4 text-sidebar-primary" />
                <div className="text-[12px] font-medium text-sidebar-foreground/90">{feature.title}</div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-sidebar-foreground/45">{feature.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] text-sidebar-foreground/35">
          <span>Prototype environment · synthetic data only</span>
          <span>v0.1</span>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ScanEye className="size-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Vantage</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Missing persons ops
              </div>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-[26px] font-semibold tracking-tight">Sign in to your workspace</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use your force code and police credentials.
            </p>
          </div>

          <LoginForm tenants={tenants} nextPath={params.next ?? "/dashboard"} />

          <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">
            This is a prototype containing synthetic records. Do not enter real personal data.
          </p>
        </div>
      </section>
    </div>
  );
}
