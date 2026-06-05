"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { JourneyBanner } from "@/components/his/journey-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { useJourneyStore } from "@/store/journey";
import { fmtCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, ChevronRight, Ticket, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const APPT_TYPES = [
  { value: "WALK_IN", label: "Walk-in", desc: "Today, immediate queue" },
  { value: "SCHEDULED", label: "Scheduled", desc: "Future date & time" },
  { value: "FOLLOW_UP", label: "Follow-up", desc: "Return visit" },
  { value: "TELECONSULT", label: "Teleconsult", desc: "Video consultation" },
];

export default function JourneyAppointmentPage() {
  const router = useRouter();
  const { patient, setAppointment } = useJourneyStore();

  const [apptType, setApptType] = useState("WALK_IN");
  const [deptId, setDeptId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [apptDate, setApptDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [apptTime, setApptTime] = useState("09:00");
  const [complaint, setComplaint] = useState("");

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["departments"],
    queryFn: () => api.get("/api/masters/departments").then(r => r.data),
  });

  const { data: doctors = [] } = useQuery<any[]>({
    queryKey: ["doctors", deptId],
    queryFn: () => api.get(`/api/masters/doctors?department_id=${deptId}`).then(r => r.data),
    enabled: !!deptId,
  });

  const { data: slotInfo } = useQuery<any>({
    queryKey: ["slots", doctorId, apptDate],
    queryFn: () => api.get(`/api/appointments/available-slots?doctor_id=${doctorId}&date=${apptDate}`).then(r => r.data),
    enabled: !!doctorId && !!apptDate && apptType !== "WALK_IN",
  });

  const { data: feeEstimate } = useQuery<any>({
    queryKey: ["fee", patient?.id, doctorId],
    queryFn: () => api.get(`/api/appointments/fee-estimate?patient_id=${patient!.id}&doctor_id=${doctorId}`).then(r => r.data),
    enabled: !!patient && !!doctorId,
  });

  useEffect(() => { setDoctorId(""); }, [deptId]);

  // Book appointment then immediately check in (walk-in flow)
  const bookMut = useMutation({
    mutationFn: async (body: any) => {
      const appt = await api.post("/api/appointments", body).then(r => r.data);
      // Auto check-in for walk-in or today's appointments
      const effectiveDate = body.appointment_date;
      if (effectiveDate === todayStr) {
        const checkin = await api.post(`/api/appointments/${appt.id}/checkin`).then(r => r.data);
        return { appt, visitId: checkin.visit_id, visitNo: checkin.visit_no };
      }
      return { appt, visitId: null, visitNo: null };
    },
    onSuccess: ({ appt, visitId, visitNo }) => {
      const selectedDoc = doctors.find((d: any) => d.id === Number(doctorId));
      const selectedDept = departments.find((d: any) => d.id === Number(deptId));
      setAppointment(
        {
          id: appt.id,
          appointment_no: appt.appointment_no,
          token_number: appt.token_number,
          doctor_name: selectedDoc?.full_name || "",
          department_name: selectedDept?.name || "",
        },
        visitId,
        visitNo || "",
      );
      toast.success(`Token #${appt.token_number} assigned${visitNo ? ` · Visit ${visitNo}` : ""}`);
      router.push("/opd/journey/vitals");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Booking failed"),
  });

  function handleBook() {
    if (!patient) return toast.error("No patient selected — go back to Step 1");
    if (!deptId) return toast.error("Select department");
    if (!doctorId) return toast.error("Select doctor");

    const effectiveDate = apptType === "WALK_IN" ? todayStr : apptDate;
    const effectiveTime = apptType === "WALK_IN" ? format(new Date(), "HH:mm:ss") : `${apptTime}:00`;

    bookMut.mutate({
      patient_id: patient.id,
      doctor_id: Number(doctorId),
      department_id: Number(deptId),
      appointment_date: effectiveDate,
      appointment_time: effectiveTime,
      appointment_type: apptType,
      visit_type: feeEstimate?.visit_type === "FOLLOW_UP" ? "FOLLOW_UP" : "NEW",
      chief_complaint: complaint || undefined,
    });
  }

  if (!patient) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar title="OPD Journey — Book Appointment" />
          <JourneyBanner currentStep={2} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-gray-600">No patient selected</p>
              <Button className="mt-4" onClick={() => router.push("/opd/journey/register")}>
                <ArrowLeft className="w-4 h-4 mr-2" />Back to Register
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="OPD Journey — Book Appointment" />
        <JourneyBanner currentStep={2} />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xl space-y-5">

            {/* Appointment Type */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Appointment Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {APPT_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setApptType(t.value)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      apptType === t.value
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                    )}
                  >
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className={cn("text-xs mt-0.5", apptType === t.value ? "text-blue-100" : "text-gray-400")}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Dept + Doctor */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department *</Label>
                <Select value={deptId} onValueChange={v => setDeptId(v ?? "")}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Doctor *</Label>
                <Select value={doctorId} onValueChange={v => setDoctorId(v ?? "")} disabled={!deptId}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder={deptId ? "Select doctor" : "Dept first"} /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date + Time for non walk-in */}
            {apptType !== "WALK_IN" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date *</Label>
                  <Input type="date" className="mt-1.5" min={todayStr} value={apptDate} onChange={e => setApptDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time *</Label>
                  <Input type="time" className="mt-1.5" value={apptTime} onChange={e => setApptTime(e.target.value)} />
                </div>
              </div>
            )}

            {/* Slot availability */}
            {slotInfo && apptType !== "WALK_IN" && (
              <div className="rounded-xl border bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600">Slot Availability</p>
                  <Badge className={cn("text-xs", slotInfo.is_full ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                    {slotInfo.is_full ? "FULL" : `${slotInfo.available} slots`}
                  </Badge>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", slotInfo.is_full ? "bg-red-500" : "bg-green-500")}
                    style={{ width: `${Math.min(100, (slotInfo.booked / Math.max(slotInfo.max, 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{slotInfo.booked}/{slotInfo.max} booked</p>
              </div>
            )}

            {/* Chief complaint */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chief Complaint</Label>
              <Textarea
                className="mt-1.5 resize-none text-sm"
                rows={3}
                placeholder="Main reason for visit..."
                value={complaint}
                onChange={e => setComplaint(e.target.value)}
              />
            </div>

            {/* Fee estimate */}
            {feeEstimate && (
              <div className="rounded-xl border bg-blue-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Consultation Fee</p>
                    <p className="text-xl font-bold text-blue-900">{fmtCurrency(feeEstimate.fee)}</p>
                  </div>
                  {feeEstimate.visit_type === "FOLLOW_UP" && (
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-800 text-xs">Follow-up rate</Badge>
                      <p className="text-xs text-gray-400 mt-1 line-through">{fmtCurrency(feeEstimate.base_fee)}</p>
                    </div>
                  )}
                </div>
                {feeEstimate.last_visit_date && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last visit: {feeEstimate.last_visit_date} ({feeEstimate.days_since}d ago)
                  </p>
                )}
              </div>
            )}

            {apptType === "WALK_IN" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                Walk-in: token will be assigned immediately and patient auto-checked in for today.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/opd/journey/register")}>
                <ArrowLeft className="w-4 h-4 mr-1" />Back
              </Button>
              <Button onClick={handleBook} disabled={bookMut.isPending} className="flex-1">
                <Ticket className="w-4 h-4 mr-2" />
                {bookMut.isPending ? "Booking & Checking In..." : "Book & Check In"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
