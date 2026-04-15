"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import { Search, Filter, Download, Plus, MoreVertical, FileText, AlertTriangle, CheckCircle } from "lucide-react";

// ─── Data Source (Accurate with Map and Sanitation) ──────────────────────────
// Merging the stalls list from the Map module and assigning realistic mock data
// for their permits, payments, and compliance status.
const VENDORS = [
  { id: "v1", stall: "A-01", section: "Section A", category: "Vegetables", name: "Maria Santos",   status: "occupied", permit: "approved", payment: "paid",    violations: 0 },
  { id: "v2", stall: "A-02", section: "Section A", category: "Vegetables", name: "—",              status: "vacant",   permit: "null",     payment: "null",    violations: 0 },
  { id: "v3", stall: "A-03", section: "Section A", category: "Vegetables", name: "Luis Reyes",     status: "occupied", permit: "pending",  payment: "paid",    violations: 0 },
  { id: "v4", stall: "A-04", section: "Section A", category: "Vegetables", name: "Juan dela Cruz", status: "flagged",  permit: "rejected", payment: "overdue", violations: 3 },
  { id: "v5", stall: "B-01", section: "Section B", category: "Meat",       name: "Pedro Garcia",   status: "occupied", permit: "approved", payment: "paid",    violations: 0 },
  { id: "v6", stall: "B-02", section: "Section B", category: "Meat",       name: "—",              status: "vacant",   permit: "null",     payment: "null",    violations: 0 },
  { id: "v7", stall: "B-03", section: "Section B", category: "Meat",       name: "Ana Torres",     status: "reserved", permit: "pending",  payment: "partial", violations: 0 },
  { id: "v8", stall: "B-12", section: "Section B", category: "Meat",       name: "Rosa Navarro",   status: "flagged",  permit: "approved", payment: "overdue", violations: 2 },
  { id: "v9", stall: "C-01", section: "Section C", category: "Fish",       name: "Carlo Mendoza",  status: "occupied", permit: "approved", payment: "paid",    violations: 2 }, // Corresponds to early sanitation test
  { id: "v10", stall: "C-02", section: "Section C", category: "Fish",      name: "Elena Flores",   status: "occupied", permit: "approved", payment: "paid",    violations: 1 },
  { id: "v11", stall: "C-03", section: "Section C", category: "Fish",      name: "—",              status: "vacant",   permit: "null",     payment: "null",    violations: 0 },
  { id: "v12", stall: "D-01", section: "Dry Goods", category: "Dry Goods", name: "Ben Castillo",   status: "occupied", permit: "approved", payment: "paid",    violations: 0 },
  { id: "v13", stall: "D-02", section: "Dry Goods", category: "Dry Goods", name: "—",              status: "vacant",   permit: "null",     payment: "null",    violations: 0 },
  { id: "v14", stall: "E-01", section: "Cooked Food", category: "Food",    name: "Nena Cruz",      status: "occupied", permit: "approved", payment: "paid",    violations: 0 },
  { id: "v15", stall: "E-02", section: "Cooked Food", category: "Food",    name: "Tony Ramos",     status: "occupied", permit: "approved", payment: "overdue", violations: 0 },
];

export default function VendorManagementPage() {
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const filteredVendors = VENDORS.filter(v => {
    const sMatch = !search || 
      v.name.toLowerCase().includes(search.toLowerCase()) || 
      v.stall.toLowerCase().includes(search.toLowerCase());
    const secMatch = filterSection === "All" || v.section === filterSection;
    const statMatch = filterStatus === "All" || v.status === filterStatus;
    return sMatch && secMatch && statMatch;
  });

  const uniqueSections = ["All", ...Array.from(new Set(VENDORS.map(v => v.section)))];
  const uniqueStatuses = ["All", "occupied", "vacant", "flagged", "reserved"];

  return (
    <AppShell pageTitle="Vendor Management" role="admin" userName="Admin User" userRole="Administrator">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Vendor & Stall Masterlist</h2>
          <p className="page-subtitle">Manage all market vendors, stall assignments, and compliance statuses.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost">
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary">
            <Plus size={14} /> Add Vendor
          </button>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* Table Controls */}
        <div className="card-header" style={{ padding: "var(--space-4)", display: "flex", gap: "var(--space-4)", flexWrap: "wrap", alignItems: "flex-end" }}>
          
          <div className="search-input-wrapper" style={{ flex: "1 1 300px" }}>
            <Search size={15} className="search-icon" />
            <input 
              type="search" 
              className="search-input" 
              placeholder="Search by vendor name or stall number..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "11px" }}>Section</label>
              <div style={{ position: "relative" }}>
                <Filter size={12} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-muted)" }} />
                <select 
                  className="form-select" 
                  style={{ paddingLeft: 28, height: 32, fontSize: "12px", minWidth: 140 }}
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                >
                  {uniqueSections.map(s => <option key={s} value={s}>{s === "All" ? "All Sections" : s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "11px" }}>Stall Status</label>
              <div style={{ position: "relative" }}>
                <Filter size={12} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-muted)" }} />
                <select 
                  className="form-select" 
                  style={{ paddingLeft: 28, height: 32, fontSize: "12px", minWidth: 140 }}
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
          <table className="table" style={{ width: "100%", whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ width: "80px" }}>Stall No.</th>
                <th>Vendor Name</th>
                <th>Section & Category</th>
                <th>Stall Status</th>
                <th>Permit</th>
                <th>Rental Payment</th>
                <th style={{ textAlign: "center" }}>Sanitation</th>
                <th style={{ width: "50px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} align="center" style={{ padding: "var(--space-8)", color: "var(--text-muted)" }}>
                    No vendors found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td style={{ fontWeight: 600, fontFamily: "monospace", color: "var(--text-secondary)" }}>
                      {vendor.stall}
                    </td>
                    <td style={{ fontWeight: 600, color: vendor.name === "—" ? "var(--text-muted)" : "var(--text-primary)" }}>
                      {vendor.name === "—" ? "Unassigned" : vendor.name}
                    </td>
                    <td>
                      <div style={{ fontSize: "12px" }}>{vendor.section}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{vendor.category}</div>
                    </td>
                    <td>
                      <StatusBadge variant={vendor.status as any} label={vendor.status} />
                    </td>
                    <td>
                      {vendor.permit === "null" ? <span style={{ color: "var(--text-muted)" }}>—</span> : (
                        <StatusBadge 
                          variant={vendor.permit === "approved" ? "success" : vendor.permit === "pending" ? "warning" : "error"} 
                          label={vendor.permit} 
                          dot={false}
                        />
                      )}
                    </td>
                    <td>
                      {vendor.payment === "null" ? <span style={{ color: "var(--text-muted)" }}>—</span> : (
                        <StatusBadge 
                          variant={vendor.payment === "paid" ? "success" : vendor.payment === "partial" ? "warning" : "error"} 
                          label={vendor.payment === "paid" ? "Up to date" : vendor.payment === "partial" ? "Partial" : "Overdue"} 
                          dot={false}
                        />
                      )}
                    </td>
                    <td align="center">
                      {vendor.status === "vacant" ? (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      ) : vendor.violations > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--color-error)", fontSize: "12px", fontWeight: 600 }}>
                          <AlertTriangle size={12} /> {vendor.violations} Issue{vendor.violations > 1 ? "s" : ""}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--color-success)", fontSize: "12px", fontWeight: 600 }}>
                          <CheckCircle size={12} /> Clear
                        </div>
                      )}
                    </td>
                    <td align="right">
                      <button className="btn btn-ghost btn-sm" aria-label={`View details for ${vendor.stall}`}>
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination (Visual only for prototype) */}
        <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--text-secondary)" }}>
          <div>Showing {filteredVendors.length} of {VENDORS.length} entries</div>
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            <button className="btn btn-ghost btn-sm" disabled>Previous</button>
            <button className="btn btn-ghost btn-sm" disabled>Next</button>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
