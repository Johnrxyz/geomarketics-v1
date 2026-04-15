"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Modal from "@/components/ui/Modal";
import {
  Search, Plus, AlertCircle, Clock, CheckCircle, Filter,
  MessageSquare, Store, Calendar, ChevronRight, Send
} from "lucide-react";

interface Complaint {
  id: string;
  stall: string;
  vendor: string;
  section: string;
  category: string;
  description: string;
  status: "open" | "reviewing" | "resolved";
  date: string;
  reporter: string;
  notes?: string;
}

const COMPLAINTS: Complaint[] = [
  { id: "CMP-001", stall: "B-12", vendor: "Rosa Navarro", section: "Section B", category: "Sanitation", description: "Unsanitary meat display — live insects observed around stall area during inspection.", status: "open", date: "Mar 23, 2026", reporter: "Inspector Cruz", notes: "" },
  { id: "CMP-002", stall: "A-04", vendor: "Juan dela Cruz", section: "Section A", category: "Overpricing", description: "Consumer reported fish sold at ₱280/kg, significantly above observed price of ₱185/kg.", status: "reviewing", date: "Mar 22, 2026", reporter: "Anonymous Consumer", notes: "Price verification in progress." },
  { id: "CMP-003", stall: "C-08", vendor: "Rosa Navarro", section: "Section C", category: "Safety Hazard", description: "Vendor blocking emergency exit with boxes during peak hours.", status: "resolved", date: "Mar 21, 2026", reporter: "Market Guard", notes: "Vendor warned and complied." },
  { id: "CMP-004", stall: "E-01", vendor: "Nena Cruz", section: "Cooked Food", category: "Food Safety", description: "Cooked food exposed without proper covering, attracting flies.", status: "open", date: "Mar 20, 2026", reporter: "Consumer App", notes: "" },
  { id: "CMP-005", stall: "A-01", vendor: "Maria Santos", section: "Section A", category: "Display Violation", description: "Display items exceeding designated stall boundaries.", status: "reviewing", date: "Mar 18, 2026", reporter: "Section A Officer", notes: "Measurement pending." },
  { id: "CMP-006", stall: "D-01", vendor: "Ben Castillo", section: "Dry Goods", category: "Permit Violation", description: "Business permit not visible / posted in required location.", status: "resolved", date: "Mar 15, 2026", reporter: "Inspector Reyes", notes: "Permit posted. Case closed." },
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <AlertCircle size={14} />,
  reviewing: <Clock size={14} />,
  resolved: <CheckCircle size={14} />,
};

const STATUS_COLORS: Record<string, string> = {
  open: "badge-open",
  reviewing: "badge-reviewing",
  resolved: "badge-resolved",
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>(COMPLAINTS);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [newOpen, setNewOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newComplaint, setNewComplaint] = useState({
    stall: "", description: "", category: "Sanitation"
  });

  const filtered = complaints.filter((c) => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      c.id.toLowerCase().includes(s) ||
      c.stall.toLowerCase().includes(s) ||
      c.vendor.toLowerCase().includes(s) ||
      c.description.toLowerCase().includes(s);
    const matchStatus = statusFilter === "All" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = (id: string, status: "open" | "reviewing" | "resolved") => {
    setComplaints((prev) => prev.map((c) => c.id === id ? { ...c, status, notes: newNote || c.notes } : c));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
    setNewNote("");
  };

  const submitComplaint = () => {
    const c: Complaint = {
      id: `CMP-00${complaints.length + 1}`,
      stall: newComplaint.stall || "Unknown",
      vendor: "—",
      section: "—",
      category: newComplaint.category,
      description: newComplaint.description,
      status: "open",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      reporter: "Consumer App",
      notes: "",
    };
    setComplaints((prev) => [c, ...prev]);
    setNewOpen(false);
    setNewComplaint({ stall: "", description: "", category: "Sanitation" });
  };

  const open = complaints.filter((c) => c.status === "open").length;
  const reviewing = complaints.filter((c) => c.status === "reviewing").length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;

  return (
    <AppShell pageTitle="Complaint & Blotter" role="admin" userName="Admin User" userRole="Administrator">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Complaint & Blotter</h2>
          <p className="page-subtitle">Track and manage market complaints and violations</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
            <Plus size={15} /> New Complaint
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "Open", value: open, color: "var(--color-error)", bg: "#FEE2E2", icon: <AlertCircle size={20} /> },
          { label: "Reviewing", value: reviewing, color: "var(--color-warning)", bg: "#FEF3C7", icon: <Clock size={20} /> },
          { label: "Resolved", value: resolved, color: "var(--color-success)", bg: "#DCFCE7", icon: <CheckCircle size={20} /> },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{
            background: "white", borderRadius: "var(--radius-lg)", padding: "var(--space-5)",
            boxShadow: "var(--shadow-md)", display: "flex", alignItems: "center", gap: "var(--space-4)"
          }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "var(--space-5)" }}>
        {/* Complaint List */}
        <div style={{ flex: "0 0 380px", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {/* Filters */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div className="search-input-wrapper" style={{ maxWidth: "100%" }}>
              <Search size={15} className="search-icon" />
              <input type="search" className="search-input" placeholder="Search complaints..."
                value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search complaints" />
            </div>
            <select className="form-select" value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="All">All Status</option>
              <option value="open">Open</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* List */}
          <div className="card" style={{ overflowY: "auto", maxHeight: "calc(100vh - 380px)" }}>
            {filtered.length === 0 ? (
              <div className="empty-state"><div className="empty-state-title">No complaints found</div></div>
            ) : filtered.map((c) => (
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
                aria-label={`View complaint ${c.id}`}
                aria-pressed={selected?.id === c.id}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--color-accent)" }}>
                    {c.id}
                  </span>
                  <span className={`badge ${STATUS_COLORS[c.status]} badge-dot`} style={{ textTransform: "capitalize" }}>
                    {c.status}
                  </span>
                </div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{c.vendor}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.description}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  <span><Store size={10} style={{ display: "inline", marginRight: 3 }} />Stall {c.stall}</span>
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
                <p className="empty-state-desc">Click on a complaint from the list to view details and take action.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              {/* Header */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-accent)" }}>{selected.id}</span>
                      <span className={`badge ${STATUS_COLORS[selected.status]} badge-dot`} style={{ textTransform: "capitalize" }}>{selected.status}</span>
                    </div>
                    <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginTop: "var(--space-1)" }}>{selected.category}</div>
                  </div>
                </div>
                <div className="card-body">
                  {/* Info grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
                    {[
                      { label: "Stall", value: selected.stall },
                      { label: "Vendor", value: selected.vendor },
                      { label: "Section", value: selected.section },
                      { label: "Date", value: selected.date },
                      { label: "Reporter", value: selected.reporter },
                      { label: "Category", value: selected.category },
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
                    borderRadius: "var(--radius-md)", marginBottom: "var(--space-4)",
                    borderLeft: "3px solid var(--color-primary)"
                  }}>
                    <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>Description</div>
                    <p style={{ fontSize: "var(--text-sm)" }}>{selected.description}</p>
                  </div>

                  {/* Notes */}
                  {selected.notes && (
                    <div style={{ padding: "var(--space-3) var(--space-4)", background: "#DBEAFE", borderRadius: "var(--radius-sm)" }}>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 2 }}>Admin Notes</div>
                      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-info)" }}>{selected.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Update status */}
              <div className="card">
                <div className="card-header"><div className="card-title">Update Status</div></div>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="admin-notes">Admin Notes</label>
                    <textarea id="admin-notes" className="form-textarea" rows={2}
                      placeholder="Add notes about this complaint..."
                      value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    <button className="btn btn-ghost" onClick={() => updateStatus(selected.id, "open")}
                      disabled={selected.status === "open"}>
                      <AlertCircle size={14} /> Mark Open
                    </button>
                    <button className="btn btn-secondary" onClick={() => updateStatus(selected.id, "reviewing")}
                      disabled={selected.status === "reviewing"}>
                      <Clock size={14} /> Mark Reviewing
                    </button>
                    <button className="btn btn-success" onClick={() => updateStatus(selected.id, "resolved")}
                      disabled={selected.status === "resolved"}>
                      <CheckCircle size={14} /> Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Complaint Modal */}
      <Modal isOpen={newOpen} onClose={() => setNewOpen(false)} title="Submit a Complaint"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setNewOpen(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={submitComplaint} disabled={!newComplaint.description.trim()}>
              <Send size={14} /> Submit Complaint
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="nc-stall">Stall Number (if known)</label>
            <input id="nc-stall" className="form-input" placeholder="e.g. B-12"
              value={newComplaint.stall} onChange={(e) => setNewComplaint((p) => ({ ...p, stall: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="nc-cat">Category</label>
            <select id="nc-cat" className="form-select"
              value={newComplaint.category} onChange={(e) => setNewComplaint((p) => ({ ...p, category: e.target.value }))}>
              <option>Sanitation</option>
              <option>Overpricing</option>
              <option>Safety Hazard</option>
              <option>Food Safety</option>
              <option>Permit Violation</option>
              <option>Display Violation</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label form-label-required" htmlFor="nc-desc">Description</label>
            <textarea id="nc-desc" className="form-textarea" rows={4}
              placeholder="Describe the issue in detail..."
              aria-required="true"
              value={newComplaint.description} onChange={(e) => setNewComplaint((p) => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
