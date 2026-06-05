"use client";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Search, UserPlus, CheckCircle, AlertTriangle, Printer,
  ChevronLeft, Users, CalendarX, IndianRupee, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calcAge, fmtDate, fmtCurrency } from "@/lib/utils";
import { useJourneyStore } from "@/store/journey";

type Patient = { id: number; uhid: string; first_name: string; last_name: string; phone: string; date_of_birth: string; gender: string; blood_group?: string };
type Doctor  = { id: number; full_name: string; department_id: number; department_name: string; specialization: string; max_patients_per_slot: number };

// ── Appointment Slip ──────────────────────────────────────────────────────────
function AppointmentSlip({ appt, patient, doctor }: { appt: any; patient: Patient; doctor: Doctor }) {
  return (
    <div className="p-8 border rounded-lg bg-white text-sm" id="print-slip">
      <div className="text-center mb-6">
        <h1 className="text-lg font-bold text-blue-900">City General Hospital</h1>
        <p className="text-gray-500 text-xs">Appointment Confirmation Slip</p>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-t pt-4">
        <div><span className="text-gray-400 text-xs block">Appointment No</span><p className="font-mono font-semibold">{appt.appointment_no}</p></div>
        <div><span className="text-gray-400 text-xs block">Token</span><p className="text-2xl font-bold text-blue-600">#{appt.token_number}</p></div>
        <div><span className="text-gray-400 text-xs block">Patient Name</span><p className="font-medium">{patient.first_name} {patient.last_name}</p></div>
        <div><span className="text-gray-400 text-xs block">UHID</span><p className="font-mono">{patient.uhid}</p></div>
        <div><span className="text-gray-400 text-xs block">Age / Gender</span><p>{calcAge(patient.date_of_birth)} / {patient.gender}</p></div>
        <div><span className="text-gray-400 text-xs block">Phone</span><p>{patient.phone}</p></div>
        <div><span className="text-gray-400 text-xs block">Doctor</span><p className="font-medium">{doctor.full_name}</p></div>
        <div><span className="text-gray-400 text-xs block">Department</span><p>{doctor.department_name}</p></div>
        <div><span className="text-gray-400 text-xs block">Date</span><p className="font-medium">{fmtDate(appt.appointment_date)}</p></div>
        <div><span className="text-gray-400 text-xs block">Time</span><p className="font-medium">{appt.appointment_time}</p></div>
        <div><span className="text-gray-400 text-xs block">Type</span><p>{appt.appointment_type?.replace("_", " ")}</p></div>
        <div><span className="text-gray-400 text-xs block">Visit Type</span><p>{appt.visit_type?.replace("_", " ")}</p></div>
      </div>
      {appt.chief_complaint && (
        <div className="mt-4 border-t pt-3">
          <span className="text-gray-400 text-xs block">Chief Complaint</span>
          <p>{appt.chief_complaint}</p>
        </div>
      )}
      <div className="mt-6 border-t pt-3 text-center text-xs text-gray-400">
        Please arrive 15 minutes before your appointment time. Bring this slip and a valid ID.
      </div>
    </div>
  );
}

// ── Slot availability pill ────────────────────────────────────────────────────
function SlotPill({ avail }: { avail: any }) {
  if (!avail) return null;

  const pct = avail.max > 0 ? avail.booked / avail.max : 0;
  const color = avail.is_full
    ? "bg-red-100 text-red-700 border-red-200"
    : pct >= 0.8
    ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-green-100 text-green-700 border-green-200";

  if (!avail.has_schedule) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400 border rounded-md px-3 py-1.5">
        <Users className="w-3.5 h-3.5" />
        No schedule — walk-in allowed &nbsp;·&nbsp; {avail.booked} booked today
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 text-xs border rounded-md px-3 py-1.5 ${color}`}>
      <Users className="w-3.5 h-3.5" />
      {avail.is_full
        ? `Slot full — ${avail.booked}/${avail.max} patients`
        : `${avail.available} of ${avail.max} slots remaining · ${avail.booked} booked`}
      {avail.slots?.length > 0 && (
        <span className="ml-2 text-gray-500">
          ({avail.slots.map((s: any) => `${s.start}–${s.end}`).join(", ")})
        </span>
      )}
    </div>
  );
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const { setPatient, setAppointment, reset } = useJourneyStore();

  // Step 1 — Patient
  const [searchQ, setSearchQ] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showQuickReg, setShowQuickReg] = useState(false);
  const [qrForm, setQrForm] = useState({ first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "" });

  // Step 2 — Booking
  const [deptId, setDeptId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [apptDate, setApptDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [apptTime, setApptTime] = useState("09:00");
  const [apptType, setApptType] = useState("WALK_IN");
  const [visitType, setVisitType] = useState("NEW");
  const [chiefComplaint, setChiefComplaint] = useState("");

  // Result
  const [bookedAppt, setBookedAppt] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const isSameDay = bookedAppt?.appointment_date === today;

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: ["patient-search", searchQ],
    queryFn: () => api.get(`/api/patients?q=${searchQ}&limit=10`).then((r) => r.data.data),
    enabled: searchQ.length >= 2,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get("/api/masters/departments").then((r) => r.data),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", deptId],
    queryFn: () => api.get(`/api/masters/doctors${deptId ? `?department_id=${deptId}` : ""}`).then((r) => r.data),
  });

  const { data: dupCheck } = useQuery({
    queryKey: ["dup-check", selectedPatient?.id, doctorId, apptDate],
    queryFn: () => api.get(`/api/appointments/duplicate-check?patient_id=${selectedPatient!.id}&doctor_id=${doctorId}&check_date=${apptDate}`).then((r) => r.data),
    enabled: !!(selectedPatient && doctorId && apptDate),
  });

  // FIX 1a — Slot availability
  const { data: slotAvail } = useQuery({
    queryKey: ["slot-avail", doctorId, apptDate],
    queryFn: () => api.get(`/api/appointments/available-slots?doctor_id=${doctorId}&date=${apptDate}`).then((r) => r.data),
    enabled: !!(doctorId && apptDate),
  });

  // FIX 1b — Doctor block check
  const { data: blocks = [] } = useQuery({
    queryKey: ["doc-blocks", doctorId, apptDate],
    queryFn: () => api.get(`/api/appointments/blocks?doctor_id=${doctorId}&block_date=${apptDate}`).then((r) => r.data),
    enabled: !!(doctorId && apptDate),
  });

  // FIX 3 — Fee estimate
  const { data: feeEstimate } = useQuery({
    queryKey: ["fee-estimate", selectedPatient?.id, doctorId],
    queryFn: () => api.get(`/api/appointments/fee-estimate?patient_id=${selectedPatient!.id}&doctor_id=${doctorId}`).then((r) => r.data),
    enabled: !!(selectedPatient && doctorId),
  });

  // Auto-suggest visit type from fee estimate
  useEffect(() => {
    if (feeEstimate?.visit_type) {
      setVisitType(feeEstimate.visit_type);
      if (feeEstimate.visit_type === "FOLLOW_UP") setApptType("FOLLOW_UP");
    }
  }, [feeEstimate?.visit_type]);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const quickRegMut = useMutation({
    mutationFn: (body: typeof qrForm) => api.post("/api/patients/quick-register", body),
    onSuccess: (res) => {
      setSelectedPatient(res.data);
      setShowQuickReg(false);
      setQrForm({ first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "" });
      toast.success(`Patient registered — UHID: ${res.data.uhid}`);
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Registration failed"),
  });

  const bookMut = useMutation({
    mutationFn: (body: any) => api.post("/api/appointments", body),
    onSuccess: (res) => {
      setBookedAppt(res.data);
      const doc = doctors.find((d: Doctor) => d.id === Number(doctorId));
      setSelectedDoctor(doc ?? null);
      toast.success("Appointment booked!");
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Booking failed"),
  });

  // FIX 2 — Check-in + start OPD journey
  const checkinMut = useMutation({
    mutationFn: (apptId: number) => api.post(`/api/appointments/${apptId}/checkin`),
    onSuccess: (res) => {
      const { visit_id, visit_no, appointment } = res.data;
      reset();
      setPatient({
        id: selectedPatient!.id,
        uhid: selectedPatient!.uhid,
        name: `${selectedPatient!.first_name} ${selectedPatient!.last_name}`,
        gender: selectedPatient!.gender,
        dob: selectedPatient!.date_of_birth,
        phone: selectedPatient!.phone,
        blood_group: selectedPatient!.blood_group,
      });
      setAppointment(
        {
          id: bookedAppt.id,
          appointment_no: bookedAppt.appointment_no,
          token_number: bookedAppt.token_number,
          doctor_name: selectedDoctor?.full_name ?? "",
          department_name: selectedDoctor?.department_name ?? "",
        },
        visit_id,
        visit_no,
      );
      toast.success("Checked in — proceeding to vitals");
      router.push("/opd/journey/vitals");
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Check-in failed"),
  });

  const handleBook = () => {
    if (!selectedPatient || !doctorId || !apptDate || !apptTime) return;
    const dept = doctors.find((d: Doctor) => d.id === Number(doctorId))?.department_id;
    bookMut.mutate({
      patient_id: selectedPatient.id,
      doctor_id: Number(doctorId),
      department_id: dept,
      appointment_date: apptDate,
      appointment_time: apptTime + ":00",
      appointment_type: apptType,
      visit_type: visitType,
      chief_complaint: chiefComplaint || undefined,
    });
  };

  const activeBlock = blocks.find((b: any) => b.is_active);

  // ── Success screen ────────────────────────────────────────────────────────────
  if (bookedAppt && selectedPatient && selectedDoctor) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar title="Appointment Booked" />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-xl mx-auto space-y-4">

              {/* Token banner */}
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
                  <p className="text-sm font-medium text-gray-800">{selectedDoctor.full_name}</p>
                  <p className="text-xs text-gray-500">{bookedAppt.appointment_date} · {bookedAppt.appointment_time?.slice(0,5)}</p>
                </div>
              </div>

              {/* FIX 2 — Same-day walk-in banner */}
              {isSameDay && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-800">Patient is here today?</p>
                    <p className="text-xs text-blue-600 mt-0.5">Check them in now and go straight to vitals — no need to come back to this page.</p>
                  </div>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 gap-1.5 ml-4 shrink-0"
                    disabled={checkinMut.isPending}
                    onClick={() => checkinMut.mutate(bookedAppt.id)}
                  >
                    Check In & Start Journey <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <AppointmentSlip appt={bookedAppt} patient={selectedPatient} doctor={selectedDoctor} />

              <div className="flex gap-3 flex-wrap">
                <Button className="gap-1.5" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" /> Print Slip
                </Button>
                <Button variant="outline" onClick={() => router.push("/appointments")}>
                  Back to Appointments
                </Button>
                <Button variant="ghost" onClick={() => {
                  setBookedAppt(null); setSelectedPatient(null); setSelectedDoctor(null);
                  setDoctorId(null); setDeptId(null); setChiefComplaint(""); setSearchQ("");
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

  // ── Booking form ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Book Appointment" />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-2xl mx-auto space-y-5">
            <Link href="/appointments" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-4 h-4" /> Back to Appointments
            </Link>

            {/* Step 1 — Patient */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800">Step 1 — Select Patient</h2>
                  {!selectedPatient && !showQuickReg && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowQuickReg(true)}>
                      <UserPlus className="w-4 h-4" /> Quick Register
                    </Button>
                  )}
                </div>

                {selectedPatient ? (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-800">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                      <p className="text-xs text-gray-500">{selectedPatient.uhid} · {selectedPatient.phone} · {calcAge(selectedPatient.date_of_birth)} / {selectedPatient.gender}</p>
                    </div>
                    <button className="text-xs text-blue-600 underline" onClick={() => { setSelectedPatient(null); setSearchQ(""); }}>
                      Change
                    </button>
                  </div>
                ) : showQuickReg ? (
                  <div className="border rounded-lg p-4 space-y-3 bg-amber-50">
                    <p className="text-sm font-medium text-amber-800">Quick Registration — UHID generated immediately, full details can be updated later</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">First Name *</label>
                        <Input value={qrForm.first_name} onChange={(e) => setQrForm(f => ({ ...f, first_name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Last Name *</label>
                        <Input value={qrForm.last_name} onChange={(e) => setQrForm(f => ({ ...f, last_name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Phone *</label>
                        <Input value={qrForm.phone} onChange={(e) => setQrForm(f => ({ ...f, phone: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Gender *</label>
                        <Select value={qrForm.gender} onValueChange={(v) => setQrForm(f => ({ ...f, gender: v ?? "MALE" }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Date of Birth *</label>
                        <Input type="date" value={qrForm.date_of_birth} onChange={(e) => setQrForm(f => ({ ...f, date_of_birth: e.target.value }))} max={today} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700"
                        disabled={!qrForm.first_name || !qrForm.last_name || !qrForm.phone || !qrForm.date_of_birth || quickRegMut.isPending}
                        onClick={() => quickRegMut.mutate(qrForm)}>
                        Register & Select
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowQuickReg(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <Input className="pl-9" placeholder="Search by name, phone, or UHID…"
                      value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
                    {searchQ.length >= 2 && (
                      <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                        {searching && <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>}
                        {!searching && searchResults.length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-400">No patients found — use Quick Register above</div>
                        )}
                        {searchResults.map((p: Patient) => (
                          <button key={p.id} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b last:border-0"
                            onClick={() => { setSelectedPatient(p); setSearchQ(""); }}>
                            <p className="text-sm font-medium text-gray-800">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-gray-400">{p.uhid} · {p.phone} · {calcAge(p.date_of_birth)}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2 — Appointment Details */}
            {selectedPatient && (
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-semibold text-gray-800">Step 2 — Appointment Details</h2>

                  {/* Duplicate warning */}
                  {dupCheck?.duplicate && dupCheck.appointment && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Duplicate appointment detected
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-amber-200 rounded-lg px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {dupCheck.appointment.token_number}
                        </div>
                        <div className="flex-1 text-xs text-gray-700">
                          <p className="font-medium">Token #{dupCheck.appointment.token_number} · {dupCheck.appointment.appointment_no}</p>
                          <p className="text-gray-500">
                            {dupCheck.appointment.appointment_time?.slice(0, 5)} · {dupCheck.appointment.appointment_type?.replace("_", " ")} · {dupCheck.appointment.status}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-amber-700">Booking another will create a second visit. Proceed only if intentional.</p>
                    </div>
                  )}

                  {/* FIX 1b — Doctor block warning */}
                  {activeBlock && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                      <CalendarX className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Doctor is <strong>{activeBlock.reason}</strong> on this date.
                        {activeBlock.notes && ` (${activeBlock.notes})`}
                        {" "}Appointments can still be booked but the doctor may not be available.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Department</label>
                      <Select value={deptId ?? "ALL"} onValueChange={(v) => { setDeptId(v === "ALL" ? null : (v ?? null)); setDoctorId(null); }}>
                        <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All departments</SelectItem>
                          {departments.map((d: any) => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Doctor *</label>
                      <Select value={doctorId ?? ""} onValueChange={(v) => setDoctorId(v ?? null)}>
                        <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                        <SelectContent>
                          {doctors.map((d: Doctor) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.full_name} — {d.department_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Date *</label>
                      <Input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} min={today} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Time *</label>
                      <Input type="time" value={apptTime} onChange={(e) => setApptTime(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Appointment Type</label>
                      <Select value={apptType} onValueChange={(v) => setApptType(v ?? "WALK_IN")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WALK_IN">Walk-in</SelectItem>
                          <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                          <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                          <SelectItem value="EMERGENCY">Emergency</SelectItem>
                          <SelectItem value="TELECONSULT">Teleconsult</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Visit Type</label>
                      <Select value={visitType} onValueChange={(v) => setVisitType(v ?? "NEW")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEW">New</SelectItem>
                          <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
                          <SelectItem value="EMERGENCY">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Chief Complaint (optional)</label>
                      <Input value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)}
                        placeholder="e.g. Chest pain, Fever since 3 days…" />
                    </div>
                  </div>

                  {/* FIX 1a — Slot availability */}
                  {doctorId && apptDate && <SlotPill avail={slotAvail} />}

                  {/* FIX 3 — Fee estimate */}
                  {feeEstimate && (
                    <div className="flex items-center gap-3 bg-gray-50 border rounded-lg px-4 py-3 text-sm">
                      <IndianRupee className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-gray-800">{fmtCurrency(feeEstimate.fee)}</span>
                        {feeEstimate.visit_type === "FOLLOW_UP" ? (
                          <span className="text-gray-500 ml-2">
                            Follow-up rate
                            {feeEstimate.discount > 0 && ` (saves ${fmtCurrency(feeEstimate.discount)})`}
                            {feeEstimate.days_since != null && ` · last visit ${feeEstimate.days_since} days ago`}
                          </span>
                        ) : (
                          <span className="text-gray-500 ml-2">
                            New patient consultation
                            {feeEstimate.followup_fee && ` · follow-up rate ${fmtCurrency(feeEstimate.followup_fee)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <Button className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={!doctorId || !apptDate || !apptTime || bookMut.isPending || slotAvail?.is_full}
                    onClick={handleBook}>
                    {slotAvail?.is_full ? "Slot Full — Cannot Book" : "Confirm Appointment"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
