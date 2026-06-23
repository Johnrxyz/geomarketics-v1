"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import Modal from "@/components/ui/Modal";
import { Plus, Printer } from "lucide-react";
import { violationsApi, vendorsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function ViolationsPage() {
  const { ready, user } = useAuthGuard("admin");
  const [violations, setViolations] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<any | null>(null);
  const [newViolation, setNewViolation] = useState({ vendor: "", violation_type: "Sanitation", severity: "low", description: "", photo: "" });
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
      const payload = { ...newViolation, violation_date: new Date().toISOString().split('T')[0] };
      await violationsApi.create(payload);
      fetchData();
      setIsModalOpen(false);
      setNewViolation({ vendor: "", violation_type: "Sanitation", severity: "low", description: "", photo: "" });
    } catch (err) {
      alert("Failed to submit violation");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <AppShell pageTitle="Violations & Penalties" role="admin" userName={user?.first_name || "Admin"} userRole="Administrator">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-violation, #printable-violation * { visibility: visible; }
          #printable-violation { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div className="page-header no-print">
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
      
      <div className="card no-print">
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
                    <th style={{ padding: "12px 8px", textAlign: "right" }}>Action</th>
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
                      <td style={{ padding: "12px 8px", textAlign: "right" }}>
                        <button 
                          onClick={() => setSelectedViolation(v)}
                          className="btn-secondary" 
                          style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                          View & Print
                        </button>
                      </td>
                    </tr>
                  ))}
                  {violations.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No violations recorded.</td></tr>
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
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} value={newViolation.description} onChange={e => setNewViolation({...newViolation, description: e.target.value})}></textarea>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Evidence Photo</span>
              {newViolation.photo && (
                <button type="button" onClick={() => setNewViolation({...newViolation, photo: ""})} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>Clear</button>
              )}
            </label>
            {newViolation.photo ? (
              <img src={newViolation.photo} alt="Preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }} />
            ) : (
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "20px", border: "2px dashed var(--border-color)", borderRadius: "var(--radius-md)", cursor: "pointer", background: "var(--surface-color)", color: "var(--text-muted)", fontWeight: 500, fontSize: 14 }}>
                <Printer size={16} /> Upload Image...
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const reader = new FileReader();
                    reader.onload = () => setNewViolation(p => ({...p, photo: reader.result as string}));
                    reader.readAsDataURL(f);
                  }
                }} />
              </label>
            )}
          </div>
        </div>
      </Modal>

      {/* Violation Details & Print Modal */}
      {selectedViolation && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 600, boxShadow: "0 25px 80px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div className="no-print" style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: "#111827", fontWeight: 700 }}>Violation Report</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Official record for printing</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button 
                  onClick={() => window.print()}
                  className="btn btn-primary" 
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px" }}>
                  <Printer size={16} /> Print Report
                </button>
                <button 
                  onClick={() => setSelectedViolation(null)}
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface-color)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                  ✕
                </button>
              </div>
            </div>
            
            <div id="printable-violation" style={{ padding: "32px", overflowY: "auto", background: "#fff" }}>
              <div style={{ textAlign: "center", marginBottom: 32, borderBottom: "2px solid #000", paddingBottom: 16 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>Official Violation Notice</h1>
                <p style={{ margin: "4px 0 0", color: "#666" }}>Date Issued: {new Date(selectedViolation.violation_date || selectedViolation.created_at).toLocaleDateString()}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Vendor Name</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedViolation.vendor_name || selectedViolation.vendor}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Violation Type</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedViolation.violation_type}</div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 8 }}>Incident Description</div>
                <div style={{ padding: 16, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {selectedViolation.description || "No specific details provided."}
                </div>
              </div>

              {selectedViolation.photo && (
                <div style={{ marginTop: 32 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 8 }}>Photographic Evidence</div>
                  <div style={{ border: "2px solid #e5e7eb", padding: 4, borderRadius: 8 }}>
                    <img 
                      src={selectedViolation.photo.startsWith("data:") ? selectedViolation.photo : `data:image/jpeg;base64,${selectedViolation.photo}`} 
                      alt="Violation Evidence" 
                      style={{ width: "100%", maxHeight: 400, objectFit: "contain", display: "block", borderRadius: 4 }} 
                    />
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                <div>
                  <div style={{ borderBottom: "1px solid #000", height: 40 }}></div>
                  <div style={{ textAlign: "center", fontSize: 12, color: "#666", marginTop: 8 }}>Authorized Signature</div>
                </div>
                <div>
                  <div style={{ borderBottom: "1px solid #000", height: 40 }}></div>
                  <div style={{ textAlign: "center", fontSize: 12, color: "#666", marginTop: 8 }}>Vendor Acknowledgment</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
