"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { cn, calcAge, fmtCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, UserPlus, X, ChevronRight, ChevronLeft, Clock,
  Users, Phone, CheckCircle2, Stethoscope, Calendar,
  AlertTriangle, Loader2, Building2, IndianRupee, Timer,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doctor {
  doctor_id: number;
  doctor_name: string;
  department_id: number;
  department_name: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  slots_total: number;
  slots_booked: number;
  slots_available: number;
  is_on_leave: boolean;
  leave_reason: string | null;
  estimated_wait_minutes: number | null;
  availability_status: "AVAILABLE" | "FEW_SLOTS" | "FULL" | "ON_LEAVE";
  consultation_fee: number;
  follow_up_fee: number;
}

interface Patient {
  id: number;
  uhid: string;
  first_name: string;
  last_name: string;
  phone: string;
  gender: string;
  date_of_birth: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
}

// ─── Symptom to Department Mapping ────────────────────────────────────────────

const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  "Cardiology": ["heart", "chest pain", "bp", "blood pressure", "palpitation", "breathless"],
  "General Medicine": ["fever", "cold", "cough", "weakness", "fatigue", "body pain"],
  "Orthopedics": ["bone", "joint", "fracture", "knee", "back pain", "spine", "shoulder"],
  "Pediatrics": ["child", "baby", "infant", "kid"],
  "Dermatology": ["skin", "rash", "allergy", "itching", "acne", "hair fall"],
  "Ophthalmology": ["eye", "vision", "glasses", "cataract"],
  "Gynecology": ["pregnancy", "periods", "menstrual", "pcod", "pcos"],
  "Neurology": ["headache", "migraine", "nerve", "paralysis", "stroke", "seizure"],
  "ENT": ["ear", "nose", "throat", "hearing", "sinus", "tonsil"],
  "Gastroenterology": ["stomach", "acidity", "digestion", "liver", "jaundice"],
};

function matchDepartment(query: string): string | null {
  const q = query.toLowerCase();
  for (const [dept, keywords] of Object.entries(SYMPTOM_KEYWORDS)) {
    if (keywords.some(k => q.includes(k))) return dept;
  }
  return null;
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    AVAILABLE: { bg: "bg-green-100", text: "text-green-700", label: "Available" },
    FEW_SLOTS: { bg: "bg-amber-100", text: "text-amber-700", label: "Few Slots" },
    FULL: { bg: "bg-red-100", text: "text-red-600", label: "Fully Booked" },
    ON_LEAVE: { bg: "bg-gray-100", text: "text-gray-500", label: "On Leave" },
  };
  const c = config[status] || config.AVAILABLE;
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", c.bg, c.text)}>
      {c.label}
    </span>
  );
}

function DoctorCard({
  doctor,
  selected,
  onSelect,
}: {
  doctor: Doctor;
  selected: boolean;
  onSelect: () => void;
}) {
  const canBook = doctor.availability_status !== "FULL" && doctor.availability_status !== "ON_LEAVE";
  const slotPct = doctor.slots_total > 0 ? (doctor.slots_booked / doctor.slots_total) * 100 : 0;

  return (
    <div
      onClick={canBook ? onSelect : undefined}
      className={cn(
        "bg-white rounded-xl border-2 p-4 transition-all",
        selected ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-100",
        canBook ? "cursor-pointer hover:border-blue-300 hover:shadow-md" : "opacity-60 cursor-not-allowed"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{doctor.doctor_name}</p>
            <p className="text-xs text-gray-500">{doctor.specialization}</p>
          </div>
        </div>
        <StatusBadge status={doctor.availability_status} />
      </div>

      {/* Details */}
      <div className="text-xs text-gray-500 mb-3">
        {doctor.qualification} · {doctor.experience_years} yrs experience
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Slots */}
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Users className="w-3 h-3" />
            <span className="text-[10px]">Slots</span>
          </div>
          <p className="text-sm font-bold text-gray-700">
            {doctor.slots_booked}/{doctor.slots_total}
          </p>
          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                slotPct >= 90 ? "bg-red-500" : slotPct >= 70 ? "bg-amber-500" : "bg-green-500"
              )}
              style={{ width: `${slotPct}%` }}
            />
          </div>
        </div>

        {/* Wait Time */}
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Timer className="w-3 h-3" />
            <span className="text-[10px]">Wait</span>
          </div>
          <p className="text-sm font-bold text-gray-700">
            {doctor.estimated_wait_minutes != null
              ? doctor.estimated_wait_minutes < 60
                ? `${doctor.estimated_wait_minutes}m`
                : `${Math.round(doctor.estimated_wait_minutes / 60)}h`
              : "—"}
          </p>
        </div>

        {/* Fee */}
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <IndianRupee className="w-3 h-3" />
            <span className="text-[10px]">Fee</span>
          </div>
          <p className="text-sm font-bold text-gray-700">₹{doctor.consultation_fee}</p>
          <p className="text-[9px] text-gray-400">F/up ₹{doctor.follow_up_fee}</p>
        </div>
      </div>

      {/* Book Button */}
      {canBook && (
        <Button
          size="sm"
          className={cn(
            "w-full",
            selected ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          {selected ? "Selected" : "Select Doctor"}
        </Button>
      )}

      {doctor.availability_status === "FULL" && (
        <p className="text-xs text-center text-gray-400 mt-2">No slots available today</p>
      )}
      {doctor.availability_status === "ON_LEAVE" && (
        <p className="text-xs text-center text-gray-400 mt-2">
          {doctor.leave_reason || "On Leave"}
        </p>
      )}
    </div>
  );
}

function PatientCard({
  patient,
  selected,
  onSelect,
  feeInfo,
}: {
  patient: Patient;
  selected: boolean;
  onSelect: () => void;
  feeInfo?: { visit_type: string; fee: number; days_since: number | null };
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "bg-white rounded-lg border p-3 cursor-pointer transition-all",
        selected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
          {patient.first_name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {patient.first_name} {patient.last_name}
          </p>
          <p className="text-xs text-gray-500">
            {patient.uhid} · {patient.gender[0]}/{calcAge(patient.date_of_birth)} · {patient.phone}
          </p>
        </div>
        {feeInfo && feeInfo.visit_type === "FOLLOW_UP" && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
            Follow-up · ₹{feeInfo.fee}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewAppointmentPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  // Step management
  const [step, setStep] = useState<1 | 2>(1); // 1 = Select Doctor, 2 = Book Patient

  // Step 1: Doctor selection
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Step 2: Patient selection
  const [patientSearch, setPatientSearch] = useState("");
  const [debouncedPatientSearch, setDebouncedPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({
    first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "",
  });
  const [complaint, setComplaint] = useState("");

  // Debounce patient search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedPatientSearch(patientSearch), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [patientSearch]);

  // Auto-detect department from symptom search
  useEffect(() => {
    if (searchQuery.length >= 3) {
      const matched = matchDepartment(searchQuery);
      if (matched) {
        const dept = departments?.find((d: Department) => d.name === matched);
        if (dept) setSelectedDeptId(dept.id);
      }
    }
  }, [searchQuery]);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: () => api.get("/api/masters/departments").then(r => r.data),
  });

  const { data: doctors = [], isLoading: loadingDoctors } = useQuery<Doctor[]>({
    queryKey: ["doctors-availability", selectedDeptId, today],
    queryFn: () => {
      let url = `/api/appointments/doctors-availability?date=${today}`;
      if (selectedDeptId) url += `&department_id=${selectedDeptId}`;
      return api.get(url).then(r => r.data);
    },
  });

  const { data: patients = [], isFetching: searchingPatients } = useQuery<Patient[]>({
    queryKey: ["patient-search", debouncedPatientSearch],
    queryFn: () => api.get(`/api/patients?q=${debouncedPatientSearch}&limit=10`).then(r => r.data),
    enabled: debouncedPatientSearch.length >= 2,
  });

  const { data: feeEstimate } = useQuery({
    queryKey: ["fee-estimate", selectedPatient?.id, selectedDoctor?.doctor_id],
    queryFn: () => api.get(`/api/appointments/fee-estimate?patient_id=${selectedPatient!.id}&doctor_id=${selectedDoctor!.doctor_id}`).then(r => r.data),
    enabled: !!(selectedPatient && selectedDoctor),
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const registerMut = useMutation({
    mutationFn: (body: typeof regForm) => api.post("/api/patients/quick-register", body).then(r => r.data),
    onSuccess: (data) => {
      setSelectedPatient(data);
      setShowRegister(false);
      setRegForm({ first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "" });
      toast.success(`Patient registered: ${data.uhid}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed"),
  });

  const bookMut = useMutation({
    mutationFn: (body: any) => api.post("/api/appointments", body).then(r => r.data),
    onSuccess: async (appt) => {
      // Check-in immediately for walk-in
      try {
        await api.post(`/api/appointments/${appt.id}/checkin`);
      } catch {}
      qc.invalidateQueries({ queryKey: ["opd-queue"] });
      toast.success(`Appointment booked! Token #${appt.token_number}`);
      router.push("/opd");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Booking failed"),
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleDoctorSelect(doc: Doctor) {
    setSelectedDoctor(doc);
    setStep(2);
  }

  function handleBook() {
    if (!selectedDoctor || !selectedPatient) return;

    bookMut.mutate({
      patient_id: selectedPatient.id,
      doctor_id: selectedDoctor.doctor_id,
      department_id: selectedDoctor.department_id,
      appointment_date: today,
      appointment_time: format(new Date(), "HH:mm:ss"),
      appointment_type: feeEstimate?.visit_type === "FOLLOW_UP" ? "FOLLOW_UP" : "WALK_IN",
      visit_type: feeEstimate?.visit_type || "NEW",
      chief_complaint: complaint || null,
    });
  }

  function handleRegister() {
    if (!regForm.first_name || !regForm.phone || !regForm.date_of_birth) {
      toast.error("Name, phone and date of birth are required");
      return;
    }
    registerMut.mutate(regForm);
  }

  // Filter doctors by search query (name or department)
  const filteredDoctors = doctors.filter((doc: Doctor) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.doctor_name.toLowerCase().includes(q) ||
      doc.department_name.toLowerCase().includes(q) ||
      doc.specialization.toLowerCase().includes(q)
    );
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="New Appointment" />

        {/* Step Indicator */}
        <div className="bg-white border-b px-6 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStep(1)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                step === 1 ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
              )}
            >
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                step === 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              )}>1</span>
              Select Doctor
            </button>

            <ChevronRight className="w-4 h-4 text-gray-300" />

            <button
              onClick={() => selectedDoctor && setStep(2)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                step === 2 ? "bg-blue-100 text-blue-700" : "text-gray-500",
                !selectedDoctor && "opacity-50 cursor-not-allowed"
              )}
              disabled={!selectedDoctor}
            >
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                step === 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              )}>2</span>
              Book Patient
            </button>

            {/* Selected Doctor Chip */}
            {selectedDoctor && (
              <div className="ml-auto flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full">
                <Stethoscope className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">{selectedDoctor.doctor_name}</span>
                <span className="text-xs text-blue-500">₹{feeEstimate?.fee || selectedDoctor.consultation_fee}</span>
                <button
                  onClick={() => { setSelectedDoctor(null); setStep(1); }}
                  className="ml-1 text-blue-400 hover:text-blue-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Select Doctor */}
          {step === 1 && (
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Search & Filter */}
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by symptom, department, or doctor name..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Quick Department Filters */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => setSelectedDeptId(null)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all",
                      selectedDeptId === null ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    All Departments
                  </button>
                  {(departments as Department[]).slice(0, 6).map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedDeptId(dept.id === selectedDeptId ? null : dept.id)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium transition-all",
                        selectedDeptId === dept.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctors Grid */}
              {loadingDoctors ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>No doctors found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDoctors.map((doc: Doctor) => (
                    <DoctorCard
                      key={doc.doctor_id}
                      doctor={doc}
                      selected={selectedDoctor?.doctor_id === doc.doctor_id}
                      onSelect={() => handleDoctorSelect(doc)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Book Patient */}
          {step === 2 && selectedDoctor && (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Patient Search */}
              <div className="bg-white rounded-xl border p-4">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Find Patient</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by phone, UHID, or name..."
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    className="pl-10"
                  />
                  {searchingPatients && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>

                {/* Search Results */}
                {debouncedPatientSearch.length >= 2 && patients.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {(patients as Patient[]).map(p => (
                      <PatientCard
                        key={p.id}
                        patient={p}
                        selected={selectedPatient?.id === p.id}
                        onSelect={() => setSelectedPatient(p)}
                        feeInfo={selectedPatient?.id === p.id ? feeEstimate : undefined}
                      />
                    ))}
                  </div>
                )}

                {debouncedPatientSearch.length >= 2 && patients.length === 0 && !searchingPatients && (
                  <div className="mt-3 text-center py-4 text-gray-500 text-sm">
                    No patients found
                  </div>
                )}

                {/* Register New */}
                <button
                  onClick={() => setShowRegister(!showRegister)}
                  className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <UserPlus className="w-4 h-4" />
                  Register New Patient
                </button>

                {/* Quick Registration Form */}
                {showRegister && (
                  <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                    <p className="text-sm font-medium text-blue-800">Quick Registration</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">First Name *</Label>
                        <Input
                          value={regForm.first_name}
                          onChange={e => setRegForm(f => ({ ...f, first_name: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Last Name</Label>
                        <Input
                          value={regForm.last_name}
                          onChange={e => setRegForm(f => ({ ...f, last_name: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Phone *</Label>
                        <Input
                          value={regForm.phone}
                          onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))}
                          className="mt-1"
                          maxLength={10}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Date of Birth *</Label>
                        <Input
                          type="date"
                          value={regForm.date_of_birth}
                          onChange={e => setRegForm(f => ({ ...f, date_of_birth: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Gender</Label>
                      <div className="flex gap-3 mt-1">
                        {["MALE", "FEMALE", "OTHER"].map(g => (
                          <button
                            key={g}
                            onClick={() => setRegForm(f => ({ ...f, gender: g }))}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                              regForm.gender === g ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleRegister}
                      disabled={registerMut.isPending}
                      className="w-full"
                    >
                      {registerMut.isPending ? "Registering..." : "Register & Select"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Chief Complaint */}
              {selectedPatient && (
                <div className="bg-white rounded-xl border p-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Chief Complaint (Optional)</Label>
                  <Textarea
                    placeholder="Why is the patient visiting today?"
                    value={complaint}
                    onChange={e => setComplaint(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              {/* Booking Summary */}
              {selectedPatient && (
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Booking Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Patient</span>
                      <span className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Doctor</span>
                      <span className="font-medium">{selectedDoctor.doctor_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Department</span>
                      <span>{selectedDoctor.department_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Visit Type</span>
                      <Badge variant="outline" className={
                        feeEstimate?.visit_type === "FOLLOW_UP"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }>
                        {feeEstimate?.visit_type || "NEW"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Est. Wait</span>
                      <span>{selectedDoctor.estimated_wait_minutes} min</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between text-base font-semibold">
                      <span>Consultation Fee</span>
                      <span className="text-blue-600">₹{feeEstimate?.fee || selectedDoctor.consultation_fee}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4"
                    size="lg"
                    onClick={handleBook}
                    disabled={bookMut.isPending}
                  >
                    {bookMut.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirm Booking
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Back Button */}
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Doctor Selection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
