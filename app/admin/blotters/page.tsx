"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import Modal from "@/components/ui/Modal";
import { Plus, FileWarning } from "lucide-react";
import { blottersApi, vendorsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function BlottersPage() {
  const { ready, user } = useAuthGuard("admin");
  const [blotters, setBlotters] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
        <div className="card-body">
          {loading ? <p>Loading...</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    <th style={{ padding: "12px 8px" }}>Date</th>
                    <th style={{ padding: "12px 8px" }}>Complainant</th>
                    <th style={{ padding: "12px 8px" }}>Vendor Involved</th>
                    <th style={{ padding: "12px 8px" }}>Details</th>
                    <th style={{ padding: "12px 8px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {blotters.map(b => (
                    <tr key={b.id} style={{ borderBottom: "1px solid var(--border-color)", fontSize: "0.875rem" }}>
                      <td style={{ padding: "12px 8px" }}>{new Date(b.incident_date || b.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 8px" }}>{b.complainant_name || "N/A"}</td>
                      <td style={{ padding: "12px 8px" }}>{b.vendor_name || b.vendor || "N/A"}</td>
                      <td style={{ padding: "12px 8px", maxWidth: 250, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.incident_details}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <span className={`badge ${b.status === 'resolved' ? 'badge-success' : 'badge-open'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {blotters.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No blotter entries recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
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
