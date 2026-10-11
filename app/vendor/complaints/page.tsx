"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  AlertCircle, Clock, CheckCircle,
  MessageSquare, Calendar, FileText, ArrowLeft, Info,
  Plus, Send, X, Flag,
} from "lucide-react";
import { complaintsApi, stallsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

interface Complaint {
  id: string;
  complaint_number: string;
  category: string;
  subject: string;
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

const CATEGORY_CONFIG: Record<string, { emoji: string; desc: string }> = {
  sanitation:  { emoji: "🧹", desc: "Cleanliness issues" },
  overpricing: { emoji: "💰", desc: "Unfair pricing" },
  safety:      { emoji: "⚠️", desc: "Physical danger" },
  food_safety: { emoji: "🥗", desc: "Spoiled or unsafe food" },
  permit:      { emoji: "📋", desc: "Missing permits" },
  display:     { emoji: "🏷️", desc: "Wrong labeling" },
  noise:       { emoji: "🔊", desc: "Loud or disruptive" },
  other:       { emoji: "❓", desc: "Something else" },
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

const EMPTY_FORM = {
  category: "sanitation",
  subject: "",
  description: "",
  stall: "",
  file: null as File | null,
};

export default function VendorComplaintsPage() {
  const { ready, user } = useAuthGuard("vendor");

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"mine" | "file">("mine");

  // ── Complaints Against Me ─────────────────────────────────────────────
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // ── File a Complaint ──────────────────────────────────────────────────
  const [form, setForm] = useState(EMPTY_FORM);
  const [stallsList, setStallsList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [myComplaintsLoading, setMyComplaintsLoading] = useState(false);

  // ── Fetch complaints against vendor ──────────────────────────────────
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
            subject: c.subject ?? c.category ?? "Complaint",
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

  // ── Fetch complaints filed BY vendor ─────────────────────────────────
  const fetchMyComplaints = useCallback(() => {
    setMyComplaintsLoading(true);
    // complainant filter — fetch all and client-filter by complainant user id
    complaintsApi.list({ complainant: user?.id?.toString() })
      .then((data: any) => {
        const results: any[] = data?.results ?? data ?? [];
        setMyComplaints(
          results.map((c) => ({
            id: c.id?.toString() ?? "—",
            complaint_number: c.complaint_number ?? c.id?.toString() ?? "—",
            category: c.category ?? "Other",
            subject: c.subject ?? c.category ?? "Complaint",
            description: c.description ?? "",
            status: (c.status ?? "open").toLowerCase() as Complaint["status"],
            date: formatDate(c.created_at ?? c.date ?? ""),
            stall: c.stall_number ?? c.stall ?? "—",
            notes: c.resolution_notes ?? c.notes ?? "",
            evidence_file: c.evidence_file,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setMyComplaintsLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (ready) {
      fetchComplaints();
      stallsApi.list({ page_size: "500" }).then((d: any) => {
        setStallsList((d?.results ?? d ?? []).filter((s: any) => s.stall_number));
      }).catch(() => {});
    }
  }, [ready, fetchComplaints]);

  useEffect(() => {
    if (ready && tab === "file") fetchMyComplaints();
  }, [ready, tab, fetchMyComplaints]);

  // ── Submit new complaint ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.subject.trim()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("category", form.category);
      fd.append("subject", form.subject);
      fd.append("description", form.description);
      fd.append("complainant_contact", user?.email ?? "");
      if (form.stall) {
        const found = stallsList.find(
          (s) => s.stall_number.toLowerCase() === form.stall.toLowerCase()
        );
        if (found) fd.append("stall", found.id.toString());
      }
      if (form.file) fd.append("evidence_file", form.file);
      await complaintsApi.createWithFile(fd);
      setSubmitSuccess(true);
      setForm(EMPTY_FORM);
      fetchMyComplaints();
    } catch (err: any) {
      alert(err?.detail ?? err?.message ?? "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelect = (c: Complaint) => { setSelected(c); setMobileView("detail"); };

  if (!ready) return null;

  const open      = complaints.filter((c) => c.status === "open").length;
  const reviewing = complaints.filter((c) => c.status === "reviewing").length;
  const resolved  = complaints.filter((c) => c.status === "resolved").length;

  /* ── Detail panel ─────────────────────────────────────────────────── */
  const DetailPanel = ({ c }: { c: Complaint }) => {
    const meta = STATUS_META[c.status] ?? STATUS_META.open;
    const catCfg = CATEGORY_CONFIG[c.category.toLowerCase()] ?? CATEGORY_CONFIG.other;
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
            <div style={{ marginTop: "var(--space-2)" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, background: "#EFF6FF", color: "#1D4ED8", padding: "3px 10px", borderRadius: "var(--radius-full)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span>{catCfg.emoji}</span> {c.category}
              </span>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "var(--space-3)" }}>
            {[
              { label: "Date Filed", value: c.date },
              { label: "Stall",      value: c.stall },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "var(--space-4)", background: "#F9FAFB", borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--color-primary)" }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>Complaint Details</div>
            <p style={{ fontSize: "var(--text-sm)", whiteSpace: "pre-wrap" }}>{c.description}</p>
            {c.evidence_file && (
              <div style={{ marginTop: "var(--space-3)" }}>
                <a href={c.evidence_file} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ display: "inline-flex", gap: "var(--space-2)" }}>
                  <FileText size={14} /> View Evidence File
                </a>
              </div>
            )}
          </div>

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

          <div style={{ padding: "var(--space-3) var(--space-4)", background: "#FFFBEB", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)", color: "#92400E" }}>
            {meta.icon}
            {c.status === "open"      && "This complaint is open and awaiting review by the market office."}
            {c.status === "reviewing" && "The market administration is currently reviewing this complaint."}
            {c.status === "resolved"  && "This complaint has been resolved by the administration."}
            {c.status === "dismissed" && "This complaint was reviewed and dismissed by the administration."}
          </div>
        </div>
      </div>
    );
  };

  /* ── Complaint list item ──────────────────────────────────────────── */
  const ComplaintItem = ({ c, onClick }: { c: Complaint; onClick: () => void }) => {
    const meta = STATUS_META[c.status] ?? STATUS_META.open;
    const catCfg = CATEGORY_CONFIG[c.category.toLowerCase()] ?? CATEGORY_CONFIG.other;
    return (
      <button
        onClick={onClick}
        style={{
          width: "100%", padding: "var(--space-3) var(--space-4)", textAlign: "left",
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
          <span className={`badge ${meta.badge} badge-dot`} style={{ textTransform: "capitalize" }}>{meta.label}</span>
        </div>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{catCfg.emoji} {c.category}</div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Calendar size={10} /> {c.date}
        </div>
      </button>
    );
  };

  return (
    <AppShell
      pageTitle="Complaints"
      role="vendor"
      userName={user?.first_name || "Vendor"}
      userRole="Vendor"
    >
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Complaints</h2>
          <p className="page-subtitle">Track complaints against you or file a report about a stall</p>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-primary"
            onClick={() => setTab("file")}
          >
            <Flag size={15} /> File a Complaint
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border-color)", marginBottom: "var(--space-5)", gap: 0 }}>
        {([
          { key: "mine",  label: "Complaints Against Me", icon: <AlertCircle size={14} /> },
          { key: "file",  label: "File a Complaint",      icon: <Plus size={14} /> },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: "var(--text-sm)",
              color: tab === key ? "var(--color-accent)" : "var(--text-muted)",
              borderBottom: tab === key ? "2px solid var(--color-accent)" : "2px solid transparent",
              marginBottom: -2, display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.15s",
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB: Complaints Against Me ══════════════════ */}
      {tab === "mine" && (
        <>
          {/* Summary strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
            {[
              { label: "Open",      value: open,      color: "var(--color-error)",   bg: "#FEE2E2", icon: <AlertCircle size={20} /> },
              { label: "Reviewing", value: reviewing,  color: "var(--color-warning)", bg: "#FEF3C7", icon: <Clock size={20} /> },
              { label: "Resolved",  value: resolved,   color: "var(--color-success)", bg: "#DCFCE7", icon: <CheckCircle size={20} /> },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", boxShadow: "var(--shadow-md)", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-3)" }}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: "var(--text-xl)", fontWeight: 800 }}>{loading ? "…" : value}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop split-pane */}
          <div className="complaints-desktop-layout" style={{ gap: "var(--space-5)" }}>
            <div style={{ flex: "0 0 340px", minWidth: 0 }}>
              <div className="card" style={{ overflowY: "auto", maxHeight: "calc(100vh - 380px)" }}>
                {loading ? (
                  <div className="empty-state"><div className="empty-state-title">Loading…</div></div>
                ) : error ? (
                  <div className="empty-state"><div className="empty-state-title" style={{ color: "var(--color-error)" }}>{error}</div></div>
                ) : complaints.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><CheckCircle size={28} /></div>
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

          {/* Mobile */}
          <div className="complaints-mobile-layout">
            {mobileView === "list" ? (
              <div className="card">
                {loading ? (
                  <div className="empty-state"><div className="empty-state-title">Loading…</div></div>
                ) : complaints.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><CheckCircle size={28} /></div>
                    <div className="empty-state-title">No complaints on record</div>
                  </div>
                ) : complaints.map((c) => (
                  <ComplaintItem key={c.id} c={c} onClick={() => handleSelect(c)} />
                ))}
              </div>
            ) : (
              <div>
                <button onClick={() => setMobileView("list")} className="btn btn-ghost btn-sm" style={{ marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <ArrowLeft size={16} /> Back to list
                </button>
                {selected && <DetailPanel c={selected} />}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════ TAB: File a Complaint ═══════════════════════ */}
      {tab === "file" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "var(--space-5)", alignItems: "start" }}>

          {/* ── Left: submission form ──────────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">New Complaint</div>
              <Flag size={16} style={{ color: "var(--text-muted)" }} />
            </div>

            {submitSuccess ? (
              <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
                <CheckCircle size={48} color="#16A34A" style={{ margin: "0 auto var(--space-4)" }} />
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-2)" }}>Complaint Submitted!</div>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-5)" }}>
                  The market administration will review your complaint and respond shortly.
                </p>
                <button className="btn btn-primary" onClick={() => setSubmitSuccess(false)}>
                  <Plus size={14} /> File Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {/* Category cards */}
                <div>
                  <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 8 }}>
                    Issue Category <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 }}>
                    {(Object.entries(CATEGORY_CONFIG) as [string, { emoji: string; desc: string }][]).map(([val, cfg]) => {
                      const isSelected = form.category === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, category: val }))}
                          style={{
                            textAlign: "left", padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                            border: isSelected ? "2px solid var(--color-accent)" : "1.5px solid var(--border-color)",
                            background: isSelected ? "var(--color-primary-pale)" : "white",
                            transition: "all 0.15s", display: "flex", alignItems: "center", gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{cfg.emoji}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "var(--color-accent)" : "var(--text-primary)", textTransform: "capitalize" }}>{val.replace("_", " ")}</div>
                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{cfg.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stall number */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="vc-stall">Stall Number (optional)</label>
                  <input
                    id="vc-stall"
                    list="vc-stalls-list"
                    className="form-input"
                    placeholder="e.g. B-12"
                    value={form.stall}
                    onChange={e => setForm(f => ({ ...f, stall: e.target.value }))}
                  />
                  <datalist id="vc-stalls-list">
                    {stallsList.map(s => <option key={s.id} value={s.stall_number}>{s.vendor_name || "Vacant"}</option>)}
                  </datalist>
                </div>

                {/* Subject */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="vc-subject">Subject <span style={{ color: "var(--color-error)" }}>*</span></label>
                  <input
                    id="vc-subject"
                    className="form-input"
                    placeholder="Brief title of the complaint..."
                    required
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  />
                </div>

                {/* Description */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="vc-desc">Description <span style={{ color: "var(--color-error)" }}>*</span></label>
                  <textarea
                    id="vc-desc"
                    className="form-input"
                    rows={4}
                    required
                    placeholder="Describe the issue in detail..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    style={{ resize: "vertical" }}
                  />
                </div>

                {/* Evidence */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="vc-file">Photo Evidence (optional)</label>
                  <input
                    id="vc-file"
                    type="file"
                    accept="image/*"
                    className="form-input"
                    onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))}
                  />
                  {form.file && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                      <FileText size={12} /> {form.file.name}
                      <button type="button" onClick={() => setForm(f => ({ ...f, file: null }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: "var(--space-2)" }}>
                  <Send size={15} /> {submitting ? "Submitting…" : "Submit Complaint"}
                </button>
              </form>
            )}
          </div>

          {/* ── Right: my filed complaints ────────────────────────── */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">My Filed Complaints</div>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, background: "var(--color-primary-pale)", color: "var(--color-accent)", padding: "3px 10px", borderRadius: "var(--radius-full)" }}>
                {myComplaintsLoading ? "…" : myComplaints.length}
              </span>
            </div>
            <div style={{ overflowY: "auto", maxHeight: 520 }}>
              {myComplaintsLoading ? (
                <div className="empty-state"><div className="empty-state-title">Loading…</div></div>
              ) : myComplaints.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Flag size={24} /></div>
                  <div className="empty-state-title">No complaints filed yet</div>
                  <p className="empty-state-desc">Use the form to submit a complaint.</p>
                </div>
              ) : myComplaints.map(c => {
                const meta = STATUS_META[c.status] ?? STATUS_META.open;
                const catCfg = CATEGORY_CONFIG[c.category.toLowerCase()] ?? CATEGORY_CONFIG.other;
                return (
                  <div key={c.id} style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-accent)" }}>{c.complaint_number}</span>
                      <span className={`badge ${meta.badge} badge-dot`} style={{ textTransform: "capitalize" }}>{meta.label}</span>
                    </div>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: 2 }}>{catCfg.emoji} {c.category}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <Calendar size={10} /> {c.date}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}
