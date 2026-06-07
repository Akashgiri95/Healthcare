"use client";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Users, CalendarDays, Activity, Receipt, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { fmtCurrency } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: todayAppts } = useQuery({
    queryKey: ["appointments", today],
    queryFn: () => api.get(`/api/appointments?appointment_date=${today}`).then((r) => r.data),
  });

  const { data: patients } = useQuery({
    queryKey: ["patients-count"],
    queryFn: () => api.get("/api/patients?limit=1").then((r) => r.data),
  });

  const apptList = todayAppts || [];
  const completed = apptList.filter((a: any) => a.status === "COMPLETED").length;
  const waiting = apptList.filter((a: any) => ["CHECKED_IN", "IN_QUEUE", "WITH_DOCTOR"].includes(a.status)).length;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Dashboard" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}, {user?.name?.split(" ")[0]}
            </h2>
            <p className="text-gray-500 text-sm">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Users} label="Total Patients" value={patients?.total || 0} sub="Registered" color="bg-blue-500" />
            <StatCard icon={CalendarDays} label="Today's Appointments" value={apptList.length} sub={`${format(new Date(), "dd MMM")}`} color="bg-violet-500" />
            <StatCard icon={Activity} label="In Queue / Active" value={waiting} sub="Currently waiting" color="bg-amber-500" />
            <StatCard icon={Receipt} label="Completed Today" value={completed} sub="Consultations done" color="bg-green-500" />
          </div>

          {/* Today's Appointment List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Today's OPD Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {apptList.length === 0 ? (
                  <p className="text-sm text-gray-400 px-4 pb-4">No appointments today</p>
                ) : (
                  <div className="divide-y max-h-72 overflow-y-auto">
                    {apptList.slice(0, 15).map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {a.token_number}
                          </span>
                          <div>
                            <p className="font-medium text-gray-800">{a.appointment_no}</p>
                            <p className="text-xs text-gray-400">{a.appointment_type}</p>
                          </div>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Register Patient", href: "/patients/new", icon: "👤", color: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
                    { label: "Book Appointment", href: "/appointments/new", icon: "📅", color: "bg-violet-50 hover:bg-violet-100 text-violet-700" },
                    { label: "OPD Queue", href: "/opd", icon: "🏃", color: "bg-amber-50 hover:bg-amber-100 text-amber-700" },
                    { label: "Doctor Desk", href: "/doctor", icon: "🩺", color: "bg-green-50 hover:bg-green-100 text-green-700" },
                    { label: "Create Bill", href: "/billing/new", icon: "🧾", color: "bg-rose-50 hover:bg-rose-100 text-rose-700" },
                    { label: "Lab Orders", href: "/lab", icon: "🔬", color: "bg-teal-50 hover:bg-teal-100 text-teal-700" },
                  ].map((action) => (
                    <a
                      key={action.href}
                      href={action.href}
                      className={`flex items-center gap-2.5 p-3 rounded-xl transition-colors ${action.color} font-medium text-sm`}
                    >
                      <span className="text-lg">{action.icon}</span>
                      {action.label}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SCHEDULED: "bg-gray-100 text-gray-600",
    CHECKED_IN: "bg-blue-100 text-blue-700",
    IN_QUEUE: "bg-amber-100 text-amber-700",
    WITH_DOCTOR: "bg-violet-100 text-violet-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-600",
    NO_SHOW: "bg-rose-100 text-rose-600",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || "bg-gray-100 text-gray-500"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
