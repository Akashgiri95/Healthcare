"use client";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calcAge, fmtDate } from "@/lib/utils";
import { Search, Plus, Phone, User } from "lucide-react";
import Link from "next/link";

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["patients", q],
    queryFn: () => api.get(`/api/patients?q=${q}&limit=30`).then((r) => r.data),
  });

  const patients = data?.data || [];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Patient Registry" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, UHID, phone..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setQ(search)}
                />
              </div>
              <Button onClick={() => setQ(search)} variant="outline">Search</Button>
            </div>
            <Link href="/patients/new">
              <Button className="bg-blue-600 hover:bg-blue-700 gap-1.5">
                <Plus className="w-4 h-4" /> Register Patient
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-16 text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-2">
              {patients.map((p: any) => (
                <Link key={p.id} href={`/patients/${p.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border hover:border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 text-sm">
                              {p.first_name} {p.middle_name || ""} {p.last_name}
                            </p>
                            {p.is_vip && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">VIP</span>
                            )}
                            {p.ayushman_card_no && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">AYUSHMAN</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-400">
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{p.uhid}</span>
                            <span>{p.gender} · {calcAge(p.date_of_birth)}</span>
                            {p.blood_group && <span className="text-red-500 font-medium">{p.blood_group}</span>}
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-400 flex-shrink-0">
                          <p className="flex items-center gap-1 justify-end">
                            <Phone className="w-3 h-3" /> {p.phone}
                          </p>
                          <p className="mt-0.5">{p.city}, {p.state}</p>
                          <p className="mt-0.5 text-gray-300">Reg: {fmtDate(p.registered_at)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {patients.length === 0 && (
                <div className="text-center py-16">
                  <User className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No patients found</p>
                  <Link href="/patients/new">
                    <Button className="mt-3 bg-blue-600 hover:bg-blue-700 gap-1.5" size="sm">
                      <Plus className="w-3.5 h-3.5" /> Register First Patient
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
