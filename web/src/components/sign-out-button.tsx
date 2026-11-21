"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors disabled:opacity-50",
        className,
      )}
    >
      <LogOut className="size-3.5" />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
