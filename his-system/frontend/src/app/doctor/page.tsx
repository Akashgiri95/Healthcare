"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sidebar, useDoctorContext } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { cn, calcAge } from "@/lib/utils";
import { toast } from "sonner";
import {
  Stethoscope, FlaskConical, Pill, CheckCircle2, AlertTriangle,
  Trash2, User, Phone, Activity, Clock,
  Loader2, Search, Heart, Thermometer, Scale,
  FileText, PlayCircle, UserCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueuePatient {
  id: number;
  token_number: number;
  status: string;
  patient_id: number;
  patient_name: string;
  patient_uhid: string;
  patient_phone: string;
  patient_gender: string;
  patient_dob: string;
  department_name: string;
  chief_complaint: string | null;
  visit_id: number | null;
  vitals: {
    bp_systolic: number | null;
    bp_diastolic: number | null;
    pulse: number | null;
    temperature: number | null;
    spo2: number | null;
    weight: number | null;
    height: number | null;
    bmi: number | null;
  } | null;
}

interface Diagnosis {
  id: number;
  icd_code: string;
  description: string;
  diagnosis_type: string;
}

interface PrescriptionItem {
  drug_id?: number;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    CHECKED_IN: { bg: "bg-blue-100", text: "text-blue-700" },
    IN_QUEUE: { bg: "bg-amber-100", text: "text-amber-700" },
    WITH_DOCTOR: { bg: "bg-green-100", text: "text-green-700" },
    COMPLETED: { bg: "bg-gray-100", text: "text-gray-500" },
  };
  const c = config[status] || { bg: "bg-gray-100", text: "text-gray-500" };
  return <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", c.bg, c.text)}>{status.replace("_", " ")}</span>;
}

// ─── Vitals Display ───────────────────────────────────────────────────────────

function VitalsPanel({ vitals }: { vitals: QueuePatient["vitals"] }) {
  if (!vitals) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
        <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
        <p className="text-sm text-amber-700">Vitals not recorded</p>
      </div>
    );
  }

  const items = [
    { label: "BP", value: vitals.bp_systolic && vitals.bp_diastolic ? `${vitals.bp_systolic}/${vitals.bp_diastolic}` : "—", unit: "mmHg", alert: vitals.bp_systolic && vitals.bp_systolic > 140 },
    { label: "Pulse", value: vitals.pulse || "—", unit: "/min" },
    { label: "Temp", value: vitals.temperature || "—", unit: "°F", alert: vitals.temperature && vitals.temperature > 99 },
    { label: "SpO2", value: vitals.spo2 || "—", unit: "%", alert: vitals.spo2 && vitals.spo2 < 95 },
    { label: "Weight", value: vitals.weight || "—", unit: "kg" },
    { label: "BMI", value: vitals.bmi || "—", unit: "" },
  ];

  return (
    <div className="grid grid-cols-6 gap-2">
      {items.map(item => (
        <div key={item.label} className={cn("rounded-lg p-2 text-center", item.alert ? "bg-red-50 border border-red-200" : "bg-gray-50")}>
          <p className="text-[10px] text-gray-500 uppercase">{item.label}</p>
          <p className={cn("text-sm font-bold", item.alert ? "text-red-600" : "text-gray-800")}>{item.value}</p>
          <p className="text-[10px] text-gray-400">{item.unit}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DoctorDeskPage() {
  const qc = useQueryClient();

  // Get selected doctor from sidebar context
  const { selectedDoctorId, doctorName, departmentName } = useDoctorContext();

  // State
  const [selectedPatient, setSelectedPatient] = useState<QueuePatient | null>(null);
  const [activeTab, setActiveTab] = useState<"soap" | "rx" | "lab" | "history">("soap");

  // SOAP form state
  const [soap, setSoap] = useState({
    chief_complaint: "",
    history_presenting_illness: "",
    past_history: "",
    examination_findings: "",
    provisional_diagnosis: "",
    treatment_plan: "",
    advice: "",
    follow_up_date: "",
  });

  // Diagnosis state
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [icdSearch, setIcdSearch] = useState("");

  // Prescription state
  const [rxItems, setRxItems] = useState<PrescriptionItem[]>([]);
  const [drugSearch, setDrugSearch] = useState("");

  // Reset selected patient when doctor changes
  useEffect(() => {
    setSelectedPatient(null);
  }, [selectedDoctorId]);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: queueData, isLoading: loadingQueue, refetch: refetchQueue } = useQuery({
    queryKey: ["doctor-queue", selectedDoctorId],
    queryFn: () => api.get(`/api/appointments/doctor-queue/${selectedDoctorId}`).then(r => r.data),
    enabled: !!selectedDoctorId,
    refetchInterval: 15000,
  });

  const queue: QueuePatient[] = queueData?.queue || [];
  const stats = queueData?.stats || { total: 0, waiting: 0, with_doctor: 0, completed: 0 };

  const { data: icdResults = [] } = useQuery({
    queryKey: ["icd-search", icdSearch],
    queryFn: () => api.get(`/api/masters/icd10?q=${icdSearch}`).then(r => r.data),
    enabled: icdSearch.length >= 2,
  });

  const { data: drugResults = [] } = useQuery({
    queryKey: ["drug-search", drugSearch],
    queryFn: () => api.get(`/api/masters/drugs?q=${drugSearch}`).then(r => r.data),
    enabled: drugSearch.length >= 2,
  });

  const { data: consultation } = useQuery({
    queryKey: ["consultation", selectedPatient?.visit_id],
    queryFn: () => api.get(`/api/clinical/consultation/${selectedPatient!.visit_id}`).then(r => r.data).catch(() => null),
    enabled: !!selectedPatient?.visit_id,
  });

  const { data: existingDiagnoses = [] } = useQuery({
    queryKey: ["diagnoses", consultation?.id],
    queryFn: () => api.get(`/api/clinical/consultation/${consultation.id}/diagnoses`).then(r => r.data),
    enabled: !!consultation?.id,
  });

  const { data: patientHistory = [] } = useQuery({
    queryKey: ["patient-history", selectedPatient?.patient_id],
    queryFn: () => api.get(`/api/patients/${selectedPatient!.patient_id}/visits`).then(r => r.data),
    enabled: !!selectedPatient?.patient_id,
  });

  // Load existing data when patient selected
  useEffect(() => {
    if (consultation) {
      setSoap({
        chief_complaint: consultation.chief_complaint || "",
        history_presenting_illness: consultation.history_presenting_illness || "",
        past_history: consultation.past_history || "",
        examination_findings: consultation.examination_findings || "",
        provisional_diagnosis: consultation.provisional_diagnosis || "",
        treatment_plan: consultation.treatment_plan || "",
        advice: consultation.advice || "",
        follow_up_date: consultation.follow_up_date || "",
      });
    } else {
      setSoap({
        chief_complaint: selectedPatient?.chief_complaint || "",
        history_presenting_illness: "",
        past_history: "",
        examination_findings: "",
        provisional_diagnosis: "",
        treatment_plan: "",
        advice: "",
        follow_up_date: "",
      });
    }
    setDiagnoses([]);
    setRxItems([]);
  }, [selectedPatient, consultation]);

  useEffect(() => {
    if (existingDiagnoses.length > 0) {
      setDiagnoses(existingDiagnoses);
    }
  }, [existingDiagnoses]);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const callNextMut = useMutation({
    mutationFn: () => api.post("/api/appointments/call-next").then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Calling patient #${data.token_number}`);
      refetchQueue();
      const patient = queue.find(p => p.id === data.id);
      if (patient) setSelectedPatient({ ...patient, status: "WITH_DOCTOR" });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "No patients waiting"),
  });

  const startConsultMut = useMutation({
    mutationFn: (apptId: number) => api.post(`/api/appointments/${apptId}/start-consultation`).then(r => r.data),
    onSuccess: (data) => {
      refetchQueue();
      if (selectedPatient) {
        setSelectedPatient({ ...selectedPatient, visit_id: data.visit_id, status: "WITH_DOCTOR" });
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to start consultation"),
  });

  const saveConsultMut = useMutation({
    mutationFn: async () => {
      if (!selectedPatient?.visit_id) throw new Error("No visit ID");
      if (consultation?.id) {
        await api.put(`/api/clinical/consultation/${consultation.id}`, { visit_id: selectedPatient.visit_id, ...soap });
      } else {
        await api.post("/api/clinical/consultation", { visit_id: selectedPatient.visit_id, ...soap });
      }
    },
    onSuccess: () => {
      toast.success("Consultation saved");
      qc.invalidateQueries({ queryKey: ["consultation", selectedPatient?.visit_id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to save"),
  });

  const completeConsultMut = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) return;
      await saveConsultMut.mutateAsync();
      await api.post(`/api/appointments/${selectedPatient.id}/complete-consultation`);
    },
    onSuccess: () => {
      toast.success("Consultation completed");
      setSelectedPatient(null);
      refetchQueue();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to complete"),
  });

  const addDiagnosisMut = useMutation({
    mutationFn: (dx: { icd_code: string; description: string; diagnosis_type: string }) =>
      api.post(`/api/clinical/consultation/${consultation!.id}/diagnosis`, dx).then(r => r.data),
    onSuccess: (data) => {
      setDiagnoses([...diagnoses, data]);
      setIcdSearch("");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to add diagnosis"),
  });

  const removeDiagnosisMut = useMutation({
    mutationFn: (dxId: number) => api.delete(`/api/clinical/consultation/${consultation!.id}/diagnosis/${dxId}`),
    onSuccess: (_, dxId) => {
      setDiagnoses(diagnoses.filter(d => d.id !== dxId));
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleSelectPatient(patient: QueuePatient) {
    setSelectedPatient(patient);
    if (patient.status !== "WITH_DOCTOR" && patient.status !== "COMPLETED") {
      startConsultMut.mutate(patient.id);
    }
  }

  function handleAddDiagnosis(icd: any) {
    if (!consultation?.id) {
      toast.error("Save consultation first");
      return;
    }
    addDiagnosisMut.mutate({
      icd_code: icd.code,
      description: icd.description,
      diagnosis_type: diagnoses.length === 0 ? "PRIMARY" : "SECONDARY",
    });
  }

  function handleAddRxItem(drug: any) {
    setRxItems([...rxItems, {
      drug_id: drug.id,
      drug_name: drug.name,
      dosage: "",
      frequency: "OD",
      duration: "5 days",
      quantity: 5,
      instructions: "",
    }]);
    setDrugSearch("");
  }

  function updateRxItem(index: number, field: string, value: any) {
    const updated = [...rxItems];
    (updated[index] as any)[field] = value;
    setRxItems(updated);
  }

  function removeRxItem(index: number) {
    setRxItems(rxItems.filter((_, i) => i !== index));
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={`Doctor Desk${doctorName ? ` — ${doctorName}` : ""}`} />

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Queue */}
          <div className="w-64 border-r bg-white flex flex-col flex-shrink-0">
            {/* Stats */}
            <div className="p-3 border-b bg-gray-50">
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="bg-white rounded p-1.5 shadow-sm">
                  <p className="text-base font-bold text-gray-800">{stats.total}</p>
                  <p className="text-[9px] text-gray-500">Total</p>
                </div>
                <div className="bg-white rounded p-1.5 shadow-sm">
                  <p className="text-base font-bold text-amber-600">{stats.waiting}</p>
                  <p className="text-[9px] text-gray-500">Wait</p>
                </div>
                <div className="bg-white rounded p-1.5 shadow-sm">
                  <p className="text-base font-bold text-green-600">{stats.with_doctor}</p>
                  <p className="text-[9px] text-gray-500">Active</p>
                </div>
                <div className="bg-white rounded p-1.5 shadow-sm">
                  <p className="text-base font-bold text-gray-400">{stats.completed}</p>
                  <p className="text-[9px] text-gray-500">Done</p>
                </div>
              </div>
            </div>

            {/* Call Next Button */}
            <div className="p-3 border-b">
              <Button className="w-full" size="sm" onClick={() => callNextMut.mutate()} disabled={callNextMut.isPending || stats.waiting === 0}>
                {callNextMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                Call Next
              </Button>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto">
              {!selectedDoctorId ? (
                <div className="text-center py-8 text-gray-400">
                  <Stethoscope className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Select a doctor</p>
                  <p className="text-xs">from sidebar</p>
                </div>
              ) : loadingQueue ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
              ) : queue.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <UserCheck className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No patients</p>
                </div>
              ) : (
                queue.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b transition-colors",
                      selectedPatient?.id === p.id ? "bg-blue-50 border-l-4 border-l-blue-500" : "hover:bg-gray-50",
                      p.status === "COMPLETED" && "opacity-50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {p.token_number}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{p.patient_name}</p>
                    <p className="text-xs text-gray-500">{p.patient_gender?.[0]}/{calcAge(p.patient_dob)} · {p.patient_uhid}</p>
                    {p.chief_complaint && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{p.chief_complaint}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Panel: Patient Details + Consultation */}
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedPatient ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">Select a patient from the queue</p>
                  <p className="text-sm">or click "Call Next"</p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Patient Header */}
                <div className="bg-white rounded-xl border p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-7 h-7 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedPatient.patient_name}</h2>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span>{selectedPatient.patient_gender} / {calcAge(selectedPatient.patient_dob)} yrs</span>
                          <span>{selectedPatient.patient_uhid}</span>
                          <span>{selectedPatient.patient_phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        #{selectedPatient.token_number}
                      </Badge>
                      <StatusBadge status={selectedPatient.status} />
                    </div>
                  </div>

                  {/* Vitals */}
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Vitals</p>
                    <VitalsPanel vitals={selectedPatient.vitals} />
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                  <div className="flex border-b">
                    {[
                      { id: "soap", label: "SOAP Notes", icon: FileText },
                      { id: "rx", label: "Prescription", icon: Pill },
                      { id: "lab", label: "Lab Orders", icon: FlaskConical },
                      { id: "history", label: "History", icon: Clock },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                          activeTab === tab.id
                            ? "border-blue-600 text-blue-600 bg-blue-50/50"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                      >
                        <tab.icon className="w-4 h-4" />{tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {/* SOAP Tab */}
                    {activeTab === "soap" && (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs font-medium text-gray-500">Chief Complaint</Label>
                          <Textarea
                            value={soap.chief_complaint}
                            onChange={e => setSoap({ ...soap, chief_complaint: e.target.value })}
                            placeholder="Why is the patient visiting today?"
                            rows={2}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-medium text-gray-500">History of Present Illness (HPI)</Label>
                          <Textarea
                            value={soap.history_presenting_illness}
                            onChange={e => setSoap({ ...soap, history_presenting_illness: e.target.value })}
                            placeholder="Onset, duration, severity, associated symptoms..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-medium text-gray-500">Past History</Label>
                          <Textarea
                            value={soap.past_history}
                            onChange={e => setSoap({ ...soap, past_history: e.target.value })}
                            placeholder="Medical, surgical, family, social history..."
                            rows={2}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-medium text-gray-500">Examination Findings (Objective)</Label>
                          <Textarea
                            value={soap.examination_findings}
                            onChange={e => setSoap({ ...soap, examination_findings: e.target.value })}
                            placeholder="General appearance, CVS, RS, CNS, local examination..."
                            rows={3}
                            className="mt-1"
                          />
                        </div>

                        {/* Diagnosis */}
                        <div>
                          <Label className="text-xs font-medium text-gray-500">Assessment (Diagnosis - ICD-10)</Label>
                          <div className="mt-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              placeholder="Search ICD-10 codes..."
                              value={icdSearch}
                              onChange={e => setIcdSearch(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          {icdSearch.length >= 2 && icdResults.length > 0 && (
                            <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                              {icdResults.slice(0, 10).map((icd: any) => (
                                <button
                                  key={icd.code}
                                  onClick={() => handleAddDiagnosis(icd)}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-b-0"
                                >
                                  <span className="font-mono text-blue-600">{icd.code}</span> — {icd.description}
                                </button>
                              ))}
                            </div>
                          )}
                          {diagnoses.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {diagnoses.map((dx, i) => (
                                <div key={dx.id || i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                  <div>
                                    <Badge variant="outline" className={i === 0 ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}>
                                      {i === 0 ? "Primary" : "Secondary"}
                                    </Badge>
                                    <span className="ml-2 text-sm">
                                      <span className="font-mono text-blue-600">{dx.icd_code}</span> — {dx.description}
                                    </span>
                                  </div>
                                  <button onClick={() => removeDiagnosisMut.mutate(dx.id)} className="text-red-400 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs font-medium text-gray-500">Plan / Treatment</Label>
                          <Textarea
                            value={soap.treatment_plan}
                            onChange={e => setSoap({ ...soap, treatment_plan: e.target.value })}
                            placeholder="Treatment approach, procedures planned..."
                            rows={2}
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-medium text-gray-500">Advice</Label>
                            <Textarea
                              value={soap.advice}
                              onChange={e => setSoap({ ...soap, advice: e.target.value })}
                              placeholder="Diet, exercise, precautions..."
                              rows={2}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500">Follow-up Date</Label>
                            <Input
                              type="date"
                              value={soap.follow_up_date}
                              onChange={e => setSoap({ ...soap, follow_up_date: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Prescription Tab */}
                    {activeTab === "rx" && (
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search drugs..."
                            value={drugSearch}
                            onChange={e => setDrugSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {drugSearch.length >= 2 && drugResults.length > 0 && (
                          <div className="border rounded-lg max-h-40 overflow-y-auto">
                            {drugResults.slice(0, 10).map((drug: any) => (
                              <button
                                key={drug.id}
                                onClick={() => handleAddRxItem(drug)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-b-0"
                              >
                                <span className="font-medium">{drug.name}</span>
                                <span className="text-gray-500 ml-2">{drug.form} · {drug.strength}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {rxItems.length === 0 ? (
                          <div className="text-center py-8 text-gray-400">
                            <Pill className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Search and add drugs</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {rxItems.map((item, i) => (
                              <div key={i} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-gray-800">{i + 1}. {item.drug_name}</span>
                                  <button onClick={() => removeRxItem(i)} className="text-red-400 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  <div>
                                    <Label className="text-[10px]">Dosage</Label>
                                    <Input
                                      value={item.dosage}
                                      onChange={e => updateRxItem(i, "dosage", e.target.value)}
                                      placeholder="1 tab"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px]">Frequency</Label>
                                    <Select value={item.frequency} onValueChange={v => updateRxItem(i, "frequency", v)}>
                                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="OD">OD</SelectItem>
                                        <SelectItem value="BD">BD</SelectItem>
                                        <SelectItem value="TDS">TDS</SelectItem>
                                        <SelectItem value="QID">QID</SelectItem>
                                        <SelectItem value="HS">HS</SelectItem>
                                        <SelectItem value="SOS">SOS</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-[10px]">Duration</Label>
                                    <Input
                                      value={item.duration}
                                      onChange={e => updateRxItem(i, "duration", e.target.value)}
                                      placeholder="5 days"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px]">Qty</Label>
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={e => updateRxItem(i, "quantity", parseInt(e.target.value) || 0)}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Lab Orders Tab */}
                    {activeTab === "lab" && (
                      <div className="text-center py-12 text-gray-400">
                        <FlaskConical className="w-10 h-10 mx-auto mb-2" />
                        <p>Lab ordering coming in Phase 2</p>
                      </div>
                    )}

                    {/* History Tab */}
                    {activeTab === "history" && (
                      <div>
                        {patientHistory.length === 0 ? (
                          <div className="text-center py-12 text-gray-400">
                            <Clock className="w-10 h-10 mx-auto mb-2" />
                            <p>No previous visits</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {patientHistory.map((visit: any) => (
                              <div key={visit.id} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-800">{format(new Date(visit.visit_date), "dd MMM yyyy")}</span>
                                  <Badge variant="outline">{visit.visit_type}</Badge>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{visit.visit_no}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedPatient.status !== "COMPLETED" && (
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => saveConsultMut.mutate()} disabled={saveConsultMut.isPending}>
                      {saveConsultMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Save Draft
                    </Button>
                    <Button onClick={() => completeConsultMut.mutate()} disabled={completeConsultMut.isPending}>
                      {completeConsultMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Complete Consultation
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
