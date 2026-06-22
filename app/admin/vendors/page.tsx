"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import { Search, Filter, Download, Plus, MoreVertical, AlertTriangle, CheckCircle } from "lucide-react";
import { vendorsApi } from "@/lib/api";

interface Vendor {
  id: string | number;
  stall: string;
  section: string;
  category: string;
  name: string;
  status: string;
  violations: number;
}

export default function VendorManagementPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    setLoading(true);
    setError(null);
    vendorsApi.list()
      .then((data: any) => {
        const results = data?.results ?? data ?? [];
        const mapped: Vendor[] = results.map((v: any) => ({
          id: v.id,
          stall: v.stall_number ?? "—",
          section: v.section_name ?? "—",
          category: v.category ?? "—",
          name: v.full_name ?? "—",
          status: (v.stall?.status ?? v.stall_status ?? "vacant").toLowerCase(),
          violations: typeof v.compliance_rate === "number"
            ? (v.compliance_rate < 100 ? Math.round((100 - v.compliance_rate) / 10) : 0)
            : 0,
        }));
        setVendors(mapped);
      })
      .catch((err: any) => {
        setError(err?.detail ?? err?.message ?? "Failed to load vendors.");
      })
      .finally(() => setLoading(false));
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

  return (
    <AppShell pageTitle="Vendor Management" role="admin" userName="Admin User" userRole="Administrator">
      <div className="page-header" style={{ marginBottom: "var(--space-8)" }}>
        <div className="page-header-left">
          <h2 className="page-title" style={{ fontSize: "var(--text-3xl)", fontWeight: 800 }}>Vendor & Stall Masterlist</h2>
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
                    <option key={s} value={s}>{s === "All" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", whiteSpace: "nowrap", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid var(--border-color)" }}>
                <th style={{ width: "100px", padding: "var(--space-4) var(--space-6)", textAlign: "left", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Stall No.</th>
                <th style={{ padding: "var(--space-4) var(--space-6)", textAlign: "left", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Vendor Name</th>
                <th style={{ padding: "var(--space-4) var(--space-6)", textAlign: "left", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Section & Category</th>
                <th style={{ padding: "var(--space-4) var(--space-6)", textAlign: "left", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Stall Status</th>
                <th style={{ textAlign: "center", padding: "var(--space-4) var(--space-6)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Sanitation</th>
                <th style={{ width: "80px", textAlign: "right", padding: "var(--space-4) var(--space-6)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.025em", color: "var(--text-muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody className="table-hover">
              {loading ? (
                <tr>
                  <td colSpan={6} align="center" style={{ padding: "var(--space-12)", color: "var(--text-muted)", fontSize: "var(--text-md)" }}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} align="center" style={{ padding: "var(--space-12)", color: "var(--color-error)", fontSize: "var(--text-md)" }}>
                    {error}
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} align="center" style={{ padding: "var(--space-12)", color: "var(--text-muted)", fontSize: "var(--text-md)" }}>
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
                    <td style={{ padding: "var(--space-5) var(--space-6)", fontWeight: 600, color: vendor.name === "—" ? "var(--text-muted)" : "#111827", fontSize: "15px" }}>
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
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-error)", background: "#FEF2F2", padding: "4px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(220, 38, 38, 0.1)" }}>
                          <AlertTriangle size={13} /> {vendor.violations} Task{vendor.violations > 1 ? "s" : ""}
                        </div>
                      ) : (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-success)", background: "#F0FDF4", padding: "4px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, border: "1px solid rgba(22, 163, 74, 0.1)" }}>
                          <CheckCircle size={13} /> Compliant
                        </div>
                      )}
                    </td>
                    <td align="right" style={{ padding: "var(--space-5) var(--space-6)" }}>
                      <button className="btn btn-ghost btn-sm" aria-label={`View details for ${vendor.stall}`} style={{ padding: 8, borderRadius: "50%" }}>
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div style={{ padding: "var(--space-4) var(--space-6)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "var(--text-secondary)", background: "#fcfcfc" }}>
          <div style={{ fontWeight: 500 }}>Showing <strong>{filteredVendors.length}</strong> of <strong>{vendors.length}</strong> entries</div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button className="btn btn-ghost btn-sm" disabled style={{ border: "1px solid var(--border-color)", padding: "4px 12px" }}>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled style={{ border: "1px solid var(--border-color)", padding: "4px 12px" }}>Next</button>
          </div>
        </div>

      </div>

      <style>{`
        .table-hover tr:hover {
          background-color: #f8fafc !important;
        }
        .search-input:focus {
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
          outline: none;
        }
        .form-select:focus {
          border-color: var(--color-primary) !important;
          outline: none;
        }
      `}</style>
    </AppShell>
  );
}
