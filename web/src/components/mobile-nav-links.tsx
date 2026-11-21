"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { navItems } from "@/lib/nav";
import { SheetClose } from "@/components/ui/sheet";

export function MobileNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <SheetClose
            key={item.href}
            render={
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60",
                )}
              />
            }
          >
            <item.icon className={cn("size-4", active ? "text-sidebar-primary" : "text-sidebar-foreground/40")} />
            {item.label}
          </SheetClose>
        );
      })}
    </nav>
  );
}
