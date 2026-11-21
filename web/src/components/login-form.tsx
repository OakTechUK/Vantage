"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { TenantLookup } from "@/lib/types";

const DEMO = {
  tenantCode: "WPC",
  email: "sarah.collins@wpc.police.uk",
  password: "Passw0rd!2026",
};

export function LoginForm({
  tenants,
  nextPath,
}: {
  tenants: TenantLookup[];
  nextPath: string;
}) {
  const router = useRouter();
  const [tenantCode, setTenantCode] = useState(tenants[0]?.code ?? "WPC");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function fillDemo() {
    setTenantCode(DEMO.tenantCode);
    setEmail(DEMO.email);
    setPassword(DEMO.password);
    setError(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantCode, email, password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.detail ?? "Sign-in failed. Check your details and try again.");
        setPending(false);
        return;
      }

      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
      router.refresh();
    } catch {
      setError("The Vantage API could not be reached. Check that the API is running.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertDescription className="text-[12px]">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="force" className="text-[12px]">Force</Label>
        <Select value={tenantCode} onValueChange={(value) => setTenantCode(String(value))}>
          <SelectTrigger id="force" className="h-10 w-full bg-background">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.code}>
                {tenant.code} · {tenant.name}
              </SelectItem>
            ))}
            {tenants.length === 0 && (
              <SelectItem value="WPC">WPC · Westshire Police</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[12px]">Police email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@force.police.uk"
            className="h-10 bg-background pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-[12px]">Password</Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••••••"
            className="h-10 bg-background pl-9"
          />
        </div>
      </div>

      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <div className="rounded-xl border border-border/70 bg-card/70 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Demo access
        </div>
        <div className="mt-2 grid gap-1.5 font-mono text-[11px] text-muted-foreground">
          <div><span className="text-foreground">Force</span> WPC · Westshire Police</div>
          <div><span className="text-foreground">Email</span> sarah.collins@wpc.police.uk</div>
          <div><span className="text-foreground">Password</span> Passw0rd!2026</div>
        </div>
        <button
          type="button"
          onClick={fillDemo}
          className="mt-3 text-[11px] font-medium text-primary hover:underline"
        >
          Use demo credentials
        </button>
      </div>
    </form>
  );
}
