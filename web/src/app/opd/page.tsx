"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn, fmtTime } from "@/lib/utils";
import api from "@/lib/api";
import { useJourneyStore } from "@/store/journey";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  X, Clock, UserPlus, Search, ChevronRight, CheckCircle2,
  Users, Loader2, Activity, AlertTriangle, ArrowRight,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED:   "bg-gray-100 text-gray-600 border-gray-200",
  CHECKED_IN:  "bg-blue-100 text-blue-700 border-blue-200",
  IN_QUEUE:    "bg-amber-100 text-amber-700 border-amber-200",
  WITH_DOCTOR: "bg-violet-100 text-violet-700 border-violet-200",
  COMPLETED:   "bg-green-100 text-green-700 border-green-200",
  CANCELLED:   "bg-red-100 text-red-600 border-red-200",
};

const STATUS_NEXT: Record<string, string> = {
  CHECKED_IN:  "IN_QUEUE",
  IN_QUEUE:    "WITH_DOCTOR",
  WITH_DOCTOR: "COMPLETED",
};

const STATUS_NEXT_LABEL: Record<string, string> = {
  CHECKED_IN:  "Send to Queue",
  IN_QUEUE:    "Call to Doctor",
  WITH_DOCTOR: "Mark Complete",
};

const SUMMARY_CONFIG = [
  { key: "SCHEDULED",   label: "Scheduled",   cls: "border-gray-200 text-gray-700 bg-gray-50" },
  { key: "CHECKED_IN",  label: "Checked In",  cls: "border-blue-200 text-blue-700 bg-blue-50" },
  { key: "IN_QUEUE",    label: "In Queue",    cls: "border-amber-200 text-amber-700 bg-amber-50" },
  { key: "WITH_DOCTOR", label: "With Doctor", cls: "border-violet-200 text-violet-700 bg-violet-50" },
  { key: "COMPLETED",   label: "Completed",   cls: "border-green-200 text-green-700 bg-green-50" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OPDQueuePage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const router = useRouter();
  const qc = useQueryClient();
  const { setPatient, setAppointment, completeStep } = useJourneyStore();

  const [doctorFilter, setDoctorFilter] = useState("all");

  // Walk-in panel state
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [wiStep, setWiStep] = useState<1 | 2>(1);
  const [wiPatient, setWiPatient] = useState<any>(null);
  const [wiSearchQ, setWiSearchQ] = useState("");
  const [wiShowReg, setWiShowReg] = useState(false);
  const [wiReg, setWiReg] = useState({
    first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "",
  });
  const [wiDoctorId, setWiDoctorId] = useState("");
  const [wiComplaint, setWiComplaint] = useState("");
  const [wiUrgent, setWiUrgent] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["opd-queue", today],
    queryFn: () =>
      api.get(`/api/appointments?appointment_date=${today}`).then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.get("/api/masters/doctors").then((r) => r.data),
  });

  const { data: wiPatients = [] } = useQuery({
    queryKey: ["wi-patient-search", wiSearchQ],
    queryFn: () =>
      api
        .get(`/api/patients?q=${encodeURIComponent(wiSearchQ)}&limit=6`)
        .then((r) => r.data.data),
    enabled: wiSearchQ.length >= 2,
    staleTime: 10000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/api/appointments/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opd-queue"] });
      toast.success("Status updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed"),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id }: { id: number }) =>
      api.patch(`/api/appointments/${id}/status`, {
        status: "CANCELLED",
        cancelled_reason: "Cancelled by staff",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opd-queue"] });
      toast.success("Appointment cancelled");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed"),
  });

  // Check-in a SCHEDULED appointment (creates visit, sets journey store)
  const checkInMutation = useMutation({
    mutationFn: async (appt: any) => {
      const [checkInRes, patRes] = await Promise.all([
        api.post(`/api/appointments/${appt.id}/checkin`),
        api.get(`/api/patients/${appt.patient_id}`),
      ]);
      return { checkin: checkInRes.data, patient: patRes.data, appt };
    },
    onSuccess: ({ checkin, patient, appt }) => {
      setPatient({
        id: patient.id,
        uhid: patient.uhid,
        name: `${patient.first_name} ${patient.last_name}`,
        gender: patient.gender,
        dob: patient.date_of_birth,
        phone: patient.phone,
        blood_group: patient.blood_group,
      });
      setAppointment(
        {
          id: appt.id,
          appointment_no: appt.appointment_no,
          token_number: appt.token_number,
          doctor_name: appt.doctor_name,
          department_name: appt.department_name,
        },
        checkin.visit_id,
        checkin.visit_no
      );
      completeStep(1);
      completeStep(2);
      qc.invalidateQueries({ queryKey: ["opd-queue"] });
      toast.success("Checked in — open Vitals to continue");
      router.push("/opd/journey/vitals");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Check-in failed"),
  });

  // Walk-in: create appointment + check-in in sequence
  const walkInMutation = useMutation({
    mutationFn: async () => {
      let patient = wiPatient;

      if (!patient) {
        const r = await api.post("/api/patients/quick-register", wiReg);
        patient = r.data;
      }

      const selectedDoc = doctors.find((d: any) => d.id === parseInt(wiDoctorId));
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}:00`;

      const apptRes = await api.post("/api/appointments", {
        patient_id: patient.id,
        doctor_id: parseInt(wiDoctorId),
        department_id: selectedDoc.department_id,
        appointment_date: today,
        appointment_time: timeStr,
        appointment_type: "WALK_IN",
        chief_complaint: wiComplaint || undefined,
        priority: wiUrgent ? 1 : 0,
      });

      const checkInRes = await api.post(
        `/api/appointments/${apptRes.data.id}/checkin`
      );

      return {
        patient,
        appointment: apptRes.data,
        checkin: checkInRes.data,
        doc: selectedDoc,
      };
    },
    onSuccess: ({ patient, appointment, checkin, doc }) => {
      setPatient({
        id: patient.id,
        uhid: patient.uhid,
        name: `${patient.first_name} ${patient.last_name}`,
        gender: patient.gender,
        dob: patient.date_of_birth,
        phone: patient.phone,
        blood_group: patient.blood_group,
      });
      setAppointment(
        {
          id: appointment.id,
          appointment_no: appointment.appointment_no,
          token_number: appointment.token_number,
          doctor_name: doc?.full_name || "",
          department_name: doc?.department_name || "",
        },
        checkin.visit_id,
        checkin.visit_no
      );
      completeStep(1);
      completeStep(2);
      qc.invalidateQueries({ queryKey: ["opd-queue"] });
      closeWalkIn();
      toast.success(`Walk-in checked in — Token #${appointment.token_number}`);
      router.push("/opd/journey/vitals");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.detail || "Booking failed"),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  function openWalkIn() {
    setWalkInOpen(true);
    setWiStep(1);
    setWiPatient(null);
    setWiSearchQ("");
    setWiShowReg(false);
    setWiReg({ first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "" });
    setWiDoctorId("");
    setWiComplaint("");
    setWiUrgent(false);
  }

  function closeWalkIn() {
    setWalkInOpen(false);
  }

  const filtered = appointments.filter(
    (a: any) =>
      doctorFilter === "all" || a.doctor_id === parseInt(doctorFilter)
  );

  const byStatus = (status: string) =>
    filtered.filter((a: any) => a.status === status);

  const wiStep1Valid = wiPatient !== null || (
    wiShowReg &&
    wiReg.first_name.trim() &&
    wiReg.last_name.trim() &&
    wiReg.phone.trim() &&
    wiReg.date_of_birth
  );

  const wiStep2Valid = wiDoctorId !== "";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="OPD Queue" />

        <main className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Summary bar */}
          <div className="grid grid-cols-5 gap-3">
            {SUMMARY_CONFIG.map((s) => (
              <div
                key={s.key}
                className={`border rounded-xl px-4 py-3 ${s.cls}`}
              >
                <p className="text-2xl font-bold">{byStatus(s.key).length}</p>
                <p className="text-xs font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter + action bar */}
          <div className="flex items-center gap-3">
            <Select
              value={doctorFilter}
              onValueChange={(v) => setDoctorFilter(v ?? "all")}
            >
              <SelectTrigger className="w-52 bg-white">
                <SelectValue placeholder="All Doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map((d: any) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    Dr. {d.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-sm text-gray-500 flex-1">
              {filtered.length} appointments today
            </p>

            <Button
              onClick={openWalkIn}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <UserPlus className="w-4 h-4" />
              New Walk-in
            </Button>
          </div>

          {/* 5-column Kanban */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading queue...
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3 min-w-0">
              {SUMMARY_CONFIG.map(({ key, label }) => (
                <div key={key} className="flex flex-col min-w-0">
                  {/* Column header */}
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border mb-2",
                      STATUS_COLOR[key]
                    )}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide truncate">
                      {label}
                    </span>
                    <span className="ml-auto text-xs font-bold shrink-0">
                      {byStatus(key).length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
                    {byStatus(key).map((a: any) => (
                      <QueueCard
                        key={a.id}
                        appointment={a}
                        onCheckIn={
                          key === "SCHEDULED"
                            ? () => checkInMutation.mutate(a)
                            : undefined
                        }
                        onAdvance={
                          STATUS_NEXT[a.status]
                            ? () =>
                                advanceMutation.mutate({
                                  id: a.id,
                                  status: STATUS_NEXT[a.status],
                                })
                            : undefined
                        }
                        onCancel={() => cancelMutation.mutate({ id: a.id })}
                        nextLabel={STATUS_NEXT_LABEL[a.status] || ""}
                        checkingIn={
                          checkInMutation.isPending &&
                          (checkInMutation.variables as any)?.id === a.id
                        }
                      />
                    ))}
                    {byStatus(key).length === 0 && (
                      <div className="text-center py-8 text-gray-300 text-xs">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Walk-in Slide Panel */}
      {walkInOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={closeWalkIn}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col">
            {/* Panel header */}
            <div className="bg-blue-700 px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <p className="text-white font-semibold text-base">New Walk-in</p>
                <p className="text-blue-200 text-xs mt-0.5">
                  {wiStep === 1 ? "Step 1: Find or register patient" : "Step 2: Appointment details"}
                </p>
              </div>
              <button
                onClick={closeWalkIn}
                className="text-blue-200 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex border-b border-gray-100 shrink-0">
              {[
                { n: 1, label: "Patient" },
                { n: 2, label: "Appointment" },
              ].map((s) => (
                <button
                  key={s.n}
                  onClick={() => s.n < wiStep || (s.n === 2 && wiStep1Valid) ? setWiStep(s.n as 1 | 2) : undefined}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5",
                    wiStep === s.n
                      ? "border-b-2 border-blue-600 text-blue-700"
                      : s.n < wiStep
                      ? "text-green-600"
                      : "text-gray-400"
                  )}
                >
                  {s.n < wiStep ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className={cn(
                      "w-4 h-4 rounded-full border text-[10px] flex items-center justify-center font-bold",
                      wiStep === s.n ? "border-blue-600 text-blue-700" : "border-gray-300 text-gray-400"
                    )}>
                      {s.n}
                    </span>
                  )}
                  {s.label}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* ── Step 1: Patient ── */}
              {wiStep === 1 && (
                <>
                  {/* Selected patient chip */}
                  {wiPatient && (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {wiPatient.first_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {wiPatient.first_name} {wiPatient.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{wiPatient.uhid} · {wiPatient.phone}</p>
                      </div>
                      <button
                        onClick={() => setWiPatient(null)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Search */}
                  {!wiPatient && !wiShowReg && (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          className="pl-9"
                          placeholder="Search by name, phone, or UHID..."
                          value={wiSearchQ}
                          onChange={(e) => setWiSearchQ(e.target.value)}
                          autoFocus
                        />
                      </div>

                      {wiSearchQ.length >= 2 && (
                        <div className="space-y-1.5">
                          {wiPatients.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">
                              No patients found
                            </p>
                          ) : (
                            wiPatients.map((p: any) => (
                              <button
                                key={p.id}
                                onClick={() => { setWiPatient(p); setWiSearchQ(""); }}
                                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all"
                              >
                                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                                  {p.first_name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">
                                    {p.first_name} {p.last_name}
                                  </p>
                                  <p className="text-xs text-gray-500">{p.uhid} · {p.phone}</p>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {wiSearchQ.length < 2 && (
                        <div className="text-center py-4 text-gray-400">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-xs">Type at least 2 characters to search</p>
                        </div>
                      )}

                      <div className="border-t border-gray-100 pt-3">
                        <button
                          onClick={() => setWiShowReg(true)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          Register new patient
                        </button>
                      </div>
                    </>
                  )}

                  {/* Quick register form */}
                  {!wiPatient && wiShowReg && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => setWiShowReg(false)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          ← Back to search
                        </button>
                        <span className="text-xs text-gray-400">·</span>
                        <p className="text-xs font-semibold text-gray-700">Quick Registration</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500">First Name *</Label>
                          <Input
                            className="mt-1 h-8 text-sm"
                            value={wiReg.first_name}
                            onChange={(e) => setWiReg((r) => ({ ...r, first_name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Last Name *</Label>
                          <Input
                            className="mt-1 h-8 text-sm"
                            value={wiReg.last_name}
                            onChange={(e) => setWiReg((r) => ({ ...r, last_name: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Phone *</Label>
                        <Input
                          className="mt-1 h-8 text-sm"
                          type="tel"
                          value={wiReg.phone}
                          onChange={(e) => setWiReg((r) => ({ ...r, phone: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500">Gender *</Label>
                          <Select
                            value={wiReg.gender}
                            onValueChange={(v) => setWiReg((r) => ({ ...r, gender: v ?? "MALE" }))}
                          >
                            <SelectTrigger className="mt-1 h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">Date of Birth *</Label>
                          <Input
                            type="date"
                            className="mt-1 h-8 text-sm"
                            max={today}
                            value={wiReg.date_of_birth}
                            onChange={(e) => setWiReg((r) => ({ ...r, date_of_birth: e.target.value }))}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Full details can be completed later in the Patients module.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── Step 2: Appointment ── */}
              {wiStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500">Doctor *</Label>
                    <Select
                      value={wiDoctorId}
                      onValueChange={(v) => setWiDoctorId(v ?? "")}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select doctor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((d: any) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            Dr. {d.full_name}
                            <span className="text-gray-400 ml-1 text-xs">
                              — {d.department_name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500">Chief Complaint</Label>
                    <Textarea
                      className="mt-1 resize-none text-sm"
                      rows={3}
                      placeholder="Reason for visit..."
                      value={wiComplaint}
                      onChange={(e) => setWiComplaint(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={() => setWiUrgent((u) => !u)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium",
                      wiUrgent
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <AlertTriangle className={cn("w-4 h-4", wiUrgent ? "text-red-500" : "text-gray-400")} />
                    <span className="flex-1 text-left">Mark as Urgent</span>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                      wiUrgent ? "bg-red-500 border-red-500" : "border-gray-300"
                    )}>
                      {wiUrgent && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>

                  {/* Summary */}
                  {wiDoctorId && (() => {
                    const doc = doctors.find((d: any) => d.id === parseInt(wiDoctorId));
                    return doc ? (
                      <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3 space-y-1.5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Booking Summary
                        </p>
                        <div className="text-sm text-gray-700">
                          <p><span className="text-gray-400">Doctor:</span> Dr. {doc.full_name}</p>
                          <p><span className="text-gray-400">Dept:</span> {doc.department_name}</p>
                          <p><span className="text-gray-400">Date:</span> {format(new Date(today), "dd MMM yyyy")} (Today)</p>
                          <p><span className="text-gray-400">Type:</span> Walk-in · {wiUrgent ? "Urgent" : "Normal"}</p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
              {wiStep === 1 ? (
                <>
                  <Button variant="outline" onClick={closeWalkIn} className="flex-none">
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={!wiStep1Valid}
                    onClick={() => setWiStep(2)}
                  >
                    Next: Appointment
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setWiStep(1)} className="flex-none">
                    Back
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={!wiStep2Valid || walkInMutation.isPending}
                    onClick={() => walkInMutation.mutate()}
                  >
                    {walkInMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4 mr-2" />
                        Book & Check In
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Queue Card ───────────────────────────────────────────────────────────────

function QueueCard({
  appointment: a,
  onCheckIn,
  onAdvance,
  onCancel,
  nextLabel,
  checkingIn,
}: {
  appointment: any;
  onCheckIn?: () => void;
  onAdvance?: () => void;
  onCancel: () => void;
  nextLabel: string;
  checkingIn?: boolean;
}) {
  const isTerminal = a.status === "COMPLETED" || a.status === "CANCELLED";

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Token + type */}
      <div className="flex items-center justify-between mb-2">
        <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
          {a.token_number || "—"}
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[a.status]}`}
        >
          {a.appointment_type?.replace("_", "-")}
        </span>
      </div>

      {/* Patient */}
      <p className="text-sm font-semibold text-gray-800 truncate">
        {a.patient_name || `Patient #${a.patient_id}`}
      </p>
      <p className="text-xs text-gray-400 truncate">{a.patient_uhid}</p>

      {/* Time + doctor */}
      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
        <Clock className="w-3 h-3 shrink-0" />
        {a.appointment_time ? fmtTime(a.appointment_time) : "Walk-in"}
        {a.priority > 0 && (
          <span className="ml-1 text-red-500 font-semibold">· URGENT</span>
        )}
      </p>
      {a.doctor_name && (
        <p className="text-xs text-gray-400 truncate mt-0.5">Dr. {a.doctor_name}</p>
      )}

      {/* Complaint */}
      {a.chief_complaint && (
        <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 rounded px-2 py-1 truncate">
          {a.chief_complaint}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-2.5">
        {a.status === "SCHEDULED" && onCheckIn && (
          <Button
            size="sm"
            className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={onCheckIn}
            disabled={checkingIn}
          >
            {checkingIn ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              "Check In"
            )}
          </Button>
        )}

        {a.status !== "SCHEDULED" && nextLabel && onAdvance && (
          <Button
            size="sm"
            className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={onAdvance}
          >
            {nextLabel}
          </Button>
        )}

        {!isTerminal && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
            onClick={onCancel}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
