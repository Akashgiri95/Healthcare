"use client";
import { useState, useEffect, useRef } from "react";
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
import { calcAge, fmtCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search, UserPlus, X, ChevronRight, Ticket,
  AlertTriangle, CalendarX, Users, Phone, Droplet, IndianRupee,
  CheckCircle2, Printer, Clock, Building2, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const APPT_TYPES = [
  { value: "WALK_IN",   label: "Walk-in",    desc: "Immediate, today" },
  { value: "SCHEDULED", label: "Scheduled",  desc: "Future date/time" },
  { value: "FOLLOW_UP", label: "Follow-up",  desc: "Return visit" },
  { value: "EMERGENCY", label: "Emergency",  desc: "Priority queue" },
];

export default function JourneyAppointmentPage() {
  const router = useRouter();
  const { setPatient, setAppointment } = useJourneyStore();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // ── Patient selection ────────────────────────────────────────────────────────
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showQuickReg, setShowQuickReg] = useState(false);
  const [qrForm, setQrForm] = useState({ first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // ── Success state ─────────────────────────────────────────────────────────────
  const [bookedResult, setBookedResult] = useState<{
    appt: any; visitNo: string; doctorName: string; deptName: string;
  } | null>(null);

  // ── Booking form ─────────────────────────────────────────────────────────────
  const [apptType, setApptType] = useState("WALK_IN");
  const [deptId, setDeptId]     = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [apptDate, setApptDate] = useState(todayStr);
  const [apptTime, setApptTime] = useState("09:00");
  const [complaint, setComplaint] = useState("");

  useEffect(() => { setDoctorId(""); }, [deptId]);
  useEffect(() => {
    if (apptType === "WALK_IN") setApptDate(todayStr);
  }, [apptType]);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: searchResults, isFetching } = useQuery<{ data: any[] }>({
    queryKey: ["patient-search", debouncedQ],
    queryFn: () => api.get(`/api/patients?q=${debouncedQ}&limit=10`).then(r => r.data),
    enabled: debouncedQ.length >= 2,
  });

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
    enabled: !!doctorId && !!apptDate,
  });

  const { data: blocks = [] } = useQuery<any[]>({
    queryKey: ["blocks", doctorId, apptDate],
    queryFn: () => api.get(`/api/appointments/blocks?doctor_id=${doctorId}&block_date=${apptDate}`).then(r => r.data),
    enabled: !!doctorId && !!apptDate,
  });

  const { data: dupCheck } = useQuery<any>({
    queryKey: ["dup", selectedPatient?.id, doctorId, apptDate],
    queryFn: () => api.get(`/api/appointments/duplicate-check?patient_id=${selectedPatient.id}&doctor_id=${doctorId}&check_date=${apptDate}`).then(r => r.data),
    enabled: !!(selectedPatient && doctorId && apptDate),
  });

  const { data: feeEstimate } = useQuery<any>({
    queryKey: ["fee", selectedPatient?.id, doctorId],
    queryFn: () => api.get(`/api/appointments/fee-estimate?patient_id=${selectedPatient.id}&doctor_id=${doctorId}`).then(r => r.data),
    enabled: !!(selectedPatient && doctorId),
  });

  // Auto-suggest visit type from fee estimate
  useEffect(() => {
    if (feeEstimate?.visit_type === "FOLLOW_UP") {
      setApptType("FOLLOW_UP");
    }
  }, [feeEstimate?.visit_type]);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const quickRegMut = useMutation({
    mutationFn: (body: typeof qrForm) => api.post("/api/patients/quick-register", body).then(r => r.data),
    onSuccess: (data) => {
      setSelectedPatient(data);
      setShowQuickReg(false);
      setQ("");
      setQrForm({ first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "" });
      toast.success(`UHID assigned: ${data.uhid}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed"),
  });

  const bookMut = useMutation({
    mutationFn: async (body: any) => {
      const appt = await api.post("/api/appointments", body).then(r => r.data);
      const checkin = await api.post(`/api/appointments/${appt.id}/checkin`).then(r => r.data);
      return { appt, visitId: checkin.visit_id, visitNo: checkin.visit_no };
    },
    onSuccess: ({ appt, visitId, visitNo }) => {
      const doc = doctors.find((d: any) => d.id === Number(doctorId));
      const dept = departments.find((d: any) => d.id === Number(deptId));
      setPatient({
        id: selectedPatient.id,
        uhid: selectedPatient.uhid,
        name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
        gender: selectedPatient.gender,
        dob: selectedPatient.date_of_birth,
        phone: selectedPatient.phone,
        blood_group: selectedPatient.blood_group,
      });
      setAppointment(
        {
          id: appt.id,
          appointment_no: appt.appointment_no,
          token_number: appt.token_number,
          doctor_name: doc?.full_name || "",
          department_name: dept?.name || doc?.department_name || "",
        },
        visitId,
        visitNo || "",
      );
      setBookedResult({
        appt,
        visitNo: visitNo || "",
        doctorName: doc?.full_name || "",
        deptName: dept?.name || doc?.department_name || "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Booking failed"),
  });

  function handleBook() {
    if (!selectedPatient) return toast.error("Select a patient first");
    if (!deptId) return toast.error("Select department");
    if (!doctorId) return toast.error("Select doctor");

    const effectiveDate = apptType === "WALK_IN" ? todayStr : apptDate;
    const effectiveTime = apptType === "WALK_IN"
      ? format(new Date(), "HH:mm:ss")
      : `${apptTime}:00`;

    bookMut.mutate({
      patient_id: selectedPatient.id,
      doctor_id: Number(doctorId),
      department_id: Number(deptId),
      appointment_date: effectiveDate,
      appointment_time: effectiveTime,
      appointment_type: apptType,
      visit_type: feeEstimate?.visit_type || "NEW",
      chief_complaint: complaint || undefined,
    });
  }

  const activeBlock = (blocks as any[]).find(b => b.is_active);
  const slotPct = slotInfo ? slotInfo.booked / Math.max(slotInfo.max, 1) : 0;

  // ── Success screen ────────────────────────────────────────────────────────────
  if (bookedResult) {
    const { appt, visitNo, doctorName, deptName } = bookedResult;
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar title="OPD Journey — Book Appointment" />
          <JourneyBanner currentStep={1} />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-4">

              {/* Token card */}
              <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-lg overflow-hidden">
                {/* Green header */}
                <div className="bg-green-500 px-6 py-4 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Appointment Confirmed</p>
                    <p className="text-green-100 text-xs font-mono">{appt.appointment_no}</p>
                  </div>
                </div>

                {/* Token number — big */}
                <div className="px-6 py-6 text-center border-b border-dashed border-blue-100">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Queue Token</p>
                  <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-blue-50 border-4 border-blue-200">
                    <div>
                      <p className="text-xs text-blue-400 font-medium">#</p>
                      <p className="text-5xl font-black text-blue-700 leading-none">{appt.token_number}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Show this number at the counter</p>
                </div>

                {/* Details */}
                <div className="px-6 py-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-500 w-20 shrink-0 text-xs">Patient</span>
                    <span className="font-medium text-gray-800">
                      {selectedPatient?.first_name} {selectedPatient?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-500 w-20 shrink-0 text-xs">Doctor</span>
                    <span className="font-medium text-gray-800">{doctorName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-500 w-20 shrink-0 text-xs">Department</span>
                    <span className="font-medium text-gray-800">{deptName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-500 w-20 shrink-0 text-xs">Time</span>
                    <span className="font-medium text-gray-800">
                      {appt.appointment_date} · {appt.appointment_time?.slice(0, 5)}
                    </span>
                  </div>
                  {visitNo && (
                    <div className="flex items-center gap-2 text-sm">
                      <Ticket className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-500 w-20 shrink-0 text-xs">Visit No.</span>
                      <span className="font-mono text-gray-800">{visitNo}</span>
                    </div>
                  )}
                </div>

                {/* SMS note */}
                <div className="px-6 py-3 bg-green-50 border-t border-green-100">
                  <p className="text-xs text-green-700">
                    SMS sent to {selectedPatient?.phone?.replace(/(\d{2})\d{6}(\d{2})/, "$1XXXXXX$2")}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 text-gray-500"
                  onClick={() => window.print()}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Token
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => router.push("/opd/journey/register")}
                >
                  Proceed to Registration
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
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
        <JourneyBanner currentStep={1} />

        <div className="flex-1 flex overflow-hidden">

          {/* ── LEFT: Patient search ─────────────────────────────────────────── */}
          <div className="w-72 bg-white border-r flex flex-col shrink-0">
            <div className="px-4 py-3 border-b">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Find Patient</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input placeholder="Name, phone, UHID…" value={q}
                  onChange={e => setQ(e.target.value)} className="pl-8 h-8 text-sm" />
                {q && (
                  <button onClick={() => { setQ(""); setDebouncedQ(""); }} className="absolute right-2 top-2">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isFetching && <p className="text-xs text-gray-400 px-4 py-3">Searching…</p>}
              {debouncedQ.length >= 2 && !isFetching && (searchResults?.data || []).length === 0 && (
                <p className="text-xs text-gray-400 px-4 py-4 text-center">No patients found</p>
              )}
              {(searchResults?.data || []).map((p: any) => (
                <button key={p.id} onClick={() => { setSelectedPatient(p); setQ(""); setDebouncedQ(""); setShowQuickReg(false); }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 border-b hover:bg-blue-50 transition-colors",
                    selectedPatient?.id === p.id && "bg-blue-50 border-l-2 border-l-blue-600"
                  )}>
                  <p className="text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-gray-500">{p.uhid} · {p.gender[0]}/{calcAge(p.date_of_birth)} · {p.phone}</p>
                </button>
              ))}
              {debouncedQ.length < 2 && !selectedPatient && !showQuickReg && (
                <div className="px-4 py-6 text-center text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Type 2+ characters to search</p>
                </div>
              )}
            </div>

            {/* Quick register */}
            <div className="border-t p-3 space-y-2">
              {showQuickReg ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-amber-700">Quick Register — UHID issued immediately</p>
                  <Input placeholder="First name *" className="h-7 text-xs" value={qrForm.first_name}
                    onChange={e => setQrForm(f => ({ ...f, first_name: e.target.value }))} />
                  <Input placeholder="Last name *" className="h-7 text-xs" value={qrForm.last_name}
                    onChange={e => setQrForm(f => ({ ...f, last_name: e.target.value }))} />
                  <Input placeholder="Phone *" className="h-7 text-xs" value={qrForm.phone}
                    onChange={e => setQrForm(f => ({ ...f, phone: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <Select value={qrForm.gender} onValueChange={v => setQrForm(f => ({ ...f, gender: v ?? "MALE" }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" className="h-7 text-xs" value={qrForm.date_of_birth}
                      max={todayStr} onChange={e => setQrForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="flex-1 h-7 text-xs bg-amber-600 hover:bg-amber-700"
                      disabled={!qrForm.first_name || !qrForm.last_name || !qrForm.phone || !qrForm.date_of_birth || quickRegMut.isPending}
                      onClick={() => quickRegMut.mutate(qrForm)}>
                      Register & Select
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowQuickReg(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full text-xs h-7"
                  onClick={() => { setShowQuickReg(true); setSelectedPatient(null); }}>
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Quick Register New Patient
                </Button>
              )}
            </div>
          </div>

          {/* ── RIGHT: Booking form ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selectedPatient ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400 max-w-xs">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-base font-medium text-gray-500 mb-1">Select a patient to begin</p>
                  <p className="text-sm">Search by name, phone, or UHID on the left. For walk-in patients without records, use Quick Register.</p>
                </div>
              </div>
            ) : (
              <div className="max-w-xl space-y-5">

                {/* Patient summary card */}
                <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                      {selectedPatient.is_vip && <Badge className="bg-yellow-100 text-yellow-800 text-xs">VIP</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="font-mono">{selectedPatient.uhid}</span>
                      <span>{calcAge(selectedPatient.date_of_birth)} · {selectedPatient.gender[0]}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedPatient.phone}</span>
                      {selectedPatient.blood_group && (
                        <span className="flex items-center gap-1"><Droplet className="w-3 h-3 text-red-400" />{selectedPatient.blood_group}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedPatient(null)} className="text-gray-400 hover:text-gray-600 ml-3">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Duplicate warning */}
                {dupCheck?.duplicate && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Patient already has an active appointment with this doctor on {apptDate}.</span>
                  </div>
                )}

                {/* Doctor block warning */}
                {activeBlock && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    <CalendarX className="w-4 h-4 flex-shrink-0" />
                    <span>Doctor is on <strong>{activeBlock.reason}</strong> on this date. {activeBlock.notes}</span>
                  </div>
                )}

                {/* Appointment type */}
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Appointment Type</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {APPT_TYPES.map(t => (
                      <button key={t.value} onClick={() => setApptType(t.value)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all",
                          apptType === t.value
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-gray-200 text-gray-700 hover:border-blue-300"
                        )}>
                        <p className="text-xs font-semibold">{t.label}</p>
                        <p className={cn("text-[10px] mt-0.5", apptType === t.value ? "text-blue-100" : "text-gray-400")}>{t.desc}</p>
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
                      <SelectContent>
                        {departments.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Doctor *</Label>
                    <Select value={doctorId} onValueChange={v => setDoctorId(v ?? "")} disabled={!deptId}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder={deptId ? "Select doctor" : "Select dept first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date + Time for non-walk-in */}
                {apptType !== "WALK_IN" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date *</Label>
                      <Input type="date" className="mt-1.5" min={todayStr} value={apptDate}
                        onChange={e => setApptDate(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time *</Label>
                      <Input type="time" className="mt-1.5" value={apptTime}
                        onChange={e => setApptTime(e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Slot availability */}
                {slotInfo && doctorId && (
                  <div className="rounded-xl border bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Users className="w-3.5 h-3.5" />
                        <span>Slot availability for {apptDate}</span>
                      </div>
                      <Badge className={cn("text-xs",
                        slotInfo.is_full ? "bg-red-100 text-red-700" :
                        slotPct >= 0.8 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>
                        {slotInfo.is_full ? "FULL" : `${slotInfo.available} slots free`}
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all",
                        slotInfo.is_full ? "bg-red-500" : slotPct >= 0.8 ? "bg-amber-500" : "bg-green-500")}
                        style={{ width: `${Math.min(100, slotPct * 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400">{slotInfo.booked}/{slotInfo.max} booked
                      {slotInfo.slots?.length > 0 && ` · ${slotInfo.slots.map((s: any) => `${s.start}–${s.end}`).join(", ")}`}
                    </p>
                  </div>
                )}

                {/* Chief complaint */}
                <div>
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chief Complaint</Label>
                  <Textarea className="mt-1.5 resize-none text-sm" rows={2}
                    placeholder="Main reason for visit…" value={complaint}
                    onChange={e => setComplaint(e.target.value)} />
                </div>

                {/* Fee estimate */}
                {feeEstimate && (
                  <div className="rounded-xl border bg-blue-50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-blue-700" />
                      <div>
                        <p className="text-xs text-gray-500">Consultation Fee</p>
                        <p className="text-lg font-bold text-blue-900">{fmtCurrency(feeEstimate.fee)}</p>
                      </div>
                    </div>
                    {feeEstimate.visit_type === "FOLLOW_UP" ? (
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800 text-xs">Follow-up rate</Badge>
                        <p className="text-xs text-gray-400 mt-1 line-through">{fmtCurrency(feeEstimate.base_fee)}</p>
                        {feeEstimate.days_since != null && (
                          <p className="text-xs text-gray-400">last visit {feeEstimate.days_since}d ago</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">New patient<br />Follow-up: {fmtCurrency(feeEstimate.followup_fee)}</p>
                    )}
                  </div>
                )}

                {/* Walk-in note */}
                {apptType === "WALK_IN" && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                    Token will be assigned immediately and patient auto-checked in.
                  </div>
                )}

                <Button onClick={handleBook} disabled={bookMut.isPending || slotInfo?.is_full}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base">
                  <Ticket className="w-4 h-4 mr-2" />
                  {slotInfo?.is_full ? "Slot Full — Cannot Book" :
                    bookMut.isPending ? "Booking & Checking In…" : "Book & Check In"}
                  {!slotInfo?.is_full && <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
