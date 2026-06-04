"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { calcAge, fmtDate, fmtCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search, UserPlus, CalendarDays, Clock, CheckCircle2, XCircle,
  AlertTriangle, Building2, Globe, Phone, Droplet, History,
  ChevronRight, RefreshCw, Users, Ticket, ArrowRightLeft, Bell,
  X, CalendarClock, ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  id: number; uhid: string; first_name: string; last_name: string;
  date_of_birth: string; gender: string; blood_group?: string; phone: string;
  company_id?: number; language_preference?: string; interpreter_required?: boolean;
  ayushman_card_no?: string; is_vip?: boolean; allergies?: { allergen: string; severity: string }[];
}
interface Doctor { id: number; full_name: string; specialization: string; consultation_fee?: number; department_id: number; }
interface Department { id: number; name: string; code: string; consultation_fee: number; follow_up_fee?: number; }
interface Appointment {
  id: number; appointment_no: string; patient_id: number; doctor_id: number; department_id: number;
  appointment_date: string; appointment_time: string; appointment_type: string; status: string;
  visit_type: string; token_number?: number; chief_complaint?: string; checked_in_at?: string;
  delay_minutes?: number; patient_name?: string; patient_uhid?: string; doctor_name?: string; department_name?: string;
}
interface SlotInfo { date: string; slots: { start: string; end: string; max: number }[]; booked: number; available: number; max: number; is_full: boolean; has_schedule: boolean; }
interface FeeEstimate { fee: number; visit_type: string; discount: number; last_visit_date?: string; days_since?: number; followup_fee: number; base_fee: number; }
interface EarliestSlot { doctor_id: number; doctor_name: string; specialization: string; date: string; available: number; booked: number; max: number; }

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-slate-100 text-slate-700",
  CHECKED_IN: "bg-blue-100 text-blue-700",
  IN_QUEUE: "bg-amber-100 text-amber-700",
  WITH_DOCTOR: "bg-violet-100 text-violet-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-gray-100 text-gray-500",
};

const APPT_TYPES = [
  { value: "WALK_IN", label: "Walk-in", icon: "🚶" },
  { value: "SCHEDULED", label: "Scheduled", icon: "📅" },
  { value: "FOLLOW_UP", label: "Follow-up", icon: "🔁" },
  { value: "TELECONSULT", label: "Teleconsult", icon: "📹" },
];

const INDIAN_STATES = ["Gujarat", "Maharashtra", "Rajasthan", "Delhi", "Karnataka", "Tamil Nadu", "Uttar Pradesh", "West Bengal", "Telangana", "Kerala", "Madhya Pradesh", "Punjab", "Haryana", "Bihar", "Odisha"];
const LANGUAGES = ["Hindi", "Gujarati", "Marathi", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Punjabi", "English", "Other"];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReceptionPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"book" | "schedule" | "waitlist">("book");
  const [searchQ, setSearchQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [delayTarget, setDelayTarget] = useState<{ appt_id: number; doctor_name: string } | null>(null);

  // Booking form state
  const [apptType, setApptType] = useState("SCHEDULED");
  const [deptId, setDeptId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [apptDate, setApptDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [apptTime, setApptTime] = useState("09:00");
  const [complaint, setComplaint] = useState("");
  const [showEarliest, setShowEarliest] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState("30");

  // New patient form
  const [newPat, setNewPat] = useState({
    first_name: "", last_name: "", date_of_birth: "", gender: "MALE", phone: "",
    address_line1: "", city: "", district: "", state: "Gujarat", pincode: "",
    blood_group: "", language_preference: "Hindi", interpreter_required: false,
  });

  // Reschedule form
  const [reschedDate, setReschedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reschedTime, setReschedTime] = useState("09:00");

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(searchQ), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQ]);

  // Reset doctor when dept changes
  useEffect(() => { setDoctorId(""); setShowEarliest(false); }, [deptId]);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: () => api.get("/api/masters/departments").then(r => r.data),
  });

  const { data: doctors = [] } = useQuery<Doctor[]>({
    queryKey: ["doctors", deptId],
    queryFn: () => api.get(`/api/masters/doctors${deptId ? `?department_id=${deptId}` : ""}`).then(r => r.data),
    enabled: !!deptId,
  });

  const { data: searchResults, isFetching: searching } = useQuery<{ data: Patient[] }>({
    queryKey: ["patient-search", debouncedQ],
    queryFn: () => api.get(`/api/patients?q=${debouncedQ}&limit=10`).then(r => r.data),
    enabled: debouncedQ.length >= 2,
  });

  const { data: slotInfo } = useQuery<SlotInfo>({
    queryKey: ["slots", doctorId, apptDate],
    queryFn: () => api.get(`/api/appointments/available-slots?doctor_id=${doctorId}&date=${apptDate}`).then(r => r.data),
    enabled: !!doctorId && !!apptDate && apptType !== "WALK_IN",
  });

  const { data: feeEstimate } = useQuery<FeeEstimate>({
    queryKey: ["fee", selectedPatient?.id, doctorId],
    queryFn: () => api.get(`/api/appointments/fee-estimate?patient_id=${selectedPatient!.id}&doctor_id=${doctorId}`).then(r => r.data),
    enabled: !!selectedPatient && !!doctorId,
  });

  const { data: earliestSlots = [], isFetching: searchingEarliest } = useQuery<EarliestSlot[]>({
    queryKey: ["earliest", deptId],
    queryFn: () => api.get(`/api/appointments/earliest-available?department_id=${deptId}&days_ahead=14`).then(r => r.data),
    enabled: showEarliest && !!deptId,
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { data: todayAppts = [], refetch: refetchToday } = useQuery<Appointment[]>({
    queryKey: ["appts-today"],
    queryFn: () => api.get(`/api/appointments?appointment_date=${todayStr}`).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: waitlistEntries = [] } = useQuery<any[]>({
    queryKey: ["waitlist"],
    queryFn: () => api.get("/api/appointments/waitlist").then(r => r.data),
    enabled: tab === "waitlist",
  });

  const selectedDoctor = doctors.find(d => d.id === Number(doctorId));
  const selectedDept = departments.find(d => d.id === Number(deptId));

  // ─── Mutations ────────────────────────────────────────────────────────────

  const bookMut = useMutation({
    mutationFn: (body: object) => api.post("/api/appointments", body).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Booked — Token #${data.token_number}`);
      setComplaint(""); setDoctorId(""); setDeptId("");
      qc.invalidateQueries({ queryKey: ["appts-today"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Booking failed"),
  });

  const checkinMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/appointments/${id}/checkin`).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Checked in — Visit ${data.visit_no}`);
      qc.invalidateQueries({ queryKey: ["appts-today"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Check-in failed"),
  });

  const noShowMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/appointments/${id}/no-show`).then(r => r.data),
    onSuccess: (data) => {
      toast.success(data.waitlist_notified ? "No-show marked. Waitlist patient notified." : "Marked as no-show");
      qc.invalidateQueries({ queryKey: ["appts-today"] });
    },
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => api.patch(`/api/appointments/${id}/status`, { status: "CANCELLED", cancelled_reason: "Cancelled at reception" }).then(r => r.data),
    onSuccess: () => { toast.success("Appointment cancelled"); qc.invalidateQueries({ queryKey: ["appts-today"] }); },
  });

  const rescheduleMut = useMutation({
    mutationFn: ({ id, ...body }: { id: number; new_date: string; new_time: string }) =>
      api.post(`/api/appointments/${id}/reschedule`, body).then(r => r.data),
    onSuccess: () => {
      toast.success("Rescheduled");
      setRescheduleTarget(null);
      qc.invalidateQueries({ queryKey: ["appts-today"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Reschedule failed"),
  });

  const delayMut = useMutation({
    mutationFn: ({ id, delay_minutes }: { id: number; delay_minutes: number }) =>
      api.post(`/api/appointments/${id}/notify-delay`, { delay_minutes }).then(r => r.data),
    onSuccess: (data) => {
      toast.success(data.message);
      setDelayTarget(null);
      qc.invalidateQueries({ queryKey: ["appts-today"] });
    },
  });

  const waitlistMut = useMutation({
    mutationFn: (body: object) => api.post("/api/appointments/waitlist", body).then(r => r.data),
    onSuccess: () => { toast.success("Added to waitlist"); qc.invalidateQueries({ queryKey: ["waitlist"] }); },
  });

  const registerMut = useMutation({
    mutationFn: (body: object) => api.post("/api/patients", body).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Registered — ${data.uhid}`);
      setSelectedPatient(data);
      setShowNewPatient(false);
      setNewPat({ first_name: "", last_name: "", date_of_birth: "", gender: "MALE", phone: "", address_line1: "", city: "", district: "", state: "Gujarat", pincode: "", blood_group: "", language_preference: "Hindi", interpreter_required: false });
      qc.invalidateQueries({ queryKey: ["patient-search"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed"),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleBook() {
    if (!selectedPatient) return toast.error("Select a patient first");
    if (!deptId) return toast.error("Select department");
    if (!doctorId) return toast.error("Select doctor");
    if (apptType !== "WALK_IN" && !apptDate) return toast.error("Select date");

    const effectiveDate = apptType === "WALK_IN" ? todayStr : apptDate;
    const effectiveTime = apptType === "WALK_IN" ? format(new Date(), "HH:mm") : apptTime;
    const effectiveVisitType = (apptType === "FOLLOW_UP" || feeEstimate?.visit_type === "FOLLOW_UP") ? "FOLLOW_UP" : "NEW";

    bookMut.mutate({
      patient_id: selectedPatient.id,
      doctor_id: Number(doctorId),
      department_id: Number(deptId),
      appointment_date: effectiveDate,
      appointment_time: `${effectiveTime}:00`,
      appointment_type: apptType,
      visit_type: effectiveVisitType,
      chief_complaint: complaint || undefined,
      priority: selectedPatient.is_vip ? 1 : 0,
    });
  }

  function handleWaitlist() {
    if (!selectedPatient || !deptId || !doctorId) return toast.error("Select patient, department, and doctor");
    waitlistMut.mutate({
      patient_id: selectedPatient.id,
      doctor_id: Number(doctorId),
      department_id: Number(deptId),
      preferred_date: apptDate,
    });
  }

  function handleRegister() {
    if (!newPat.first_name || !newPat.last_name || !newPat.date_of_birth || !newPat.phone || !newPat.address_line1 || !newPat.city || !newPat.pincode) {
      return toast.error("Fill all required fields");
    }
    const payload: any = { ...newPat };
    if (!payload.blood_group) delete payload.blood_group;
    registerMut.mutate(payload);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  const stats = {
    total: todayAppts.length,
    checkedIn: todayAppts.filter(a => a.status === "CHECKED_IN").length,
    inQueue: todayAppts.filter(a => ["IN_QUEUE", "WITH_DOCTOR"].includes(a.status)).length,
    completed: todayAppts.filter(a => a.status === "COMPLETED").length,
    noShow: todayAppts.filter(a => a.status === "NO_SHOW").length,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Reception Desk" />
        <div className="flex-1 flex overflow-hidden">

          {/* ── LEFT: Patient Search Panel ─────────────────────────────────── */}
          <div className="w-72 bg-white border-r flex flex-col shrink-0">
            <div className="px-4 py-3 border-b bg-blue-950 text-white">
              <p className="font-semibold text-sm">Patient Search</p>
              <p className="text-blue-300 text-xs">Search or register new</p>
            </div>

            {/* Search bar */}
            <div className="px-3 py-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Name, phone, UHID..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
                {searchQ && (
                  <button onClick={() => { setSearchQ(""); setDebouncedQ(""); }} className="absolute right-2 top-2">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-xs h-7"
                onClick={() => { setShowNewPatient(!showNewPatient); setSearchQ(""); setSelectedPatient(null); }}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                {showNewPatient ? "Cancel Registration" : "Register New Patient"}
              </Button>
            </div>

            {/* New Patient Form */}
            {showNewPatient && (
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-blue-50/30">
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">New Patient</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">First Name *</Label>
                    <Input className="h-7 text-xs" value={newPat.first_name} onChange={e => setNewPat(p => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Last Name *</Label>
                    <Input className="h-7 text-xs" value={newPat.last_name} onChange={e => setNewPat(p => ({ ...p, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Date of Birth *</Label>
                    <Input type="date" className="h-7 text-xs" value={newPat.date_of_birth} onChange={e => setNewPat(p => ({ ...p, date_of_birth: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Gender *</Label>
                    <Select value={newPat.gender} onValueChange={v => setNewPat(p => ({ ...p, gender: v ?? "MALE" }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Phone *</Label>
                  <Input className="h-7 text-xs" placeholder="10-digit mobile" value={newPat.phone} onChange={e => setNewPat(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Address *</Label>
                  <Input className="h-7 text-xs" value={newPat.address_line1} onChange={e => setNewPat(p => ({ ...p, address_line1: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">City *</Label>
                    <Input className="h-7 text-xs" value={newPat.city} onChange={e => setNewPat(p => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">District</Label>
                    <Input className="h-7 text-xs" value={newPat.district} onChange={e => setNewPat(p => ({ ...p, district: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">State *</Label>
                    <Select value={newPat.state} onValueChange={v => setNewPat(p => ({ ...p, state: v ?? "Gujarat" }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Pincode *</Label>
                    <Input className="h-7 text-xs" maxLength={6} value={newPat.pincode} onChange={e => setNewPat(p => ({ ...p, pincode: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Blood Group</Label>
                    <Select value={newPat.blood_group} onValueChange={v => setNewPat(p => ({ ...p, blood_group: v ?? "" }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>{["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Language</Label>
                    <Select value={newPat.language_preference} onValueChange={v => setNewPat(p => ({ ...p, language_preference: v ?? "Hindi" }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={newPat.interpreter_required} onChange={e => setNewPat(p => ({ ...p, interpreter_required: e.target.checked }))} />
                  Interpreter required
                </label>
                <Button size="sm" className="w-full h-7 text-xs" onClick={handleRegister} disabled={registerMut.isPending}>
                  {registerMut.isPending ? "Registering..." : "Register Patient"}
                </Button>
              </div>
            )}

            {/* Search Results */}
            {!showNewPatient && debouncedQ.length >= 2 && (
              <div className="flex-1 overflow-y-auto">
                {searching && <p className="text-xs text-gray-400 px-3 py-2">Searching...</p>}
                {(searchResults?.data || []).length === 0 && !searching && (
                  <p className="text-xs text-gray-400 px-3 py-4 text-center">No patients found</p>
                )}
                {(searchResults?.data || []).map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatient(p); setSearchQ(""); setDebouncedQ(""); }}
                    className={cn(
                      "w-full text-left px-3 py-2 border-b hover:bg-blue-50 transition-colors",
                      selectedPatient?.id === p.id && "bg-blue-50 border-l-2 border-l-blue-600"
                    )}
                  >
                    <p className="text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-gray-500">{p.uhid} · {p.gender[0]}/{calcAge(p.date_of_birth)}y · {p.phone}</p>
                    {p.company_id && <Badge className="text-[10px] px-1 py-0 mt-0.5 bg-amber-100 text-amber-800">Corporate</Badge>}
                    {p.interpreter_required && <Badge className="text-[10px] px-1 py-0 mt-0.5 ml-1 bg-purple-100 text-purple-700">Interpreter</Badge>}
                  </button>
                ))}
              </div>
            )}

            {/* Selected Patient Card */}
            {selectedPatient && !showNewPatient && debouncedQ.length < 2 && (
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 bg-blue-50 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-blue-900">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                      <p className="text-xs text-blue-700 font-mono">{selectedPatient.uhid}</p>
                    </div>
                    <button onClick={() => setSelectedPatient(null)} className="text-blue-400 hover:text-blue-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600">
                    <span>{selectedPatient.gender === "MALE" ? "M" : selectedPatient.gender === "FEMALE" ? "F" : "O"} / {calcAge(selectedPatient.date_of_birth)} yrs</span>
                    {selectedPatient.blood_group && (
                      <span className="flex items-center gap-1"><Droplet className="w-3 h-3 text-red-400" />{selectedPatient.blood_group}</span>
                    )}
                    <span className="flex items-center gap-1 col-span-2"><Phone className="w-3 h-3" />{selectedPatient.phone}</span>
                    {selectedPatient.language_preference && selectedPatient.language_preference !== "Hindi" && (
                      <span className="flex items-center gap-1 col-span-2">
                        <Globe className="w-3 h-3 text-purple-500" />
                        {selectedPatient.language_preference}
                        {selectedPatient.interpreter_required && <span className="text-purple-600 font-semibold ml-1">(Interpreter needed)</span>}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedPatient.is_vip && <Badge className="text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-800">VIP</Badge>}
                    {selectedPatient.company_id && <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800"><Building2 className="w-2.5 h-2.5 mr-0.5 inline" />Corporate</Badge>}
                    {selectedPatient.ayushman_card_no && <Badge className="text-[10px] px-1.5 py-0 bg-green-100 text-green-800">Ayushman</Badge>}
                    {selectedPatient.interpreter_required && <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-700">Interpreter</Badge>}
                  </div>
                </div>

                {/* Fee estimate preview (when doctor selected) */}
                {feeEstimate && (
                  <div className="p-3 border-b bg-white">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Fee Estimate</p>
                    <p className="text-lg font-bold text-blue-900">{fmtCurrency(feeEstimate.fee)}</p>
                    {feeEstimate.visit_type === "FOLLOW_UP" && (
                      <div className="text-xs text-green-700 mt-0.5">
                        Follow-up rate (last visit: {feeEstimate.days_since}d ago)
                        {feeEstimate.discount > 0 && <span className="ml-1 text-gray-400 line-through">{fmtCurrency(feeEstimate.base_fee)}</span>}
                      </div>
                    )}
                    {selectedPatient.company_id && (
                      <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />Corporate billing — patient payable: ₹0
                      </p>
                    )}
                  </div>
                )}

                <div className="p-3 text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700 uppercase text-[10px] tracking-wide">Patient selected — use Booking panel →</p>
                  <p>Select department and doctor to book appointment.</p>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!selectedPatient && !showNewPatient && debouncedQ.length < 2 && (
              <div className="flex-1 flex items-center justify-center text-center px-4">
                <div className="text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Search for a patient<br />or register a new one</p>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Main Panel ──────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Stats bar */}
            <div className="grid grid-cols-5 gap-px bg-gray-200 border-b shrink-0">
              {[
                { label: "Booked Today", value: stats.total, color: "text-blue-700" },
                { label: "Checked In", value: stats.checkedIn, color: "text-blue-600" },
                { label: "In Queue / Doctor", value: stats.inQueue, color: "text-amber-600" },
                { label: "Completed", value: stats.completed, color: "text-green-600" },
                { label: "No-shows", value: stats.noShow, color: "text-gray-500" },
              ].map(s => (
                <div key={s.label} className="bg-white px-4 py-2">
                  <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tab bar */}
            <div className="flex border-b bg-white shrink-0">
              {[
                { key: "book", label: "Book Appointment", icon: CalendarDays },
                { key: "schedule", label: "Today's Schedule", icon: ListChecks },
                { key: "waitlist", label: "Waitlist", icon: CalendarClock },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                    tab === t.key
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">

              {/* ── BOOK APPOINTMENT ──────────────────────────────────────── */}
              {tab === "book" && (
                <div className="max-w-2xl space-y-4">
                  {!selectedPatient && (
                    <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-500">
                      Select a patient from the left panel to begin booking
                    </div>
                  )}

                  {/* Appointment Type */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Appointment Type</Label>
                    <div className="flex gap-2 mt-1.5">
                      {APPT_TYPES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setApptType(t.value)}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                            apptType === t.value
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                          )}
                        >
                          <span className="mr-1">{t.icon}</span>{t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Department + Doctor */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department *</Label>
                      <Select value={deptId} onValueChange={v => setDeptId(v ?? "")}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Doctor *</Label>
                        {deptId && (
                          <button
                            onClick={() => setShowEarliest(!showEarliest)}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Search className="w-3 h-3" />Find Earliest
                          </button>
                        )}
                      </div>
                      <Select value={doctorId} onValueChange={v => { setDoctorId(v ?? ""); setShowEarliest(false); }} disabled={!deptId}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder={deptId ? "Select doctor" : "Select dept first"} /></SelectTrigger>
                        <SelectContent>
                          {doctors.map(d => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.full_name} — {d.specialization}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Earliest Available panel */}
                  {showEarliest && deptId && (
                    <div className="rounded-xl border bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                        <Search className="w-3 h-3" />Earliest Available Slots
                        {searchingEarliest && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
                      </p>
                      {earliestSlots.length === 0 && !searchingEarliest && (
                        <p className="text-xs text-amber-600">No slots found in next 14 days</p>
                      )}
                      <div className="space-y-1.5">
                        {earliestSlots.map(s => (
                          <button
                            key={s.doctor_id}
                            onClick={() => {
                              setDoctorId(String(s.doctor_id));
                              setApptDate(s.date);
                              setShowEarliest(false);
                            }}
                            className="w-full text-left p-2 rounded-lg bg-white border hover:border-amber-400 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium">{s.doctor_name}</p>
                              <Badge className="text-[10px] bg-green-100 text-green-800">{s.available} slots left</Badge>
                            </div>
                            <p className="text-xs text-gray-500">{s.specialization} · {format(new Date(s.date), "dd MMM yyyy (EEE)")}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date + Time (not for walk-in) */}
                  {apptType !== "WALK_IN" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date *</Label>
                        <Input
                          type="date"
                          className="mt-1.5"
                          min={todayStr}
                          value={apptDate}
                          onChange={e => setApptDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time *</Label>
                        <Input type="time" className="mt-1.5" value={apptTime} onChange={e => setApptTime(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {/* Slot availability bar */}
                  {slotInfo && doctorId && apptType !== "WALK_IN" && (
                    <div className="rounded-xl border p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600">Slot Availability — {format(new Date(apptDate), "dd MMM yyyy")}</p>
                        {slotInfo.is_full ? (
                          <Badge className="text-xs bg-red-100 text-red-700">FULL</Badge>
                        ) : (
                          <Badge className="text-xs bg-green-100 text-green-700">{slotInfo.available} available</Badge>
                        )}
                      </div>
                      {slotInfo.has_schedule ? (
                        <>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", slotInfo.is_full ? "bg-red-500" : slotInfo.booked / slotInfo.max > 0.75 ? "bg-amber-500" : "bg-green-500")}
                              style={{ width: `${Math.min(100, (slotInfo.booked / slotInfo.max) * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{slotInfo.booked}/{slotInfo.max} patients booked</p>
                          {slotInfo.slots.map((sl, i) => (
                            <p key={i} className="text-xs text-gray-500">{sl.start}–{sl.end} (max {sl.max})</p>
                          ))}
                        </>
                      ) : (
                        <p className="text-xs text-amber-600">No scheduled sessions on this day. Walk-in only.</p>
                      )}
                    </div>
                  )}

                  {/* Chief Complaint */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chief Complaint</Label>
                    <Textarea
                      className="mt-1.5 text-sm resize-none"
                      rows={2}
                      placeholder="e.g. Chest pain since 2 days, breathlessness on exertion..."
                      value={complaint}
                      onChange={e => setComplaint(e.target.value)}
                    />
                  </div>

                  {/* Walk-in info */}
                  {apptType === "WALK_IN" && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                      Walk-in token will be assigned immediately for today. Patient will be added to the triage queue.
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleBook}
                      disabled={bookMut.isPending || !selectedPatient}
                      className="flex-1"
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      {bookMut.isPending ? "Booking..." : apptType === "WALK_IN" ? "Assign Walk-in Token" : "Book Appointment"}
                    </Button>
                    {slotInfo?.is_full && (
                      <Button variant="outline" onClick={handleWaitlist} disabled={waitlistMut.isPending}>
                        <CalendarClock className="w-4 h-4 mr-2" />
                        Waitlist
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* ── TODAY'S SCHEDULE ────────────────────────────────────────── */}
              {tab === "schedule" && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-700">
                      {format(new Date(), "dd MMM yyyy")} — {todayAppts.length} appointments
                    </h2>
                    <Button variant="outline" size="sm" onClick={() => refetchToday()} className="text-xs h-7">
                      <RefreshCw className="w-3 h-3 mr-1" />Refresh
                    </Button>
                  </div>

                  {todayAppts.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No appointments today</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {todayAppts.map(appt => (
                      <div
                        key={appt.id}
                        className={cn(
                          "bg-white rounded-xl border p-3 flex items-center gap-3",
                          appt.delay_minutes && appt.delay_minutes > 0 && ["SCHEDULED", "CHECKED_IN"].includes(appt.status) && "border-amber-300 bg-amber-50/30"
                        )}
                      >
                        {/* Token */}
                        <div className="w-10 h-10 rounded-xl bg-blue-950 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {appt.token_number ?? "—"}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-gray-900 truncate">{appt.patient_name}</p>
                            <span className="text-xs text-gray-400 shrink-0">{appt.patient_uhid}</span>
                            <Badge className={cn("text-[10px] px-1.5 py-0 shrink-0", STATUS_COLOR[appt.status])}>
                              {appt.status.replace("_", " ")}
                            </Badge>
                            {appt.delay_minutes && appt.delay_minutes > 0 && ["SCHEDULED", "CHECKED_IN"].includes(appt.status) && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800">
                                <Clock className="w-2.5 h-2.5 mr-0.5 inline" />+{appt.delay_minutes}m delay
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {appt.doctor_name} · {appt.department_name} · {appt.appointment_time?.slice(0, 5)}
                          </p>
                          {appt.chief_complaint && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{appt.chief_complaint}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5 shrink-0">
                          {appt.status === "SCHEDULED" && (
                            <>
                              <Button size="sm" className="h-7 text-xs px-2" onClick={() => checkinMut.mutate(appt.id)} disabled={checkinMut.isPending}>
                                <CheckCircle2 className="w-3 h-3 mr-1" />Check In
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => { setRescheduleTarget(appt); setReschedDate(appt.appointment_date); setReschedTime(appt.appointment_time?.slice(0,5)); }}>
                                <ArrowRightLeft className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-amber-600 border-amber-200" onClick={() => setDelayTarget({ appt_id: appt.id, doctor_name: appt.doctor_name || "" })}>
                                <Bell className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-red-500 border-red-200" onClick={() => cancelMut.mutate(appt.id)}>
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          {appt.status === "CHECKED_IN" && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => { setRescheduleTarget(appt); setReschedDate(appt.appointment_date); setReschedTime(appt.appointment_time?.slice(0,5)); }}>
                                <ArrowRightLeft className="w-3 h-3 mr-1" />Reschedule
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs px-2 text-gray-500" onClick={() => noShowMut.mutate(appt.id)}>
                                No-show
                              </Button>
                            </>
                          )}
                          {["IN_QUEUE", "WITH_DOCTOR"].includes(appt.status) && (
                            <span className="text-xs text-violet-600 font-medium px-2">With clinical team</span>
                          )}
                          {appt.status === "COMPLETED" && (
                            <span className="text-xs text-green-600 font-medium px-2">
                              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Done
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── WAITLIST ────────────────────────────────────────────────── */}
              {tab === "waitlist" && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Active Waitlist</h2>
                  {waitlistEntries.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No waitlist entries</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {waitlistEntries.map((w: any) => (
                      <div key={w.id} className="bg-white rounded-xl border p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shrink-0">
                          #{w.position}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{w.patient_name}</p>
                          <p className="text-xs text-gray-500">{w.doctor_name} · Preferred: {fmtDate(w.preferred_date)}</p>
                        </div>
                        <Badge className={cn("text-xs", w.status === "NOTIFIED" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700")}>
                          {w.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Reschedule Modal ──────────────────────────────────────────────── */}
      {rescheduleTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="font-semibold text-lg mb-1">Reschedule Appointment</h3>
            <p className="text-sm text-gray-500 mb-4">
              {rescheduleTarget.patient_name} · Token #{rescheduleTarget.token_number}
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">New Date</Label>
                <Input type="date" min={todayStr} value={reschedDate} onChange={e => setReschedDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">New Time</Label>
                <Input type="time" value={reschedTime} onChange={e => setReschedTime(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => rescheduleMut.mutate({ id: rescheduleTarget.id, new_date: reschedDate, new_time: `${reschedTime}:00` })} disabled={rescheduleMut.isPending} className="flex-1">
                {rescheduleMut.isPending ? "Rescheduling..." : "Confirm Reschedule"}
              </Button>
              <Button variant="outline" onClick={() => setRescheduleTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delay Notification Modal ──────────────────────────────────────── */}
      {delayTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
            <h3 className="font-semibold text-lg mb-1">Doctor Running Late</h3>
            <p className="text-sm text-gray-500 mb-4">{delayTarget.doctor_name}</p>
            <div>
              <Label className="text-xs">Delay Duration</Label>
              <div className="flex gap-2 mt-2">
                {["15", "30", "45", "60"].map(m => (
                  <button
                    key={m}
                    onClick={() => setDelayMinutes(m)}
                    className={cn("flex-1 py-1.5 rounded-lg border text-sm font-medium transition-all",
                      delayMinutes === m ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-gray-200 text-gray-600"
                    )}
                  >{m} min</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => delayMut.mutate({ id: delayTarget.appt_id, delay_minutes: Number(delayMinutes) })} disabled={delayMut.isPending} className="flex-1 bg-amber-500 hover:bg-amber-600">
                <Bell className="w-4 h-4 mr-2" />
                {delayMut.isPending ? "Notifying..." : `Notify Patients (+${delayMinutes}m)`}
              </Button>
              <Button variant="outline" onClick={() => setDelayTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
