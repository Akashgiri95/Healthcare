"use client";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { Pill } from "lucide-react";

export default function PharmacyPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Pharmacy" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="text-center py-16 text-gray-400">
            <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Pharmacy Dispensing</p>
            <p className="text-xs mt-1">Prescriptions appear here for dispensing</p>
          </div>
        </main>
      </div>
    </div>
  );
}
