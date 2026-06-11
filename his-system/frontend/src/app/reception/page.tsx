"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { cn, calcAge } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, UserPlus, X, ChevronRight, ChevronLeft,
  Users, CheckCircle2, Stethoscope,
  AlertTriangle, Loader2, IndianRupee, Timer,
  CalendarPlus, ListChecks, UserSearch, XCircle,
  LogIn, FileText, Edit, AlertCircle,
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
  address_line1?: string;
  city?: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Appointment {
  id: number;
  appointment_no: string;
  patient_id: number;
  doctor_id: number;
  department_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  token_number: number | null;
  patient_name: string;
  patient_uhid: string;
  patient_phone: string;
  doctor_name: string;
  department_name: string;
  chief_complaint: string | null;
}

interface DuplicateMatch {
  id: number;
  uhid: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh",
];

const BLOOD_GROUPS = ["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"];
const BLOOD_GROUP_LABELS: Record<string, string> = {
  A_POSITIVE: "A+", A_NEGATIVE: "A-", B_POSITIVE: "B+", B_NEGATIVE: "B-",
  AB_POSITIVE: "AB+", AB_NEGATIVE: "AB-", O_POSITIVE: "O+", O_NEGATIVE: "O-",
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
    FULL: { bg: "bg-red-100", text: "text-red-600", label: "Full" },
    ON_LEAVE: { bg: "bg-gray-100", text: "text-gray-500", label: "On Leave" },
    SCHEDULED: { bg: "bg-slate-100", text: "text-slate-700", label: "Scheduled" },
    CHECKED_IN: { bg: "bg-blue-100", text: "text-blue-700", label: "Checked In" },
    IN_QUEUE: { bg: "bg-amber-100", text: "text-amber-700", label: "In Queue" },
    WITH_DOCTOR: { bg: "bg-violet-100", text: "text-violet-700", label: "With Doctor" },
    COMPLETED: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
    CANCELLED: { bg: "bg-red-100", text: "text-red-600", label: "Cancelled" },
  };
  const c = config[status] || { bg: "bg-gray-100", text: "text-gray-600", label: status };
  return <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", c.bg, c.text)}>{c.label}</span>;
}

function DoctorCard({ doctor, selected, onSelect }: { doctor: Doctor; selected: boolean; onSelect: () => void }) {
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
      <div className="text-xs text-gray-500 mb-3">{doctor.qualification} · {doctor.experience_years} yrs</div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Users className="w-3 h-3" /><span className="text-[10px]">Slots</span>
          </div>
          <p className="text-sm font-bold text-gray-700">{doctor.slots_booked}/{doctor.slots_total}</p>
          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full", slotPct >= 90 ? "bg-red-500" : slotPct >= 70 ? "bg-amber-500" : "bg-green-500")} style={{ width: `${slotPct}%` }} />
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <Timer className="w-3 h-3" /><span className="text-[10px]">Wait</span>
          </div>
          <p className="text-sm font-bold text-gray-700">{doctor.estimated_wait_minutes != null ? `${doctor.estimated_wait_minutes}m` : "—"}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
            <IndianRupee className="w-3 h-3" /><span className="text-[10px]">Fee</span>
          </div>
          <p className="text-sm font-bold text-gray-700">₹{doctor.consultation_fee}</p>
        </div>
      </div>
      {canBook && (
        <Button size="sm" className={cn("w-full", selected ? "bg-blue-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200")} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
          {selected ? "Selected" : "Select"}
        </Button>
      )}
    </div>
  );
}

// ─── Full Registration Form Component ─────────────────────────────────────────

interface FullRegFormData {
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  phone: string;
  alternate_phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  aadhaar_last4: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  marital_status: string;
  occupation: string;
}

const EMPTY_FORM: FullRegFormData = {
  first_name: "", middle_name: "", last_name: "", date_of_birth: "", gender: "MALE",
  blood_group: "", phone: "", alternate_phone: "", email: "",
  address_line1: "", address_line2: "", city: "", district: "", state: "", pincode: "",
  aadhaar_last4: "", emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: "",
  marital_status: "", occupation: "",
};

function FullRegistrationForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (patient: Patient) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FullRegFormData>(EMPTY_FORM);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=Basic, 2=Address, 3=Emergency
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const registerMut = useMutation({
    mutationFn: (body: FullRegFormData) => api.post("/api/patients", {
      ...body,
      blood_group: body.blood_group || null,
      aadhaar_last4: body.aadhaar_last4 || null,
    }).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Patient registered: ${data.uhid}`);
      onSuccess(data);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed"),
  });

  async function checkDuplicate() {
    if (!form.phone || !form.date_of_birth) return;
    setCheckingDuplicate(true);
    try {
      const res = await api.get("/api/patients/check-duplicate", {
        params: { phone: form.phone, date_of_birth: form.date_of_birth, first_name: form.first_name },
      });
      if (res.data.is_duplicate) {
        setDuplicates(res.data.matches);
        setShowDuplicateWarning(true);
      } else {
        setDuplicates([]);
        setShowDuplicateWarning(false);
        setStep(2);
      }
    } catch {
      setStep(2);
    }
    setCheckingDuplicate(false);
  }

  function handleNext() {
    if (step === 1) {
      if (!form.first_name || !form.phone || !form.date_of_birth) {
        toast.error("Name, phone, and date of birth are required");
        return;
      }
      checkDuplicate();
    } else if (step === 2) {
      if (!form.address_line1 || !form.city || !form.state || !form.pincode) {
        toast.error("Address, city, state, and pincode are required");
        return;
      }
      setStep(3);
    }
  }

  function handleSubmit() {
    registerMut.mutate(form);
  }

  function handleUseExisting(patient: DuplicateMatch) {
    onSuccess({
      id: patient.id,
      uhid: patient.uhid,
      first_name: patient.first_name,
      last_name: patient.last_name,
      phone: patient.phone,
      gender: patient.gender,
      date_of_birth: patient.date_of_birth,
    });
  }

  const updateField = (field: keyof FullRegFormData, value: string) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="bg-white rounded-xl border p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">New Patient Registration</h2>
          <p className="text-sm text-gray-500">Step {step} of 3: {step === 1 ? "Basic Info" : step === 2 ? "Address" : "Emergency Contact"}</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className={cn("h-1.5 flex-1 rounded-full", s <= step ? "bg-blue-600" : "bg-gray-200")} />
        ))}
      </div>

      {/* Duplicate Warning */}
      {showDuplicateWarning && duplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">Possible Duplicate Found</p>
              <p className="text-sm text-amber-700 mt-1">A patient with the same phone and date of birth already exists.</p>
              <div className="mt-3 space-y-2">
                {duplicates.map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-white rounded-lg border border-amber-200 p-3">
                    <div>
                      <p className="font-medium">{d.first_name} {d.last_name}</p>
                      <p className="text-xs text-gray-500">{d.uhid} · {d.phone} · {d.gender}/{calcAge(d.date_of_birth)}yrs</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleUseExisting(d)}>Use This</Button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowDuplicateWarning(false); setStep(2); }}>
                  Create New Anyway
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && !showDuplicateWarning && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">First Name *</Label>
              <Input value={form.first_name} onChange={e => updateField("first_name", e.target.value)} className="mt-1" placeholder="Ramesh" />
            </div>
            <div>
              <Label className="text-xs">Middle Name</Label>
              <Input value={form.middle_name} onChange={e => updateField("middle_name", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Last Name *</Label>
              <Input value={form.last_name} onChange={e => updateField("last_name", e.target.value)} className="mt-1" placeholder="Kumar" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Date of Birth *</Label>
              <Input type="date" value={form.date_of_birth} onChange={e => updateField("date_of_birth", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Gender *</Label>
              <div className="flex gap-2 mt-1">
                {["MALE", "FEMALE", "OTHER"].map(g => (
                  <button key={g} onClick={() => updateField("gender", g)}
                    className={cn("px-3 py-2 rounded-lg text-xs font-medium border flex-1",
                      form.gender === g ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200")}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Blood Group</Label>
              <Select value={form.blood_group} onValueChange={v => updateField("blood_group", v || "")}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map(bg => (
                    <SelectItem key={bg} value={bg}>{BLOOD_GROUP_LABELS[bg]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Phone *</Label>
              <Input value={form.phone} onChange={e => updateField("phone", e.target.value)} className="mt-1" maxLength={10} placeholder="9876543210" />
            </div>
            <div>
              <Label className="text-xs">Alternate Phone</Label>
              <Input value={form.alternate_phone} onChange={e => updateField("alternate_phone", e.target.value)} className="mt-1" maxLength={10} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={e => updateField("email", e.target.value)} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Aadhaar (Last 4 digits only)</Label>
              <Input value={form.aadhaar_last4} onChange={e => updateField("aadhaar_last4", e.target.value)} className="mt-1" maxLength={4} placeholder="1234" />
              <p className="text-[10px] text-gray-400 mt-1">Full Aadhaar not stored per UIDAI norms</p>
            </div>
            <div>
              <Label className="text-xs">Marital Status</Label>
              <Select value={form.marital_status} onValueChange={v => updateField("marital_status", v || "")}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE">Single</SelectItem>
                  <SelectItem value="MARRIED">Married</SelectItem>
                  <SelectItem value="DIVORCED">Divorced</SelectItem>
                  <SelectItem value="WIDOWED">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Address */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Address Line 1 *</Label>
            <Input value={form.address_line1} onChange={e => updateField("address_line1", e.target.value)} className="mt-1" placeholder="House No., Street Name" />
          </div>
          <div>
            <Label className="text-xs">Address Line 2</Label>
            <Input value={form.address_line2} onChange={e => updateField("address_line2", e.target.value)} className="mt-1" placeholder="Landmark, Area" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">City *</Label>
              <Input value={form.city} onChange={e => updateField("city", e.target.value)} className="mt-1" placeholder="Mumbai" />
            </div>
            <div>
              <Label className="text-xs">District *</Label>
              <Input value={form.district} onChange={e => updateField("district", e.target.value)} className="mt-1" placeholder="Mumbai Suburban" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">State *</Label>
              <Select value={form.state} onValueChange={v => updateField("state", v || "")}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select State" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">PIN Code *</Label>
              <Input value={form.pincode} onChange={e => updateField("pincode", e.target.value)} className="mt-1" maxLength={6} placeholder="400001" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Occupation</Label>
            <Input value={form.occupation} onChange={e => updateField("occupation", e.target.value)} className="mt-1" placeholder="Business, Service, etc." />
          </div>
        </div>
      )}

      {/* Step 3: Emergency Contact */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Emergency contact is important for critical situations
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Contact Name</Label>
              <Input value={form.emergency_contact_name} onChange={e => updateField("emergency_contact_name", e.target.value)} className="mt-1" placeholder="Suresh Kumar" />
            </div>
            <div>
              <Label className="text-xs">Contact Phone</Label>
              <Input value={form.emergency_contact_phone} onChange={e => updateField("emergency_contact_phone", e.target.value)} className="mt-1" maxLength={10} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Relationship</Label>
            <Select value={form.emergency_contact_relation} onValueChange={v => updateField("emergency_contact_relation", v || "")}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select Relationship" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SPOUSE">Spouse</SelectItem>
                <SelectItem value="PARENT">Parent</SelectItem>
                <SelectItem value="CHILD">Child</SelectItem>
                <SelectItem value="SIBLING">Sibling</SelectItem>
                <SelectItem value="FRIEND">Friend</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Registration Summary</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="text-gray-500">Name:</p>
              <p className="font-medium">{form.first_name} {form.middle_name} {form.last_name}</p>
              <p className="text-gray-500">DOB / Gender:</p>
              <p className="font-medium">{form.date_of_birth} / {form.gender}</p>
              <p className="text-gray-500">Phone:</p>
              <p className="font-medium">{form.phone}</p>
              <p className="text-gray-500">Address:</p>
              <p className="font-medium">{form.city}, {form.state} - {form.pincode}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={step === 1 ? onCancel : () => setStep(s => (s - 1) as 1 | 2 | 3)}>
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        {step < 3 ? (
          <Button onClick={handleNext} disabled={checkingDuplicate}>
            {checkingDuplicate ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Checking...</> : "Next"}
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={registerMut.isPending}>
            {registerMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Registering...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Register Patient</>}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReceptionPage() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  // Tab state
  const [activeTab, setActiveTab] = useState<"new" | "appointments" | "patients">("new");

  // ─── TAB 1: New Appointment State ───────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [debouncedPatientSearch, setDebouncedPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickRegForm, setQuickRegForm] = useState({ first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "" });
  const [complaint, setComplaint] = useState("");

  // ─── TAB 2: Appointments State ──────────────────────────────────────────────
  const [apptFilter, setApptFilter] = useState<string>("all");

  // ─── TAB 3: Patients State ──────────────────────────────────────────────────
  const [patientSearchTab, setPatientSearchTab] = useState("");
  const [debouncedPatientSearchTab, setDebouncedPatientSearchTab] = useState("");
  const [showFullRegistration, setShowFullRegistration] = useState(false);

  // Debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedPatientSearch(patientSearch), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [patientSearch]);

  const debounceRef2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef2.current) clearTimeout(debounceRef2.current);
    debounceRef2.current = setTimeout(() => setDebouncedPatientSearchTab(patientSearchTab), 300);
    return () => { if (debounceRef2.current) clearTimeout(debounceRef2.current); };
  }, [patientSearchTab]);

  // Auto-detect department from symptom
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: () => api.get("/api/masters/departments").then(r => r.data),
  });

  useEffect(() => {
    if (searchQuery.length >= 3) {
      const matched = matchDepartment(searchQuery);
      if (matched) {
        const dept = departments.find((d: Department) => d.name === matched);
        if (dept) setSelectedDeptId(dept.id);
      }
    }
  }, [searchQuery, departments]);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: doctors = [], isLoading: loadingDoctors } = useQuery<Doctor[]>({
    queryKey: ["doctors-availability", selectedDeptId, today],
    queryFn: () => {
      let url = `/api/appointments/doctors-availability?date=${today}`;
      if (selectedDeptId) url += `&department_id=${selectedDeptId}`;
      return api.get(url).then(r => r.data);
    },
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["patient-search", debouncedPatientSearch],
    queryFn: () => api.get(`/api/patients?q=${debouncedPatientSearch}&limit=10`).then(r => r.data),
    enabled: debouncedPatientSearch.length >= 2,
    select: (data: any) => data.data || data,
  });

  const { data: patientsTab = [], isFetching: searchingPatientsTab } = useQuery<Patient[]>({
    queryKey: ["patient-search-tab", debouncedPatientSearchTab],
    queryFn: () => api.get(`/api/patients?q=${debouncedPatientSearchTab}&limit=20`).then(r => r.data),
    enabled: debouncedPatientSearchTab.length >= 2,
    select: (data: any) => data.data || data,
  });

  // Fetch recent patients when no search query (default view)
  const { data: recentPatients = [], isLoading: loadingRecentPatients } = useQuery<Patient[]>({
    queryKey: ["recent-patients"],
    queryFn: () => api.get("/api/patients?limit=30").then(r => r.data),
    enabled: debouncedPatientSearchTab.length < 2,
    select: (data: any) => data.data || data,
  });

  const { data: feeEstimate } = useQuery({
    queryKey: ["fee-estimate", selectedPatient?.id, selectedDoctor?.doctor_id],
    queryFn: () => api.get(`/api/appointments/fee-estimate?patient_id=${selectedPatient!.id}&doctor_id=${selectedDoctor!.doctor_id}`).then(r => r.data),
    enabled: !!(selectedPatient && selectedDoctor),
  });

  const { data: appointments = [], isLoading: loadingAppts } = useQuery<Appointment[]>({
    queryKey: ["appointments-today", today],
    queryFn: () => api.get(`/api/appointments?appointment_date=${today}`).then(r => r.data),
    refetchInterval: 15000,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const quickRegisterMut = useMutation({
    mutationFn: (body: typeof quickRegForm) => api.post("/api/patients/quick-register", body).then(r => r.data),
    onSuccess: (data) => {
      setSelectedPatient(data);
      setShowQuickRegister(false);
      setQuickRegForm({ first_name: "", last_name: "", phone: "", gender: "MALE", date_of_birth: "" });
      toast.success(`Registered: ${data.uhid}`);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed"),
  });

  const bookMut = useMutation({
    mutationFn: (body: any) => api.post("/api/appointments", body).then(r => r.data),
    onSuccess: async (appt) => {
      try { await api.post(`/api/appointments/${appt.id}/checkin`); } catch {}
      qc.invalidateQueries({ queryKey: ["appointments-today"] });
      qc.invalidateQueries({ queryKey: ["doctors-availability"] });
      toast.success(`Booked! Token #${appt.token_number}`);
      setSelectedDoctor(null);
      setSelectedPatient(null);
      setComplaint("");
      setStep(1);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Booking failed"),
  });

  const checkinMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/appointments/${id}/checkin`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments-today"] }); toast.success("Checked in"); },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Check-in failed"),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/appointments/${id}/cancel`, { reason: "Cancelled at reception" }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments-today"] });
      qc.invalidateQueries({ queryKey: ["doctors-availability"] });
      toast.success("Cancelled");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Cancel failed"),
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

  function handleQuickRegister() {
    if (!quickRegForm.first_name || !quickRegForm.phone || !quickRegForm.date_of_birth) {
      toast.error("Name, phone and DOB required");
      return;
    }
    quickRegisterMut.mutate(quickRegForm);
  }

  // Filter
  const filteredDoctors = doctors.filter((doc: Doctor) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return doc.doctor_name.toLowerCase().includes(q) || doc.department_name.toLowerCase().includes(q);
  });

  const filteredAppointments = appointments.filter((a: Appointment) => apptFilter === "all" || a.status === apptFilter);

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter((a: Appointment) => a.status === "SCHEDULED").length,
    checkedIn: appointments.filter((a: Appointment) => a.status === "CHECKED_IN" || a.status === "IN_QUEUE").length,
    withDoctor: appointments.filter((a: Appointment) => a.status === "WITH_DOCTOR").length,
    completed: appointments.filter((a: Appointment) => a.status === "COMPLETED").length,
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="Reception Desk" />

        {/* Tab Bar */}
        <div className="bg-white border-b px-6 py-2">
          <div className="flex items-center gap-1">
            <button onClick={() => setActiveTab("new")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === "new" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100")}>
              <CalendarPlus className="w-4 h-4" />New Appointment
            </button>
            <button onClick={() => setActiveTab("appointments")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === "appointments" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100")}>
              <ListChecks className="w-4 h-4" />Appointments<span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">{stats.total}</span>
            </button>
            <button onClick={() => setActiveTab("patients")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === "patients" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100")}>
              <UserSearch className="w-4 h-4" />Patients
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: NEW APPOINTMENT */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "new" && (
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Step indicator */}
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setStep(1)} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium", step === 1 ? "bg-blue-100 text-blue-700" : "text-gray-500")}>
                  <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold", step === 1 ? "bg-blue-600 text-white" : "bg-gray-200")}>1</span>Select Doctor
                </button>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <button onClick={() => selectedDoctor && setStep(2)} disabled={!selectedDoctor} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium", step === 2 ? "bg-blue-100 text-blue-700" : "text-gray-500", !selectedDoctor && "opacity-50")}>
                  <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold", step === 2 ? "bg-blue-600 text-white" : "bg-gray-200")}>2</span>Book Patient
                </button>
                {selectedDoctor && (
                  <div className="ml-auto flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">{selectedDoctor.doctor_name}</span>
                    <span className="text-xs text-blue-500">₹{feeEstimate?.fee || selectedDoctor.consultation_fee}</span>
                    <button onClick={() => { setSelectedDoctor(null); setStep(1); }} className="text-blue-400 hover:text-blue-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>

              {/* STEP 1: Doctor Selection */}
              {step === 1 && (
                <>
                  <div className="bg-white rounded-xl border p-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input placeholder="Search by symptom, department, or doctor name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button onClick={() => setSelectedDeptId(null)} className={cn("px-3 py-1 rounded-full text-xs font-medium", selectedDeptId === null ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>All</button>
                      {departments.slice(0, 6).map((dept: Department) => (
                        <button key={dept.id} onClick={() => setSelectedDeptId(dept.id === selectedDeptId ? null : dept.id)} className={cn("px-3 py-1 rounded-full text-xs font-medium", selectedDeptId === dept.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>{dept.name}</button>
                      ))}
                    </div>
                  </div>
                  {loadingDoctors ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredDoctors.map((doc: Doctor) => (
                        <DoctorCard key={doc.doctor_id} doctor={doc} selected={selectedDoctor?.doctor_id === doc.doctor_id} onSelect={() => handleDoctorSelect(doc)} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* STEP 2: Patient Selection */}
              {step === 2 && selectedDoctor && (
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="bg-white rounded-xl border p-4">
                    <Label className="text-sm font-medium mb-2 block">Find Patient</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input placeholder="Search by phone, UHID, or name..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className="pl-10" />
                    </div>
                    {debouncedPatientSearch.length >= 2 && patients.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {patients.map((p: Patient) => (
                          <div key={p.id} onClick={() => setSelectedPatient(p)} className={cn("p-3 rounded-lg border cursor-pointer transition-all", selectedPatient?.id === p.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300")}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{p.first_name[0]}</div>
                              <div>
                                <p className="font-medium">{p.first_name} {p.last_name}</p>
                                <p className="text-xs text-gray-500">{p.uhid} · {p.gender[0]}/{calcAge(p.date_of_birth)} · {p.phone}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setShowQuickRegister(!showQuickRegister)} className="mt-3 flex items-center gap-2 text-sm text-blue-600">
                      <UserPlus className="w-4 h-4" />Quick Register (Walk-in)
                    </button>
                    {showQuickRegister && (
                      <div className="mt-3 p-4 bg-blue-50 rounded-lg space-y-3">
                        <p className="text-xs text-blue-800 font-medium">Minimal details for walk-in — complete profile later</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs">First Name *</Label><Input value={quickRegForm.first_name} onChange={e => setQuickRegForm(f => ({ ...f, first_name: e.target.value }))} className="mt-1" /></div>
                          <div><Label className="text-xs">Last Name</Label><Input value={quickRegForm.last_name} onChange={e => setQuickRegForm(f => ({ ...f, last_name: e.target.value }))} className="mt-1" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs">Phone *</Label><Input value={quickRegForm.phone} onChange={e => setQuickRegForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" maxLength={10} /></div>
                          <div><Label className="text-xs">Date of Birth *</Label><Input type="date" value={quickRegForm.date_of_birth} onChange={e => setQuickRegForm(f => ({ ...f, date_of_birth: e.target.value }))} className="mt-1" /></div>
                        </div>
                        <div>
                          <Label className="text-xs">Gender</Label>
                          <div className="flex gap-2 mt-1">
                            {["MALE", "FEMALE", "OTHER"].map(g => (
                              <button key={g} onClick={() => setQuickRegForm(f => ({ ...f, gender: g }))} className={cn("px-3 py-1.5 rounded text-xs font-medium border", quickRegForm.gender === g ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200")}>{g}</button>
                            ))}
                          </div>
                        </div>
                        <Button size="sm" onClick={handleQuickRegister} disabled={quickRegisterMut.isPending} className="w-full">
                          {quickRegisterMut.isPending ? "Registering..." : "Register & Select"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {selectedPatient && (
                    <>
                      <div className="bg-white rounded-xl border p-4">
                        <Label className="text-sm font-medium mb-2 block">Chief Complaint</Label>
                        <Textarea placeholder="Why is the patient visiting?" value={complaint} onChange={e => setComplaint(e.target.value)} rows={2} />
                      </div>
                      <div className="bg-white rounded-xl border p-4">
                        <p className="text-sm font-medium mb-3">Booking Summary</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Patient</span><span className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Doctor</span><span className="font-medium">{selectedDoctor.doctor_name}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Department</span><span>{selectedDoctor.department_name}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Type</span><Badge variant="outline" className={feeEstimate?.visit_type === "FOLLOW_UP" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}>{feeEstimate?.visit_type || "NEW"}</Badge></div>
                          <hr className="my-2" />
                          <div className="flex justify-between text-base font-semibold"><span>Fee</span><span className="text-blue-600">₹{feeEstimate?.fee || selectedDoctor.consultation_fee}</span></div>
                        </div>
                        <Button className="w-full mt-4" onClick={handleBook} disabled={bookMut.isPending}>
                          {bookMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Booking...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Confirm Booking</>}
                        </Button>
                      </div>
                    </>
                  )}
                  <button onClick={() => setStep(1)} className="flex items-center gap-2 text-sm text-gray-500"><ChevronLeft className="w-4 h-4" />Back</button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: APPOINTMENTS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "appointments" && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "Total", value: stats.total, color: "bg-gray-100 text-gray-700" },
                  { label: "Scheduled", value: stats.scheduled, color: "bg-slate-100 text-slate-700" },
                  { label: "Checked In", value: stats.checkedIn, color: "bg-blue-100 text-blue-700" },
                  { label: "With Doctor", value: stats.withDoctor, color: "bg-violet-100 text-violet-700" },
                  { label: "Completed", value: stats.completed, color: "bg-green-100 text-green-700" },
                ].map(s => (
                  <div key={s.label} className={cn("rounded-xl p-3 text-center", s.color)}>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Filter */}
              <div className="flex gap-2">
                {["all", "SCHEDULED", "CHECKED_IN", "IN_QUEUE", "WITH_DOCTOR", "COMPLETED", "CANCELLED"].map(f => (
                  <button key={f} onClick={() => setApptFilter(f)} className={cn("px-3 py-1 rounded-full text-xs font-medium", apptFilter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                    {f === "all" ? "All" : f.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Token</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingAppts ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : filteredAppointments.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No appointments</TableCell></TableRow>
                    ) : (
                      filteredAppointments.map((a: Appointment) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono font-bold text-blue-600">#{a.token_number || "-"}</TableCell>
                          <TableCell><p className="font-medium">{a.patient_name}</p><p className="text-xs text-gray-500">{a.patient_uhid}</p></TableCell>
                          <TableCell><p>{a.doctor_name}</p><p className="text-xs text-gray-500">{a.department_name}</p></TableCell>
                          <TableCell>{a.appointment_time?.substring(0, 5)}</TableCell>
                          <TableCell><StatusBadge status={a.status} /></TableCell>
                          <TableCell className="text-right">
                            {a.status === "SCHEDULED" && (
                              <Button size="sm" variant="outline" onClick={() => checkinMut.mutate(a.id)} disabled={checkinMut.isPending}><LogIn className="w-3.5 h-3.5 mr-1" />Check In</Button>
                            )}
                            {(a.status === "SCHEDULED" || a.status === "CHECKED_IN") && (
                              <Button size="sm" variant="ghost" className="text-red-600 ml-2" onClick={() => cancelMut.mutate(a.id)} disabled={cancelMut.isPending}><XCircle className="w-3.5 h-3.5" /></Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: PATIENTS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === "patients" && (
            <div className="max-w-4xl mx-auto space-y-4">
              {showFullRegistration ? (
                <FullRegistrationForm
                  onSuccess={(patient) => {
                    setShowFullRegistration(false);
                    qc.invalidateQueries({ queryKey: ["patient-search-tab"] });
                    qc.invalidateQueries({ queryKey: ["recent-patients"] });
                    toast.success(`Patient ${patient.uhid} registered successfully`);
                  }}
                  onCancel={() => setShowFullRegistration(false)}
                />
              ) : (
                <>
                  {/* Search + Register Button */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-white rounded-xl border p-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder="Search by phone, UHID, or name..." value={patientSearchTab} onChange={e => setPatientSearchTab(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    <Button onClick={() => setShowFullRegistration(true)} className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />Full Registration
                    </Button>
                  </div>

                  {/* Loading */}
                  {searchingPatientsTab && (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
                  )}

                  {/* Results */}
                  {!searchingPatientsTab && debouncedPatientSearchTab.length >= 2 && (
                    <div className="bg-white rounded-xl border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>UHID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Age/Gender</TableHead>
                            <TableHead>Profile</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {patientsTab.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No patients found</TableCell></TableRow>
                          ) : (
                            patientsTab.map((p: Patient) => {
                              const isIncomplete = !p.city || p.city === "—" || p.address_line1 === "To be updated";
                              return (
                                <TableRow key={p.id}>
                                  <TableCell className="font-mono text-blue-600">{p.uhid}</TableCell>
                                  <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                                  <TableCell>{p.phone}</TableCell>
                                  <TableCell>{calcAge(p.date_of_birth)} / {p.gender[0]}</TableCell>
                                  <TableCell>
                                    {isIncomplete ? (
                                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                        <AlertCircle className="w-3 h-3 mr-1" />Incomplete
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />Complete
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right space-x-2">
                                    <Button size="sm" variant="outline" onClick={() => { setSelectedPatient(p); setActiveTab("new"); setStep(2); }}>
                                      <CalendarPlus className="w-3.5 h-3.5 mr-1" />Book
                                    </Button>
                                    {isIncomplete && (
                                      <Button size="sm" variant="ghost" className="text-amber-600">
                                        <Edit className="w-3.5 h-3.5 mr-1" />Complete
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Recent Patients (when no search) */}
                  {debouncedPatientSearchTab.length < 2 && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">All Patients ({recentPatients.length})</p>
                      </div>
                      {loadingRecentPatients ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
                      ) : (
                        <div className="bg-white rounded-xl border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>UHID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Age/Gender</TableHead>
                                <TableHead>Profile</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {recentPatients.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No patients registered yet</TableCell></TableRow>
                              ) : (
                                recentPatients.map((p: Patient) => {
                                  const isIncomplete = !p.city || p.city === "—" || p.address_line1 === "To be updated";
                                  return (
                                    <TableRow key={p.id}>
                                      <TableCell className="font-mono text-blue-600">{p.uhid}</TableCell>
                                      <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                                      <TableCell>{p.phone}</TableCell>
                                      <TableCell>{calcAge(p.date_of_birth)} / {p.gender[0]}</TableCell>
                                      <TableCell>
                                        {isIncomplete ? (
                                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                            <AlertCircle className="w-3 h-3 mr-1" />Incomplete
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />Complete
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="outline" onClick={() => { setSelectedPatient(p); setActiveTab("new"); setStep(2); }}>
                                          <CalendarPlus className="w-3.5 h-3.5 mr-1" />Book
                                        </Button>
                                        {isIncomplete && (
                                          <Button size="sm" variant="ghost" className="text-amber-600">
                                            <Edit className="w-3.5 h-3.5 mr-1" />Complete
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
