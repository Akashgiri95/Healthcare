"use client";
import { Sidebar } from "@/components/his/sidebar";
import { Topbar } from "@/components/his/topbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useState } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarDays, Plus, UserCheck, X, RotateCcw, Eye, AlertTriangle, Check } from "lucide-react";
import Link from "next/link";
import { fmtTime } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED: "bg-gray-100 text-gray-600",
  CHECKED_IN: "bg-blue-100 text-blue-700",
  IN_QUEUE: "bg-amber-100 text-amber-700",
  WITH_DOCTOR: "bg-violet-100 text-violet-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
  NO_SHOW: "bg-rose-100 text-rose-600",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled", CHECKED_IN: "Checked In", IN_QUEUE: "In Queue",
  WITH_DOCTOR: "With Doctor", COMPLETED: "Completed", CANCELLED: "Cancelled", NO_SHOW: "No Show",
};

const AUDIT_LABEL: Record<string, string> = {
  CREATED: "Booked", CHECKED_IN: "Checked In", RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled", NO_SHOW: "No Show", STATUS_CHANGED: "Status Changed", TRANSFERRED: "Transferred",
};

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState<"cancel" | "transfer" | null>(null);

  const [cancelModal, setCancelModal] = useState<{ id: number; no: string } | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{ id: number; no: string } | null>(null);
  const [auditModal, setAuditModal] = useState<{ id: number; no: string } | null>(null);

  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("09:00");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [transferDoctorId, setTransferDoctorId] = useState<string | null>(null);
  const [transferReason, setTransferReason] = useState("");

  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["appointments"] });
    qc.invalidateQueries({ queryKey: ["appointment-stats"] });
  };

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", date],
    queryFn: () => api.get(`/api/appointments?appointment_date=${date}`).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["appointment-stats", date],
    queryFn: () => api.get(`/api/appointments/stats?stats_date=${date}`).then((r) => r.data),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.get("/api/masters/doctors").then((r) => r.data),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit", auditModal?.id],
    queryFn: () => api.get(`/api/appointments/${auditModal!.id}/audit`).then((r) => r.data),
    enabled: !!auditModal,
  });

  const checkinMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/appointments/${id}/checkin`),
    onSuccess: () => { invalidate(); toast.success("Patient checked in"); },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Check-in failed"),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post(`/api/appointments/${id}/cancel`, { reason }),
    onSuccess: () => {
      invalidate(); setCancelModal(null); setCancelReason("");
      toast.success("Appointment cancelled");
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Cancel failed"),
  });

  const rescheduleMut = useMutation({
    mutationFn: ({ id, new_date, new_time, reason }: { id: number; new_date: string; new_time: string; reason: string }) =>
      api.post(`/api/appointments/${id}/reschedule`, { new_date, new_time, reason }),
    onSuccess: () => {
      invalidate(); setRescheduleModal(null); setRescheduleReason("");
      toast.success("Appointment rescheduled");
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Reschedule failed"),
  });

  const noShowMut = useMutation({
    mutationFn: (id: number) => api.post(`/api/appointments/${id}/no-show`),
    onSuccess: () => { invalidate(); toast.success("Marked as no-show"); },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed"),
  });

  const bulkCancelMut = useMutation({
    mutationFn: ({ ids, reason }: { ids: number[]; reason: string }) =>
      api.post("/api/appointments/bulk-cancel", { appointment_ids: ids, reason }),
    onSuccess: (res) => {
      invalidate(); setSelectedIds(new Set()); setBulkMode(null); setCancelReason("");
      toast.success(`Cancelled ${res.data.cancelled.length} appointments`);
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Bulk cancel failed"),
  });

  const bulkTransferMut = useMutation({
    mutationFn: ({ ids, toDocId, reason }: { ids: number[]; toDocId: number; reason: string }) =>
      api.post("/api/appointments/bulk-transfer", { appointment_ids: ids, to_doctor_id: toDocId, reason }),
    onSuccess: (res) => {
      invalidate(); setSelectedIds(new Set()); setBulkMode(null); setTransferDoctorId(null); setTransferReason("");
      toast.success(`Transferred ${res.data.count} appointments`);
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Bulk transfer failed"),
  });

  const filtered = appointments.filter((a: any) => {
    const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (a.patient_name || "").toLowerCase().includes(q) ||
      (a.patient_uhid || "").toLowerCase().includes(q) ||
      (a.patient_phone || "").includes(q) ||
      (a.appointment_no || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const cancellable = filtered.filter((a: any) => !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status));
  const allSelected = selectedIds.size > 0 && selectedIds.size === cancellable.length;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(cancellable.map((a: any) => a.id)));
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Appointments" />
        <main className="flex-1 overflow-y-auto bg-gray-50">

          {/* Stats strip */}
          {stats && (
            <div className="bg-white border-b px-6 py-3 flex gap-6 text-sm flex-wrap">
              <span className="text-gray-500">Total <strong className="text-gray-800 ml-1">{stats.total}</strong></span>
              <span className="text-gray-500">Scheduled <strong className="text-gray-600 ml-1">{stats.by_status.SCHEDULED}</strong></span>
              <span className="text-blue-600">Checked In <strong className="ml-1">{stats.by_status.CHECKED_IN}</strong></span>
              <span className="text-amber-600">In Queue <strong className="ml-1">{stats.by_status.IN_QUEUE}</strong></span>
              <span className="text-violet-600">With Doctor <strong className="ml-1">{stats.by_status.WITH_DOCTOR}</strong></span>
              <span className="text-green-600">Completed <strong className="ml-1">{stats.completed}</strong></span>
              <span className="text-red-500">Cancelled <strong className="ml-1">{stats.cancelled}</strong></span>
              <span className="text-rose-500">No Show <strong className="ml-1">{stats.no_show}</strong></span>
            </div>
          )}

          <div className="p-6 space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44 bg-white" />
              <Input placeholder="Search name / UHID / phone / APT#…" value={search}
                onChange={(e) => setSearch(e.target.value)} className="w-72 bg-white" />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
                <SelectTrigger className="w-44 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex gap-2 items-center">
                {selectedIds.size > 0 && (
                  <>
                    <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200"
                      onClick={() => { setCancelReason(""); setBulkMode("cancel"); }}>
                      Bulk Cancel
                    </Button>
                    <Button size="sm" variant="outline"
                      onClick={() => { setTransferDoctorId(null); setBulkMode("transfer"); }}>
                      Bulk Transfer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); setBulkMode(null); }}>
                      Clear
                    </Button>
                  </>
                )}
                <Link href="/appointments/new">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5">
                    <Plus className="w-4 h-4" /> Book Appointment
                  </Button>
                </Link>
              </div>
            </div>

            {/* Bulk cancel form */}
            {bulkMode === "cancel" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-red-700 font-medium mb-1 block">Cancellation reason *</label>
                  <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Doctor unavailable, Patient request…" className="bg-white" />
                </div>
                <Button className="bg-red-600 hover:bg-red-700" disabled={!cancelReason.trim() || bulkCancelMut.isPending}
                  onClick={() => bulkCancelMut.mutate({ ids: Array.from(selectedIds), reason: cancelReason })}>
                  Confirm Cancel ({selectedIds.size})
                </Button>
                <Button variant="ghost" onClick={() => setBulkMode(null)}>Dismiss</Button>
              </div>
            )}

            {/* Bulk transfer form */}
            {bulkMode === "transfer" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-end gap-3 flex-wrap">
                <div className="w-56">
                  <label className="text-xs text-blue-700 font-medium mb-1 block">Transfer to doctor *</label>
                  <Select value={transferDoctorId ?? ""} onValueChange={(v) => setTransferDoctorId(v ?? null)}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select doctor" /></SelectTrigger>
                    <SelectContent>
                      {doctors.map((d: any) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.full_name} — {d.department_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-48">
                  <label className="text-xs text-blue-700 font-medium mb-1 block">Reason *</label>
                  <Input value={transferReason} onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="Doctor on leave, emergency…" className="bg-white" />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700"
                  disabled={!transferDoctorId || !transferReason.trim() || bulkTransferMut.isPending}
                  onClick={() => bulkTransferMut.mutate({ ids: Array.from(selectedIds), toDocId: Number(transferDoctorId), reason: transferReason })}>
                  Confirm Transfer ({selectedIds.size})
                </Button>
                <Button variant="ghost" onClick={() => setBulkMode(null)}>Cancel</Button>
              </div>
            )}

            {/* Status legend */}
            <div className="flex gap-2 flex-wrap text-xs">
              {Object.entries(STATUS_COLOR).map(([k, cls]) => (
                <span key={k} className={`px-2 py-0.5 rounded-full font-medium ${cls}`}>{STATUS_LABEL[k]}</span>
              ))}
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="text-center py-16 text-gray-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No appointments found</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[40px_56px_1fr_1fr_140px_130px_170px] gap-x-3 px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="flex items-center">
                    <input type="checkbox" className="rounded" checked={allSelected} onChange={toggleAll} />
                  </div>
                  <div>Token</div>
                  <div>Patient</div>
                  <div>Doctor / Dept</div>
                  <div>Time · Type</div>
                  <div>Status</div>
                  <div>Actions</div>
                </div>
                {/* Rows */}
                {filtered.map((a: any) => {
                  const canAct = !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status);
                  const isSelected = selectedIds.has(a.id);
                  return (
                    <div key={a.id}
                      className={`grid grid-cols-[40px_56px_1fr_1fr_140px_130px_170px] gap-x-3 px-4 py-3 border-b last:border-0 items-center text-sm ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                      <div className="flex items-center">
                        {canAct && (
                          <input type="checkbox" className="rounded" checked={isSelected} onChange={() => toggleSelect(a.id)} />
                        )}
                      </div>
                      <div>
                        <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {a.token_number ?? "—"}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{a.patient_name || `Patient #${a.patient_id}`}</p>
                        <p className="text-xs text-gray-400">{a.patient_uhid} · {a.patient_phone}</p>
                        {a.chief_complaint && (
                          <p className="text-xs text-gray-400 truncate">{a.chief_complaint}</p>
                        )}
                        {a.priority > 0 && <span className="text-xs text-red-500 font-semibold">● URGENT</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-700 truncate">{a.doctor_name || `Dr. #${a.doctor_id}`}</p>
                        <p className="text-xs text-gray-400">{a.department_name}</p>
                        <p className="text-xs font-mono text-gray-300">{a.appointment_no}</p>
                      </div>
                      <div>
                        <p className="text-gray-700">{fmtTime(a.appointment_time)}</p>
                        <p className="text-xs text-gray-400">{a.appointment_type?.replace("_", " ")}</p>
                        <p className="text-xs text-gray-400">{a.visit_type?.replace("_", " ")}</p>
                        {a.delay_minutes && (
                          <p className="text-xs text-amber-600">+{a.delay_minutes} min delay</p>
                        )}
                      </div>
                      <div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${STATUS_COLOR[a.status] ?? ""}`}>
                          {STATUS_LABEL[a.status] ?? a.status}
                        </span>
                      </div>
                      <div className="flex gap-1 items-center">
                        {a.status === "SCHEDULED" && (
                          <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Check In"
                            onClick={() => checkinMut.mutate(a.id)}>
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {canAct && (
                          <>
                            <button className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Reschedule"
                              onClick={() => {
                                setRescheduleModal({ id: a.id, no: a.appointment_no });
                                setRescheduleDate(a.appointment_date);
                                setRescheduleTime(a.appointment_time.slice(0, 5));
                                setRescheduleReason("");
                              }}>
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Cancel"
                              onClick={() => { setCancelModal({ id: a.id, no: a.appointment_no }); setCancelReason(""); }}>
                              <X className="w-4 h-4" />
                            </button>
                            {a.status !== "NO_SHOW" && (
                              <button className="p-1.5 text-rose-500 hover:bg-rose-50 rounded" title="Mark No Show"
                                onClick={() => noShowMut.mutate(a.id)}>
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        <button className="p-1.5 text-gray-400 hover:bg-gray-100 rounded" title="Audit Log"
                          onClick={() => setAuditModal({ id: a.id, no: a.appointment_no })}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Cancel Modal */}
      {cancelModal && (
        <Modal title={`Cancel — ${cancelModal.no}`} onClose={() => setCancelModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Reason for cancellation *</label>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Patient request, Doctor unavailable, Emergency…" rows={3} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelModal(null)}>Back</Button>
              <Button className="bg-red-600 hover:bg-red-700"
                disabled={!cancelReason.trim() || cancelMut.isPending}
                onClick={() => cancelMut.mutate({ id: cancelModal.id, reason: cancelReason })}>
                Confirm Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <Modal title={`Reschedule — ${rescheduleModal.no}`} onClose={() => setRescheduleModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">New Date *</label>
                <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">New Time *</label>
                <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Reason (optional)</label>
              <Input value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Patient request…" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRescheduleModal(null)}>Back</Button>
              <Button className="bg-amber-600 hover:bg-amber-700"
                disabled={!rescheduleDate || rescheduleMut.isPending}
                onClick={() => rescheduleMut.mutate({
                  id: rescheduleModal.id,
                  new_date: rescheduleDate,
                  new_time: rescheduleTime + ":00",
                  reason: rescheduleReason,
                })}>
                Reschedule
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Audit Log Modal */}
      {auditModal && (
        <Modal title={`Audit Log — ${auditModal.no}`} onClose={() => setAuditModal(null)}>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No audit entries yet</p>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="flex gap-3 text-sm pb-3 border-b last:border-0">
                  <div className="mt-0.5 flex-shrink-0">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-gray-500" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-700">{AUDIT_LABEL[log.action] ?? log.action}</span>
                      <span className="text-xs text-gray-400">by {log.performed_by_name}</span>
                      {log.performed_by_role && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{log.performed_by_role}</span>
                      )}
                    </div>
                    {log.note && <p className="text-xs text-gray-500 mt-0.5">{log.note}</p>}
                    {log.old_value && (
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{log.old_value} → {log.new_value}</p>
                    )}
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Date(log.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
