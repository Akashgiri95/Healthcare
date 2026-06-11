"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState, useEffect, createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  LayoutDashboard, Users, CalendarDays, Stethoscope,
  FlaskConical, Receipt, Pill, Settings, LogOut, Activity,
  MonitorCheck, GitBranch, UserPlus, ChevronDown, LayoutList,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Doctor Context (shared across app) ───────────────────────────────────────

interface DoctorContextType {
  selectedDoctorId: number | null;
  setSelectedDoctorId: (id: number | null) => void;
  doctorName: string;
  departmentName: string;
}

const DoctorContext = createContext<DoctorContextType>({
  selectedDoctorId: null,
  setSelectedDoctorId: () => {},
  doctorName: "",
  departmentName: "",
});

export const useDoctorContext = () => useContext(DoctorContext);

// ─── Nav Config ───────────────────────────────────────────────────────────────

type NavItem = { type: "item"; href: string; label: string; icon: any; roles: string[] };
type NavGroup = { type: "group"; label: string; icon: any; roles: string[]; basePath: string; children: NavItem[] };
type NavEntry = NavItem | NavGroup;

const NAV: NavEntry[] = [
  { type: "item", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "BILLING", "PHARMACIST", "LAB_TECHNICIAN"] },
  { type: "item", href: "/reception", label: "Reception", icon: MonitorCheck, roles: ["ADMIN", "RECEPTIONIST"] },
  { type: "item", href: "/opd", label: "OPD Queue", icon: Activity, roles: ["ADMIN", "NURSE", "RECEPTIONIST", "DOCTOR"] },
  { type: "item", href: "/opd/journey/vitals", label: "Vitals / Triage", icon: Activity, roles: ["ADMIN", "NURSE"] },
  { type: "item", href: "/doctor", label: "Doctor Desk", icon: Stethoscope, roles: ["DOCTOR", "ADMIN"] },
  {
    type: "group",
    label: "Departments",
    icon: GitBranch,
    basePath: "/dept",
    roles: ["ADMIN", "PHARMACIST", "LAB_TECHNICIAN", "DOCTOR", "NURSE"],
    children: [
      { type: "item", href: "/pharmacy", label: "Pharmacy", icon: Pill, roles: ["ADMIN", "PHARMACIST"] },
      { type: "item", href: "/lab", label: "Lab", icon: FlaskConical, roles: ["ADMIN", "LAB_TECHNICIAN", "DOCTOR", "NURSE"] },
    ],
  },
  { type: "item", href: "/billing", label: "Billing", icon: Receipt, roles: ["ADMIN", "BILLING", "RECEPTIONIST"] },
  { type: "item", href: "/admin", label: "Admin", icon: Settings, roles: ["ADMIN"] },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);

  // Fetch doctors list
  const { data: doctorsData = [] } = useQuery({
    queryKey: ["doctors-list"],
    queryFn: () => api.get("/api/appointments/doctors-availability").then(r => r.data),
  });

  // Auto-select first doctor
  useEffect(() => {
    if (doctorsData.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctorsData[0].doctor_id);
    }
  }, [doctorsData, selectedDoctorId]);

  const selectedDoctor = doctorsData.find((d: any) => d.doctor_id === selectedDoctorId);

  // Auto-expand groups when navigating to a child route
  useEffect(() => {
    NAV.forEach((entry) => {
      if (entry.type === "group") {
        const onChild =
          pathname.startsWith(entry.basePath) ||
          entry.children.some((c) => pathname === c.href);
        if (onChild) {
          setOpenGroups((prev) =>
            prev.includes(entry.basePath) ? prev : [...prev, entry.basePath]
          );
        }
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
    <DoctorContext.Provider value={{
      selectedDoctorId,
      setSelectedDoctorId,
      doctorName: selectedDoctor?.doctor_name || "",
      departmentName: selectedDoctor?.department_name || "",
    }}>
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

        {/* Doctor Selector */}
        <div className="px-3 py-3 border-b border-blue-800 bg-blue-900/60">
          <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1.5 font-medium">Select Doctor</p>
          <Select
            value={selectedDoctorId?.toString() || ""}
            onValueChange={(v) => setSelectedDoctorId(parseInt(v))}
          >
            <SelectTrigger className="bg-blue-900/50 border-blue-700 text-white text-xs h-8 hover:bg-blue-800">
              <SelectValue placeholder="Choose doctor..." />
            </SelectTrigger>
            <SelectContent>
              {doctorsData.map((doc: any) => (
                <SelectItem key={doc.doctor_id} value={doc.doctor_id.toString()}>
                  <div className="flex items-center justify-between gap-2">
                    <span>{doc.doctor_name}</span>
                    <span className="text-[10px] text-gray-400">({doc.slots_booked})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDoctor && (
            <p className="text-[10px] text-blue-300 mt-1">{selectedDoctor.department_name}</p>
          )}
        </div>

        {/* User info */}
        <div className="px-4 py-2 border-b border-blue-800 bg-blue-900/40">
          <p className="text-xs font-medium text-white truncate">{user?.name}</p>
          <p className="text-[10px] text-blue-300">{role.replace("_", " ")}</p>
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
            const isGroupActive =
              pathname.startsWith(group.basePath) ||
              group.children.some((c) => pathname === c.href);
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
                      const isChildActive =
                        child.href === "/opd"
                          ? pathname === "/opd"
                          : pathname === child.href || pathname.startsWith(child.href + "/");
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
    </DoctorContext.Provider>
  );
}
