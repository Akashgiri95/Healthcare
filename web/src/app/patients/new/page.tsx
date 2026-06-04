"use client";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const INDIAN_STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu & Kashmir", "Ladakh", "Chandigarh", "Puducherry"];

export default function NewPatientPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "", middle_name: "", last_name: "",
    date_of_birth: "", gender: "", blood_group: "",
    phone: "", alternate_phone: "", email: "",
    address_line1: "", address_line2: "", city: "", district: "", state: "Gujarat", pincode: "",
    abha_id: "", aadhaar_last4: "",
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: "",
    insurance_provider: "", insurance_policy_no: "", ayushman_card_no: "",
    marital_status: "", occupation: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/api/patients", data),
    onSuccess: (res) => {
      toast.success(`Patient registered — UHID: ${res.data.uhid}`);
      router.push(`/patients/${res.data.id}`);
    },
    onError: () => toast.error("Failed to register patient"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: any = { ...form };
    Object.keys(payload).forEach((k) => { if (!payload[k]) delete payload[k]; });
    mutation.mutate(payload);
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Register New Patient" />
        <main className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="demographics">
              <TabsList className="mb-4">
                <TabsTrigger value="demographics">Demographics</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="emergency">Emergency & Insurance</TabsTrigger>
              </TabsList>

              <TabsContent value="demographics">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Personal Information</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>First Name *</Label>
                      <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Middle Name</Label>
                      <Input value={form.middle_name} onChange={(e) => set("middle_name", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Last Name *</Label>
                      <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date of Birth *</Label>
                      <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} required max={new Date().toISOString().split("T")[0]} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Gender *</Label>
                      <Select value={form.gender} onValueChange={(v) => set("gender", v ?? "")} required>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Blood Group</Label>
                      <Select value={form.blood_group} onValueChange={(v) => set("blood_group", v ?? "")}>
                        <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                        <SelectContent>
                          {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone *</Label>
                      <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} required maxLength={10} placeholder="10-digit mobile" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Alternate Phone</Label>
                      <Input value={form.alternate_phone} onChange={(e) => set("alternate_phone", e.target.value)} maxLength={10} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>ABHA ID</Label>
                      <Input value={form.abha_id} onChange={(e) => set("abha_id", e.target.value)} placeholder="XX-XXXX-XXXX-XXXX" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Aadhaar (last 4 digits)</Label>
                      <Input value={form.aadhaar_last4} onChange={(e) => set("aadhaar_last4", e.target.value)} maxLength={4} placeholder="XXXX" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Marital Status</Label>
                      <Select value={form.marital_status} onValueChange={(v) => set("marital_status", v ?? "")}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                          <SelectItem value="Divorced">Divorced</SelectItem>
                          <SelectItem value="Widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 col-span-1">
                      <Label>Occupation</Label>
                      <Input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="address">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Address Details</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <Label>Address Line 1 *</Label>
                      <Input value={form.address_line1} onChange={(e) => set("address_line1", e.target.value)} required placeholder="House No., Street" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label>Address Line 2</Label>
                      <Input value={form.address_line2} onChange={(e) => set("address_line2", e.target.value)} placeholder="Landmark, Area" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>City *</Label>
                      <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>District *</Label>
                      <Input value={form.district} onChange={(e) => set("district", e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>State *</Label>
                      <Select value={form.state} onValueChange={(v) => set("state", v ?? "Gujarat")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pincode *</Label>
                      <Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} required maxLength={6} placeholder="6-digit pincode" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emergency">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Emergency Contact</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input value={form.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} maxLength={10} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Relation</Label>
                        <Select value={form.emergency_contact_relation} onValueChange={(v) => set("emergency_contact_relation", v ?? "")}>
                          <SelectTrigger><SelectValue placeholder="Select relation" /></SelectTrigger>
                          <SelectContent>
                            {["Spouse", "Parent", "Child", "Sibling", "Friend", "Other"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Insurance / Ayushman</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Insurance Provider</Label>
                        <Input value={form.insurance_provider} onChange={(e) => set("insurance_provider", e.target.value)} placeholder="Star Health, New India, etc." />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Policy Number</Label>
                        <Input value={form.insurance_policy_no} onChange={(e) => set("insurance_policy_no", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Ayushman Card Number</Label>
                        <Input value={form.ayushman_card_no} onChange={(e) => set("ayushman_card_no", e.target.value)} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-32" disabled={mutation.isPending}>
                {mutation.isPending ? "Registering..." : "Register Patient"}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
