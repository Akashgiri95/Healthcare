"use client";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcAge, fmtDate, fmtTime } from "@/lib/utils";
import { toast } from "sonner";
import { Stethoscope, FlaskConical, Pill, CheckCircle2, AlertCircle, Plus, Trash2, User } from "lucide-react";

export default function DoctorDeskPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const qc = useQueryClient();

  const { data: queue = [] } = useQuery({
    queryKey: ["doctor-queue", today],
    queryFn: () => api.get(`/api/appointments?appointment_date=${today}&status=WITH_DOCTOR`).then((r) => r.data),
    refetchInterval: 20000,
  });

  const { data: allToday = [] } = useQuery({
    queryKey: ["all-today", today],
    queryFn: () => api.get(`/api/appointments?appointment_date=${today}`).then((r) => r.data),
    refetchInterval: 20000,
  });

  const { data: patient } = useQuery({
    queryKey: ["patient", selectedAppt?.patient_id],
    queryFn: () => api.get(`/api/patients/${selectedAppt.patient_id}`).then((r) => r.data),
    enabled: !!selectedAppt?.patient_id,
  });

  const { data: vitals } = useQuery({
    queryKey: ["vitals", selectedVisit?.id],
    queryFn: () => api.get(`/api/clinical/vitals/${selectedVisit.id}`).then((r) => r.data),
    enabled: !!selectedVisit?.id,
  });

  const { data: consultation } = useQuery({
    queryKey: ["consultation", selectedVisit?.id],
    queryFn: () => api.get(`/api/clinical/consultation/${selectedVisit.id}`).then((r) => r.data).catch(() => null),
    enabled: !!selectedVisit?.id,
  });

  const { data: patientVisits = [] } = useQuery({
    queryKey: ["patient-visits", selectedAppt?.patient_id],
    queryFn: () => api.get(`/api/patients/${selectedAppt.patient_id}/visits`).then((r) => r.data),
    enabled: !!selectedAppt?.patient_id,
  });

  async function selectAppointment(a: any) {
    setSelectedAppt(a);
    try {
      const visits = await api.get(`/api/patients/${a.patient_id}/visits`).then((r) => r.data);
      const todayVisit = visits.find((v: any) => v.appointment_id === a.id);
      setSelectedVisit(todayVisit || null);
    } catch {
      setSelectedVisit(null);
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Doctor Desk" />
        <div className="flex-1 flex overflow-hidden">
          {/* Patient Queue — left panel */}
          <div className="w-64 border-r bg-white flex flex-col flex-shrink-0">
            <div className="px-3 py-2 border-b bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Today's Queue</p>
              <p className="text-xs text-gray-400">{allToday.length} total · {queue.length} with doctor</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {allToday.map((a: any) => (
                <button
                  key={a.id}
                  onClick={() => selectAppointment(a)}
                  className={`w-full text-left px-3 py-2.5 border-b hover:bg-blue-50 transition-colors ${selectedAppt?.id === a.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {a.token_number}
                    </span>
                    <StatusPill status={a.status} />
                  </div>
                  <p className="text-xs font-medium text-gray-700 mt-1">Patient #{a.patient_id}</p>
                  <p className="text-xs text-gray-400">{fmtTime(a.appointment_time)}</p>
                  {a.chief_complaint && <p className="text-xs text-gray-400 truncate mt-0.5">{a.chief_complaint}</p>}
                </button>
              ))}
              {allToday.length === 0 && (
                <div className="text-center py-8 text-gray-300 text-xs">No patients today</div>
              )}
            </div>
          </div>

          {/* Main workspace */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedAppt ? (
              <div className="flex-1 flex items-center justify-center text-gray-300">
                <div className="text-center">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a patient from the queue</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Patient info — right strip */}
                <div className="w-64 border-l bg-gray-50 flex-shrink-0 overflow-y-auto order-last">
                  <PatientInfoPanel patient={patient} vitals={vitals} visits={patientVisits} />
                </div>

                {/* Clinical workspace — center */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {selectedAppt.token_number}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {patient ? `${patient.first_name} ${patient.last_name}` : `Patient #${selectedAppt.patient_id}`}
                      </p>
                      <p className="text-xs text-gray-400">{selectedAppt.appointment_no} · {selectedAppt.visit_type} · {selectedAppt.appointment_type}</p>
                    </div>
                    <Badge className="ml-auto text-xs">{selectedAppt.status}</Badge>
                  </div>

                  <Tabs defaultValue="soap">
                    <TabsList className="mb-3">
                      <TabsTrigger value="soap" className="text-xs">SOAP Notes</TabsTrigger>
                      <TabsTrigger value="diagnosis" className="text-xs">Diagnosis (ICD-10)</TabsTrigger>
                      <TabsTrigger value="prescription" className="text-xs">Prescription</TabsTrigger>
                      <TabsTrigger value="labs" className="text-xs">Lab Orders</TabsTrigger>
                    </TabsList>
                    <TabsContent value="soap">
                      <SOAPNotesPanel visit={selectedVisit} existing={consultation} onSave={() => { qc.invalidateQueries({ queryKey: ["consultation"] }); }} />
                    </TabsContent>
                    <TabsContent value="diagnosis">
                      {consultation ? (
                        <DiagnosisPanel consultationId={consultation.id} />
                      ) : <p className="text-xs text-gray-400">Save SOAP notes first</p>}
                    </TabsContent>
                    <TabsContent value="prescription">
                      {consultation ? (
                        <PrescriptionPanel consultationId={consultation.id} patientId={selectedAppt.patient_id} />
                      ) : <p className="text-xs text-gray-400">Save SOAP notes first</p>}
                    </TabsContent>
                    <TabsContent value="labs">
                      {consultation ? (
                        <LabOrderPanel consultationId={consultation.id} patientId={selectedAppt.patient_id} />
                      ) : <p className="text-xs text-gray-400">Save SOAP notes first</p>}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    SCHEDULED: "bg-gray-100 text-gray-500",
    CHECKED_IN: "bg-blue-100 text-blue-600",
    IN_QUEUE: "bg-amber-100 text-amber-600",
    WITH_DOCTOR: "bg-violet-100 text-violet-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-600",
  };
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${map[status] || "bg-gray-100 text-gray-500"}`}>{status.replace("_", " ")}</span>;
}

function PatientInfoPanel({ patient, vitals, visits }: any) {
  if (!patient) return <div className="p-3 text-xs text-gray-400">Loading...</div>;

  return (
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-lg border p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">{patient.first_name} {patient.last_name}</p>
            <p className="text-xs text-gray-400 font-mono">{patient.uhid}</p>
          </div>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between"><span className="text-gray-400">Age/Sex</span><span>{calcAge(patient.date_of_birth)} / {patient.gender[0]}</span></div>
          {patient.blood_group && <div className="flex justify-between"><span className="text-gray-400">Blood</span><span className="text-red-500 font-medium">{patient.blood_group}</span></div>}
          <div className="flex justify-between"><span className="text-gray-400">Phone</span><span>{patient.phone}</span></div>
          {patient.abha_id && <div className="flex justify-between"><span className="text-gray-400">ABHA</span><span className="font-mono">{patient.abha_id}</span></div>}
        </div>
      </div>

      {vitals && (
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Today's Vitals</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {vitals.temperature && <VitalItem label="Temp" value={`${vitals.temperature}°C`} />}
            {vitals.pulse && <VitalItem label="Pulse" value={`${vitals.pulse} bpm`} alert={vitals.pulse > 100 || vitals.pulse < 60} />}
            {vitals.bp_systolic && <VitalItem label="BP" value={`${vitals.bp_systolic}/${vitals.bp_diastolic}`} alert={vitals.bp_systolic > 140} />}
            {vitals.spo2 && <VitalItem label="SpO2" value={`${vitals.spo2}%`} alert={vitals.spo2 < 95} />}
            {vitals.weight && <VitalItem label="Wt" value={`${vitals.weight} kg`} />}
            {vitals.bmi && <VitalItem label="BMI" value={vitals.bmi} alert={vitals.bmi > 30 || vitals.bmi < 18} />}
            {vitals.blood_glucose && <VitalItem label="Glucose" value={`${vitals.blood_glucose} mg/dL`} alert={vitals.blood_glucose > 140} />}
            {vitals.pain_score !== null && <VitalItem label="Pain" value={`${vitals.pain_score}/10`} alert={vitals.pain_score > 6} />}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border p-3">
        <p className="text-xs font-semibold text-gray-700 mb-2">Past Visits ({visits.length})</p>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {visits.slice(0, 8).map((v: any) => (
            <div key={v.id} className="flex justify-between text-xs text-gray-500">
              <span className="font-mono">{v.visit_no}</span>
              <span>{fmtDate(v.visit_date)}</span>
            </div>
          ))}
          {visits.length === 0 && <p className="text-xs text-gray-300">No past visits</p>}
        </div>
      </div>
    </div>
  );
}

function VitalItem({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${alert ? "text-red-600 font-medium" : "text-gray-600"}`}>
      <span className="text-gray-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SOAPNotesPanel({ visit, existing, onSave }: any) {
  const qc = useQueryClient();
  const [soap, setSoap] = useState({
    chief_complaint: existing?.chief_complaint || "",
    history_of_present_illness: existing?.history_of_present_illness || "",
    past_medical_history: existing?.past_medical_history || "",
    family_history: existing?.family_history || "",
    personal_history: existing?.personal_history || "",
    general_examination: existing?.general_examination || "",
    systemic_examination: existing?.systemic_examination || "",
    clinical_notes: existing?.clinical_notes || "",
    advice: existing?.advice || "",
    follow_up_days: existing?.follow_up_days || "",
  });

  const set = (k: string, v: string) => setSoap((p) => ({ ...p, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...soap, visit_id: visit?.id, patient_id: visit?.patient_id };
      if (existing?.id) {
        return api.put(`/api/clinical/consultation/${existing.id}`, payload);
      }
      return api.post("/api/clinical/consultation", payload);
    },
    onSuccess: () => {
      toast.success("Notes saved");
      qc.invalidateQueries({ queryKey: ["consultation"] });
      onSave();
    },
    onError: () => toast.error("Failed to save"),
  });

  if (!visit) return <div className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Patient not checked in yet — no visit created</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2">
          <Label className="text-xs font-semibold">Chief Complaint *</Label>
          <Input className="text-sm" value={soap.chief_complaint} onChange={(e) => set("chief_complaint", e.target.value)} placeholder="Patient's main complaint" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">History of Present Illness</Label>
          <Textarea className="text-xs min-h-20 resize-none" value={soap.history_of_present_illness} onChange={(e) => set("history_of_present_illness", e.target.value)} placeholder="Duration, onset, progression..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Past Medical History</Label>
          <Textarea className="text-xs min-h-20 resize-none" value={soap.past_medical_history} onChange={(e) => set("past_medical_history", e.target.value)} placeholder="DM, HTN, previous surgeries..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Family History</Label>
          <Textarea className="text-xs min-h-16 resize-none" value={soap.family_history} onChange={(e) => set("family_history", e.target.value)} placeholder="DM, HTN, CAD in family..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Personal History (smoking, alcohol, diet)</Label>
          <Textarea className="text-xs min-h-16 resize-none" value={soap.personal_history} onChange={(e) => set("personal_history", e.target.value)} placeholder="Smoker, alcoholic, diet habits..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">General Examination</Label>
          <Textarea className="text-xs min-h-16 resize-none" value={soap.general_examination} onChange={(e) => set("general_examination", e.target.value)} placeholder="Conscious, oriented, no pallor..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Systemic Examination</Label>
          <Textarea className="text-xs min-h-16 resize-none" value={soap.systemic_examination} onChange={(e) => set("systemic_examination", e.target.value)} placeholder="CVS: S1 S2 normal, RS: Clear..." />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs font-semibold">Clinical Notes / Assessment</Label>
          <Textarea className="text-xs min-h-20 resize-none" value={soap.clinical_notes} onChange={(e) => set("clinical_notes", e.target.value)} placeholder="Assessment and plan..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Advice / Instructions</Label>
          <Textarea className="text-xs min-h-16 resize-none" value={soap.advice} onChange={(e) => set("advice", e.target.value)} placeholder="Rest, diet, lifestyle advice..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Follow Up (days)</Label>
          <Input type="number" className="text-sm" value={soap.follow_up_days} onChange={(e) => set("follow_up_days", e.target.value)} placeholder="e.g. 7" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
          {saveMutation.isPending ? "Saving..." : existing ? "Update Notes" : "Save Notes"}
        </Button>
      </div>
    </div>
  );
}

function DiagnosisPanel({ consultationId }: { consultationId: number }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const { data: diagnoses = [] } = useQuery({
    queryKey: ["diagnoses", consultationId],
    queryFn: () => api.get(`/api/clinical/consultation/${consultationId}/diagnoses`).then((r) => r.data),
  });

  async function searchICD(q: string) {
    setSearch(q);
    if (q.length < 2) return setResults([]);
    const data = await api.get(`/api/masters/icd10?q=${q}`).then((r) => r.data);
    setResults(data);
  }

  const addMutation = useMutation({
    mutationFn: (dx: any) => api.post(`/api/clinical/consultation/${consultationId}/diagnosis`, dx),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["diagnoses"] }); setResults([]); setSearch(""); toast.success("Diagnosis added"); },
  });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Search ICD-10</Label>
        <Input className="text-sm" value={search} onChange={(e) => searchICD(e.target.value)} placeholder="Type diagnosis name or ICD code..." />
        {results.length > 0 && (
          <div className="border rounded-lg overflow-hidden shadow-md max-h-48 overflow-y-auto bg-white">
            {results.map((r) => (
              <button key={r.id} className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0 text-xs" onClick={() => addMutation.mutate({ icd10_code: r.code, icd10_description: r.description, is_primary: diagnoses.length === 0, is_provisional: true })}>
                <span className="font-mono text-blue-600 mr-2">{r.code}</span>
                <span className="text-gray-700">{r.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-600">Added Diagnoses</p>
        {diagnoses.map((d: any) => (
          <div key={d.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <span className="font-mono text-xs text-blue-700 font-bold">{d.icd10_code}</span>
            <span className="text-xs text-gray-700 flex-1">{d.icd10_description}</span>
            {d.is_primary && <Badge className="text-xs h-4 bg-green-100 text-green-700 border-0">PRIMARY</Badge>}
            {d.is_provisional && <Badge className="text-xs h-4 bg-amber-100 text-amber-700 border-0">PROVISIONAL</Badge>}
          </div>
        ))}
        {diagnoses.length === 0 && <p className="text-xs text-gray-300">No diagnoses added</p>}
      </div>
    </div>
  );
}

function PrescriptionPanel({ consultationId, patientId }: { consultationId: number; patientId: number }) {
  const qc = useQueryClient();
  const [items, setItems] = useState<any[]>([{ drug_id: 0, drug_name: "", dosage: "", frequency: "OD", duration: "5 days", route: "Oral", instructions: "", quantity: 0 }]);
  const [drugSearch, setDrugSearch] = useState("");
  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  async function searchDrug(q: string, idx: number) {
    setDrugSearch(q);
    setActiveIdx(idx);
    const updated = [...items];
    updated[idx].drug_name = q;
    setItems(updated);
    if (q.length < 2) return setDrugResults([]);
    const data = await api.get(`/api/masters/drugs?q=${q}`).then((r) => r.data);
    setDrugResults(data);
  }

  function selectDrug(drug: any, idx: number) {
    const updated = [...items];
    updated[idx].drug_id = drug.id;
    updated[idx].drug_name = `${drug.name} ${drug.strength} (${drug.formulation})`;
    setItems(updated);
    setDrugResults([]);
    setDrugSearch("");
    setActiveIdx(null);
  }

  const freqs = ["OD", "BD", "TDS", "QID", "SOS", "STAT", "HS", "OD-Morning", "OD-Night"];
  const durations = ["1 day", "3 days", "5 days", "7 days", "10 days", "14 days", "1 month", "3 months", "Ongoing"];
  const routes = ["Oral", "IV", "IM", "SC", "Topical", "Inhalation", "Sublingual", "Rectal"];

  const saveMutation = useMutation({
    mutationFn: () => api.post("/api/prescriptions", { consultation_id: consultationId, patient_id: patientId, items: items.filter((i) => i.drug_id), notes }),
    onSuccess: () => { toast.success("Prescription saved"); qc.invalidateQueries({ queryKey: ["prescriptions"] }); },
    onError: () => toast.error("Failed to save prescription"),
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {items.map((item, idx) => (
          <div key={idx} className="border rounded-lg p-3 bg-gray-50 relative">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4 space-y-1 relative">
                <Label className="text-xs">Drug Name</Label>
                <Input
                  className="text-xs h-7"
                  value={item.drug_name}
                  onChange={(e) => searchDrug(e.target.value, idx)}
                  placeholder="Type to search drug..."
                />
                {activeIdx === idx && drugResults.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded shadow-lg max-h-40 overflow-y-auto">
                    {drugResults.map((d) => (
                      <button key={d.id} onClick={() => selectDrug(d, idx)} className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 border-b last:border-0">
                        <span className="font-medium">{d.name}</span> {d.strength} ({d.formulation})
                        {d.brand_name && <span className="text-gray-400 ml-1">— {d.brand_name}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Dosage</Label>
                <Input className="text-xs h-7" value={item.dosage} onChange={(e) => { const u = [...items]; u[idx].dosage = e.target.value; setItems(u); }} placeholder="1 tab, 5ml..." />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Frequency</Label>
                <Select value={item.frequency} onValueChange={(v) => { const u = [...items]; u[idx].frequency = v ?? "OD"; setItems(u); }}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{freqs.map((f) => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Duration</Label>
                <Select value={item.duration} onValueChange={(v) => { const u = [...items]; u[idx].duration = v ?? "5 days"; setItems(u); }}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{durations.map((d) => <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs">Route</Label>
                <Select value={item.route} onValueChange={(v) => { const u = [...items]; u[idx].route = v ?? "Oral"; setItems(u); }}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{routes.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-1 flex items-end justify-end pb-0.5">
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="col-span-8 space-y-1">
                <Label className="text-xs">Instructions</Label>
                <Input className="text-xs h-7" value={item.instructions} onChange={(e) => { const u = [...items]; u[idx].instructions = e.target.value; setItems(u); }} placeholder="Before food, With water..." />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setItems([...items, { drug_id: 0, drug_name: "", dosage: "", frequency: "OD", duration: "5 days", route: "Oral", instructions: "", quantity: 0 }])}>
          <Plus className="w-3.5 h-3.5" /> Add Drug
        </Button>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 ml-auto text-xs" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Pill className="w-3.5 h-3.5 mr-1" /> Save Prescription
        </Button>
      </div>
    </div>
  );
}

function LabOrderPanel({ consultationId, patientId }: { consultationId: number; patientId: number }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [priority, setPriority] = useState("ROUTINE");
  const [notes, setNotes] = useState("");

  async function searchTest(q: string) {
    setSearch(q);
    if (q.length < 2) return setResults([]);
    const data = await api.get(`/api/masters/lab-tests?q=${q}`).then((r) => r.data);
    setResults(data);
  }

  const saveMutation = useMutation({
    mutationFn: () => api.post("/api/lab/orders", { consultation_id: consultationId, patient_id: patientId, tests: selected.map((t) => ({ test_id: t.id, test_name: t.name })), priority, clinical_notes: notes }),
    onSuccess: () => { toast.success("Lab order placed"); setSelected([]); qc.invalidateQueries(); },
    onError: () => toast.error("Failed to place order"),
  });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Search Test</Label>
        <Input className="text-sm" value={search} onChange={(e) => searchTest(e.target.value)} placeholder="CBC, LFT, Blood glucose..." />
        {results.length > 0 && (
          <div className="border rounded-lg overflow-hidden shadow-md max-h-48 overflow-y-auto bg-white">
            {results.map((r) => (
              <button key={r.id} className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-0 text-xs flex justify-between" onClick={() => { if (!selected.find((s) => s.id === r.id)) setSelected([...selected, r]); setResults([]); setSearch(""); }}>
                <span><span className="font-mono text-blue-600 mr-2">{r.code}</span>{r.name}</span>
                <span className="text-gray-400">₹{r.price}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-600">Selected Tests ({selected.length})</p>
          <div className="space-y-1">
            {selected.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded px-3 py-1.5 text-xs">
                <span><span className="font-mono text-teal-700 mr-2">{t.code}</span>{t.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">₹{t.price}</span>
                  <button onClick={() => setSelected(selected.filter((s) => s.id !== t.id))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v ?? "ROUTINE")}>
            <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ROUTINE">Routine</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="STAT">STAT (Immediate)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Clinical Notes</Label>
          <Input className="text-xs h-8" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for test..." />
        </div>
      </div>

      <Button size="sm" className="bg-teal-600 hover:bg-teal-700 gap-1.5 text-xs" disabled={selected.length === 0 || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        <FlaskConical className="w-3.5 h-3.5" /> Place Lab Order
      </Button>
    </div>
  );
}
