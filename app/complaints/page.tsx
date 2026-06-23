"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import Modal from "@/components/ui/Modal";
import {
  AlertCircle, Clock, CheckCircle, Search, Plus, Store, Calendar,
  MessageSquare, ChevronRight, Send, FileText, UploadCloud
} from "lucide-react";
import { complaintsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

interface Complaint {
  id: string;
  complaint_number: string;
  stall: string;
  vendor: string;
  category: string;
  description: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  date: string;
  notes?: string;
  evidence_file?: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <AlertCircle size={14} />,
  reviewing: <Clock size={14} />,
  resolved: <CheckCircle size={14} />,
  dismissed: <FileText size={14} />,
};

const STATUS_COLORS: Record<string, string> = {
  open: "badge-open",
  reviewing: "badge-reviewing",
  resolved: "badge-resolved",
  dismissed: "badge-neutral",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function ConsumerComplaintsPage() {
  const { ready, user } = useAuthGuard("customer");

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // New Complaint Modal State
  const [newOpen, setNewOpen] = useState(false);
  const [newComplaint, setNewComplaint] = useState<{ stall: string, description: string, category: string, file: File | null }>({
    stall: "", description: "", category: "Sanitation", file: null
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = useCallback(() => {
    setLoading(true);
    setError(null);
    complaintsApi.list()
      .then((data: any) => {
        const results = data?.results ?? data ?? [];
        const mapped: Complaint[] = results.map((c: any) => ({
          id: c.id?.toString() ?? "—",
          complaint_number: c.complaint_number ?? c.id?.toString() ?? "—",
          stall: c.stall_number ?? c.stall ?? "—",
          vendor: c.vendor_name ?? c.vendor ?? "—",
          category: c.category ?? "Other",
          description: c.description ?? "",
          status: (c.status ?? "open").toLowerCase() as Complaint["status"],
          date: formatDate(c.created_at ?? c.date ?? ""),
          notes: c.resolution_notes ?? c.notes ?? "",
          evidence_file: c.evidence_file,
        }));
        setComplaints(mapped);
      })
      .catch((err: any) => {
        setError(err?.detail ?? err?.message ?? "Failed to load complaints.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (ready) fetchComplaints();
  }, [ready, fetchComplaints]);

  const filtered = complaints.filter((c) => {
    const s = search.toLowerCase();
    return !search ||
      c.complaint_number.toLowerCase().includes(s) ||
      c.stall.toLowerCase().includes(s) ||
      c.vendor.toLowerCase().includes(s) ||
      c.description.toLowerCase().includes(s) ||
      c.category.toLowerCase().includes(s);
  });

  const submitComplaint = async () => {
    if (!newComplaint.description.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (newComplaint.stall) formData.append('stall_number', newComplaint.stall);
      formData.append('category', newComplaint.category);
      formData.append('description', newComplaint.description);
      formData.append('subject', `Complaint regarding ${newComplaint.category}`);
      if (newComplaint.file) {
        formData.append('evidence_file', newComplaint.file);
      }

      await complaintsApi.createWithFile(formData);
      
      setNewOpen(false);
      setNewComplaint({ stall: "", description: "", category: "Sanitation", file: null });
      fetchComplaints(); // Refresh list to get real ID and formatted fields
    } catch (err: any) {
      alert(err?.detail ?? err?.message ?? "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewComplaint(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  if (!ready) return null;

  return (
    <AppShell pageTitle="My Complaints" role="customer" userName={user?.first_name || "Consumer"} userRole="Consumer">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">My Complaints</h2>
          <p className="page-subtitle">Track complaints you have filed</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
            <Plus size={15} /> File a Complaint
          </button>
        </div>
      </div>

      <div className="complaints-desktop-layout" style={{ gap: "var(--space-5)" }}>
        {/* List */}
        <div style={{ flex: "0 0 380px", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="search-input-wrapper" style={{ maxWidth: "100%" }}>
            <Search size={15} className="search-icon" />
            <input type="search" className="search-input" placeholder="Search my complaints..."
              value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search complaints" />
          </div>

          <div className="card" style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
            {loading ? (
              <div className="empty-state"><div className="empty-state-title">Loading...</div></div>
            ) : error ? (
              <div className="empty-state"><div className="empty-state-title" style={{ color: "var(--color-error)" }}>{error}</div></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><MessageSquare size={28} /></div>
                <div className="empty-state-title">No complaints found</div>
                <p className="empty-state-desc">You have not filed any complaints matching this search.</p>
              </div>
            ) : filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelected(c); setMobileView("detail"); }}
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
                  <span className={`badge ${STATUS_COLORS[c.status]} badge-dot`} style={{ textTransform: "capitalize" }}>
                    {c.status}
                  </span>
                </div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{c.category}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.description}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  <span><Store size={10} style={{ display: "inline", marginRight: 3 }} />Vendor: {c.vendor}</span>
                  <span><Calendar size={10} style={{ display: "inline", marginRight: 3 }} />{c.date}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected ? (
            <div className="card" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div className="empty-state">
                <div className="empty-state-icon"><MessageSquare size={28} /></div>
                <div className="empty-state-title">Select a complaint</div>
                <p className="empty-state-desc">Click on a complaint from the list to view its details.</p>
              </div>
            </div>
          ) : (
            <div className="card" style={{ height: "100%" }}>
              <div className="card-header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-accent)" }}>{selected.complaint_number}</span>
                    <span className={`badge ${STATUS_COLORS[selected.status]} badge-dot`} style={{ textTransform: "capitalize" }}>{selected.status}</span>
                  </div>
                  <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginTop: "var(--space-1)" }}>{selected.category}</div>
                </div>
              </div>
              
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                {/* Info grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "var(--space-4)" }}>
                  {[
                    { label: "Vendor", value: selected.vendor },
                    { label: "Stall", value: selected.stall },
                    { label: "Date Filed", value: selected.date },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div style={{
                  padding: "var(--space-4)", background: "#F9FAFB",
                  borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--color-primary)"
                }}>
                  <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>Description</div>
                  <p style={{ fontSize: "var(--text-sm)", whiteSpace: "pre-wrap" }}>{selected.description}</p>
                  
                  {selected.evidence_file && (
                    <div style={{ marginTop: "var(--space-3)" }}>
                      <a href={selected.evidence_file} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ display: "inline-flex", gap: "var(--space-2)" }}>
                        <AlertCircle size={14} /> View Evidence File
                      </a>
                    </div>
                  )}
                </div>

                {/* Admin response */}
                {selected.notes ? (
                  <div style={{ padding: "var(--space-3) var(--space-4)", background: "#DBEAFE", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "#1E40AF", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <MessageSquare size={12} /> Response from Market Administration
                    </div>
                    <p style={{ fontSize: "var(--text-sm)", color: "#1E40AF", whiteSpace: "pre-wrap" }}>{selected.notes}</p>
                  </div>
                ) : (
                  <div style={{ padding: "var(--space-3) var(--space-4)", background: "#F9FAFB", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    No administrative response yet. The market office will review your complaint shortly.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE layout ── */}
      <div className="complaints-mobile-layout">
        {mobileView === "list" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="search-input-wrapper" style={{ maxWidth: "100%" }}>
              <Search size={15} className="search-icon" />
              <input type="search" className="search-input" placeholder="Search my complaints..."
                value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search complaints" />
            </div>

            <div className="card">
              {loading ? (
                <div className="empty-state"><div className="empty-state-title">Loading...</div></div>
              ) : error ? (
                <div className="empty-state"><div className="empty-state-title" style={{ color: "var(--color-error)" }}>{error}</div></div>
              ) : filtered.length === 0 ? (
                <div className="empty-state"><div className="empty-state-title">No complaints found</div></div>
              ) : filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelected(c); setMobileView("detail"); }}
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
                    <span className={`badge ${STATUS_COLORS[c.status]} badge-dot`} style={{ textTransform: "capitalize" }}>
                      {c.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{c.category}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.description}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                    <span><Store size={10} style={{ display: "inline", marginRight: 3 }} />Vendor: {c.vendor}</span>
                    <span><Calendar size={10} style={{ display: "inline", marginRight: 3 }} />{c.date}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setMobileView("list")}
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> Back to list
            </button>
            
            {selected && (
              <div className="card" style={{ height: "100%" }}>
                <div className="card-header">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-accent)" }}>{selected.complaint_number}</span>
                      <span className={`badge ${STATUS_COLORS[selected.status]} badge-dot`} style={{ textTransform: "capitalize" }}>{selected.status}</span>
                    </div>
                    <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginTop: "var(--space-1)" }}>{selected.category}</div>
                  </div>
                </div>
                
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                  {/* Info grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "var(--space-4)" }}>
                    {[
                      { label: "Vendor", value: selected.vendor },
                      { label: "Stall", value: selected.stall },
                      { label: "Date Filed", value: selected.date },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  <div style={{
                    padding: "var(--space-4)", background: "#F9FAFB",
                    borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--color-primary)"
                  }}>
                    <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>Description</div>
                    <p style={{ fontSize: "var(--text-sm)", whiteSpace: "pre-wrap" }}>{selected.description}</p>
                    
                    {selected.evidence_file && (
                      <div style={{ marginTop: "var(--space-3)" }}>
                        <a href={selected.evidence_file} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ display: "inline-flex", gap: "var(--space-2)" }}>
                          <AlertCircle size={14} /> View Evidence File
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Admin response */}
                  {selected.notes ? (
                    <div style={{ padding: "var(--space-3) var(--space-4)", background: "#DBEAFE", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "#1E40AF", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        <MessageSquare size={12} /> Response from Market Administration
                      </div>
                      <p style={{ fontSize: "var(--text-sm)", color: "#1E40AF", whiteSpace: "pre-wrap" }}>{selected.notes}</p>
                    </div>
                  ) : (
                    <div style={{ padding: "var(--space-3) var(--space-4)", background: "#F9FAFB", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      No administrative response yet. The market office will review your complaint shortly.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Complaint Modal */}
      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title="File a Complaint"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setNewOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitComplaint} disabled={!newComplaint.description.trim() || submitting}>
              <Send size={14} /> {submitting ? "Submitting…" : "Submit Complaint"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="nc-stall">Stall ID / Vendor Name (Optional)</label>
            <input id="nc-stall" className="form-input" placeholder="e.g. B-12 or Juan's Meat Shop"
              value={newComplaint.stall} onChange={(e) => setNewComplaint((p) => ({ ...p, stall: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="nc-cat">Category</label>
            <select id="nc-cat" className="form-select"
              value={newComplaint.category} onChange={(e) => setNewComplaint((p) => ({ ...p, category: e.target.value }))}>
              <option value="sanitation">Sanitation</option>
              <option value="overpricing">Overpricing</option>
              <option value="safety">Safety Hazard</option>
              <option value="food_safety">Food Safety</option>
              <option value="permit">Permit Violation</option>
              <option value="display">Display Violation</option>
              <option value="noise">Noise/Disturbance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label form-label-required" htmlFor="nc-desc">Description</label>
            <textarea id="nc-desc" className="form-textarea" rows={4}
              placeholder="Please provide details about the incident..."
              aria-required="true"
              value={newComplaint.description} onChange={(e) => setNewComplaint((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="nc-file">Evidence File (Optional)</label>
            <div style={{
              border: "1px dashed #D1D5DB", borderRadius: "var(--radius-md)", padding: "var(--space-4)",
              display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB", cursor: "pointer"
            }} onClick={() => document.getElementById("nc-file")?.click()}>
              <input id="nc-file" type="file" style={{ display: "none" }} onChange={handleFileChange} />
              {newComplaint.file ? (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--color-primary)", fontWeight: 500 }}>
                  <FileText size={16} /> {newComplaint.file.name}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--text-secondary)" }}>
                  <UploadCloud size={16} /> Click to upload image or document
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
