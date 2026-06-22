"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import { Search, Filter, Download, Plus, MoreVertical, AlertTriangle, CheckCircle, User, Edit3, RefreshCw, Flag, ArrowRightLeft, Map, X, ChevronDown } from "lucide-react";
import { vendorsApi, stallsApi } from "@/lib/api";

interface Vendor {
  id: string | number;
  stall: string;
  stallId: string | number;
  section: string;
  category: string;
  name: string;
  status: string;
  violations: number;
  building: string;
  floor: string;
  svgCellId: string;
}

const STATUS_OPTIONS = [
  { value: "owner",                label: "Managed by the Owner",    color: "#374151" },
  { value: "rented",               label: "With Renter",             color: "#F97316" },
  { value: "storage",              label: "Bodega",                  color: "#84CC16" },
  { value: "surrendered_bolante",  label: "Surrendered w/ Bolante",  color: "#FBBF24" },
  { value: "vacant",               label: "Surrendered / Vacant",    color: "#38BDF8" },
  { value: "closed",               label: "Closed / No Operation",   color: "#8B5CF6" },
];

const VIOLATION_CATEGORIES = [
  "Sanitation / Cleanliness",
  "Overcharging / Price Gouging",
  "Operating Outside Hours",
  "Unauthorized Goods / Activities",
  "Obstruction of Walkways",
  "Noise Complaint",
  "Other",
];

export default function VendorManagementPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update Status Modal
  const [statusModal, setStatusModal] = useState<{ open: boolean; vendor: Vendor | null }>({ open: false, vendor: null });
  const [newStatus, setNewStatus] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  // Log Violation Modal
  const [violationModal, setViolationModal] = useState<{ open: boolean; vendor: Vendor | null }>({ open: false, vendor: null });
  const [violationForm, setViolationForm] = useState({ category: "Sanitation / Cleanliness", description: "" });
  const [violationSaving, setViolationSaving] = useState(false);
  const [violationSuccess, setViolationSuccess] = useState(false);

  // Reassign Modal
  const [reassignModal, setReassignModal] = useState<{ open: boolean; vendor: Vendor | null }>({ open: false, vendor: null });

  useEffect(() => {
    loadVendors();
  }, []);

  function loadVendors() {
    setLoading(true);
    setError(null);
    vendorsApi.list()
      .then((data: any) => {
        const results = data?.results ?? data ?? [];
        const mapped: Vendor[] = results.map((v: any) => ({
          id: v.id,
          stall: v.stall_number ?? "—",
          stallId: v.stall?.id ?? v.stall_id ?? v.id,
          section: v.section_name ?? v.stall?.section_name ?? "—",
          category: v.category ?? v.stall?.category ?? "—",
          name: v.full_name ?? "—",
          status: (v.stall?.status ?? v.stall_status ?? "vacant").toLowerCase(),
          violations: typeof v.compliance_rate === "number"
            ? (v.compliance_rate < 100 ? Math.round((100 - v.compliance_rate) / 10) : 0)
            : 0,
          building: v.building ?? v.stall?.building ?? "main",
          floor: v.floor ?? v.stall?.floor ?? "1",
          svgCellId: v.svg_cell_id ?? v.stall?.svg_cell_id ?? "",
        }));
        setVendors(mapped);
      })
      .catch((err: any) => {
        setError(err?.detail ?? err?.message ?? "Failed to load vendors.");
      })
      .finally(() => setLoading(false));
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredVendors = vendors.filter(v => {
    const sMatch = !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.stall.toLowerCase().includes(search.toLowerCase());
    const secMatch = filterSection === "All" || v.section === filterSection;
    const statMatch = filterStatus === "All" || v.status === filterStatus;
    return sMatch && secMatch && statMatch;
  });

  const uniqueSections = ["All", ...Array.from(new Set(vendors.map(v => v.section)))];
  const uniqueStatuses = ["All", "owner", "rented", "storage", "surrendered_bolante", "vacant", "closed"];

  // ── Actions ──────────────────────────────────────────────────────────────────

  function handleViewProfile(vendor: Vendor) {
    setOpenDropdownId(null);
    router.push(`/admin/vendors/${vendor.id}`);
  }

  function handleEditDetails(vendor: Vendor) {
    setOpenDropdownId(null);
    router.push(`/admin/vendors/${vendor.id}?edit=true`);
  }

  function handleUpdateStatus(vendor: Vendor) {
    setOpenDropdownId(null);
    setNewStatus(vendor.status);
    setStatusModal({ open: true, vendor });
  }

  async function saveStatus() {
    if (!statusModal.vendor || !newStatus) return;
    setStatusSaving(true);
    try {
      await stallsApi.get(statusModal.vendor.stallId); // verify access
      // PATCH the stall status directly
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/stalls/${statusModal.vendor.stallId}/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (res.ok) {
        setVendors(prev => prev.map(v => v.id === statusModal.vendor!.id ? { ...v, status: newStatus } : v));
        setStatusModal({ open: false, vendor: null });
      }
    } finally {
      setStatusSaving(false);
    }
  }

  function handleLogViolation(vendor: Vendor) {
    setOpenDropdownId(null);
    setViolationForm({ category: "Sanitation / Cleanliness", description: "" });
    setViolationSuccess(false);
    setViolationModal({ open: true, vendor });
  }

  async function saveViolation() {
    if (!violationModal.vendor || !violationForm.description.trim()) return;
    setViolationSaving(true);
    try {
      // POST to complaints endpoint
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/complaints/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` },
          body: JSON.stringify({
            stall: violationModal.vendor.stallId,
            vendor: violationModal.vendor.id,
            subject: violationForm.category,
            category: "sanitation",
            description: violationForm.description,
          }),
        }
      );
      if (res.ok) {
        setViolationSuccess(true);
        setTimeout(() => setViolationModal({ open: false, vendor: null }), 1500);
      }
    } finally {
      setViolationSaving(false);
    }
  }

  function handleReassign(vendor: Vendor) {
    setOpenDropdownId(null);
    setReassignModal({ open: true, vendor });
  }

  function handleViewOnMap(vendor: Vendor) {
    setOpenDropdownId(null);
    const params = new URLSearchParams({
      building: vendor.building,
      floor: vendor.floor,
      stall: vendor.stall,
    });
    router.push(`/map?${params.toString()}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AppShell pageTitle="Vendor Management" role="admin" userName="Admin User" userRole="Administrator">
      <div className="page-header" style={{ marginBottom: "var(--space-8)" }}>
        <div className="page-header-left">
          <h2 className="page-title" style={{ fontSize: "var(--text-3xl)", fontWeight: 800 }}>Vendor &amp; Stall Masterlist</h2>
          <p className="page-subtitle" style={{ fontSize: "var(--text-md)", opacity: 0.7 }}>Manage all market vendors, stall assignments, and compliance statuses.</p>
        </div>
        <div className="page-header-actions" style={{ display: "flex", gap: "var(--space-3)" }}>
          <button className="btn btn-ghost" style={{ border: "1px solid var(--border-color)", padding: "var(--space-2) var(--space-4)" }}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-primary" style={{ padding: "var(--space-2) var(--space-6)", boxShadow: "var(--shadow-md)" }}>
            <Plus size={16} /> Add Vendor
          </button>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 0, boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-color)" }}>
        {/* Table Controls */}
        <div className="card-header" style={{ padding: "var(--space-6)", borderBottom: "1px solid var(--border-color)", display: "flex", gap: "var(--space-6)", flexWrap: "wrap", alignItems: "flex-end", background: "#fcfcfc" }}>
          <div className="search-input-wrapper" style={{ flex: "1 1 400px", position: "relative" }}>
            <Search size={18} className="search-icon" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="search"
              className="search-input"
              placeholder="Search by vendor name or stall number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 40, height: 44, borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", width: "100%", fontSize: "var(--text-sm)" }}
            />
          </div>

          <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Section</label>
              <div style={{ position: "relative" }}>
                <Filter size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <select
                  className="form-select"
                  style={{ paddingLeft: 36, height: 40, fontSize: "13px", minWidth: 160, borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                >
                  {uniqueSections.map(s => <option key={s} value={s}>{s === "All" ? "All Sections" : s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>Stall Status</label>
              <div style={{ position: "relative" }}>
                <Filter size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <select
                  className="form-select"
                  style={{ paddingLeft: 36, height: 40, fontSize: "13px", minWidth: 160, borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  {uniqueStatuses.map(s => (
                    <option key={s} value={s}>{s === "All" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: "auto", position: "relative" }} ref={dropdownRef}>
          <table className="table" style={{ width: "100%", whiteSpace: "nowrap", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid var(--border-color)" }}>
                <th style={{ width: "100px", padding: "var(--space-4) var(--space-6)", textAlign: "left", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Stall No.</th>
                <th style={{ padding: "var(--space-4) var(--space-6)", textAlign: "left", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Vendor Name</th>
                <th style={{ padding: "var(--space-4) var(--space-6)", textAlign: "left", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Section &amp; Category</th>
                <th style={{ padding: "var(--space-4) var(--space-6)", textAlign: "left", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Stall Status</th>
                <th style={{ textAlign: "center", padding: "var(--space-4) var(--space-6)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Sanitation</th>
                <th style={{ width: "80px", textAlign: "right", padding: "var(--space-4) var(--space-6)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody className="table-hover">
              {loading ? (
                <tr><td colSpan={6} align="center" style={{ padding: "var(--space-12)", color: "var(--text-muted)" }}>Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} align="center" style={{ padding: "var(--space-12)", color: "var(--color-error)" }}>{error}</td></tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} align="center" style={{ padding: "var(--space-12)", color: "var(--text-muted)" }}>
                    <AlertTriangle size={32} style={{ marginBottom: "var(--space-3)", opacity: 0.3 }} />
                    <p>No vendors found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.2s" }}>
                    <td style={{ padding: "var(--space-5) var(--space-6)", fontWeight: 700, fontFamily: "monospace", color: "var(--color-primary)", fontSize: "14px" }}>
                      {vendor.stall}
                    </td>
                    <td
                      style={{ padding: "var(--space-5) var(--space-6)", fontWeight: 600, color: vendor.name === "—" ? "var(--text-muted)" : "#111827", fontSize: "15px", cursor: vendor.name !== "—" ? "pointer" : "default" }}
                      onClick={() => vendor.name !== "—" && handleViewProfile(vendor)}
                    >
                      {vendor.name === "—" ? "Vacant" : vendor.name}
                    </td>
                    <td style={{ padding: "var(--space-5) var(--space-6)" }}>
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>{vendor.section}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{vendor.category}</div>
                    </td>
                    <td style={{ padding: "var(--space-5) var(--space-6)" }}>
                      <StatusBadge variant={vendor.status as any} label={vendor.status} />
                    </td>
                    <td align="center" style={{ padding: "var(--space-5) var(--space-6)" }}>
                      {vendor.status === "vacant" ? (
                        <span style={{ color: "var(--text-muted)", fontSize: "18px" }}>—</span>
                      ) : vendor.violations > 0 ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-error)", background: "#FEF2F2", padding: "4px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(220,38,38,0.1)" }}>
                          <AlertTriangle size={13} /> {vendor.violations} Task{vendor.violations > 1 ? "s" : ""}
                        </div>
                      ) : (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-success)", background: "#F0FDF4", padding: "4px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(22,163,74,0.1)" }}>
                          <CheckCircle size={13} /> Compliant
                        </div>
                      )}
                    </td>
                    <td align="right" style={{ padding: "var(--space-5) var(--space-6)", position: "relative" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        aria-label={`Actions for ${vendor.stall}`}
                        onClick={() => setOpenDropdownId(openDropdownId === vendor.id ? null : vendor.id)}
                        style={{ padding: 8, borderRadius: "50%", background: openDropdownId === vendor.id ? "#EFF6FF" : undefined, color: openDropdownId === vendor.id ? "var(--color-primary)" : undefined, border: openDropdownId === vendor.id ? "1px solid #BFDBFE" : "1px solid transparent" }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openDropdownId === vendor.id && (
                        <div style={{
                          position: "absolute",
                          right: "var(--space-6)",
                          top: "calc(100% - 4px)",
                          zIndex: 1000,
                          background: "#fff",
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-lg)",
                          boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
                          minWidth: 220,
                          overflow: "hidden",
                          animation: "dropdownFadeIn 0.12s ease-out",
                        }}>
                          {/* Header */}
                          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--border-color)", background: "#f8fafc" }}>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              {vendor.stall} — Actions
                            </div>
                          </div>

                          {/* View Profile */}
                          <button className="dropdown-item" onClick={() => handleViewProfile(vendor)} style={dropItemStyle}>
                            <User size={15} style={{ color: "#3B82F6" }} />
                            <span>View Full Profile</span>
                          </button>

                          {/* Edit Details */}
                          <button className="dropdown-item" onClick={() => handleEditDetails(vendor)} style={dropItemStyle}>
                            <Edit3 size={15} style={{ color: "#10B981" }} />
                            <span>Edit Details</span>
                          </button>

                          <div style={{ height: 1, background: "var(--border-color)", margin: "4px 0" }} />

                          {/* Update Status */}
                          <button className="dropdown-item" onClick={() => handleUpdateStatus(vendor)} style={dropItemStyle}>
                            <RefreshCw size={15} style={{ color: "#F59E0B" }} />
                            <span>Update Status</span>
                          </button>

                          {/* Log Violation */}
                          <button className="dropdown-item" onClick={() => handleLogViolation(vendor)} style={dropItemStyle}>
                            <Flag size={15} style={{ color: "#EF4444" }} />
                            <span>Log Violation / Complaint</span>
                          </button>

                          <div style={{ height: 1, background: "var(--border-color)", margin: "4px 0" }} />

                          {/* Reassign Stall */}
                          <button className="dropdown-item" onClick={() => handleReassign(vendor)} style={dropItemStyle}>
                            <ArrowRightLeft size={15} style={{ color: "#8B5CF6" }} />
                            <span>Reassign / Transfer Stall</span>
                          </button>

                          {/* View on Map */}
                          <button className="dropdown-item" onClick={() => handleViewOnMap(vendor)} style={dropItemStyle}>
                            <Map size={15} style={{ color: "#06B6D4" }} />
                            <span>View on Map</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: "var(--space-4) var(--space-6)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "var(--text-secondary)", background: "#fcfcfc" }}>
          <div style={{ fontWeight: 500 }}>Showing <strong>{filteredVendors.length}</strong> of <strong>{vendors.length}</strong> entries</div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button className="btn btn-ghost btn-sm" disabled style={{ border: "1px solid var(--border-color)", padding: "4px 12px" }}>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled style={{ border: "1px solid var(--border-color)", padding: "4px 12px" }}>Next</button>
          </div>
        </div>
      </div>

      {/* ── Update Status Modal ── */}
      {statusModal.open && statusModal.vendor && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Update Status</div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginTop: 2 }}>{statusModal.vendor.stall} — {statusModal.vendor.name === "—" ? "Vacant" : statusModal.vendor.name}</div>
              </div>
              <button onClick={() => setStatusModal({ open: false, vendor: null })} style={closeButtonStyle}><X size={18} /></button>
            </div>
            <div style={{ padding: "var(--space-6)" }}>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>Select the new occupancy status for this stall:</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {STATUS_OPTIONS.map(opt => (
                  <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", border: `2px solid ${newStatus === opt.value ? "var(--color-primary)" : "var(--border-color)"}`, cursor: "pointer", background: newStatus === opt.value ? "#EFF6FF" : "#fff", transition: "all 0.15s" }}>
                    <input type="radio" name="status" value={opt.value} checked={newStatus === opt.value} onChange={() => setNewStatus(opt.value)} style={{ display: "none" }} />
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: opt.color, flexShrink: 0, border: "2px solid rgba(0,0,0,0.1)" }} />
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>{opt.label}</span>
                    {newStatus === opt.value && <CheckCircle size={16} style={{ marginLeft: "auto", color: "var(--color-primary)" }} />}
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-6)", justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setStatusModal({ open: false, vendor: null })} style={{ border: "1px solid var(--border-color)" }}>Cancel</button>
                <button className="btn btn-primary" onClick={saveStatus} disabled={statusSaving} style={{ minWidth: 100 }}>
                  {statusSaving ? "Saving..." : "Save Status"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Violation Modal ── */}
      {violationModal.open && violationModal.vendor && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Log Violation / Complaint</div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginTop: 2 }}>{violationModal.vendor.stall} — {violationModal.vendor.name === "—" ? "Vacant" : violationModal.vendor.name}</div>
              </div>
              <button onClick={() => setViolationModal({ open: false, vendor: null })} style={closeButtonStyle}><X size={18} /></button>
            </div>
            <div style={{ padding: "var(--space-6)" }}>
              {violationSuccess ? (
                <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
                  <CheckCircle size={48} style={{ color: "var(--color-success)", marginBottom: 12 }} />
                  <div style={{ fontWeight: 700, fontSize: "16px" }}>Violation Logged Successfully!</div>
                </div>
              ) : (
                <>
                  <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", marginBottom: 6 }}>Violation Category</label>
                    <div style={{ position: "relative" }}>
                      <select
                        className="form-select"
                        value={violationForm.category}
                        onChange={e => setViolationForm(f => ({ ...f, category: e.target.value }))}
                        style={{ width: "100%", height: 42, borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontSize: "14px", padding: "0 12px" }}
                      >
                        {VIOLATION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", marginBottom: 6 }}>Description</label>
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="Describe the violation or complaint in detail..."
                      value={violationForm.description}
                      onChange={e => setViolationForm(f => ({ ...f, description: e.target.value }))}
                      style={{ width: "100%", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontSize: "14px", padding: "10px 12px", resize: "vertical" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
                    <button className="btn btn-ghost" onClick={() => setViolationModal({ open: false, vendor: null })} style={{ border: "1px solid var(--border-color)" }}>Cancel</button>
                    <button className="btn btn-primary" onClick={saveViolation} disabled={violationSaving || !violationForm.description.trim()} style={{ minWidth: 120, background: "#EF4444", borderColor: "#EF4444" }}>
                      <Flag size={14} /> {violationSaving ? "Logging..." : "Log Violation"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reassign Modal (informational) ── */}
      {reassignModal.open && reassignModal.vendor && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 440 }}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Reassign / Transfer Stall</div>
                <div style={{ fontSize: "18px", fontWeight: 700, marginTop: 2 }}>{reassignModal.vendor.stall} — {reassignModal.vendor.name === "—" ? "Vacant" : reassignModal.vendor.name}</div>
              </div>
              <button onClick={() => setReassignModal({ open: false, vendor: null })} style={closeButtonStyle}><X size={18} /></button>
            </div>
            <div style={{ padding: "var(--space-6)" }}>
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "var(--radius-md)", padding: "var(--space-4)", display: "flex", gap: 12, alignItems: "flex-start", marginBottom: "var(--space-5)" }}>
                <AlertTriangle size={18} style={{ color: "#F97316", flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: "13px", color: "#92400E", lineHeight: 1.5 }}>
                  To reassign this stall, please update the vendor's stall assignment directly in the <strong>Vendor Profile</strong> page. This action requires administrative approval and will be logged for audit purposes.
                </p>
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setReassignModal({ open: false, vendor: null })} style={{ border: "1px solid var(--border-color)" }}>Close</button>
                <button className="btn btn-primary" onClick={() => { setReassignModal({ open: false, vendor: null }); handleViewProfile(reassignModal.vendor!); }}>
                  <User size={14} /> Go to Vendor Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .table-hover tr:hover { background-color: #f8fafc !important; }
        .search-input:focus { border-color: var(--color-primary) !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; outline: none; }
        .form-select:focus { border-color: var(--color-primary) !important; outline: none; }
        .dropdown-item:hover { background: #F8FAFC !important; }
        @keyframes dropdownFadeIn { from { opacity: 0; transform: translateY(-6px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </AppShell>
  );
}

const dropItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "9px 14px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
  color: "#111827",
  fontWeight: 500,
  textAlign: "left",
  transition: "background 0.1s",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  backdropFilter: "blur(3px)",
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "var(--radius-xl)",
  boxShadow: "0 25px 80px rgba(0,0,0,0.2)",
  width: "100%",
  maxWidth: 520,
  overflow: "hidden",
  animation: "dropdownFadeIn 0.15s ease-out",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  padding: "var(--space-5) var(--space-6)",
  borderBottom: "1px solid var(--border-color)",
  background: "#f8fafc",
};

const closeButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--text-muted)",
  padding: 4,
  borderRadius: "var(--radius-sm)",
  display: "flex",
};
