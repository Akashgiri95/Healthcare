"use client";
import { useRouter } from "next/navigation";
import { useJourneyStore } from "@/store/journey";
import { calcAge } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, RotateCcw } from "lucide-react";

const STEPS = [
  { num: 1, label: "Appointment", href: "/opd/journey/appointment" },
  { num: 2, label: "Registration", href: "/opd/journey/register" },
  { num: 3, label: "Vitals",       href: "/opd/journey/vitals" },
  { num: 4, label: "Consultation", href: "/opd/journey/consultation" },
];

export function JourneyBanner({ currentStep }: { currentStep: number }) {
  const { patient, visitNo, completedSteps, reset } = useJourneyStore();
  const router = useRouter();

  return (
    <div className="bg-blue-950 border-b border-blue-800 px-4 py-2 flex items-center gap-3 shrink-0">
      {/* Patient chip */}
      <div className="shrink-0 min-w-[140px]">
        {patient ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {patient.name[0]}
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-none truncate max-w-[110px]">{patient.name}</p>
              <p className="text-[10px] text-blue-300 mt-0.5">{patient.uhid} · {calcAge(patient.dob)}</p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-blue-500 italic">No patient</p>
        )}
      </div>

      <div className="w-px h-5 bg-blue-800 shrink-0" />

      {/* Steps */}
      <div className="flex items-center gap-0.5 flex-1">
        {STEPS.map((step, i) => {
          const done = completedSteps.includes(step.num);
          const active = step.num === currentStep;
          const reachable = step.num === 1 || completedSteps.includes(step.num - 1);

          return (
            <div key={step.num} className="flex items-center">
              <button
                onClick={() => reachable && router.push(step.href)}
                disabled={!reachable}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
                  active
                    ? "bg-blue-600 text-white"
                    : done
                    ? "text-green-300 hover:bg-blue-900 cursor-pointer"
                    : "text-blue-600 cursor-not-allowed"
                )}
              >
                {done && !active ? (
                  <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                ) : (
                  <span className={cn(
                    "w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0",
                    active ? "border-white bg-white text-blue-700" : "border-blue-700 text-blue-600"
                  )}>
                    {step.num}
                  </span>
                )}
                {step.label}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-3 h-3 text-blue-800 mx-0.5 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {visitNo && (
        <>
          <div className="w-px h-5 bg-blue-800 shrink-0" />
          <p className="text-[10px] text-blue-400 shrink-0">
            Visit: <span className="font-mono text-blue-200">{visitNo}</span>
          </p>
        </>
      )}

      <button
        onClick={() => { reset(); router.push("/opd/journey/appointment"); }}
        className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-red-400 transition-colors shrink-0"
        title="Start new journey"
      >
        <RotateCcw className="w-3 h-3" />
        New
      </button>
    </div>
  );
}
