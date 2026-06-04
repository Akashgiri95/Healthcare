import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PatientSummary {
  id: number;
  uhid: string;
  name: string;
  gender: string;
  dob: string;
  phone: string;
  blood_group?: string;
}

export interface AppointmentSummary {
  id: number;
  appointment_no: string;
  token_number?: number;
  doctor_name: string;
  department_name: string;
}

interface JourneyStore {
  patient: PatientSummary | null;
  appointment: AppointmentSummary | null;
  visitId: number | null;
  visitNo: string | null;
  consultationId: number | null;
  completedSteps: number[];

  setPatient: (p: PatientSummary) => void;
  setAppointment: (a: AppointmentSummary, visitId: number, visitNo: string) => void;
  setConsultationId: (id: number) => void;
  completeStep: (step: number) => void;
  reset: () => void;
}

export const useJourneyStore = create<JourneyStore>()(
  persist(
    (set) => ({
      patient: null,
      appointment: null,
      visitId: null,
      visitNo: null,
      consultationId: null,
      completedSteps: [],

      setPatient: (patient) => set({ patient, completedSteps: [1] }),

      setAppointment: (appointment, visitId, visitNo) =>
        set((s) => ({
          appointment,
          visitId,
          visitNo,
          completedSteps: [...new Set([...s.completedSteps, 2])],
        })),

      setConsultationId: (consultationId) => set({ consultationId }),

      completeStep: (step) =>
        set((s) => ({ completedSteps: [...new Set([...s.completedSteps, step])] })),

      reset: () =>
        set({
          patient: null,
          appointment: null,
          visitId: null,
          visitNo: null,
          consultationId: null,
          completedSteps: [],
        }),
    }),
    { name: "his-journey" }
  )
);
