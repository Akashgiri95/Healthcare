"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { useJourneyStore } from "@/store/journey";
import { calcAge, fmtDate, fmtCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import {
  Search, UserPlus, X, ChevronLeft, ChevronRight, Ticket,
  AlertTriangle, CalendarX, Users, Phone, Printer,
  CheckCircle, CheckCircle2, Clock, Building2, User, ArrowRight,
  ShieldCheck, Briefcase, Star, Stethoscope, Timer,
  UserCheck, Calendar, RefreshCw, Zap, Video,
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
  {
    value: "TELECONSULT", label: "Teleconsult", desc: "Remote", icon: Video,
    active: "bg-violet-600 border-violet-600 text-white",
    inactive: "bg-white border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50/40",
    iconCls: "text-violet-500",
  },
];

const COMPLAINT_TAGS = [
  "Fever", "Cold & Cough", "Headache", "Chest Pain", "Stomach Pain",
  "Back Pain", "BP Check", "Sugar Check", "Diabetes Follow-up",
  "Joint Pain", "Skin Rash", "Weakness", "Dizziness",
];

const DEPT_PALETTE = [
  "bg-blue-100 text-blue-700",    "bg-rose-100 text-rose-700",
  "bg-orange-100 text-orange-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-teal-100 text-teal-700",
  "bg-pink-100 text-pink-700",    "bg-amber-100 text-amber-700",
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

// ── Types ─────────────────────────────────────────────────────────────────────

type Patient = {
  id: number; uhid: string; first_name: string; last_name: string;
  phone: string; date_of_birth: string; gender: string;
  blood_group?: string; is_vip?: boolean;
};

function AppointmentSlip({ appt, patient, doctor }: { appt: any; patient: Patient; doctor: any }) {
  return (
    <div className="p-8 border-2 rounded-xl bg-white text-sm" id="print-slip">
      <div className="text-center mb-5 pb-5 border-b">
        <h1 className="text-lg font-bold text-blue-900">HIS Portal</h1>
        <p className="text-gray-500 text-xs mt-0.5">Appointment Confirmation Slip</p>
      </div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Appointment No</p>
          <p className="font-mono font-bold text-gray-800">{appt.appointment_no}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 uppercase">Queue Token</p>
          <p className="text-4xl font-black text-blue-600">#{appt.token_number}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-t pt-4">
        {[
          ["Patient",    `${patient.first_name} ${patient.last_name}`],
          ["UHID",       patient.uhid],
          ["Age / Sex",  `${calcAge(patient.date_of_birth)} / ${patient.gender}`],
          ["Phone",      patient.phone],
          ["Doctor",     doctor.full_name],
          ["Department", doctor.department_name],
          ["Date",       fmtDate(appt.appointment_date)],
          ["Time",       appt.appointment_time?.slice(0, 5)],
          ["Type",       appt.appointment_type?.replace(/_/g, " ")],
          ["Visit Type", appt.visit_type?.replace(/_/g, " ")],
        ].map(([label, value]) => (
          <div key={label}>
            <span className="text-gray-400 text-[10px] uppercase block">{label}</span>
            <p className="font-medium text-gray-800">{value}</p>
          </div>
        ))}
      </div>
      {appt.chief_complaint && (
        <div className="mt-4 border-t pt-3">
          <span className="text-gray-400 text-[10px] uppercase block">Chief Complaint</span>
          <p className="text-gray-800">{appt.chief_complaint}</p>
        </div>
      )}
      <div className="mt-5 border-t pt-3 text-center text-xs text-gray-400">
        Please arrive 15 minutes early. Bring this slip and a valid ID.
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewAppointmentPage() {
  const router = useRouter();
  const { setPatient, setAppointment, reset } = useJourneyStore();
  const today = format(new Date(), "yyyy-MM-dd");

  // ── Patient ───────────────────────────────────────────────────────────────────
  const [q, setQ]                   = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showQuickReg, setShowQuickReg]       = useState(false);
  const [qrForm, setQrForm] = useState({ first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // ── Booking form ──────────────────────────────────────────────────────────────
  const [apptType, setApptType]         = useState("WALK_IN");
  const [deptId, setDeptId]             = useState("");
  const [doctorId, setDoctorId]         = useState("");
  const [apptDate, setApptDate]         = useState(today);
  const [apptTime, setApptTime]         = useState("");
  const [visitType, setVisitType]       = useState("NEW");
  const [chiefComplaint, setChiefComplaint] = useState("");

  useEffect(() => { setDoctorId(""); setApptTime(""); }, [deptId]);
  useEffect(() => { if (apptType === "WALK_IN") setApptDate(today); setApptTime(""); }, [apptType]);

  // ── Success state ─────────────────────────────────────────────────────────────
  const [bookedAppt, setBookedAppt]         = useState<any>(null);
  const [bookedDoctor, setBookedDoctor]     = useState<any>(null);
  const [bookedPatient, setBookedPatient]   = useState<Patient | null>(null);

  // ── Waitlist ──────────────────────────────────────────────────────────────────
  const [showWaitlist, setShowWaitlist]   = useState(false);
  const [waitlistNotes, setWaitlistNotes] = useState("");
  const [waitlistDone, setWaitlistDone]   = useState<{ position: number } | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────────
  const { data: searchResults, isFetching } = useQuery<{ data: Patient[] }>({
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
    queryFn: () => api.get(`/api/masters/doctors${deptId ? `?department_id=${deptId}` : ""}`).then(r => r.data),
  });

  const { data: slotAvail } = useQuery<any>({
    queryKey: ["slot-avail", doctorId, apptDate],
    queryFn: () => api.get(`/api/appointments/available-slots?doctor_id=${doctorId}&date=${apptDate}`).then(r => r.data),
    enabled: !!(doctorId && apptDate),
  });

  const { data: blocks = [] } = useQuery<any[]>({
    queryKey: ["doc-blocks", doctorId, apptDate],
    queryFn: () => api.get(`/api/appointments/blocks?doctor_id=${doctorId}&block_date=${apptDate}`).then(r => r.data),
    enabled: !!(doctorId && apptDate),
  });

  const { data: dupCheck } = useQuery<any>({
    queryKey: ["dup-check", selectedPatient?.id, doctorId, apptDate],
    queryFn: () => api.get(`/api/appointments/duplicate-check?patient_id=${selectedPatient!.id}&doctor_id=${doctorId}&check_date=${apptDate}`).then(r => r.data),
    enabled: !!(selectedPatient && doctorId && apptDate),
  });

  const { data: feeEstimate } = useQuery<any>({
    queryKey: ["fee-estimate", selectedPatient?.id, doctorId],
    queryFn: () => api.get(`/api/appointments/fee-estimate?patient_id=${selectedPatient!.id}&doctor_id=${doctorId}`).then(r => r.data),
    enabled: !!(selectedPatient && doctorId),
  });

  useEffect(() => {
    if (feeEstimate?.visit_type) {
      setVisitType(feeEstimate.visit_type);
      if (feeEstimate.visit_type === "FOLLOW_UP") setApptType("FOLLOW_UP");
    }
  }, [feeEstimate?.visit_type]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedDoc  = (doctors as any[]).find(d => d.id === Number(doctorId));
  const activeBlock  = (blocks as any[]).find(b => b.is_active);
  const slotPct      = slotAvail ? slotAvail.booked / Math.max(slotAvail.max, 1) : 0;
  const canBook      = !!(selectedPatient && doctorId && (apptType === "WALK_IN" || apptTime));
  const isSameDay    = bookedAppt?.appointment_date === today;

  const pd = patientDetail || selectedPatient;
  const insuranceInfo = pd?.ayushman_card_no
    ? { label: "Ayushman Bharat", cls: "bg-green-50 text-green-700 border-green-200" }
    : pd?.insurance_provider
    ? { label: pd.insurance_provider, cls: "bg-purple-50 text-purple-700 border-purple-200" }
    : pd?.company_id
    ? { label: "Corporate", cls: "bg-blue-50 text-blue-700 border-blue-200" }
    : { label: "Self-pay", cls: "bg-gray-50 text-gray-500 border-gray-200" };

  const estimatedWait = slotAvail && selectedDoc
    ? slotAvail.booked * (selectedDoc.avg_consultation_minutes || 10)
    : null;

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
    mutationFn: (body: any) => api.post("/api/appointments", body).then(r => r.data),
    onSuccess: (data) => {
      setBookedAppt(data);
      setBookedDoctor(selectedDoc ?? null);
      setBookedPatient(selectedPatient);
      toast.success("Appointment booked!");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Booking failed"),
  });

  const checkinMut = useMutation({
    mutationFn: (apptId: number) => api.post(`/api/appointments/${apptId}/checkin`).then(r => r.data),
    onSuccess: (res) => {
      reset();
      setPatient({
        id: bookedPatient!.id,           uhid: bookedPatient!.uhid,
        name: `${bookedPatient!.first_name} ${bookedPatient!.last_name}`,
        gender: bookedPatient!.gender,   dob: bookedPatient!.date_of_birth,
        phone: bookedPatient!.phone,     blood_group: bookedPatient!.blood_group,
      });
      setAppointment(
        {
          id: bookedAppt.id,
          appointment_no: bookedAppt.appointment_no,
          token_number: bookedAppt.token_number,
          doctor_name: bookedDoctor?.full_name ?? "",
          department_name: bookedDoctor?.department_name ?? "",
        },
        res.visit_id, res.visit_no,
      );
      toast.success("Checked in — going to vitals");
      router.push("/opd/journey/vitals");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Check-in failed"),
  });

  function handleBook() {
    if (!selectedPatient) return toast.error("Select a patient first");
    if (!doctorId)        return toast.error("Select a doctor");
    bookMut.mutate({
      patient_id:       selectedPatient.id,
      doctor_id:        Number(doctorId),
      department_id:    selectedDoc?.department_id,
      appointment_date: apptType === "WALK_IN" ? today : apptDate,
      appointment_time: apptType === "WALK_IN" ? format(new Date(), "HH:mm:ss") : `${apptTime}:00`,
      appointment_type: apptType,
      visit_type:       visitType,
      chief_complaint:  chiefComplaint || undefined,
    });
  }

  function handleJoinWaitlist() {
    if (!selectedPatient || !doctorId) return;
    waitlistMut.mutate({
      patient_id:     selectedPatient.id,
      doctor_id:      Number(doctorId),
      department_id:  selectedDoc?.department_id,
      preferred_date: apptType === "WALK_IN" ? today : apptDate,
      notes:          waitlistNotes || undefined,
    });
  }

  // ── Success screen ────────────────────────────────────────────────────────────
  if (bookedAppt && bookedPatient && bookedDoctor) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar title="Appointment Booked" />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-xl mx-auto space-y-4">

              <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm flex items-center gap-6 px-6 py-5">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 border-4 border-blue-200 shrink-0">
                  <div className="text-center">
                    <p className="text-[10px] text-blue-400 font-medium leading-none">#</p>
                    <p className="text-4xl font-black text-blue-700 leading-none">{bookedAppt.token_number}</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-semibold text-sm">Appointment confirmed</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-0.5">{bookedAppt.appointment_no}</p>
                  <p className="text-sm font-semibold text-gray-800">{bookedDoctor.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {fmtDate(bookedAppt.appointment_date)} · {bookedAppt.appointment_time?.slice(0, 5)}
                  </p>
                </div>
              </div>

              {isSameDay && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-blue-800">Patient is here today?</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Check in now and start the OPD journey — vitals → doctor → billing.
                    </p>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 shrink-0 gap-1.5"
                    disabled={checkinMut.isPending} onClick={() => checkinMut.mutate(bookedAppt.id)}>
                    {checkinMut.isPending ? "Checking in…" : "Check In & Start Journey"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <AppointmentSlip appt={bookedAppt} patient={bookedPatient} doctor={bookedDoctor} />

              <div className="flex gap-3 flex-wrap">
                <Button className="gap-1.5" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" /> Print Slip
                </Button>
                <Button variant="outline" onClick={() => router.push("/appointments")}>
                  Back to Appointments
                </Button>
                <Button variant="ghost" onClick={() => {
                  setBookedAppt(null); setBookedDoctor(null); setBookedPatient(null);
                  setSelectedPatient(null); setDoctorId(""); setDeptId("");
                  setChiefComplaint(""); setQ(""); setDebouncedQ("");
                  setApptTime(""); setWaitlistDone(null);
                }}>
                  Book Another
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Book Appointment" />

        <div className="flex-1 flex overflow-hidden">

          {/* ── LEFT: Patient panel ────────────────────────────────────────────── */}
          <div className="w-64 bg-white border-r flex flex-col shrink-0">
            <div className="px-4 py-2.5 border-b bg-gray-50 flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Patient</p>
              <Link href="/appointments" className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600">
                <ChevronLeft className="w-3 h-3" /> Back
              </Link>
            </div>

            {selectedPatient ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

                <button
                  onClick={() => { setSelectedPatient(null); setQ(""); setDebouncedQ(""); }}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
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
                  {(searchResults?.data || []).map((p) => (
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
                    <Input type="date" className="h-7 text-xs" max={today} value={qrForm.date_of_birth}
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
              <div className="grid grid-cols-5 gap-2">
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

            {/* 2 — Department filter + doctor cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Doctor</SectionLabel>
                <Select value={deptId || "ALL"} onValueChange={v => { setDeptId(v === "ALL" ? "" : (v ?? "")); setDoctorId(""); setApptTime(""); }}>
                  <SelectTrigger className="h-7 text-xs w-44 shrink-0">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All departments</SelectItem>
                    {(departments as any[]).map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {doctors.length === 0 ? (
                <p className="text-sm text-gray-400 py-3 text-center">No doctors available</p>
              ) : (
                <div className="space-y-2">
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
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-gray-400">{doc.department_name}</p>
                              {doc.experience_years && (
                                <p className="text-xs text-gray-400">· {doc.experience_years} yrs · {doc.avg_consultation_minutes} min/patient</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {isSelected && slotAvail && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-blue-100 overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all",
                                slotAvail.is_full ? "bg-red-500" : slotPct >= 0.8 ? "bg-amber-500" : "bg-green-500")}
                                style={{ width: `${Math.min(100, slotPct * 100)}%` }} />
                            </div>
                            <span className={cn("text-xs font-semibold shrink-0",
                              slotAvail.is_full ? "text-red-600" : slotPct >= 0.8 ? "text-amber-600" : "text-green-600")}>
                              {slotAvail.is_full ? "Full" : `${slotAvail.available} slots free`}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3 — Date (non-walk-in) */}
            {doctorId && apptType !== "WALK_IN" && (
              <div>
                <SectionLabel>Date</SectionLabel>
                <Input type="date" className="w-44" min={today} value={apptDate}
                  onChange={e => { setApptDate(e.target.value); setApptTime(""); }} />
              </div>
            )}

            {/* 4 — Time slot picker (non-walk-in) */}
            {doctorId && apptType !== "WALK_IN" && slotAvail && (
              <div>
                <SectionLabel>Time Slot</SectionLabel>
                <div className="bg-white rounded-xl border p-4 space-y-4">
                  {slotAvail.time_slots?.length > 0 ? (
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
                        const slots = (slotAvail.time_slots as any[]).filter(
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

            {/* 5 — Chief complaint */}
            {doctorId && (
              <div>
                <SectionLabel>Chief Complaint</SectionLabel>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {COMPLAINT_TAGS.map(tag => (
                    <button key={tag} onClick={() => setChiefComplaint(c => c === tag ? "" : tag)}
                      className={cn(
                        "px-2.5 py-1 rounded-full border text-xs font-medium transition-all",
                        chiefComplaint === tag
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700"
                      )}>
                      {tag}
                    </button>
                  ))}
                </div>
                <Textarea className="resize-none text-sm" rows={2}
                  placeholder="Or describe the complaint in detail…"
                  value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} />
              </div>
            )}
          </div>

          {/* ── RIGHT: Appointment summary panel ──────────────────────────────── */}
          <div className="w-72 shrink-0 bg-white border-l flex flex-col">
            <div className="px-4 py-2.5 border-b bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Appointment Summary</p>
            </div>

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
                  <p className="text-xs text-blue-400 pl-5">{selectedDoc.department_name}</p>
                </div>
              ) : (
                <StepPrompt n={2} label="Choose a doctor" active={summaryStep === 2} />
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

              {/* Type + visit type + complaint */}
              {doctorId && (apptType === "WALK_IN" || apptTime) && (
                <div className="flex items-center gap-2 flex-wrap pl-1">
                  <Badge className={cn("text-[10px]",
                    apptType === "EMERGENCY"   ? "bg-red-100 text-red-700" :
                    apptType === "FOLLOW_UP"   ? "bg-green-100 text-green-700" :
                    apptType === "TELECONSULT" ? "bg-violet-100 text-violet-700" :
                    apptType === "WALK_IN"     ? "bg-blue-100 text-blue-700" :
                    "bg-indigo-100 text-indigo-700")}>
                    {apptType.replace(/_/g, " ")}
                  </Badge>
                  {visitType === "FOLLOW_UP" && (
                    <Badge className="bg-green-100 text-green-700 text-[10px]">Follow-up rate</Badge>
                  )}
                  {chiefComplaint && (
                    <p className="w-full text-xs text-gray-400 italic truncate">"{chiefComplaint}"</p>
                  )}
                </div>
              )}

              {/* Estimated wait (walk-in) */}
              {apptType === "WALK_IN" && estimatedWait !== null && doctorId && (
                <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                  <Timer className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Estimated wait</p>
                    <p className="text-xs text-amber-600">~{estimatedWait} min · {slotAvail?.booked} ahead in queue</p>
                  </div>
                </div>
              )}

              {/* Fee breakdown */}
              {feeEstimate && (
                <>
                  <div className="border-t" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fee Estimate</p>
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
              {slotAvail?.is_full ? (
                <div className="space-y-2">
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium text-center">
                    Slot full — {slotAvail.booked}/{slotAvail.max} booked
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
                <Button onClick={handleBook} disabled={!canBook || bookMut.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-sm font-semibold">
                  <Ticket className="w-4 h-4 mr-2" />
                  {bookMut.isPending ? "Booking…" : "Confirm Appointment"}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
