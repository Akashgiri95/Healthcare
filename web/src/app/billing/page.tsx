"use client";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { Receipt } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Billing" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="text-center py-16 text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Billing</p>
            <p className="text-xs mt-1">Create and manage OPD bills</p>
          </div>
        </main>
      </div>
    </div>
  );
}
