"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { JourneyBanner } from "@/components/his/journey-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useJourneyStore } from "@/store/journey";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, AlertTriangle, Activity, Thermometer, Heart, Wind, Droplets, Scale, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";

interface VitalsForm {
  bp_systolic: string;
  bp_diastolic: string;
  pulse: string;
  temperature: string;
  spo2: string;
  respiratory_rate: string;
  weight: string;
  height: string;
  blood_glucose: string;
  pain_score: string;
  notes: string;
}

function flagVital(key: string, val: string): "normal" | "warning" | "critical" {
  const n = parseFloat(val);
  if (isNaN(n)) return "normal";
  switch (key) {
    case "bp_systolic":    return n >= 180 ? "critical" : n >= 140 ? "warning" : n < 90 ? "warning" : "normal";
    case "bp_diastolic":   return n >= 120 ? "critical" : n >= 90 ? "warning" : n < 60 ? "warning" : "normal";
    case "pulse":          return n > 150 ? "critical" : n > 100 || n < 50 ? "warning" : "normal";
    case "temperature":    return n >= 40 ? "critical" : n >= 38 ? "warning" : n < 35 ? "warning" : "normal";
    case "spo2":           return n < 90 ? "critical" : n < 95 ? "warning" : "normal";
    case "respiratory_rate": return n > 30 ? "critical" : n > 20 || n < 10 ? "warning" : "normal";
    case "blood_glucose":  return n > 400 ? "critical" : n > 200 || n < 70 ? "warning" : "normal";
    case "pain_score":     return n >= 8 ? "critical" : n >= 5 ? "warning" : "normal";
    default: return "normal";
  }
}

const FLAG_COLORS = {
  normal:   "",
  warning:  "border-amber-400 bg-amber-50",
  critical: "border-red-500 bg-red-50",
};

const FLAG_BADGE = {
  normal:   null,
  warning:  <Badge className="text-[10px] bg-amber-100 text-amber-700 px-1 py-0">!</Badge>,
  critical: <Badge className="text-[10px] bg-red-100 text-red-700 px-1 py-0">!!</Badge>,
};

export default function JourneyVitalsPage() {
  const router = useRouter();
  const { patient, visitId, completeStep } = useJourneyStore();

  const [form, setForm] = useState<VitalsForm>({
    bp_systolic: "", bp_diastolic: "", pulse: "", temperature: "",
    spo2: "", respiratory_rate: "", weight: "", height: "",
    blood_glucose: "", pain_score: "", notes: "",
  });

  const bmi = (() => {
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height) / 100;
    if (!w || !h) return null;
    return (w / (h * h)).toFixed(1);
  })();

  const bmiLabel = (() => {
    if (!bmi) return null;
    const v = parseFloat(bmi);
    if (v < 18.5) return { text: "Underweight", cls: "text-blue-600" };
    if (v < 25)   return { text: "Normal",      cls: "text-green-600" };
    if (v < 30)   return { text: "Overweight",  cls: "text-amber-600" };
    return           { text: "Obese",          cls: "text-red-600" };
  })();

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = { visit_id: visitId, patient_id: patient!.id };
      if (form.bp_systolic)     payload.bp_systolic     = parseInt(form.bp_systolic);
      if (form.bp_diastolic)    payload.bp_diastolic    = parseInt(form.bp_diastolic);
      if (form.pulse)           payload.pulse           = parseInt(form.pulse);
      if (form.temperature)     payload.temperature     = parseFloat(form.temperature);
      if (form.spo2)            payload.spo2            = parseInt(form.spo2);
      if (form.respiratory_rate) payload.respiratory_rate = parseInt(form.respiratory_rate);
      if (form.weight)          payload.weight          = parseFloat(form.weight);
      if (form.height)          payload.height          = parseFloat(form.height);
      if (bmi)                  payload.bmi             = parseFloat(bmi);
      if (form.blood_glucose)   payload.blood_glucose   = parseFloat(form.blood_glucose);
      if (form.pain_score)      payload.pain_score      = parseInt(form.pain_score);
      if (form.notes)           payload.notes           = form.notes;
      return api.post("/api/clinical/vitals", payload).then(r => r.data);
    },
    onSuccess: () => {
      completeStep(3);
      toast.success("Vitals saved");
      router.push("/opd/journey/consultation");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to save vitals"),
  });

  function set(key: keyof VitalsForm, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleSave() {
    if (!visitId) return toast.error("No active visit");
    saveMut.mutate();
  }

  if (!patient || !visitId) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar title="OPD Journey — Vitals & Triage" />
          <JourneyBanner currentStep={3} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium text-gray-600">No active visit — complete Steps 1 & 2 first</p>
              <Button className="mt-4" onClick={() => router.push("/opd/journey/register")}>
                <ArrowLeft className="w-4 h-4 mr-2" />Start from Register
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="OPD Journey — Vitals & Triage" />
        <JourneyBanner currentStep={3} />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl space-y-5">

            {/* BP + Pulse + Temp row */}
            <div className="bg-white rounded-2xl border p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-red-400" />Cardiovascular
              </p>
              <div className="grid grid-cols-3 gap-3">
                {/* BP */}
                <div>
                  <Label className="text-xs text-gray-500">BP Systolic (mmHg)</Label>
                  <div className={cn("mt-1 rounded-lg border overflow-hidden", FLAG_COLORS[flagVital("bp_systolic", form.bp_systolic)])}>
                    <Input
                      type="number" placeholder="120"
                      className="border-0 shadow-none bg-transparent"
                      value={form.bp_systolic}
                      onChange={e => set("bp_systolic", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-400">Normal: 90–139</span>
                    {FLAG_BADGE[flagVital("bp_systolic", form.bp_systolic)]}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">BP Diastolic (mmHg)</Label>
                  <div className={cn("mt-1 rounded-lg border overflow-hidden", FLAG_COLORS[flagVital("bp_diastolic", form.bp_diastolic)])}>
                    <Input
                      type="number" placeholder="80"
                      className="border-0 shadow-none bg-transparent"
                      value={form.bp_diastolic}
                      onChange={e => set("bp_diastolic", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-400">Normal: 60–89</span>
                    {FLAG_BADGE[flagVital("bp_diastolic", form.bp_diastolic)]}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Pulse (bpm)</Label>
                  <div className={cn("mt-1 rounded-lg border overflow-hidden", FLAG_COLORS[flagVital("pulse", form.pulse)])}>
                    <Input
                      type="number" placeholder="72"
                      className="border-0 shadow-none bg-transparent"
                      value={form.pulse}
                      onChange={e => set("pulse", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-400">Normal: 60–100</span>
                    {FLAG_BADGE[flagVital("pulse", form.pulse)]}
                  </div>
                </div>
              </div>
            </div>

            {/* Temp + SpO2 + RR */}
            <div className="bg-white rounded-2xl border p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-orange-400" />Respiratory & Temperature
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Temperature (°C)</Label>
                  <div className={cn("mt-1 rounded-lg border overflow-hidden", FLAG_COLORS[flagVital("temperature", form.temperature)])}>
                    <Input
                      type="number" step="0.1" placeholder="37.0"
                      className="border-0 shadow-none bg-transparent"
                      value={form.temperature}
                      onChange={e => set("temperature", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-400">Normal: 36.1–37.9</span>
                    {FLAG_BADGE[flagVital("temperature", form.temperature)]}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">SpO2 (%)</Label>
                  <div className={cn("mt-1 rounded-lg border overflow-hidden", FLAG_COLORS[flagVital("spo2", form.spo2)])}>
                    <Input
                      type="number" placeholder="98"
                      className="border-0 shadow-none bg-transparent"
                      value={form.spo2}
                      onChange={e => set("spo2", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-400">Normal: ≥95</span>
                    {FLAG_BADGE[flagVital("spo2", form.spo2)]}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Resp. Rate (/min)</Label>
                  <div className={cn("mt-1 rounded-lg border overflow-hidden", FLAG_COLORS[flagVital("respiratory_rate", form.respiratory_rate)])}>
                    <Input
                      type="number" placeholder="16"
                      className="border-0 shadow-none bg-transparent"
                      value={form.respiratory_rate}
                      onChange={e => set("respiratory_rate", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-400">Normal: 12–20</span>
                    {FLAG_BADGE[flagVital("respiratory_rate", form.respiratory_rate)]}
                  </div>
                </div>
              </div>
            </div>

            {/* Weight + Height + BMI + Blood Glucose */}
            <div className="bg-white rounded-2xl border p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-blue-400" />Anthropometry & Metabolic
              </p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Weight (kg)</Label>
                  <Input
                    type="number" step="0.1" placeholder="70" className="mt-1"
                    value={form.weight}
                    onChange={e => set("weight", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Height (cm)</Label>
                  <Input
                    type="number" placeholder="170" className="mt-1"
                    value={form.height}
                    onChange={e => set("height", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">BMI</Label>
                  <div className="mt-1 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center px-3">
                    {bmi ? (
                      <span className="text-sm font-semibold text-gray-700">
                        {bmi} <span className={cn("text-xs font-normal", bmiLabel?.cls)}>{bmiLabel?.text}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Auto-calc</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Blood Glucose (mg/dL)</Label>
                  <div className={cn("mt-1 rounded-lg border overflow-hidden", FLAG_COLORS[flagVital("blood_glucose", form.blood_glucose)])}>
                    <Input
                      type="number" placeholder="100"
                      className="border-0 shadow-none bg-transparent"
                      value={form.blood_glucose}
                      onChange={e => set("blood_glucose", e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-gray-400">Fasting: 70–100</span>
                    {FLAG_BADGE[flagVital("blood_glucose", form.blood_glucose)]}
                  </div>
                </div>
              </div>
            </div>

            {/* Pain score */}
            <div className="bg-white rounded-2xl border p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pain Score (0–10)</p>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => set("pain_score", String(i))}
                    className={cn(
                      "w-9 h-9 rounded-lg border text-sm font-semibold transition-all",
                      form.pain_score === String(i)
                        ? i >= 8 ? "bg-red-600 border-red-600 text-white"
                          : i >= 5 ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-green-600 border-green-600 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                    )}
                  >{i}</button>
                ))}
                {form.pain_score && (
                  <Badge className={cn("self-center text-xs ml-2",
                    parseInt(form.pain_score) >= 8 ? "bg-red-100 text-red-700"
                    : parseInt(form.pain_score) >= 5 ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                  )}>
                    {parseInt(form.pain_score) >= 8 ? "Severe" : parseInt(form.pain_score) >= 5 ? "Moderate" : "Mild"}
                  </Badge>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Triage Notes</Label>
              <Textarea
                className="mt-1.5 resize-none text-sm"
                rows={2}
                placeholder="Any observations, allergies, special instructions..."
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/opd/journey/appointment")}>
                <ArrowLeft className="w-4 h-4 mr-1" />Back
              </Button>
              <Button onClick={handleSave} disabled={saveMut.isPending} className="flex-1">
                <Activity className="w-4 h-4 mr-2" />
                {saveMut.isPending ? "Saving Vitals..." : "Save & Proceed to Consultation"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
