"use client";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { calcAge, fmtTime } from "@/lib/utils";
import { UserCheck, ChevronRight, X, CheckCircle2, Clock, Users } from "lucide-react";

const STATUS_FLOW: Record<string, string> = {
  SCHEDULED: "CHECKED_IN",
  CHECKED_IN: "IN_QUEUE",
  IN_QUEUE: "WITH_DOCTOR",
  WITH_DOCTOR: "COMPLETED",
};

const STATUS_LABEL: Record<string, string> = {
  CHECKED_IN: "Check In",
  IN_QUEUE: "Send to Queue",
  WITH_DOCTOR: "Call to Doctor",
  COMPLETED: "Mark Complete",
};

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-gray-100 text-gray-600 border-gray-200",
  CHECKED_IN: "bg-blue-100 text-blue-700 border-blue-200",
  IN_QUEUE: "bg-amber-100 text-amber-700 border-amber-200",
  WITH_DOCTOR: "bg-violet-100 text-violet-700 border-violet-200",
  COMPLETED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-red-100 text-red-600 border-red-200",
};

export default function OPDQueuePage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const qc = useQueryClient();
  const [doctorFilter, setDoctorFilter] = useState<string>("all");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["opd-queue", today],
    queryFn: () => api.get(`/api/appointments?appointment_date=${today}`).then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.get("/api/masters/doctors").then((r) => r.data),
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/api/appointments/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opd-queue"] });
      toast.success("Status updated");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.patch(`/api/appointments/${id}/status`, { status: "CANCELLED", cancelled_reason: reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opd-queue"] });
      toast.success("Appointment cancelled");
    },
  });

  const filtered = appointments.filter((a: any) => {
    if (doctorFilter !== "all" && a.doctor_id !== parseInt(doctorFilter)) return false;
    return true;
  });

  const byStatus = (status: string) => filtered.filter((a: any) => a.status === status);

  const counts = {
    scheduled: byStatus("SCHEDULED").length,
    checkedIn: byStatus("CHECKED_IN").length,
    inQueue: byStatus("IN_QUEUE").length,
    withDoctor: byStatus("WITH_DOCTOR").length,
    completed: byStatus("COMPLETED").length,
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="OPD Queue" />
        <main className="flex-1 overflow-y-auto p-4">
          {/* Summary bar */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[
              { label: "Scheduled", count: counts.scheduled, color: "bg-gray-50 border-gray-200 text-gray-700" },
              { label: "Checked In", count: counts.checkedIn, color: "bg-blue-50 border-blue-200 text-blue-700" },
              { label: "In Queue", count: counts.inQueue, color: "bg-amber-50 border-amber-200 text-amber-700" },
              { label: "With Doctor", count: counts.withDoctor, color: "bg-violet-50 border-violet-200 text-violet-700" },
              { label: "Completed", count: counts.completed, color: "bg-green-50 border-green-200 text-green-700" },
            ].map((s) => (
              <div key={s.label} className={`border rounded-xl p-3 ${s.color}`}>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3 mb-4">
            <Select value={doctorFilter} onValueChange={(v) => setDoctorFilter(v ?? "all")}>
              <SelectTrigger className="w-56 bg-white">
                <SelectValue placeholder="All Doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map((d: any) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    Dr. {d.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">{filtered.length} appointments today</p>
          </div>

          {/* Kanban-style queue */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {["CHECKED_IN", "IN_QUEUE", "WITH_DOCTOR", "COMPLETED"].map((status) => (
              <div key={status} className="space-y-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${STATUS_COLOR[status]}`}>
                  <span className="text-xs font-semibold uppercase tracking-wide">{status.replace("_", " ")}</span>
                  <span className="ml-auto text-xs font-bold">{byStatus(status).length}</span>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                  {byStatus(status).map((a: any) => (
                    <QueueCard
                      key={a.id}
                      appointment={a}
                      onAdvance={() => {
                        const next = STATUS_FLOW[a.status];
                        if (next) advanceMutation.mutate({ id: a.id, status: next });
                      }}
                      onCancel={() => cancelMutation.mutate({ id: a.id, reason: "Cancelled by staff" })}
                      nextLabel={STATUS_LABEL[STATUS_FLOW[a.status]] || ""}
                    />
                  ))}
                  {byStatus(status).length === 0 && (
                    <div className="text-center py-8 text-gray-300 text-sm">Empty</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function QueueCard({ appointment: a, onAdvance, onCancel, nextLabel }: {
  appointment: any;
  onAdvance: () => void;
  onCancel: () => void;
  nextLabel: string;
}) {
  return (
    <div className="bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
          {a.token_number}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[a.status]}`}>
          {a.appointment_type}
        </span>
      </div>
      <p className="text-xs font-mono text-gray-400 mb-1">{a.appointment_no}</p>
      <p className="text-sm font-semibold text-gray-800">Patient #{a.patient_id}</p>
      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
        <Clock className="w-3 h-3" /> {fmtTime(a.appointment_time)}
        {a.priority > 0 && <span className="ml-1 text-red-500 font-bold">● URGENT</span>}
      </p>
      {a.chief_complaint && (
        <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded px-2 py-1 truncate">
          {a.chief_complaint}
        </p>
      )}
      <div className="flex gap-1.5 mt-2.5">
        {nextLabel && (
          <Button size="sm" className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={onAdvance}>
            {nextLabel}
          </Button>
        )}
        {a.status !== "COMPLETED" && a.status !== "CANCELLED" && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={onCancel}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
