"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { ArrowLeft, Search, Plus, X, Stethoscope, Pill, FlaskConical, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, format } from "date-fns";

type Tab = "soap" | "diagnosis" | "prescription" | "lab";

const FREQUENCIES = ["Once daily", "Twice daily", "Three times daily", "Four times daily", "Every 6 hours", "Every 8 hours", "At night", "Before meals", "After meals", "As needed (SOS)"];
const ROUTES = ["Oral", "IV", "IM", "SC", "Topical", "Inhalation", "Sublingual", "Rectal", "Nasal"];
const DURATIONS = ["3 days", "5 days", "7 days", "10 days", "14 days", "1 month", "2 months", "3 months", "As directed"];

interface RxItem {
  drug_id: number;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
  quantity: number;
}

interface LabItem {
  test_id: number;
  test_name: string;
}

export default function JourneyConsultationPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { patient, visitId, appointment, consultationId, setConsultationId, completeStep } = useJourneyStore();
  const { user } = useAuthStore();
  const isDoctor = user?.role === "DOCTOR" || user?.role === "ADMIN";

  const [tab, setTab] = useState<Tab>("soap");

  // SOAP state
  const [soap, setSoap] = useState({
    chief_complaint: "",
    history_of_present_illness: "",
    past_medical_history: "",
    family_history: "",
    general_examination: "",
    systemic_examination: "",
    clinical_notes: "",
    advice: "",
    follow_up_days: "",
  });

  // Diagnosis state
  const [dxQ, setDxQ] = useState("");
  const [debouncedDxQ, setDebouncedDxQ] = useState("");
  const dxRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prescription state
  const [drugQ, setDrugQ] = useState("");
  const [debouncedDrugQ, setDebouncedDrugQ] = useState("");
  const drugRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rxItems, setRxItems] = useState<RxItem[]>([]);
  const [rxNotes, setRxNotes] = useState("");
  const [pendingDrug, setPendingDrug] = useState<{ id: number; name: string } | null>(null);
  const [rxForm, setRxForm] = useState({ dosage: "", frequency: FREQUENCIES[0], duration: DURATIONS[0], route: ROUTES[0], instructions: "" });

  // Lab state
  const [labQ, setLabQ] = useState("");
  const [debouncedLabQ, setDebouncedLabQ] = useState("");
  const labRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [labItems, setLabItems] = useState<LabItem[]>([]);

  // Debounce helpers
  useEffect(() => {
    if (dxRef.current) clearTimeout(dxRef.current);
    dxRef.current = setTimeout(() => setDebouncedDxQ(dxQ), 350);
    return () => { if (dxRef.current) clearTimeout(dxRef.current); };
  }, [dxQ]);

  useEffect(() => {
    if (drugRef.current) clearTimeout(drugRef.current);
    drugRef.current = setTimeout(() => setDebouncedDrugQ(drugQ), 350);
    return () => { if (drugRef.current) clearTimeout(drugRef.current); };
  }, [drugQ]);

  useEffect(() => {
    if (labRef.current) clearTimeout(labRef.current);
    labRef.current = setTimeout(() => setDebouncedLabQ(labQ), 350);
    return () => { if (labRef.current) clearTimeout(labRef.current); };
  }, [labQ]);

  // Fetch existing consultation
  const { data: existingConsult } = useQuery<any>({
    queryKey: ["consultation", visitId],
    queryFn: () => api.get(`/api/clinical/consultation/${visitId}`).then(r => r.data),
    enabled: !!visitId,
    retry: false,
  });

  // Pre-fill SOAP from existing consultation
  useEffect(() => {
    if (existingConsult) {
      setConsultationId(existingConsult.id);
      setSoap({
        chief_complaint: existingConsult.chief_complaint || "",
        history_of_present_illness: existingConsult.history_of_present_illness || "",
        past_medical_history: existingConsult.past_medical_history || "",
        family_history: existingConsult.family_history || "",
        general_examination: existingConsult.general_examination || "",
        systemic_examination: existingConsult.systemic_examination || "",
        clinical_notes: existingConsult.clinical_notes || "",
        advice: existingConsult.advice || "",
        follow_up_days: existingConsult.follow_up_days ? String(existingConsult.follow_up_days) : "",
      });
    }
  }, [existingConsult]);

  // Diagnoses query
  const { data: diagnoses = [], refetch: refetchDx } = useQuery<any[]>({
    queryKey: ["diagnoses", consultationId],
    queryFn: () => api.get(`/api/clinical/consultation/${consultationId}/diagnoses`).then(r => r.data),
    enabled: !!consultationId,
  });

  // ICD10 search
  const { data: icd10Results = [] } = useQuery<any[]>({
    queryKey: ["icd10", debouncedDxQ],
    queryFn: () => api.get(`/api/masters/icd10?q=${debouncedDxQ}`).then(r => r.data),
    enabled: debouncedDxQ.length >= 2,
  });

  // Drug search
  const { data: drugResults = [] } = useQuery<any[]>({
    queryKey: ["drugs", debouncedDrugQ],
    queryFn: () => api.get(`/api/masters/drugs?q=${debouncedDrugQ}`).then(r => r.data),
    enabled: debouncedDrugQ.length >= 2,
  });

  // Lab test search
  const { data: labTestResults = [] } = useQuery<any[]>({
    queryKey: ["lab-tests", debouncedLabQ],
    queryFn: () => api.get(`/api/masters/lab-tests?q=${debouncedLabQ}`).then(r => r.data),
    enabled: debouncedLabQ.length >= 2,
  });

  // Create or update consultation
  const soapMut = useMutation({
    mutationFn: async () => {
      if (!visitId || !patient) return;
      const body = {
        visit_id: visitId,
        patient_id: patient.id,
        ...soap,
        follow_up_days: soap.follow_up_days ? parseInt(soap.follow_up_days) : undefined,
      };
      if (consultationId) {
        return api.put(`/api/clinical/consultation/${consultationId}`, body).then(r => r.data);
      }
      return api.post("/api/clinical/consultation", body).then(r => r.data);
    },
    onSuccess: (data: any) => {
      if (data && !consultationId) setConsultationId(data.id);
      toast.success("SOAP notes saved");
      qc.invalidateQueries({ queryKey: ["consultation", visitId] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to save"),
  });

  // Add diagnosis
  const addDxMut = useMutation({
    mutationFn: (dx: { icd10_code: string; icd10_description: string; is_primary: boolean }) =>
      api.post(`/api/clinical/consultation/${consultationId}/diagnosis`, { ...dx, is_provisional: false }).then(r => r.data),
    onSuccess: () => { refetchDx(); setDxQ(""); },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to add diagnosis"),
  });

  // Remove diagnosis
  const removeDxMut = useMutation({
    mutationFn: (dxId: number) => api.delete(`/api/clinical/consultation/${consultationId}/diagnosis/${dxId}`),
    onSuccess: () => refetchDx(),
  });

  // Save prescription
  const rxMut = useMutation({
    mutationFn: () =>
      api.post("/api/prescriptions", {
        consultation_id: consultationId,
        patient_id: patient!.id,
        items: rxItems,
        notes: rxNotes || undefined,
      }).then(r => r.data),
    onSuccess: () => { toast.success("Prescription saved"); setRxItems([]); setRxNotes(""); },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to save prescription"),
  });

  // Save lab order
  const labMut = useMutation({
    mutationFn: () =>
      api.post("/api/lab/orders", {
        consultation_id: consultationId,
        patient_id: patient!.id,
        tests: labItems,
      }).then(r => r.data),
    onSuccess: () => { toast.success("Lab order created"); setLabItems([]); },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to create lab order"),
  });

  // Finalize
  const finalizeMut = useMutation({
    mutationFn: () => api.post(`/api/clinical/consultation/${consultationId}/finalize`).then(r => r.data),
    onSuccess: () => {
      completeStep(4);
      toast.success("Consultation finalized");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to finalize"),
  });

  function addRxItem() {
    if (!pendingDrug) return;
    if (!rxForm.dosage) return toast.error("Enter dosage");
    setRxItems(prev => [...prev, {
      drug_id: pendingDrug.id,
      drug_name: pendingDrug.name,
      dosage: rxForm.dosage,
      frequency: rxForm.frequency,
      duration: rxForm.duration,
      route: rxForm.route,
      instructions: rxForm.instructions,
      quantity: 0,
    }]);
    setPendingDrug(null);
    setDrugQ("");
    setRxForm({ dosage: "", frequency: FREQUENCIES[0], duration: DURATIONS[0], route: ROUTES[0], instructions: "" });
  }

  if (!patient || !visitId) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar title="OPD Journey — Consultation" />
          <JourneyBanner currentStep={4} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-400 opacity-60" />
              <p className="font-medium text-gray-600 mb-4">No active visit — complete earlier steps first</p>
              <Button onClick={() => router.push("/opd/journey/register")}>
                <ArrowLeft className="w-4 h-4 mr-2" />Start from Register
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isFinalized = existingConsult?.is_finalized;
  const followUpDate = soap.follow_up_days ? format(addDays(new Date(), parseInt(soap.follow_up_days)), "dd MMM yyyy") : null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="OPD Journey — Consultation" />
        <JourneyBanner currentStep={4} />

        <div className="flex-1 flex min-h-0">
          {/* Tab strip + content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Tab bar */}
            <div className="bg-white border-b flex items-center px-4 gap-1 shrink-0">
              {([
                { key: "soap",         label: "SOAP Notes",     icon: Stethoscope },
                { key: "diagnosis",    label: "Diagnosis",      icon: Search },
                { key: "prescription", label: "Prescription",   icon: Pill },
                { key: "lab",          label: "Lab Orders",     icon: FlaskConical },
              ] as { key: Tab; label: string; icon: any }[]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors",
                    tab === t.key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2 py-1.5">
                {isFinalized ? (
                  <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />Finalized
                  </Badge>
                ) : consultationId && (
                  <Button
                    size="sm"
                    onClick={() => finalizeMut.mutate()}
                    disabled={finalizeMut.isPending || !consultationId}
                    className="text-xs h-7 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {finalizeMut.isPending ? "Finalizing..." : "Finalize Consultation"}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* ─── SOAP Notes ─── */}
              {tab === "soap" && (
                <div className="max-w-2xl space-y-4">
                  {!isDoctor && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <Lock className="w-4 h-4 shrink-0" />
                      Read-only — log in as a doctor to edit consultation notes.
                    </div>
                  )}

                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chief Complaint *</Label>
                    <Textarea
                      className="mt-1.5 resize-none text-sm"
                      rows={2}
                      placeholder="Primary reason for today's visit..."
                      value={soap.chief_complaint}
                      onChange={e => setSoap(s => ({ ...s, chief_complaint: e.target.value }))}
                      disabled={!isDoctor || isFinalized}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">History of Present Illness</Label>
                    <Textarea
                      className="mt-1.5 resize-none text-sm"
                      rows={3}
                      placeholder="Onset, duration, character, associated symptoms..."
                      value={soap.history_of_present_illness}
                      onChange={e => setSoap(s => ({ ...s, history_of_present_illness: e.target.value }))}
                      disabled={!isDoctor || isFinalized}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Past Medical History</Label>
                      <Textarea
                        className="mt-1.5 resize-none text-sm"
                        rows={2}
                        placeholder="Previous conditions, surgeries, hospitalizations..."
                        value={soap.past_medical_history}
                        onChange={e => setSoap(s => ({ ...s, past_medical_history: e.target.value }))}
                        disabled={!isDoctor || isFinalized}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Family History</Label>
                      <Textarea
                        className="mt-1.5 resize-none text-sm"
                        rows={2}
                        placeholder="Relevant hereditary conditions..."
                        value={soap.family_history}
                        onChange={e => setSoap(s => ({ ...s, family_history: e.target.value }))}
                        disabled={!isDoctor || isFinalized}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">General Examination</Label>
                      <Textarea
                        className="mt-1.5 resize-none text-sm"
                        rows={2}
                        placeholder="General appearance, build, nourishment..."
                        value={soap.general_examination}
                        onChange={e => setSoap(s => ({ ...s, general_examination: e.target.value }))}
                        disabled={!isDoctor || isFinalized}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Systemic Examination</Label>
                      <Textarea
                        className="mt-1.5 resize-none text-sm"
                        rows={2}
                        placeholder="CVS, RS, P/A, CNS findings..."
                        value={soap.systemic_examination}
                        onChange={e => setSoap(s => ({ ...s, systemic_examination: e.target.value }))}
                        disabled={!isDoctor || isFinalized}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clinical Notes / Assessment</Label>
                    <Textarea
                      className="mt-1.5 resize-none text-sm"
                      rows={3}
                      placeholder="Assessment, differential diagnoses, clinical reasoning..."
                      value={soap.clinical_notes}
                      onChange={e => setSoap(s => ({ ...s, clinical_notes: e.target.value }))}
                      disabled={!isDoctor || isFinalized}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Advice / Plan</Label>
                    <Textarea
                      className="mt-1.5 resize-none text-sm"
                      rows={2}
                      placeholder="Diet, lifestyle, activity restrictions, referral..."
                      value={soap.advice}
                      onChange={e => setSoap(s => ({ ...s, advice: e.target.value }))}
                      disabled={!isDoctor || isFinalized}
                    />
                  </div>

                  <div className="flex items-end gap-3">
                    <div className="w-36">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Follow-up (days)</Label>
                      <Input
                        type="number" min="1" max="365" placeholder="e.g. 7"
                        className="mt-1.5"
                        value={soap.follow_up_days}
                        onChange={e => setSoap(s => ({ ...s, follow_up_days: e.target.value }))}
                        disabled={!isDoctor || isFinalized}
                      />
                    </div>
                    {followUpDate && (
                      <p className="text-sm text-blue-600 font-medium mb-2">
                        Follow-up on {followUpDate}
                      </p>
                    )}
                  </div>

                  {isDoctor && !isFinalized && (
                    <Button onClick={() => soapMut.mutate()} disabled={soapMut.isPending || !soap.chief_complaint}>
                      {soapMut.isPending ? "Saving..." : consultationId ? "Update SOAP Notes" : "Save & Create Consultation"}
                    </Button>
                  )}
                </div>
              )}

              {/* ─── Diagnosis ─── */}
              {tab === "diagnosis" && (
                <div className="max-w-xl space-y-4">
                  {!consultationId && (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Save SOAP notes first to create a consultation before adding diagnoses.
                    </div>
                  )}

                  {/* Current diagnoses */}
                  {diagnoses.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Diagnoses</p>
                      {diagnoses.map((dx: any) => (
                        <div key={dx.id} className="flex items-start justify-between bg-white border rounded-xl px-3 py-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-600">{dx.icd10_code}</span>
                              {dx.is_primary && <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">Primary</Badge>}
                              {dx.is_provisional && <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">Provisional</Badge>}
                            </div>
                            <p className="text-sm text-gray-700 mt-0.5">{dx.icd10_description}</p>
                          </div>
                          {isDoctor && !isFinalized && (
                            <button onClick={() => removeDxMut.mutate(dx.id)} className="text-gray-400 hover:text-red-500 ml-2 mt-0.5">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Search + add */}
                  {isDoctor && !isFinalized && consultationId && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search ICD-10</p>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                        <Input
                          placeholder="Search by code or description..."
                          value={dxQ}
                          onChange={e => setDxQ(e.target.value)}
                          className="pl-8 text-sm"
                        />
                      </div>
                      {icd10Results.length > 0 && (
                        <div className="border rounded-xl overflow-hidden bg-white divide-y max-h-48 overflow-y-auto">
                          {icd10Results.map((icd: any) => (
                            <div key={icd.id} className="px-3 py-2 hover:bg-blue-50 flex items-start justify-between group cursor-pointer"
                              onClick={() => {
                                const isPrimary = diagnoses.length === 0;
                                addDxMut.mutate({ icd10_code: icd.code, icd10_description: icd.description, is_primary: isPrimary });
                              }}
                            >
                              <div>
                                <span className="font-mono text-xs font-bold text-blue-600 mr-2">{icd.code}</span>
                                <span className="text-sm text-gray-700">{icd.description}</span>
                              </div>
                              <Plus className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!isDoctor && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <Lock className="w-4 h-4 shrink-0" />
                      Read-only — log in as a doctor to add diagnoses.
                    </div>
                  )}
                </div>
              )}

              {/* ─── Prescription ─── */}
              {tab === "prescription" && (
                <div className="max-w-xl space-y-4">
                  {!isDoctor ? (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <Lock className="w-4 h-4 shrink-0" />
                      Read-only — log in as a doctor to write prescriptions.
                    </div>
                  ) : !consultationId ? (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Save SOAP notes first before adding prescription items.
                    </div>
                  ) : (
                    <>
                      {/* Pending item builder */}
                      <div className="bg-white border rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add Medication</p>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                          <Input
                            placeholder="Search drug by name..."
                            value={pendingDrug ? pendingDrug.name : drugQ}
                            onChange={e => { if (!pendingDrug) setDrugQ(e.target.value); }}
                            className="pl-8 text-sm"
                            readOnly={!!pendingDrug}
                          />
                          {pendingDrug && (
                            <button onClick={() => { setPendingDrug(null); setDrugQ(""); }} className="absolute right-2 top-2">
                              <X className="w-4 h-4 text-gray-400" />
                            </button>
                          )}
                        </div>

                        {!pendingDrug && drugResults.length > 0 && (
                          <div className="border rounded-xl overflow-hidden bg-gray-50 divide-y max-h-36 overflow-y-auto">
                            {drugResults.map((d: any) => (
                              <button
                                key={d.id}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                                onClick={() => { setPendingDrug({ id: d.id, name: d.name }); setDrugQ(""); }}
                              >
                                <span className="font-medium">{d.name}</span>
                                <span className="text-xs text-gray-400 ml-2">{d.drug_type} · {d.strength}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {pendingDrug && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-500">Dosage *</Label>
                                <Input
                                  placeholder="e.g. 500mg, 1 tablet"
                                  className="mt-1 text-sm"
                                  value={rxForm.dosage}
                                  onChange={e => setRxForm(f => ({ ...f, dosage: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Frequency</Label>
                                <Select value={rxForm.frequency} onValueChange={v => setRxForm(f => ({ ...f, frequency: v ?? FREQUENCIES[0] }))}>
                                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Duration</Label>
                                <Select value={rxForm.duration} onValueChange={v => setRxForm(f => ({ ...f, duration: v ?? DURATIONS[0] }))}>
                                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>{DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Route</Label>
                                <Select value={rxForm.route} onValueChange={v => setRxForm(f => ({ ...f, route: v ?? ROUTES[0] }))}>
                                  <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>{ROUTES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Special Instructions</Label>
                              <Input
                                placeholder="e.g. Take with food, avoid alcohol..."
                                className="mt-1 text-sm"
                                value={rxForm.instructions}
                                onChange={e => setRxForm(f => ({ ...f, instructions: e.target.value }))}
                              />
                            </div>
                            <Button size="sm" onClick={addRxItem} className="w-full">
                              <Plus className="w-3.5 h-3.5 mr-1" />Add to Prescription
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Rx items list */}
                      {rxItems.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prescription Items</p>
                          {rxItems.map((item, i) => (
                            <div key={i} className="bg-white border rounded-xl px-3 py-2.5 flex items-start justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{item.drug_name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {item.dosage} · {item.frequency} · {item.duration} · {item.route}
                                  {item.instructions && <span className="italic"> — {item.instructions}</span>}
                                </p>
                              </div>
                              <button onClick={() => setRxItems(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 ml-2">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <div>
                            <Label className="text-xs text-gray-500">Prescription Notes (optional)</Label>
                            <Textarea
                              className="mt-1 resize-none text-sm"
                              rows={2}
                              placeholder="Any notes for pharmacist..."
                              value={rxNotes}
                              onChange={e => setRxNotes(e.target.value)}
                            />
                          </div>
                          <Button onClick={() => rxMut.mutate()} disabled={rxMut.isPending} className="w-full">
                            <Pill className="w-4 h-4 mr-2" />
                            {rxMut.isPending ? "Saving..." : "Save Prescription"}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ─── Lab Orders ─── */}
              {tab === "lab" && (
                <div className="max-w-xl space-y-4">
                  {!isDoctor ? (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <Lock className="w-4 h-4 shrink-0" />
                      Read-only — log in as a doctor to order lab tests.
                    </div>
                  ) : !consultationId ? (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Save SOAP notes first before ordering lab tests.
                    </div>
                  ) : (
                    <>
                      <div className="bg-white border rounded-2xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search Lab Tests</p>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                          <Input
                            placeholder="CBC, LFT, RFT, HbA1c..."
                            value={labQ}
                            onChange={e => setLabQ(e.target.value)}
                            className="pl-8 text-sm"
                          />
                        </div>
                        {labTestResults.length > 0 && (
                          <div className="border rounded-xl overflow-hidden bg-gray-50 divide-y max-h-48 overflow-y-auto">
                            {labTestResults.map((t: any) => {
                              const already = labItems.some(i => i.test_id === t.id);
                              return (
                                <button
                                  key={t.id}
                                  disabled={already}
                                  className={cn("w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex justify-between items-center", already && "opacity-50 cursor-not-allowed")}
                                  onClick={() => { setLabItems(prev => [...prev, { test_id: t.id, test_name: t.name }]); setLabQ(""); }}
                                >
                                  <span>
                                    <span className="font-medium">{t.name}</span>
                                    <span className="text-xs text-gray-400 ml-2">{t.category}</span>
                                  </span>
                                  {already ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {labItems.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ordered Tests ({labItems.length})</p>
                          {labItems.map((item, i) => (
                            <div key={i} className="bg-white border rounded-xl px-3 py-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-sm text-gray-800">{item.test_name}</span>
                              </div>
                              <button onClick={() => setLabItems(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <Button onClick={() => labMut.mutate()} disabled={labMut.isPending} className="w-full">
                            <FlaskConical className="w-4 h-4 mr-2" />
                            {labMut.isPending ? "Ordering..." : "Submit Lab Order"}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar: patient + visit summary */}
          <div className="w-56 border-l bg-white shrink-0 overflow-y-auto p-3 space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Patient</p>
              <p className="text-sm font-semibold text-gray-800">{patient.name}</p>
              <p className="text-xs text-gray-500 font-mono">{patient.uhid}</p>
              {patient.blood_group && <Badge className="mt-1 bg-red-50 text-red-700 text-[10px]">{patient.blood_group}</Badge>}
            </div>

            {appointment && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Appointment</p>
                <p className="text-xs text-gray-600">Dr. {appointment.doctor_name}</p>
                <p className="text-xs text-gray-500">{appointment.department_name}</p>
                <p className="text-xs font-mono text-blue-600 mt-0.5">{appointment.appointment_no}</p>
                {appointment.token_number && (
                  <Badge className="mt-1 bg-blue-50 text-blue-700 text-[10px]">Token #{appointment.token_number}</Badge>
                )}
              </div>
            )}

            {existingConsult && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Consultation</p>
                <p className="text-xs font-mono text-gray-600">{existingConsult.consultation_no}</p>
                {existingConsult.is_finalized && (
                  <Badge className="mt-1 bg-green-100 text-green-700 text-[10px] flex items-center gap-1 w-fit">
                    <CheckCircle2 className="w-2.5 h-2.5" />Finalized
                  </Badge>
                )}
              </div>
            )}

            <div className="pt-2 border-t">
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => router.push("/opd/journey/vitals")}>
                <ArrowLeft className="w-3 h-3 mr-1" />Back to Vitals
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
