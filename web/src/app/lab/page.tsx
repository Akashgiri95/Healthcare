"use client";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";

export default function LabPage() {
  const { data: orders = [] } = useQuery({
    queryKey: ["lab-orders"],
    queryFn: () => api.get("/api/lab/orders").then((r) => r.data).catch(() => []),
  });

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Lab Orders" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="text-center py-16 text-gray-400">
            <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Lab Orders</p>
            <p className="text-xs mt-1">Orders placed from Doctor Desk appear here</p>
          </div>
        </main>
      </div>
    </div>
  );
}
