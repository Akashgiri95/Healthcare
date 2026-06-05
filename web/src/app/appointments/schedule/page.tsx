"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays, parseISO } from "date-fns";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, CalendarDays, UserCheck,
  AlertTriangle, Clock, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED:   "bg-gray-100 text-gray-700 border-gray-200",
  CHECKED_IN:  "bg-blue-100 text-blue-700 border-blue-200",
  IN_QUEUE:    "bg-amber-100 text-amber-700 border-amber-200",
  WITH_DOCTOR: "bg-violet-100 text-violet-700 border-violet-200",
  COMPLETED:   "bg-green-100 text-green-700 border-green-200",
  CANCELLED:   "bg-red-100 text-red-600 border-red-200",
  NO_SHOW:     "bg-orange-100 text-orange-600 border-orange-200",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED:   "Scheduled",
  CHECKED_IN:  "Checked In",
  IN_QUEUE:    "In Queue",
  WITH_DOCTOR: "With Doctor",
  COMPLETED:   "Completed",
  CANCELLED:   "Cancelled",
  NO_SHOW:     "No Show",
};

const TYPE_LABEL: Record<string, string> = {
  WALK_IN:   "Walk-in",
  SCHEDULED: "Scheduled",
  FOLLOW_UP: "Follow-up",
  EMERGENCY: "Emergency",
};

// 08:00 – 20:00 in 30-min steps
const TIME_SLOTS: string[] = [];
for (let h = 8; h < 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

function apptInSlot(appt: any, slot: string) {
  if (!appt.appointment_time) return false;
  const time = appt.appointment_time.slice(0, 5);
  const [ah, am] = time.split(":").map(Number);
  const [sh, sm] = slot.split(":").map(Number);
  const slotStart = sh * 60 + sm;
  const apptMin  = ah * 60 + am;
  return apptMin >= slotStart && apptMin < slotStart + 30;
}

function slotIsBlocked(blocks: any[], slot: string) {
  return blocks.some(b => {
    if (!b.is_active) return false;
    if (!b.start_time && !b.end_time) return true;
    const [sh, sm] = slot.split(":").map(Number);
    const slotMin = sh * 60 + sm;
    const [bsh, bsm] = (b.start_time ?? "00:00").slice(0, 5).split(":").map(Number);
    const blockStart = bsh * 60 + bsm;
    const blockEnd = b.end_time
      ? (() => { const [eh, em] = b.end_time.slice(0, 5).split(":").map(Number); return eh * 60 + em; })()
      : 20 * 60;
    return slotMin >= blockStart && slotMin < blockEnd;
  });
}

export default function SchedulePage() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [doctorId, setDoctorId] = useState("");

  const { data: doctors = [] } = useQuery<any[]>({
    queryKey: ["doctors-all"],
    queryFn: () => api.get("/api/masters/doctors").then(r => r.data),
  });

  const { data: appointments = [] } = useQuery<any[]>({
    queryKey: ["schedule-appts", doctorId, selectedDate],
    queryFn: () => api.get(`/api/appointments?doctor_id=${doctorId}&appointment_date=${selectedDate}`).then(r => r.data),
    enabled: !!doctorId,
    refetchInterval: 30000,
  });

  const { data: blocks = [] } = useQuery<any[]>({
    queryKey: ["schedule-blocks", doctorId, selectedDate],
    queryFn: () => api.get(`/api/appointments/blocks?doctor_id=${doctorId}&block_date=${selectedDate}`).then(r => r.data),
    enabled: !!doctorId,
  });

  const { data: waitlist = [] } = useQuery<any[]>({
    queryKey: ["schedule-waitlist", doctorId, selectedDate],
    queryFn: () => api.get(`/api/appointments/waitlist?doctor_id=${doctorId}&preferred_date=${selectedDate}`).then(r => r.data),
    enabled: !!doctorId,
  });

  const { data: slotInfo } = useQuery<any>({
    queryKey: ["schedule-slots", doctorId, selectedDate],
    queryFn: () => api.get(`/api/appointments/available-slots?doctor_id=${doctorId}&date=${selectedDate}`).then(r => r.data),
    enabled: !!doctorId,
  });

  const checkinMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/appointments/${id}/checkin`).then(r => r.data),
    onSuccess: () => {
      toast.success("Patient checked in");
      qc.invalidateQueries({ queryKey: ["schedule-appts"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Check-in failed"),
  });

  const appts = appointments as any[];
  const blks  = blocks as any[];

  const total     = appts.length;
  const completed = appts.filter(a => a.status === "COMPLETED").length;
  const remaining = appts.filter(a => !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status)).length;
  const cancelled = appts.filter(a => a.status === "CANCELLED" || a.status === "NO_SHOW").length;

  const activeBlocks = blks.filter(b => b.is_active);
  const isToday = selectedDate === today;

  const selectedDoctor = (doctors as any[]).find(d => String(d.id) === doctorId);

  function prevDay() { setSelectedDate(format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd")); }
  function nextDay() { setSelectedDate(format(addDays(parseISO(selectedDate), 1), "yyyy-MM-dd")); }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Doctor Schedule" />

        {/* Toolbar */}
        <div className="bg-white border-b px-4 py-2.5 flex items-center gap-3 shrink-0 flex-wrap">
          {/* Doctor picker */}
          <Select value={doctorId} onValueChange={v => setDoctorId(v ?? "")}>
            <SelectTrigger className="w-60 h-8 text-sm">
              <SelectValue placeholder="Select doctor…" />
            </SelectTrigger>
            <SelectContent>
              {(doctors as any[]).map(d => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.full_name} — {d.department_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date nav */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={prevDay}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => e.target.value && setSelectedDate(e.target.value)}
              className="h-8 border border-input rounded-md px-2 text-sm bg-white"
            />
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={nextDay}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            {!isToday && (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-blue-600"
                onClick={() => setSelectedDate(today)}>
                Today
              </Button>
            )}
            {isToday && (
              <span className="text-xs text-blue-600 font-medium px-2">Today</span>
            )}
          </div>

          {/* Stats */}
          {doctorId && total > 0 && (
            <div className="flex items-center gap-4 ml-auto text-xs">
              <span className="text-gray-500">{total} appointments</span>
              <span className="flex items-center gap-1 text-green-600 font-medium">
                <CheckCircle2 className="w-3 h-3" />{completed} done
              </span>
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <Clock className="w-3 h-3" />{remaining} remaining
              </span>
              {cancelled > 0 && (
                <span className="text-red-500">{cancelled} cancelled / no-show</span>
              )}
              {slotInfo && (
                <span className="text-gray-400 border-l pl-3">{slotInfo.available} slots free</span>
              )}
            </div>
          )}
        </div>

        {/* Block banner */}
        {activeBlocks.length > 0 && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <p className="text-xs text-red-700">
              Doctor unavailable:{" "}
              {activeBlocks.map(b =>
                `${b.reason}${b.start_time ? ` (${b.start_time.slice(0, 5)}–${b.end_time?.slice(0, 5) ?? "EOD"})` : " — full day"}`
              ).join(" · ")}
            </p>
          </div>
        )}

        {/* Doctor header strip */}
        {selectedDoctor && (
          <div className="bg-blue-950 px-4 py-2 flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {selectedDoctor.full_name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">{selectedDoctor.full_name}</p>
              <p className="text-[10px] text-blue-300 mt-0.5">{selectedDoctor.department_name}</p>
            </div>
            <p className="ml-auto text-xs text-blue-300">
              {format(parseISO(selectedDate), "EEEE, d MMMM yyyy")}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto">
          {!doctorId ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-500">Select a doctor to view their schedule</p>
                <p className="text-xs mt-1">Use the dropdown above to choose a doctor</p>
              </div>
            </div>
          ) : total === 0 && !appts.length ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm text-gray-500">No appointments for this day</p>
              </div>
            </div>
          ) : (
            <div>
              {TIME_SLOTS.map(slot => {
                const slotAppts = appts.filter(a => apptInSlot(a, slot));
                const blocked   = slotIsBlocked(blks, slot);
                const isHour    = slot.endsWith(":00");
                const isEmpty   = slotAppts.length === 0 && !blocked;

                if (isEmpty && !isHour) return null;

                return (
                  <div
                    key={slot}
                    className={cn(
                      "flex border-b min-h-[48px]",
                      blocked ? "bg-red-50" : isHour ? "bg-white" : "bg-gray-50/40",
                    )}
                  >
                    {/* Time label */}
                    <div className={cn(
                      "w-14 shrink-0 flex items-start justify-end pr-2 pt-2.5",
                      isHour ? "text-xs font-semibold text-gray-700" : "text-[10px] text-gray-400"
                    )}>
                      {slot}
                    </div>

                    {/* Vertical rule */}
                    <div className={cn("w-px shrink-0 mt-1", isHour ? "bg-gray-300" : "bg-gray-200")} />

                    {/* Appointment cards */}
                    <div className="flex-1 px-3 py-1.5 flex flex-wrap gap-2 items-start min-h-[48px]">
                      {blocked && slotAppts.length === 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-red-400 italic mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          Doctor unavailable
                        </div>
                      )}

                      {slotAppts.map((appt: any) => {
                        const isDone = appt.status === "COMPLETED";
                        const isCancelled = appt.status === "CANCELLED" || appt.status === "NO_SHOW";
                        return (
                          <div
                            key={appt.id}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border px-3 py-2 w-[300px]",
                              STATUS_COLOR[appt.status] || "bg-white border-gray-200",
                              isDone && "opacity-60",
                              isCancelled && "opacity-50",
                            )}
                          >
                            {/* Token circle */}
                            <div className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                              isDone ? "bg-green-500 text-white" :
                              isCancelled ? "bg-gray-400 text-white" :
                              appt.appointment_type === "EMERGENCY" ? "bg-red-600 text-white" :
                              "bg-blue-600 text-white"
                            )}>
                              {appt.token_number}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                                {appt.patient_name}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">
                                {appt.patient_uhid} · {TYPE_LABEL[appt.appointment_type] ?? appt.appointment_type}
                              </p>
                              {appt.chief_complaint && (
                                <p className="text-[10px] text-gray-500 truncate mt-0.5 italic">
                                  {appt.chief_complaint}
                                </p>
                              )}
                            </div>

                            {/* Status + action */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge className={cn("text-[10px] px-1.5 py-0 border", STATUS_COLOR[appt.status])}>
                                {STATUS_LABEL[appt.status] ?? appt.status}
                              </Badge>
                              {appt.status === "SCHEDULED" && (
                                <button
                                  onClick={() => checkinMut.mutate(appt.id)}
                                  disabled={checkinMut.isPending}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5 mt-0.5"
                                >
                                  <UserCheck className="w-3 h-3" /> Check In
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Waitlist panel */}
              {doctorId && (waitlist as any[]).length > 0 && (
                <div className="border-t-4 border-amber-200 bg-amber-50">
                  <div className="px-4 py-3 flex items-center gap-2 border-b border-amber-200">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-semibold text-amber-800">
                      Waitlist — {(waitlist as any[]).length} patient{(waitlist as any[]).length > 1 ? "s" : ""} waiting
                    </p>
                  </div>
                  <div className="divide-y divide-amber-100">
                    {(waitlist as any[]).map((w: any) => (
                      <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {w.position}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{w.patient_name}</p>
                          <p className="text-xs text-gray-500">{w.patient_uhid}</p>
                          {w.notes && <p className="text-xs text-amber-700 italic mt-0.5">{w.notes}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400">
                            Added {new Date(w.added_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {w.notified_at && (
                            <p className="text-[10px] text-green-600 mt-0.5">Notified</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
