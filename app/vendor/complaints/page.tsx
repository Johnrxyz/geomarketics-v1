"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  AlertCircle, Clock, CheckCircle,
  MessageSquare, Calendar, FileText, ArrowLeft, Info,
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
  evidence_file?: string;
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

export default function VendorComplaintsPage() {
  const { ready, user } = useAuthGuard("vendor");

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

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
            notes: c.resolution_notes ?? c.notes ?? "",
            evidence_file: c.evidence_file,
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

  const handleSelect = (c: Complaint) => {
    setSelected(c);
    setMobileView("detail");
  };

  if (!ready) return null;

  const open      = complaints.filter((c) => c.status === "open").length;
  const reviewing = complaints.filter((c) => c.status === "reviewing").length;
  const resolved  = complaints.filter((c) => c.status === "resolved").length;

  /* ── Shared detail panel ── */
  const DetailPanel = ({ c }: { c: Complaint }) => {
    const meta = STATUS_META[c.status] ?? STATUS_META.open;
    return (
      <div className="card" style={{ flex: 1 }}>
        <div className="card-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-accent)" }}>
                {c.complaint_number}
              </span>
              <span className={`badge ${meta.badge} badge-dot`} style={{ textTransform: "capitalize" }}>
                {meta.label}
              </span>
            </div>
            <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginTop: "var(--space-1)" }}>
              {c.category}
            </div>
          </div>
        </div>

        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {/* Meta */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "var(--space-4)" }}>
            {[
              { label: "Date Filed", value: c.date },
              { label: "Stall",      value: c.stall },
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
              Complaint Details
            </div>
            <p style={{ fontSize: "var(--text-sm)", whiteSpace: "pre-wrap" }}>{c.description}</p>
            {c.evidence_file && (
              <div style={{ marginTop: "var(--space-3)" }}>
                <a href={c.evidence_file} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ display: "inline-flex", gap: "var(--space-2)" }}>
                  <FileText size={14} /> View Evidence File
                </a>
              </div>
            )}
          </div>

          {/* Admin response */}
          {c.notes ? (
            <div style={{ padding: "var(--space-3) var(--space-4)", background: "#DBEAFE", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "#1E40AF", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <Info size={12} /> Response from Market Administration
              </div>
              <p style={{ fontSize: "var(--text-sm)", color: "#1E40AF" }}>{c.notes}</p>
            </div>
          ) : (
            <div style={{ padding: "var(--space-3) var(--space-4)", background: "#F9FAFB", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              No admin response yet.
            </div>
          )}

          {/* Status hint */}
          <div style={{ padding: "var(--space-3) var(--space-4)", background: "#FFFBEB", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)", color: "#92400E" }}>
            {meta.icon}
            {c.status === "open"      && "This complaint is currently open and awaiting review by the market office."}
            {c.status === "reviewing" && "The market administration is currently reviewing this complaint."}
            {c.status === "resolved"  && "This complaint has been resolved by the administration."}
            {c.status === "dismissed" && "This complaint was reviewed and dismissed by the administration."}
          </div>
        </div>
      </div>
    );
  };

  /* ── Shared complaint list item ── */
  const ComplaintItem = ({ c, onClick }: { c: Complaint; onClick: () => void }) => {
    const meta = STATUS_META[c.status] ?? STATUS_META.open;
    return (
      <button
        onClick={onClick}
        style={{
          width: "100%", padding: "var(--space-4)", textAlign: "left",
          background: selected?.id === c.id ? "var(--bg-secondary)" : "white",
          borderBottom: "1px solid #F3F4F6", cursor: "pointer",
          display: "flex", flexDirection: "column", gap: "var(--space-2)",
          transition: "background var(--transition-fast)",
        }}
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
          <Calendar size={10} /> {c.date}
        </div>
      </button>
    );
  };

  return (
    <AppShell
      pageTitle="Complaints Against Me"
      role="vendor"
      userName={user?.first_name || "Vendor"}
      userRole="Vendor"
    >
      {/* Page header — no action buttons, read-only */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Complaints Against Me</h2>
          <p className="page-subtitle">View complaints filed against your stall by consumers or the market office</p>
        </div>
      </div>

      {/* Info notice */}
      <div style={{
        background: "#EFF6FF", border: "1px solid #BFDBFE",
        borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)",
        display: "flex", alignItems: "flex-start", gap: "var(--space-3)",
        marginBottom: "var(--space-6)", fontSize: "var(--text-sm)", color: "#1E40AF",
      }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          This is a read-only view. Complaints are filed by consumers or the market administration. 
          If you have concerns, please contact the market office directly.
        </span>
      </div>

      {/* Summary strip */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "var(--space-4)",
        marginBottom: "var(--space-6)",
      }}>
        {[
          { label: "Open",      value: open,      color: "var(--color-error)",   bg: "#FEE2E2", icon: <AlertCircle size={20} /> },
          { label: "Reviewing", value: reviewing,  color: "var(--color-warning)", bg: "#FEF3C7", icon: <Clock size={20} /> },
          { label: "Resolved",  value: resolved,   color: "var(--color-success)", bg: "#DCFCE7", icon: <CheckCircle size={20} /> },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{
            background: "white", borderRadius: "var(--radius-lg)", padding: "var(--space-4)",
            boxShadow: "var(--shadow-md)", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-3)",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "var(--radius-md)",
              background: bg, display: "flex", alignItems: "center",
              justifyContent: "center", color, flexShrink: 0,
            }}>{icon}</div>
            <div style={{ width: "100%" }}>
              <div style={{ fontSize: "var(--text-xl)", fontWeight: 800 }}>{loading ? "…" : value}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflowWrap: "break-word" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── DESKTOP layout ── */}
      <div className="complaints-desktop-layout" style={{ gap: "var(--space-5)" }}>
        <div style={{ flex: "0 0 340px", minWidth: 0 }}>
          <div className="card" style={{ overflowY: "auto", maxHeight: "calc(100vh - 380px)" }}>
            {loading ? (
              <div className="empty-state"><div className="empty-state-title">Loading…</div></div>
            ) : error ? (
              <div className="empty-state"><div className="empty-state-title" style={{ color: "var(--color-error)" }}>{error}</div></div>
            ) : complaints.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><MessageSquare size={28} /></div>
                <div className="empty-state-title">No complaints on record</div>
                <p className="empty-state-desc">You have no complaints filed against your stall.</p>
              </div>
            ) : complaints.map((c) => (
              <ComplaintItem key={c.id} c={c} onClick={() => handleSelect(c)} />
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            <div className="card" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="empty-state">
                <div className="empty-state-icon"><MessageSquare size={28} /></div>
                <div className="empty-state-title">Select a complaint</div>
                <p className="empty-state-desc">Click a complaint from the list to view its details.</p>
              </div>
            </div>
          ) : (
            <DetailPanel c={selected} />
          )}
        </div>
      </div>

      {/* ── MOBILE layout ── */}
      <div className="complaints-mobile-layout">
        {mobileView === "list" ? (
          <div className="card">
            {loading ? (
              <div className="empty-state"><div className="empty-state-title">Loading…</div></div>
            ) : error ? (
              <div className="empty-state"><div className="empty-state-title" style={{ color: "var(--color-error)" }}>{error}</div></div>
            ) : complaints.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><MessageSquare size={28} /></div>
                <div className="empty-state-title">No complaints on record</div>
                <p className="empty-state-desc">You have no complaints filed against your stall.</p>
              </div>
            ) : complaints.map((c) => (
              <ComplaintItem key={c.id} c={c} onClick={() => handleSelect(c)} />
            ))}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setMobileView("list")}
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              <ArrowLeft size={16} /> Back to list
            </button>
            {selected && <DetailPanel c={selected} />}
          </div>
        )}
      </div>
    </AppShell>
  );
}
