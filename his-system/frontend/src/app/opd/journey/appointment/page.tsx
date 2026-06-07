"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { JourneyBanner } from "@/components/his/journey-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertTriangle, CalendarX, Users, Phone,
  CheckCircle2, Printer, Clock, Building2, User,
  ShieldCheck, Briefcase, Star, Stethoscope, Timer,
  UserCheck, Calendar, RefreshCw, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const APPT_TYPES = [
  {
    value: "WALK_IN", label: "Walk-in", desc: "Now", icon: UserCheck,
    active: "bg-blue-600 border-blue-600 text-white",
    inactive: "bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50/40",
    iconCls: "text-blue-500",
  },
  {
    value: "SCHEDULED", label: "Scheduled", desc: "Future", icon: Calendar,
    active: "bg-indigo-600 border-indigo-600 text-white",
    inactive: "bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/40",
    iconCls: "text-indigo-500",
  },
  {
    value: "FOLLOW_UP", label: "Follow-up", desc: "Return", icon: RefreshCw,
    active: "bg-green-600 border-green-600 text-white",
    inactive: "bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50/40",
    iconCls: "text-green-500",
  },
  {
    value: "EMERGENCY", label: "Emergency", desc: "Priority", icon: Zap,
    active: "bg-red-600 border-red-600 text-white",
    inactive: "bg-red-50 border-red-200 text-red-700 hover:border-red-400",
    iconCls: "text-red-500",
  },
];

const COMPLAINT_TAGS = [
  "Fever", "Cold & Cough", "Headache", "Chest Pain", "Stomach Pain",
  "Back Pain", "BP Check", "Sugar Check", "Diabetes Follow-up",
  "Joint Pain", "Skin Rash", "Weakness", "Dizziness",
];

const DEPT_PALETTE = [
  "bg-blue-100 text-blue-700",   "bg-rose-100 text-rose-700",
  "bg-orange-100 text-orange-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-teal-100 text-teal-700",
  "bg-pink-100 text-pink-700",   "bg-amber-100 text-amber-700",
];

function deptColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xff;
  return DEPT_PALETTE[h % DEPT_PALETTE.length];
}

const TIME_PERIODS = [
  { label: "Morning",   from: "06:00", to: "12:00" },
  { label: "Afternoon", from: "12:00", to: "17:00" },
  { label: "Evening",   from: "17:00", to: "22:00" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function StepPrompt({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 border",
      active ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-100"
    )}>
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
        active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"
      )}>{n}</div>
      <p className={cn("text-xs", active ? "text-blue-700 font-medium" : "text-gray-400")}>{label}</p>
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round(((step - 1) / 3) * 100);
  const labels = ["Patient", "Doctor", "Time", "Ready"];
  return (
    <div className="px-4 pt-3 pb-2 border-b space-y-1.5">
      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between">
        {labels.map((label, i) => (
          <span key={label} className={cn("text-[9px] font-semibold",
            i + 1 <= step ? "text-blue-600" : "text-gray-300")}>{label}</span>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JourneyAppointmentPage() {
  const router = useRouter();
  const { setPatient, setAppointment } = useJourneyStore();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [q, setQ]                   = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showQuickReg, setShowQuickReg]       = useState(false);
  const [qrForm, setQrForm] = useState({ first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  const [apptType, setApptType]   = useState("WALK_IN");
  const [deptId, setDeptId]       = useState("");
  const [doctorId, setDoctorId]   = useState("");
  const [apptDate, setApptDate]   = useState(todayStr);
  const [apptTime, setApptTime]   = useState("");
  const [complaint, setComplaint] = useState("");

  useEffect(() => { setDoctorId(""); setApptTime(""); }, [deptId]);
  useEffect(() => { if (apptType === "WALK_IN") setApptDate(todayStr); setApptTime(""); }, [apptType]);

  const [bookedResult, setBookedResult] = useState<{
    appt: any; visitNo: string; doctorName: string; deptName: string;
  } | null>(null);

  const [showWaitlist, setShowWaitlist]   = useState(false);
  const [waitlistNotes, setWaitlistNotes] = useState("");
  const [waitlistDone, setWaitlistDone]   = useState<{ position: number } | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────────
  const { data: searchResults, isFetching } = useQuery<{ data: any[] }>({
    queryKey: ["patient-search", debouncedQ],
    queryFn: () => api.get(`/api/patients?q=${debouncedQ}&limit=10`).then(r => r.data),
    enabled: debouncedQ.length >= 2,
  });

  const { data: patientDetail } = useQuery<any>({
    queryKey: ["patient-detail", selectedPatient?.id],
    queryFn: () => api.get(`/api/patients/${selectedPatient!.id}`).then(r => r.data),
    enabled: !!selectedPatient?.id,
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

  useEffect(() => {
    if (feeEstimate?.visit_type === "FOLLOW_UP") setApptType("FOLLOW_UP");
  }, [feeEstimate?.visit_type]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedDoc  = (doctors as any[]).find(d => d.id === Number(doctorId));
  const selectedDept = (departments as any[]).find(d => d.id === Number(deptId));
  const activeBlock  = (blocks as any[]).find(b => b.is_active);
  const slotPct      = slotInfo ? slotInfo.booked / Math.max(slotInfo.max, 1) : 0;
  const canBook      = !!(selectedPatient && deptId && doctorId && (apptType === "WALK_IN" || apptTime));

  const pd = patientDetail || selectedPatient;
  const insuranceInfo = pd?.ayushman_card_no
    ? { label: "Ayushman Bharat", cls: "bg-green-50 text-green-700 border-green-200" }
    : pd?.insurance_provider
    ? { label: pd.insurance_provider, cls: "bg-purple-50 text-purple-700 border-purple-200" }
    : pd?.company_id
    ? { label: "Corporate", cls: "bg-blue-50 text-blue-700 border-blue-200" }
    : { label: "Self-pay", cls: "bg-gray-50 text-gray-500 border-gray-200" };

  const estimatedWait = slotInfo && selectedDoc
    ? slotInfo.booked * (selectedDoc.avg_consultation_minutes || 10)
    : null;

  // right panel step
  const summaryStep = !selectedPatient ? 1 : !doctorId ? 2 : (apptType !== "WALK_IN" && !apptTime) ? 3 : 4;

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const waitlistMut = useMutation({
    mutationFn: (body: object) => api.post("/api/appointments/waitlist", body).then(r => r.data),
    onSuccess: (data) => {
      setWaitlistDone({ position: data.position });
      setShowWaitlist(false);
      toast.success(`Added to waitlist — position #${data.position}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Waitlist failed"),
  });

  const quickRegMut = useMutation({
    mutationFn: (body: typeof qrForm) => api.post("/api/patients/quick-register", body).then(r => r.data),
    onSuccess: (data) => {
      setSelectedPatient(data);
      setShowQuickReg(false);
      setQ(""); setDebouncedQ("");
      setQrForm({ first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "" });
      toast.success(`UHID assigned: ${data.uhid}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed"),
  });

  const bookMut = useMutation({
    mutationFn: async (body: any) => {
      const appt    = await api.post("/api/appointments", body).then(r => r.data);
      const checkin = await api.post(`/api/appointments/${appt.id}/checkin`).then(r => r.data);
      return { appt, visitId: checkin.visit_id, visitNo: checkin.visit_no };
    },
    onSuccess: ({ appt, visitId, visitNo }) => {
      setPatient({
        id: selectedPatient.id, uhid: selectedPatient.uhid,
        name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
        gender: selectedPatient.gender, dob: selectedPatient.date_of_birth,
        phone: selectedPatient.phone, blood_group: selectedPatient.blood_group,
      });
      setAppointment(
        {
          id: appt.id, appointment_no: appt.appointment_no, token_number: appt.token_number,
          doctor_name: selectedDoc?.full_name || "",
          department_name: selectedDept?.name || selectedDoc?.department_name || "",
        },
        visitId, visitNo || "",
      );
      setBookedResult({
        appt, visitNo: visitNo || "",
        doctorName: selectedDoc?.full_name || "",
        deptName: selectedDept?.name || selectedDoc?.department_name || "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Booking failed"),
  });

  function handleBook() {
    if (!selectedPatient) return toast.error("Select a patient first");
    if (!deptId)          return toast.error("Select department");
    if (!doctorId)        return toast.error("Select doctor");
    bookMut.mutate({
      patient_id:       selectedPatient.id,
      doctor_id:        Number(doctorId),
      department_id:    Number(deptId),
      appointment_date: apptType === "WALK_IN" ? todayStr : apptDate,
      appointment_time: apptType === "WALK_IN" ? format(new Date(), "HH:mm:ss") : `${apptTime}:00`,
      appointment_type: apptType,
      visit_type:       feeEstimate?.visit_type || "NEW",
      chief_complaint:  complaint || undefined,
    });
  }

  function handleJoinWaitlist() {
    if (!selectedPatient || !doctorId || !deptId) return;
    waitlistMut.mutate({
      patient_id:     selectedPatient.id,
      doctor_id:      Number(doctorId),
      department_id:  Number(deptId),
      preferred_date: apptType === "WALK_IN" ? todayStr : apptDate,
      notes:          waitlistNotes || undefined,
    });
  }

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
              <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-lg overflow-hidden">
                <div className="bg-green-500 px-6 py-4 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-white shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Appointment Confirmed</p>
                    <p className="text-green-100 text-xs font-mono">{appt.appointment_no}</p>
                  </div>
                </div>
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
                <div className="px-6 py-4 space-y-2.5">
                  {[
                    { icon: User,      label: "Patient",    value: `${selectedPatient?.first_name} ${selectedPatient?.last_name}` },
                    { icon: User,      label: "Doctor",     value: doctorName },
                    { icon: Building2, label: "Department", value: deptName },
                    { icon: Clock,     label: "Time",       value: `${appt.appointment_date} · ${appt.appointment_time?.slice(0, 5)}` },
                    { icon: Ticket,    label: "Visit No.",  value: visitNo },
                  ].filter(r => r.value).map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-2 text-sm">
                      <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-500 w-20 shrink-0 text-xs">{label}</span>
                      <span className={cn("font-medium text-gray-800", label === "Visit No." && "font-mono")}>{value}</span>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-3 bg-green-50 border-t border-green-100">
                  <p className="text-xs text-green-700">
                    SMS sent to {selectedPatient?.phone?.replace(/(\d{2})\d{6}(\d{2})/, "$1XXXXXX$2")}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-gray-500" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" /> Print Token
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => router.push("/opd/journey/register")}>
                  Proceed to Registration <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="OPD Journey — Book Appointment" />
        <JourneyBanner currentStep={1} />

        <div className="flex-1 flex overflow-hidden">

          {/* ── LEFT: Patient panel ────────────────────────────────────────────── */}
          <div className="w-64 bg-white border-r flex flex-col shrink-0">
            <div className="px-4 py-2.5 border-b bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Patient</p>
            </div>

            {selectedPatient ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Avatar + name */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-700 font-bold text-sm select-none">
                    {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 leading-tight">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </p>
                      {selectedPatient.is_vip && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400 shrink-0" />}
                    </div>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{selectedPatient.uhid}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                    <p className="text-[10px] text-gray-400 uppercase mb-0.5">Age / Sex</p>
                    <p className="font-bold text-gray-800">{calcAge(selectedPatient.date_of_birth)} / {selectedPatient.gender[0]}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                    <p className="text-[10px] text-gray-400 uppercase mb-0.5">Blood Group</p>
                    <p className={cn("font-bold", selectedPatient.blood_group ? "text-red-600" : "text-gray-400")}>
                      {selectedPatient.blood_group || "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  {selectedPatient.phone}
                </div>

                <div className={cn("flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs font-medium", insuranceInfo.cls)}>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{insuranceInfo.label}</span>
                </div>

                {feeEstimate?.last_visit_date && (
                  <div className="border border-blue-100 rounded-lg px-2.5 py-2 bg-blue-50">
                    <p className="text-[10px] text-blue-400 uppercase font-semibold">Last Visit</p>
                    <p className="text-xs font-bold text-blue-800 mt-0.5">{feeEstimate.days_since} days ago</p>
                    <p className="text-[10px] text-blue-500">{feeEstimate.last_visit_date}</p>
                  </div>
                )}

                {dupCheck?.duplicate && dupCheck.appointment && (
                  <div className="border border-amber-200 bg-amber-50 rounded-lg px-2.5 py-2">
                    <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Existing appointment
                    </div>
                    <p className="text-[10px] text-amber-600">
                      Token #{dupCheck.appointment.token_number} · {dupCheck.appointment.appointment_time?.slice(0, 5)} · {dupCheck.appointment.status}
                    </p>
                  </div>
                )}

                <button onClick={() => { setSelectedPatient(null); setQ(""); setDebouncedQ(""); }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                  ← Change patient
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="px-3 py-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <Input placeholder="Name, phone, UHID…" value={q}
                      onChange={e => setQ(e.target.value)} className="pl-8 h-8 text-sm" autoFocus />
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
                    <button key={p.id}
                      onClick={() => { setSelectedPatient(p); setQ(""); setDebouncedQ(""); setShowQuickReg(false); }}
                      className="w-full text-left px-4 py-2.5 border-b hover:bg-blue-50 transition-colors">
                      <p className="text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-gray-500">{p.uhid} · {p.gender[0]}/{calcAge(p.date_of_birth)} · {p.phone}</p>
                    </button>
                  ))}
                  {debouncedQ.length < 2 && !showQuickReg && (
                    <div className="px-4 py-8 text-center text-gray-400">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">Type 2+ characters</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick register */}
            <div className="border-t p-3">
              {showQuickReg ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-700">Quick Register</p>
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
                    <Input type="date" className="h-7 text-xs" max={todayStr} value={qrForm.date_of_birth}
                      onChange={e => setQrForm(f => ({ ...f, date_of_birth: e.target.value }))} />
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
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Quick Register
                </Button>
              )}
            </div>
          </div>

          {/* ── CENTER: Booking form ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Doctor block alert */}
            {activeBlock && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <CalendarX className="w-4 h-4 shrink-0" />
                Doctor is on <strong className="mx-1">{activeBlock.reason}</strong> on this date.
                {activeBlock.notes && <span className="text-red-500 ml-1">{activeBlock.notes}</span>}
              </div>
            )}

            {/* 1 — Appointment type */}
            <div>
              <SectionLabel>Appointment Type</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {APPT_TYPES.map(t => (
                  <button key={t.value} onClick={() => setApptType(t.value)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-left transition-all",
                      apptType === t.value ? t.active : t.inactive
                    )}>
                    <t.icon className={cn("w-4 h-4 mb-2", apptType === t.value ? "text-white/90" : t.iconCls)} />
                    <p className={cn("text-xs font-bold leading-tight", apptType !== t.value && "text-gray-800")}>{t.label}</p>
                    <p className={cn("text-[10px] mt-0.5", apptType === t.value ? "text-white/70" : "text-gray-400")}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2 — Department */}
            <div>
              <SectionLabel>Department</SectionLabel>
              <Select value={deptId} onValueChange={v => setDeptId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {(departments as any[]).map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3 — Doctor cards */}
            {deptId && (
              <div>
                <SectionLabel>Doctor</SectionLabel>
                {doctors.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No doctors available in this department</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                    {(doctors as any[]).map(doc => {
                      const isSelected = doctorId === String(doc.id);
                      const avatarCls  = deptColor(doc.department_name || "");
                      return (
                        <button key={doc.id}
                          onClick={() => { setDoctorId(String(doc.id)); setApptTime(""); }}
                          className={cn(
                            "w-full text-left p-3.5 rounded-xl border-2 transition-all relative",
                            isSelected
                              ? "border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-100"
                              : "border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm"
                          )}>
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          <div className="flex items-start gap-3 pr-6">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold select-none transition-all",
                              isSelected ? "bg-blue-600 text-white" : avatarCls
                            )}>
                              {doc.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 truncate">{doc.full_name}</p>
                                {doc.consultation_fee != null && (
                                  <span className={cn("text-sm font-bold shrink-0", isSelected ? "text-blue-700" : "text-gray-700")}>
                                    ₹{Number(doc.consultation_fee).toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">{doc.specialization}</p>
                              {doc.experience_years && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {doc.experience_years} yrs · {doc.avg_consultation_minutes} min/patient
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Slot bar */}
                          {isSelected && slotInfo && (
                            <div className="mt-3 flex items-center gap-2">
                              <div className="h-1.5 flex-1 rounded-full bg-blue-100 overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all",
                                  slotInfo.is_full ? "bg-red-500" : slotPct >= 0.8 ? "bg-amber-500" : "bg-green-500")}
                                  style={{ width: `${Math.min(100, slotPct * 100)}%` }} />
                              </div>
                              <span className={cn("text-xs font-semibold shrink-0",
                                slotInfo.is_full ? "text-red-600" : slotPct >= 0.8 ? "text-amber-600" : "text-green-600")}>
                                {slotInfo.is_full ? "Full" : `${slotInfo.available} slots free`}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4 — Date (non-walk-in) */}
            {doctorId && apptType !== "WALK_IN" && (
              <div>
                <SectionLabel>Date</SectionLabel>
                <Input type="date" className="w-44" min={todayStr} value={apptDate}
                  onChange={e => { setApptDate(e.target.value); setApptTime(""); }} />
              </div>
            )}

            {/* 5 — No schedule banner */}
            {doctorId && apptType !== "WALK_IN" && slotInfo && !slotInfo.has_schedule && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                <CalendarX className="w-4 h-4 shrink-0" />
                No schedule on {apptDate}. Try a different date.
              </div>
            )}

            {/* 5 — Time slot picker (non-walk-in) */}
            {doctorId && apptType !== "WALK_IN" && slotInfo && slotInfo.has_schedule && (
              <div>
                <SectionLabel>Time Slot</SectionLabel>
                <div className="bg-white rounded-xl border p-4 space-y-4">
                  {slotInfo.time_slots?.length > 0 ? (
                    <>
                      {/* Legend */}
                      <div className="flex items-center gap-4 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-white border border-gray-300 inline-block" />
                          Available
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-gray-100 border border-gray-200 inline-block" />
                          Booked
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block" />
                          Selected
                        </span>
                      </div>

                      {/* Period groups */}
                      {TIME_PERIODS.map(period => {
                        const slots = (slotInfo.time_slots as any[]).filter(
                          ts => ts.time >= period.from && ts.time < period.to
                        );
                        if (slots.length === 0) return null;
                        const free = slots.filter(ts => !ts.is_full).length;
                        return (
                          <div key={period.label}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{period.label}</span>
                              <div className="flex-1 h-px bg-gray-100" />
                              <span className={cn("text-[10px] font-medium",
                                free === 0 ? "text-red-400" : free <= 3 ? "text-amber-500" : "text-green-600")}>
                                {free === 0 ? "All booked" : `${free} free`}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {slots.map(ts => (
                                <button key={ts.time} disabled={ts.is_full} onClick={() => setApptTime(ts.time)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                                    apptTime === ts.time
                                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                      : ts.is_full
                                      ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
                                      : "bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                                  )}>
                                  {ts.time}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">No schedule configured — enter time manually</p>
                      <Input type="time" className="w-32" value={apptTime} onChange={e => setApptTime(e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6 — Chief complaint */}
            {doctorId && (
              <div>
                <SectionLabel>Chief Complaint</SectionLabel>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {COMPLAINT_TAGS.map(tag => (
                    <button key={tag} onClick={() => setComplaint(c => c === tag ? "" : tag)}
                      className={cn(
                        "px-2.5 py-1 rounded-full border text-xs font-medium transition-all",
                        complaint === tag
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700"
                      )}>
                      {tag}
                    </button>
                  ))}
                </div>
                <Textarea className="resize-none text-sm" rows={2}
                  placeholder="Or describe the complaint in detail…"
                  value={complaint} onChange={e => setComplaint(e.target.value)} />
              </div>
            )}
          </div>

          {/* ── RIGHT: Appointment summary panel ──────────────────────────────── */}
          <div className="w-72 shrink-0 bg-white border-l flex flex-col">
            <div className="px-4 py-2.5 border-b bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Appointment Summary</p>
            </div>

            <ProgressBar step={summaryStep} />

            <div className="flex-1 overflow-y-auto p-4 space-y-3">

              {/* Step 1: Patient */}
              {selectedPatient ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0 select-none">
                    {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{selectedPatient.uhid} · {calcAge(selectedPatient.date_of_birth)}/{selectedPatient.gender[0]}</p>
                  </div>
                </div>
              ) : (
                <StepPrompt n={1} label="Search and select a patient" active={summaryStep === 1} />
              )}

              {/* Step 2: Doctor */}
              {selectedDoc ? (
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <p className="text-sm font-semibold text-blue-900 truncate">{selectedDoc.full_name}</p>
                  </div>
                  <p className="text-xs text-blue-600 pl-5">{selectedDoc.specialization}</p>
                  {selectedDept && <p className="text-xs text-blue-400 pl-5">{selectedDept.name}</p>}
                </div>
              ) : (
                <StepPrompt n={2} label="Choose a department & doctor" active={summaryStep === 2} />
              )}

              {/* Step 3: Time (non-walk-in only) */}
              {apptType !== "WALK_IN" && (
                apptTime && doctorId ? (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-700">{apptDate} · {apptTime}</span>
                  </div>
                ) : (
                  <StepPrompt n={3} label="Pick a time slot" active={summaryStep === 3} />
                )
              )}

              {/* Walk-in time indicator */}
              {apptType === "WALK_IN" && doctorId && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-700">Today · Now</span>
                  <Badge className="bg-blue-100 text-blue-700 text-[10px] ml-auto">Walk-in</Badge>
                </div>
              )}

              {/* Type + complaint */}
              {doctorId && (apptType === "WALK_IN" || apptTime) && (
                <div className="flex items-center gap-2 flex-wrap pl-5">
                  <Badge className={cn("text-[10px]",
                    apptType === "EMERGENCY" ? "bg-red-100 text-red-700" :
                    apptType === "FOLLOW_UP" ? "bg-green-100 text-green-700" :
                    apptType === "WALK_IN"   ? "bg-blue-100 text-blue-700" :
                    "bg-indigo-100 text-indigo-700")}>
                    {apptType.replace("_", " ")}
                  </Badge>
                  {feeEstimate?.visit_type === "FOLLOW_UP" && (
                    <Badge className="bg-green-100 text-green-700 text-[10px]">Follow-up rate</Badge>
                  )}
                  {complaint && (
                    <p className="w-full text-xs text-gray-400 italic truncate">"{complaint}"</p>
                  )}
                </div>
              )}

              {/* Estimated wait (walk-in only) */}
              {apptType === "WALK_IN" && estimatedWait !== null && doctorId && (
                <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                  <Timer className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Estimated wait</p>
                    <p className="text-xs text-amber-600">~{estimatedWait} min · {slotInfo?.booked} ahead</p>
                  </div>
                </div>
              )}

              {/* Fee breakdown */}
              {feeEstimate && (
                <>
                  <div className="border-t" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fee</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Consultation</span>
                        <span className="font-medium text-gray-700">
                          {fmtCurrency(feeEstimate.base_fee ?? feeEstimate.fee)}
                        </span>
                      </div>
                      {feeEstimate.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Follow-up discount</span>
                          <span>−{fmtCurrency(feeEstimate.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-1.5 mt-1">
                        <span className="font-semibold text-gray-700">Net payable</span>
                        <span className="font-bold text-blue-700 text-base">{fmtCurrency(feeEstimate.fee)}</span>
                      </div>
                    </div>
                    {pd?.ayushman_card_no && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 mt-1">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        Ayushman Bharat coverage applicable
                      </div>
                    )}
                    {pd?.company_id && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
                        <Briefcase className="w-3.5 h-3.5 shrink-0" />
                        Corporate billing applicable
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Book / waitlist button */}
            <div className="p-4 border-t space-y-2.5">
              {apptType === "WALK_IN" && canBook && !slotInfo?.is_full && (
                <p className="text-[11px] text-blue-500 text-center leading-tight">
                  Token assigned immediately · patient auto-checked in
                </p>
              )}

              {slotInfo?.is_full ? (
                <div className="space-y-2">
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium text-center">
                    Slot full — {slotInfo.booked}/{slotInfo.max} booked
                  </div>
                  {waitlistDone ? (
                    <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-center">
                      <p className="text-xs font-semibold text-green-800">Waitlist #{waitlistDone.position}</p>
                      <p className="text-[10px] text-green-600">Will be notified when a slot opens</p>
                    </div>
                  ) : showWaitlist ? (
                    <div className="space-y-2">
                      <Textarea className="text-xs resize-none h-14" placeholder="Notes (optional)…"
                        value={waitlistNotes} onChange={e => setWaitlistNotes(e.target.value)} />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => setShowWaitlist(false)}>Cancel</Button>
                        <Button size="sm" className="flex-1 text-xs h-8 bg-amber-600 hover:bg-amber-700"
                          disabled={!canBook || waitlistMut.isPending} onClick={handleJoinWaitlist}>
                          {waitlistMut.isPending ? "Adding…" : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                      disabled={!canBook} onClick={() => setShowWaitlist(true)}>
                      <Users className="w-4 h-4 mr-2" /> Add to Waitlist
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <Button onClick={handleBook} disabled={!canBook || bookMut.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-sm font-semibold">
                    <Ticket className="w-4 h-4 mr-2" />
                    {bookMut.isPending ? "Booking…" : apptType === "WALK_IN" ? "Book & Check In" : "Confirm Appointment"}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                  {!canBook && (
                    <p className="text-[11px] text-center text-gray-400">
                      {!selectedPatient ? "Select a patient to continue" :
                       !deptId ? "Choose a department to continue" :
                       !doctorId ? "Choose a doctor to continue" :
                       "Pick a time slot to continue"}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
