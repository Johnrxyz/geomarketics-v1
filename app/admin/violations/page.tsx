"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import Modal from "@/components/ui/Modal";
import { Plus, AlertTriangle, ShieldAlert } from "lucide-react";
import { violationsApi, vendorsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function ViolationsPage() {
  const { ready, user } = useAuthGuard("admin");
  const [violations, setViolations] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newViolation, setNewViolation] = useState({ vendor: "", violation_type: "Sanitation", severity: "minor", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      violationsApi.list(),
      vendorsApi.list()
    ])
      .then(([vRes, vendRes]: [any, any]) => {
        setViolations(vRes?.results ?? vRes ?? []);
        setVendors(vendRes?.results ?? vendRes ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (ready) fetchData();
  }, [ready, fetchData]);

  const handleSubmit = async () => {
    if (!newViolation.vendor || !newViolation.description) return;
    setSubmitting(true);
    try {
      await violationsApi.create(newViolation);
      fetchData();
      setIsModalOpen(false);
      setNewViolation({ vendor: "", violation_type: "Sanitation", severity: "minor", description: "" });
    } catch (err) {
      alert("Failed to submit violation");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <AppShell pageTitle="Violations & Penalties" role="admin" userName={user?.first_name || "Admin"} userRole="Administrator">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Violations & Penalties</h2>
          <p className="page-subtitle">Manage market violations and issue penalties</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={15} /> Record Violation
          </button>
        </div>
      </div>
      
      <div className="card">
        <div className="card-body">
          {loading ? <p>Loading...</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    <th style={{ padding: "12px 8px" }}>Date</th>
                    <th style={{ padding: "12px 8px" }}>Vendor</th>
                    <th style={{ padding: "12px 8px" }}>Type</th>
                    <th style={{ padding: "12px 8px" }}>Severity</th>
                    <th style={{ padding: "12px 8px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map(v => (
                    <tr key={v.id} style={{ borderBottom: "1px solid var(--border-color)", fontSize: "0.875rem" }}>
                      <td style={{ padding: "12px 8px" }}>{new Date(v.violation_date || v.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 8px", fontWeight: 600 }}>{v.vendor_name || v.vendor}</td>
                      <td style={{ padding: "12px 8px" }}>{v.violation_type}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <span className={`badge ${v.severity === 'critical' ? 'badge-error' : v.severity === 'major' ? 'badge-warning' : 'badge-info'}`}>
                          {v.severity_display || v.severity}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <span className={`badge ${v.status === 'resolved' ? 'badge-success' : 'badge-open'}`}>
                          {v.status_display || v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {violations.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No violations recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Violation"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleSubmit} disabled={submitting || !newViolation.vendor}>
              {submitting ? "Saving..." : "Save Violation"}
            </button>
          </>
        }>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">Vendor</label>
            <select className="form-select" value={newViolation.vendor} onChange={e => setNewViolation({...newViolation, vendor: e.target.value})}>
              <option value="">Select Vendor...</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.first_name} {v.last_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={newViolation.violation_type} onChange={e => setNewViolation({...newViolation, violation_type: e.target.value})}>
              <option value="Sanitation">Sanitation</option>
              <option value="Permit">Permit</option>
              <option value="Overpricing">Overpricing</option>
              <option value="Safety">Safety</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Severity</label>
            <select className="form-select" value={newViolation.severity} onChange={e => setNewViolation({...newViolation, severity: e.target.value})}>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} value={newViolation.description} onChange={e => setNewViolation({...newViolation, description: e.target.value})}></textarea>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
