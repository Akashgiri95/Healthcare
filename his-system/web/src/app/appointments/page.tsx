"use client";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtTime } from "@/lib/utils";
import { toast } from "sonner";
import { CalendarDays, Plus, UserCheck } from "lucide-react";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-gray-100 text-gray-600",
  CHECKED_IN: "bg-blue-100 text-blue-700",
  IN_QUEUE: "bg-amber-100 text-amber-700",
  WITH_DOCTOR: "bg-violet-100 text-violet-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW: "bg-rose-100 text-rose-600",
};

export default function AppointmentsPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const qc = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", date],
    queryFn: () => api.get(`/api/appointments?appointment_date=${date}`).then((r) => r.data),
  });

  const checkinMutation = useMutation({
    mutationFn: (id: number) => api.post(`/api/appointments/${id}/checkin`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Patient checked in"); },
    onError: () => toast.error("Check-in failed"),
  });

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Appointments" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
              <span className="text-sm text-gray-500">{appointments.length} appointments</span>
            </div>
            <Link href="/appointments/new">
              <Button className="bg-blue-600 hover:bg-blue-700 gap-1.5">
                <Plus className="w-4 h-4" /> Book Appointment
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-2">
              {appointments.map((a: any) => (
                <Card key={a.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {a.token_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-400">{a.appointment_no}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status]}`}>{a.status.replace("_", " ")}</span>
                          {a.priority > 0 && <span className="text-xs text-red-500 font-bold">● URGENT</span>}
                        </div>
                        <p className="text-sm font-medium text-gray-800 mt-0.5">Patient #{a.patient_id}</p>
                        {a.chief_complaint && <p className="text-xs text-gray-400 truncate">{a.chief_complaint}</p>}
                      </div>
                      <div className="text-right text-xs text-gray-400 flex-shrink-0">
                        <p className="font-medium text-gray-600">{fmtTime(a.appointment_time)}</p>
                        <p>{a.appointment_type} · {a.visit_type}</p>
                        <p>Doctor #{a.doctor_id}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {a.status === "SCHEDULED" && (
                          <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 gap-1" onClick={() => checkinMutation.mutate(a.id)}>
                            <UserCheck className="w-3.5 h-3.5" /> Check In
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {appointments.length === 0 && (
                <div className="text-center py-16">
                  <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No appointments for this date</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
