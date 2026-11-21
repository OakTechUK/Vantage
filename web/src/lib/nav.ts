import {
  BarChart3,
  FolderSearch,
  LayoutDashboard,
  ShieldAlert,
  Users,
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Enquiries", icon: FolderSearch },
  { href: "/people", label: "People", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/cawns", label: "Warning notices", icon: ShieldAlert },
];
