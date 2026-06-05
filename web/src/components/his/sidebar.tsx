"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, CalendarDays, Stethoscope,
  FlaskConical, Receipt, Pill, Settings, LogOut, Activity,
  MonitorCheck, GitBranch, UserPlus, ChevronDown, LayoutList,
} from "lucide-react";

type NavItem = { type: "item"; href: string; label: string; icon: any; roles: string[] };
type NavGroup = { type: "group"; label: string; icon: any; roles: string[]; basePath: string; children: NavItem[] };
type NavEntry = NavItem | NavGroup;

const NAV: NavEntry[] = [
  { type: "item", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "BILLING", "PHARMACIST"] },
  { type: "item", href: "/reception", label: "Reception", icon: MonitorCheck, roles: ["ADMIN", "RECEPTIONIST"] },
  {
    type: "group",
    label: "OPD Journey",
    icon: GitBranch,
    basePath: "/opd/journey",
    roles: ["ADMIN", "NURSE", "RECEPTIONIST", "DOCTOR", "BILLING"],
    children: [
      { type: "item", href: "/opd/journey/vitals", label: "1. Vitals & Triage", icon: Activity, roles: ["ADMIN", "NURSE", "RECEPTIONIST", "DOCTOR", "BILLING"] },
      { type: "item", href: "/opd/journey/consultation", label: "2. Consultation", icon: Stethoscope, roles: ["ADMIN", "NURSE", "RECEPTIONIST", "DOCTOR", "BILLING"] },
    ],
  },
  { type: "item", href: "/opd", label: "OPD Queue", icon: Activity, roles: ["ADMIN", "NURSE", "RECEPTIONIST", "DOCTOR"] },
  { type: "item", href: "/patients", label: "Patients", icon: Users, roles: ["ADMIN", "NURSE", "RECEPTIONIST", "DOCTOR", "BILLING"] },
  { type: "item", href: "/appointments", label: "Appointments", icon: CalendarDays, roles: ["ADMIN", "NURSE", "RECEPTIONIST", "DOCTOR"] },
  { type: "item", href: "/appointments/schedule", label: "Doctor Schedule", icon: LayoutList, roles: ["ADMIN", "NURSE", "RECEPTIONIST", "DOCTOR"] },
  { type: "item", href: "/doctor", label: "Doctor Desk", icon: Stethoscope, roles: ["DOCTOR", "ADMIN"] },
  { type: "item", href: "/lab", label: "Lab Orders", icon: FlaskConical, roles: ["ADMIN", "DOCTOR", "NURSE", "LAB_TECHNICIAN"] },
  { type: "item", href: "/billing", label: "Billing", icon: Receipt, roles: ["ADMIN", "BILLING", "RECEPTIONIST"] },
  { type: "item", href: "/pharmacy", label: "Pharmacy", icon: Pill, roles: ["ADMIN", "PHARMACIST"] },
  { type: "item", href: "/admin", label: "Admin", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // Auto-expand groups when navigating to a child route
  useEffect(() => {
    NAV.forEach((entry) => {
      if (entry.type === "group" && pathname.startsWith(entry.basePath)) {
        setOpenGroups((prev) =>
          prev.includes(entry.basePath) ? prev : [...prev, entry.basePath]
        );
      }
    });
  }, [pathname]);

  function toggleGroup(basePath: string) {
    setOpenGroups((prev) =>
      prev.includes(basePath) ? prev.filter((p) => p !== basePath) : [...prev, basePath]
    );
  }

  function handleLogout() {
    logout();
    toast.success("Signed out");
    router.replace("/login");
  }

  const role = user?.role || "";

  return (
    <aside className="w-56 flex-shrink-0 bg-blue-950 text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-blue-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏥</span>
          <div>
            <p className="font-bold text-sm leading-tight">HIS Portal</p>
            <p className="text-blue-300 text-xs">Healthcare</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-blue-800 bg-blue-900/40">
        <p className="text-xs font-medium text-white truncate">{user?.name}</p>
        <p className="text-xs text-blue-300">{role.replace("_", " ")}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map((entry) => {
          if (!entry.roles.includes(role)) return null;

          if (entry.type === "item") {
            const isActive =
              entry.href === "/opd"
                ? pathname === "/opd"
                : pathname.startsWith(entry.href);
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-blue-200 hover:bg-blue-800 hover:text-white"
                )}
              >
                <entry.icon className="w-4 h-4 flex-shrink-0" />
                {entry.label}
              </Link>
            );
          }

          // Group
          const group = entry as NavGroup;
          const isGroupActive = pathname.startsWith(group.basePath);
          const isOpen = openGroups.includes(group.basePath);
          const visibleChildren = group.children.filter((c) => c.roles.includes(role));

          return (
            <div key={group.basePath}>
              <button
                onClick={() => toggleGroup(group.basePath)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isGroupActive
                    ? "text-white bg-blue-900/60"
                    : "text-blue-200 hover:bg-blue-800 hover:text-white"
                )}
              >
                <group.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={cn("w-3.5 h-3.5 transition-transform shrink-0", isOpen && "rotate-180")}
                />
              </button>

              {isOpen && (
                <div className="mt-0.5 ml-3 pl-2 border-l border-blue-800/70 space-y-0.5">
                  {visibleChildren.map((child) => {
                    const isChildActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          isChildActive
                            ? "bg-blue-600 text-white"
                            : "text-blue-300 hover:bg-blue-800 hover:text-white"
                        )}
                      >
                        <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-blue-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-200 hover:bg-red-600/20 hover:text-red-300 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
