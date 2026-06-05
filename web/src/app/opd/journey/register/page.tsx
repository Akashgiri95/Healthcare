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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { calcAge } from "@/lib/utils";
import { useJourneyStore } from "@/store/journey";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, ChevronRight, SkipForward, User, MapPin, Phone, Droplet, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATES = ["Gujarat","Maharashtra","Rajasthan","Delhi","Karnataka","Tamil Nadu","Uttar Pradesh","West Bengal","Telangana","Kerala","Madhya Pradesh","Punjab","Haryana","Bihar","Odisha"];
const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const RELATIONS = ["Spouse","Parent","Child","Sibling","Friend","Other"];

function FieldRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon: React.ElementType }) {
  const filled = !!value && value !== "To be updated" && value !== "—" && value !== "000000";
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      {filled ? (
        <span className="text-sm text-gray-800 flex-1">{value}</span>
      ) : (
        <span className="text-sm text-gray-400 italic flex-1">Not provided</span>
      )}
      {filled
        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
        : <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      }
    </div>
  );
}

export default function JourneyRegisterPage() {
  const router = useRouter();
  const { patient, completeStep } = useJourneyStore();

  const [form, setForm] = useState({
    address_line1: "",
    city: "",
    district: "",
    state: "Gujarat",
    pincode: "",
    blood_group: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
    insurance_provider: "",
    insurance_policy_no: "",
    ayushman_card_no: "",
  });

  const { data: full } = useQuery({
    queryKey: ["patient-full", patient?.id],
    queryFn: () => api.get(`/api/patients/${patient!.id}`).then(r => r.data as Record<string, string | null>),
    enabled: !!patient?.id,
  });

  useEffect(() => {
    if (!full) return;
    setForm({
      address_line1: full.address_line1 === "To be updated" ? "" : (full.address_line1 ?? ""),
      city: full.city === "—" ? "" : (full.city ?? ""),
      district: full.district === "—" ? "" : (full.district ?? ""),
      state: full.state ?? "Gujarat",
      pincode: full.pincode === "000000" ? "" : (full.pincode ?? ""),
      blood_group: full.blood_group ?? "",
      emergency_contact_name: full.emergency_contact_name ?? "",
      emergency_contact_phone: full.emergency_contact_phone ?? "",
      emergency_contact_relation: full.emergency_contact_relation ?? "",
      insurance_provider: full.insurance_provider ?? "",
      insurance_policy_no: full.insurance_policy_no ?? "",
      ayushman_card_no: full.ayushman_card_no ?? "",
    });
  }, [full]);

  const updateMut = useMutation({
    mutationFn: (body: object) => api.put(`/api/patients/${patient!.id}`, body).then(r => r.data),
    onSuccess: () => {
      completeStep(2);
      toast.success("Registration complete");
      router.push("/opd/journey/vitals");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Update failed"),
  });

  function handleSave() {
    const payload: Record<string, string> = {};
    if (form.address_line1) payload.address_line1 = form.address_line1;
    if (form.city) payload.city = form.city;
    if (form.district) payload.district = form.district;
    if (form.state) payload.state = form.state;
    if (form.pincode) payload.pincode = form.pincode;
    if (form.blood_group) payload.blood_group = form.blood_group;
    if (form.emergency_contact_name) payload.emergency_contact_name = form.emergency_contact_name;
    if (form.emergency_contact_phone) payload.emergency_contact_phone = form.emergency_contact_phone;
    if (form.emergency_contact_relation) payload.emergency_contact_relation = form.emergency_contact_relation;
    if (form.insurance_provider) payload.insurance_provider = form.insurance_provider;
    if (form.insurance_policy_no) payload.insurance_policy_no = form.insurance_policy_no;
    if (form.ayushman_card_no) payload.ayushman_card_no = form.ayushman_card_no;

    if (!form.address_line1 || !form.city || !form.pincode) {
      return toast.error("Address, city and pincode are required");
    }
    updateMut.mutate(payload);
  }

  function handleSkip() {
    completeStep(2);
    toast.info("Registration skipped — complete later");
    router.push("/opd/journey/vitals");
  }

  if (!patient) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar title="OPD Journey — Registration" />
          <JourneyBanner currentStep={2} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
              <p className="font-medium mb-2">No patient selected</p>
              <Link href="/opd/journey/appointment" className="text-sm text-blue-600 underline">
                Go back to Step 1 — Appointment
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const addressComplete =
    full &&
    full.address_line1 !== "To be updated" &&
    full.city !== "—" &&
    full.pincode !== "000000" &&
    full.address_line1 &&
    full.city &&
    full.pincode;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="OPD Journey — Registration" />
        <JourneyBanner currentStep={2} />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Patient header */}
            <div className="bg-white rounded-xl border px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                  {patient.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{patient.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{patient.uhid} · {patient.gender[0]}/{calcAge(patient.dob)} · {patient.phone}</p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-400">Step 2 of 4</div>
            </div>

            {/* Current data status */}
            {full && (
              <div className="bg-white rounded-xl border px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Current Record Status</p>
                <FieldRow label="Address" value={full.address_line1} icon={MapPin} />
                <FieldRow label="City" value={full.city} icon={MapPin} />
                <FieldRow label="Blood Group" value={full.blood_group} icon={Droplet} />
                <FieldRow label="Emergency Contact" value={full.emergency_contact_name} icon={Phone} />
                <FieldRow label="Insurance" value={full.insurance_provider} icon={Shield} />
              </div>
            )}

            {/* Address */}
            <div className="bg-white rounded-xl border px-5 py-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-gray-800">Address</p>
                {addressComplete && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
              </div>
              <div>
                <Label className="text-xs">Address Line 1 *</Label>
                <Input className="mt-1" placeholder="House/Flat no, Street, Area" value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">City *</Label>
                  <Input className="mt-1" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">District</Label>
                  <Input className="mt-1" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Pincode *</Label>
                  <Input className="mt-1" maxLength={6} value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v ?? "Gujarat" }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Blood Group + Emergency Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border px-5 py-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Droplet className="w-4 h-4 text-red-500" />
                  <p className="text-sm font-semibold text-gray-800">Blood Group</p>
                  {full?.blood_group && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                </div>
                <Select value={form.blood_group} onValueChange={v => setForm(f => ({ ...f, blood_group: v ?? "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{BLOOD_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="bg-white rounded-xl border px-5 py-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-gray-800">Emergency Contact</p>
                  {full?.emergency_contact_name && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                </div>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input className="mt-1" value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input className="mt-1" value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Relation</Label>
                  <Select value={form.emergency_contact_relation} onValueChange={v => setForm(f => ({ ...f, emergency_contact_relation: v ?? "" }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{RELATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Insurance */}
            <div className="bg-white rounded-xl border px-5 py-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold text-gray-800">Insurance / Ayushman</p>
                {full?.insurance_provider && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Insurance Provider</Label>
                  <Input className="mt-1" placeholder="e.g. Star Health" value={form.insurance_provider} onChange={e => setForm(f => ({ ...f, insurance_provider: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Policy No.</Label>
                  <Input className="mt-1" value={form.insurance_policy_no} onChange={e => setForm(f => ({ ...f, insurance_policy_no: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Ayushman Card No.</Label>
                <Input className="mt-1" placeholder="If applicable" value={form.ayushman_card_no} onChange={e => setForm(f => ({ ...f, ayushman_card_no: e.target.value }))} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkip}
                className="flex items-center gap-1.5 text-gray-500"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Skip for Now
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMut.isPending}
                className={cn("flex-1 flex items-center gap-2")}
              >
                {updateMut.isPending ? "Saving..." : "Save & Continue to Vitals"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
