"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import Modal from "@/components/ui/Modal";
import { Plus, Search, Calendar, User, ShieldAlert } from "lucide-react";
import { blottersApi, vendorsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function BlottersPage() {
  const { ready, user } = useAuthGuard("admin");
  const [blotters, setBlotters] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBlotter, setNewBlotter] = useState({ vendor: "", complainant_name: "", incident_details: "", action_taken: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      blottersApi.list(),
      vendorsApi.list()
    ])
      .then(([bRes, vendRes]: [any, any]) => {
        setBlotters(bRes?.results ?? bRes ?? []);
        setVendors(vendRes?.results ?? vendRes ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (ready) fetchData();
  }, [ready, fetchData]);

  const filteredBlotters = useMemo(() => {
    return blotters.filter((b) => {
      const complainant = (b.complainant_name || "").toLowerCase();
      const vendor = (b.vendor_name || b.vendor || "").toLowerCase();
      const details = (b.incident_details || "").toLowerCase();
      const matchesSearch =
        !searchQuery ||
        complainant.includes(searchQuery.toLowerCase()) ||
        vendor.includes(searchQuery.toLowerCase()) ||
        details.includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || b.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [blotters, searchQuery, statusFilter]);

  const handleSubmit = async () => {
    if (!newBlotter.incident_details) return;
    setSubmitting(true);
    try {
      await blottersApi.create({
        vendor: newBlotter.vendor || null,
        complainant_name: newBlotter.complainant_name,
        incident_details: newBlotter.incident_details,
        action_taken: newBlotter.action_taken,
        status: 'active'
      });
      fetchData();
      setIsModalOpen(false);
      setNewBlotter({ vendor: "", complainant_name: "", incident_details: "", action_taken: "" });
    } catch (err) {
      alert("Failed to submit blotter");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <AppShell pageTitle="Blotters" role="admin" userName={user?.first_name || "Admin"} userRole="Administrator">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Market Blotters</h2>
          <p className="page-subtitle">Record and track market incidents</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={15} /> Record Incident
          </button>
        </div>
      </div>
      
      <div className="card">
        {/* Filter Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", flex: 1, minWidth: 220 }}>
            <div className="form-input-wrapper" style={{ flex: "1 1 180px", maxWidth: 360 }}>
              <Search size={14} className="form-input-icon" />
              <input
                type="search"
                className="form-input has-icon-left"
                placeholder="Search complainant, vendor, details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "var(--text-sm)", height: 38 }}
              />
            </div>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: "auto", minWidth: 120, height: 38, fontSize: "var(--text-sm)" }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
            {filteredBlotters.length} incidents
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <p style={{ padding: "var(--space-4)" }}>Loading...</p>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW */}
              <div className="desktop-only" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                      <th style={{ padding: "12px 16px" }}>Date</th>
                      <th style={{ padding: "12px 16px" }}>Complainant</th>
                      <th style={{ padding: "12px 16px" }}>Vendor Involved</th>
                      <th style={{ padding: "12px 16px" }}>Details</th>
                      <th style={{ padding: "12px 16px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBlotters.map(b => (
                      <tr key={b.id} style={{ borderBottom: "1px solid var(--border-color)", fontSize: "0.875rem" }}>
                        <td style={{ padding: "12px 16px" }}>{new Date(b.incident_date || b.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{b.complainant_name || "N/A"}</td>
                        <td style={{ padding: "12px 16px" }}>{b.vendor_name || b.vendor || "N/A"}</td>
                        <td style={{ padding: "12px 16px", maxWidth: 280, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.incident_details}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className={`badge ${b.status === 'resolved' ? 'badge-success' : 'badge-open'}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredBlotters.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No blotter entries found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW */}
              <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-3)" }}>
                {filteredBlotters.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      background: "var(--bg-secondary, #F9FAFB)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-3)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={12} />
                        {new Date(b.incident_date || b.created_at).toLocaleDateString()}
                      </span>
                      <span className={`badge ${b.status === 'resolved' ? 'badge-success' : 'badge-open'}`}>
                        {b.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>
                        Complainant: {b.complainant_name || "N/A"}
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                        Vendor Involved: <strong style={{ color: "var(--color-primary)" }}>{b.vendor_name || b.vendor || "N/A"}</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)", background: "#ffffff", padding: "var(--space-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", lineHeight: 1.4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>Details</div>
                      {b.incident_details}
                    </div>

                    {b.action_taken && (
                      <div style={{ fontSize: "var(--text-xs)", color: "#15803D", background: "#DCFCE7", padding: "var(--space-2)", borderRadius: "var(--radius-sm)", border: "1px solid #BBF7D0", lineHeight: 1.4 }}>
                        <strong style={{ display: "block", fontSize: 11, textTransform: "uppercase" }}>Action Taken:</strong>
                        {b.action_taken}
                      </div>
                    )}
                  </div>
                ))}
                {filteredBlotters.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                    No blotter entries found matching filters.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Incident"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleSubmit} disabled={submitting || !newBlotter.incident_details}>
              {submitting ? "Saving..." : "Save Blotter"}
            </button>
          </>
        }>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Vendor Involved (Optional)</label>
            <select className="form-select" value={newBlotter.vendor} onChange={e => setNewBlotter({...newBlotter, vendor: e.target.value})}>
              <option value="">None / Unknown</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.first_name} {v.last_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Complainant Name</label>
            <input type="text" className="form-input" value={newBlotter.complainant_name} onChange={e => setNewBlotter({...newBlotter, complainant_name: e.target.value})} placeholder="Name of person reporting" />
          </div>
          <div className="form-group">
            <label className="form-label">Incident Details</label>
            <textarea className="form-textarea" rows={3} value={newBlotter.incident_details} onChange={e => setNewBlotter({...newBlotter, incident_details: e.target.value})}></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Action Taken</label>
            <textarea className="form-textarea" rows={2} value={newBlotter.action_taken} onChange={e => setNewBlotter({...newBlotter, action_taken: e.target.value})}></textarea>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
