"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import Modal from "@/components/ui/Modal";
import {
  AlertCircle, Clock, CheckCircle, Plus,
  MessageSquare, Calendar, Send, FileText,
} from "lucide-react";
import { complaintsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

interface Complaint {
  id: string;
  complaint_number: string;
  category: string;
  description: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  date: string;
  stall: string;
  notes?: string;
}

const STATUS_META: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  open:      { label: "Open",      badge: "badge-open",      icon: <AlertCircle size={14} /> },
  reviewing: { label: "Reviewing", badge: "badge-reviewing", icon: <Clock size={14} /> },
  resolved:  { label: "Resolved",  badge: "badge-resolved",  icon: <CheckCircle size={14} /> },
  dismissed: { label: "Dismissed", badge: "badge-neutral",   icon: <FileText size={14} /> },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const CATEGORIES = [
  "Sanitation", "Overpricing", "Safety Hazard",
  "Food Safety", "Permit Violation", "Display Violation", "Other",
];

export default function VendorComplaintsPage() {
  const { ready, user } = useAuthGuard("vendor");

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: "Sanitation", description: "" });

  const fetchComplaints = useCallback(() => {
    setLoading(true);
    setError(null);
    complaintsApi
      .list()
      .then((data: any) => {
        const results: any[] = data?.results ?? data ?? [];
        setComplaints(
          results.map((c) => ({
            id: c.id?.toString() ?? "—",
            complaint_number: c.complaint_number ?? c.id?.toString() ?? "—",
            category: c.category ?? "Other",
            description: c.description ?? "",
            status: (c.status ?? "open").toLowerCase() as Complaint["status"],
            date: formatDate(c.created_at ?? c.date ?? ""),
            stall: c.stall_number ?? c.stall ?? "—",
            notes: c.admin_notes ?? c.notes ?? "",
          }))
        );
      })
      .catch((err: any) => {
        setError(err?.detail ?? err?.message ?? "Failed to load complaints.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (ready) fetchComplaints();
  }, [ready, fetchComplaints]);

  const submitComplaint = async () => {
    if (!form.description.trim()) return;
    setSubmitting(true);
    try {
      const created: any = await complaintsApi.create({
        category: form.category,
        description: form.description,
      });
      const newItem: Complaint = {
        id: created?.id?.toString() ?? `TMP-${Date.now()}`,
        complaint_number: created?.complaint_number ?? created?.id?.toString() ?? "—",
        category: created?.category ?? form.category,
        description: created?.description ?? form.description,
        status: "open",
        date: formatDate(created?.created_at ?? new Date().toISOString()),
        stall: created?.stall_number ?? "—",
        notes: "",
      };
      setComplaints((prev) => [newItem, ...prev]);
      setModalOpen(false);
      setForm({ category: "Sanitation", description: "" });
    } catch (err: any) {
      alert(err?.detail ?? err?.message ?? "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  const open = complaints.filter((c) => c.status === "open").length;
  const reviewing = complaints.filter((c) => c.status === "reviewing").length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;

  return (
    <AppShell
      pageTitle="My Complaints"
      role="vendor"
      userName={user?.first_name || "Vendor"}
      userRole="Vendor"
    >
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">My Complaints</h2>
          <p className="page-subtitle">View and track your submitted complaints</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> New Complaint
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "Open",      value: open,      color: "var(--color-error)",   bg: "#FEE2E2", icon: <AlertCircle size={20} /> },
          { label: "Reviewing", value: reviewing,  color: "var(--color-warning)", bg: "#FEF3C7", icon: <Clock size={20} /> },
          { label: "Resolved",  value: resolved,   color: "var(--color-success)", bg: "#DCFCE7", icon: <CheckCircle size={20} /> },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{
            background: "white", borderRadius: "var(--radius-lg)", padding: "var(--space-5)",
            boxShadow: "var(--shadow-md)", display: "flex", alignItems: "center", gap: "var(--space-4)",
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "var(--radius-md)",
              background: bg, display: "flex", alignItems: "center",
              justifyContent: "center", color, flexShrink: 0,
            }}>{icon}</div>
            <div>
              <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800 }}>{loading ? "…" : value}</div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ display: "flex", gap: "var(--space-5)" }}>
        {/* List */}
        <div style={{ flex: "0 0 360px" }}>
          <div className="card" style={{ overflowY: "auto", maxHeight: "calc(100vh - 340px)" }}>
            {loading ? (
              <div className="empty-state"><div className="empty-state-title">Loading…</div></div>
            ) : error ? (
              <div className="empty-state">
                <div className="empty-state-title" style={{ color: "var(--color-error)" }}>{error}</div>
              </div>
            ) : complaints.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><MessageSquare size={28} /></div>
                <div className="empty-state-title">No complaints yet</div>
                <p className="empty-state-desc">Use the button above to submit your first complaint.</p>
              </div>
            ) : complaints.map((c) => {
              const meta = STATUS_META[c.status] ?? STATUS_META.open;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{
                    width: "100%", padding: "var(--space-4)", textAlign: "left",
                    background: selected?.id === c.id ? "var(--bg-secondary)" : "white",
                    borderBottom: "1px solid #F3F4F6", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: "var(--space-2)",
                    transition: "background var(--transition-fast)",
                  }}
                  aria-label={`View complaint ${c.complaint_number}`}
                  aria-pressed={selected?.id === c.id}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-accent)" }}>
                      {c.complaint_number}
                    </span>
                    <span className={`badge ${meta.badge} badge-dot`} style={{ textTransform: "capitalize" }}>
                      {meta.label}
                    </span>
                  </div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{c.category}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.description}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <Calendar size={10} style={{ display: "inline" }} /> {c.date}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            <div className="card" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="empty-state">
                <div className="empty-state-icon"><MessageSquare size={28} /></div>
                <div className="empty-state-title">Select a complaint</div>
                <p className="empty-state-desc">Click a complaint from the list to view its details.</p>
              </div>
            </div>
          ) : (() => {
            const meta = STATUS_META[selected.status] ?? STATUS_META.open;
            return (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-accent)" }}>
                        {selected.complaint_number}
                      </span>
                      <span className={`badge ${meta.badge} badge-dot`} style={{ textTransform: "capitalize" }}>
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginTop: "var(--space-1)" }}>
                      {selected.category}
                    </div>
                  </div>
                </div>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                  {/* Meta */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "var(--space-4)" }}>
                    {[
                      { label: "Date Filed", value: selected.date },
                      { label: "Stall",      value: selected.stall },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 2 }}>
                          {label}
                        </div>
                        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  <div style={{
                    padding: "var(--space-4)", background: "#F9FAFB",
                    borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--color-primary)",
                  }}>
                    <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
                      Description
                    </div>
                    <p style={{ fontSize: "var(--text-sm)" }}>{selected.description}</p>
                  </div>

                  {/* Admin notes (read-only for vendors) */}
                  {selected.notes && (
                    <div style={{ padding: "var(--space-3) var(--space-4)", background: "#DBEAFE", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 2 }}>
                        Response from Admin
                      </div>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-info)" }}>{selected.notes}</p>
                    </div>
                  )}

                  {/* Status timeline hint */}
                  <div style={{ padding: "var(--space-3) var(--space-4)", background: "#F9FAFB", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    {meta.icon}
                    {selected.status === "open" && "Your complaint has been received and is awaiting review."}
                    {selected.status === "reviewing" && "The market administration is currently reviewing your complaint."}
                    {selected.status === "resolved" && "This complaint has been resolved by the administration."}
                    {selected.status === "dismissed" && "This complaint was reviewed and dismissed by the administration."}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* New Complaint Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setForm({ category: "Sanitation", description: "" }); }}
        title="Submit a Complaint"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={submitComplaint}
              disabled={!form.description.trim() || submitting}
            >
              <Send size={14} /> {submitting ? "Submitting…" : "Submit Complaint"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="vc-cat">Category</label>
            <select id="vc-cat" className="form-select"
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label form-label-required" htmlFor="vc-desc">Description</label>
            <textarea id="vc-desc" className="form-textarea" rows={5}
              placeholder="Describe the issue in detail…"
              aria-required="true"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
