"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { JourneyBanner } from "@/components/his/journey-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { calcAge } from "@/lib/utils";
import { useJourneyStore } from "@/store/journey";
import { toast } from "sonner";
import { Search, UserPlus, X, ChevronRight, Phone, Droplet, Building2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const STATES = ["Gujarat", "Maharashtra", "Rajasthan", "Delhi", "Karnataka", "Tamil Nadu", "Uttar Pradesh", "West Bengal", "Telangana", "Kerala", "Madhya Pradesh", "Punjab", "Haryana", "Bihar", "Odisha"];

export default function JourneyRegisterPage() {
  const router = useRouter();
  const { setPatient, patient: journeyPatient } = useJourneyStore();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", date_of_birth: "", gender: "MALE", phone: "",
    address_line1: "", city: "", district: "", state: "Gujarat", pincode: "",
    blood_group: "", language_preference: "Hindi",
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // Pre-select from journey store if already set
  useEffect(() => {
    if (journeyPatient) {
      setSelected({
        id: journeyPatient.id, uhid: journeyPatient.uhid,
        first_name: journeyPatient.name.split(" ")[0],
        last_name: journeyPatient.name.split(" ").slice(1).join(" "),
        date_of_birth: journeyPatient.dob,
        gender: journeyPatient.gender, phone: journeyPatient.phone,
        blood_group: journeyPatient.blood_group,
      });
    }
  }, []);

  const { data: results, isFetching } = useQuery<{ data: any[] }>({
    queryKey: ["patient-search", debouncedQ],
    queryFn: () => api.get(`/api/patients?q=${debouncedQ}&limit=10`).then(r => r.data),
    enabled: debouncedQ.length >= 2,
  });

  const registerMut = useMutation({
    mutationFn: (body: object) => api.post("/api/patients", body).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Patient registered — ${data.uhid}`);
      setSelected(data);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["patient-search"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Registration failed"),
  });

  function handleSelect(p: any) {
    setSelected(p);
    setQ("");
    setDebouncedQ("");
  }

  function handleConfirm() {
    if (!selected) return;
    setPatient({
      id: selected.id,
      uhid: selected.uhid,
      name: `${selected.first_name} ${selected.last_name}`,
      gender: selected.gender,
      dob: selected.date_of_birth,
      phone: selected.phone,
      blood_group: selected.blood_group,
    });
    toast.success("Patient selected — proceeding to appointment booking");
    router.push("/opd/journey/appointment");
  }

  function handleRegister() {
    const { blood_group, ...rest } = form;
    const payload: any = { ...rest };
    if (blood_group) payload.blood_group = blood_group;
    if (!payload.first_name || !payload.last_name || !payload.date_of_birth || !payload.phone || !payload.address_line1 || !payload.city || !payload.pincode)
      return toast.error("Fill all required fields");
    registerMut.mutate(payload);
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title="OPD Journey — Register Patient" />
        <JourneyBanner currentStep={1} />

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Search */}
          <div className="w-80 bg-white border-r flex flex-col shrink-0">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-semibold text-gray-700 mb-2">Search Existing Patient</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input
                  placeholder="Name, phone, UHID..."
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
                {q && <button onClick={() => { setQ(""); setDebouncedQ(""); }} className="absolute right-2 top-2"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {isFetching && <p className="text-xs text-gray-400 px-4 py-3">Searching...</p>}
              {debouncedQ.length >= 2 && !isFetching && (results?.data || []).length === 0 && (
                <p className="text-xs text-gray-400 px-4 py-4 text-center">No patients found</p>
              )}
              {(results?.data || []).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 border-b hover:bg-blue-50 transition-colors",
                    selected?.id === p.id && "bg-blue-50 border-l-2 border-l-blue-600"
                  )}
                >
                  <p className="text-sm font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-gray-500">{p.uhid} · {p.gender[0]}/{calcAge(p.date_of_birth)} · {p.phone}</p>
                </button>
              ))}
              {debouncedQ.length < 2 && !selected && !showForm && (
                <div className="px-4 py-6 text-center text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Type at least 2 characters to search</p>
                </div>
              )}
            </div>

            {/* New patient toggle */}
            <div className="p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => { setShowForm(!showForm); setSelected(null); }}
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                {showForm ? "Cancel" : "Register New Patient"}
              </Button>
            </div>
          </div>

          {/* Right: Details / Form */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* New Patient Form */}
            {showForm && (
              <div className="max-w-xl">
                <h2 className="text-base font-semibold text-gray-800 mb-4">New Patient Registration</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">First Name *</Label>
                      <Input className="mt-1" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Last Name *</Label>
                      <Input className="mt-1" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Date of Birth *</Label>
                      <Input type="date" className="mt-1" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Gender *</Label>
                      <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v ?? "MALE" }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Blood Group</Label>
                      <Select value={form.blood_group} onValueChange={v => setForm(f => ({ ...f, blood_group: v ?? "" }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>
                        <SelectContent>
                          {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Phone *</Label>
                    <Input className="mt-1" placeholder="10-digit mobile" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Address *</Label>
                    <Input className="mt-1" value={form.address_line1} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">City *</Label>
                      <Input className="mt-1" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-xs">State</Label>
                      <Select value={form.state} onValueChange={v => setForm(f => ({ ...f, state: v ?? "Gujarat" }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Pincode *</Label>
                      <Input className="mt-1" maxLength={6} value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} />
                    </div>
                  </div>
                  <Button onClick={handleRegister} disabled={registerMut.isPending} className="w-full">
                    {registerMut.isPending ? "Registering..." : "Register & Continue"}
                  </Button>
                </div>
              </div>
            )}

            {/* Selected Patient Card */}
            {selected && !showForm && (
              <div className="max-w-xl">
                <div className="bg-white rounded-2xl border shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selected.first_name} {selected.last_name}
                      </h2>
                      <p className="text-sm text-gray-500 font-mono">{selected.uhid}</p>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Age / Gender</p>
                      <p className="font-medium">{calcAge(selected.date_of_birth)} / {selected.gender}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Phone</p>
                      <p className="font-medium flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-400" />{selected.phone}</p>
                    </div>
                    {selected.blood_group && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Blood Group</p>
                        <p className="font-medium flex items-center gap-1"><Droplet className="w-3.5 h-3.5 text-red-400" />{selected.blood_group}</p>
                      </div>
                    )}
                    {selected.language_preference && selected.language_preference !== "Hindi" && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Language</p>
                        <p className="font-medium flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-purple-400" />{selected.language_preference}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {selected.is_vip && <Badge className="bg-yellow-100 text-yellow-800">VIP</Badge>}
                    {selected.company_id && <Badge className="bg-amber-100 text-amber-800"><Building2 className="w-3 h-3 mr-1 inline" />Corporate</Badge>}
                    {selected.ayushman_card_no && <Badge className="bg-green-100 text-green-800">Ayushman</Badge>}
                    {selected.interpreter_required && <Badge className="bg-purple-100 text-purple-700">Interpreter Needed</Badge>}
                  </div>

                  <Button onClick={handleConfirm} className="w-full" size="lg">
                    Confirm Patient & Continue to Appointment
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                <p className="text-xs text-gray-400 mt-3 text-center">
                  Not the right patient?{" "}
                  <button onClick={() => setSelected(null)} className="text-blue-600 underline">Search again</button>
                </p>
              </div>
            )}

            {/* Empty state */}
            {!selected && !showForm && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400 max-w-xs">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-base font-medium text-gray-500 mb-1">Find or Register a Patient</p>
                  <p className="text-sm">Search by name, phone, or UHID on the left. For new patients, click "Register New Patient".</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
