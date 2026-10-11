"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Modal from "@/components/ui/Modal";
import { Plus, Printer, Search, Calendar, AlertTriangle } from "lucide-react";
import { violationsApi, vendorsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

function ViolationsContent() {
  const { ready, user } = useAuthGuard("admin");
  const [violations, setViolations] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<any | null>(null);
  const [newViolation, setNewViolation] = useState({ vendor: "", violation_type: "Sanitation", severity: "low", description: "", photo: "" });
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const targetId = searchParams.get("id");

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

  useEffect(() => {
    if (targetId && violations.length > 0 && !selectedViolation) {
      const found = violations.find(v => v.id.toString() === targetId);
      if (found) {
        setSelectedViolation(found);
      }
    }
  }, [targetId, violations, selectedViolation]);

  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      const vendorName = (v.vendor_name || v.vendor || "").toLowerCase();
      const type = (v.violation_type || "").toLowerCase();
      const desc = (v.description || "").toLowerCase();
      const matchesSearch = !searchQuery || 
        vendorName.includes(searchQuery.toLowerCase()) || 
        type.includes(searchQuery.toLowerCase()) ||
        desc.includes(searchQuery.toLowerCase());

      const matchesSeverity = severityFilter === "all" || 
        (severityFilter === "major" ? (v.severity === "major" || v.severity === "high") : v.severity === severityFilter);

      return matchesSearch && matchesSeverity;
    });
  }, [violations, searchQuery, severityFilter]);

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
        {/* Filter bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center", justifyContent: "space-between", padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", flex: 1, minWidth: 220 }}>
            <div className="form-input-wrapper" style={{ flex: "1 1 180px", maxWidth: 360 }}>
              <Search size={14} className="form-input-icon" />
              <input
                type="search"
                className="form-input has-icon-left"
                placeholder="Search vendor or violation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "var(--text-sm)", height: 38 }}
              />
            </div>
            <select
              className="form-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ width: "auto", minWidth: 130, height: 38, fontSize: "var(--text-sm)" }}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="major">Major / High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
            {filteredViolations.length} recorded
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
                      <th style={{ padding: "12px 16px" }}>Vendor</th>
                      <th style={{ padding: "12px 16px" }}>Type</th>
                      <th style={{ padding: "12px 16px" }}>Severity</th>
                      <th style={{ padding: "12px 16px" }}>Status</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredViolations.map(v => (
                      <tr key={v.id} style={{ borderBottom: "1px solid var(--border-color)", fontSize: "0.875rem" }}>
                        <td style={{ padding: "12px 16px" }}>{new Date(v.violation_date || v.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{v.vendor_name || v.vendor}</td>
                        <td style={{ padding: "12px 16px" }}>{v.violation_type}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className={`badge ${v.severity === 'critical' ? 'badge-error' : v.severity === 'major' || v.severity === 'high' ? 'badge-warning' : 'badge-info'}`}>
                            {v.severity_display || v.severity}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className={`badge ${v.status === 'resolved' ? 'badge-success' : 'badge-open'}`}>
                            {v.status_display || v.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <button 
                            onClick={() => setSelectedViolation(v)}
                            className="btn btn-secondary" 
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                            <Printer size={13} /> View & Print
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredViolations.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No violations found matching filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW */}
              <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-3)" }}>
                {filteredViolations.map((v) => (
                  <div
                    key={v.id}
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
                        {new Date(v.violation_date || v.created_at).toLocaleDateString()}
                      </span>
                      <span className={`badge ${v.status === 'resolved' ? 'badge-success' : 'badge-open'}`}>
                        {v.status_display || v.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: "var(--text-base)", color: "var(--text-primary)" }}>
                        {v.vendor_name || v.vendor}
                      </div>
                      <span className={`badge ${v.severity === 'critical' ? 'badge-error' : v.severity === 'major' || v.severity === 'high' ? 'badge-warning' : 'badge-info'}`}>
                        {v.severity_display || v.severity}
                      </span>
                    </div>

                    <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-primary)" }}>
                      {v.violation_type}
                    </div>

                    {v.description && (
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.4, background: "#ffffff", padding: "var(--space-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                        {v.description}
                      </div>
                    )}

                    <button
                      onClick={() => setSelectedViolation(v)}
                      className="btn btn-primary"
                      style={{ width: "100%", minHeight: 40, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: "var(--text-xs)", fontWeight: 600 }}
                    >
                      <Printer size={14} /> View & Print Report
                    </button>
                  </div>
                ))}
                {filteredViolations.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                    No violations found matching filters.
                  </div>
                )}
              </div>
            </>
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
          zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 8px"
        }}>
          <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 600, boxShadow: "0 25px 80px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "92vh" }}>
            <div className="no-print" style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: "#111827", fontWeight: 700 }}>Violation Report</h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Official record for printing</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button 
                  onClick={() => window.print()}
                  className="btn btn-primary" 
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: "0.85rem" }}>
                  <Printer size={15} /> Print Report
                </button>
                <button 
                  onClick={() => setSelectedViolation(null)}
                  style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--surface-color)", border: "1px solid var(--border-color)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
                  ✕
                </button>
              </div>
            </div>
            
            <div id="printable-violation" style={{ padding: "clamp(16px, 4vw, 32px)", overflowY: "auto", background: "#fff" }}>
              <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "2px solid #000", paddingBottom: 14 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>Official Violation Notice</h1>
                <p style={{ margin: "4px 0 0", color: "#666", fontSize: 13 }}>Date Issued: {new Date(selectedViolation.violation_date || selectedViolation.created_at).toLocaleDateString()}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 3 }}>Vendor Name</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{selectedViolation.vendor_name || selectedViolation.vendor}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 3 }}>Violation Type</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{selectedViolation.violation_type}</div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 6 }}>Incident Description</div>
                <div style={{ padding: 14, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {selectedViolation.description || "No specific details provided."}
                </div>
              </div>

              {selectedViolation.photo && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 6 }}>Photographic Evidence</div>
                  <div style={{ border: "2px solid #e5e7eb", padding: 4, borderRadius: 8 }}>
                    <img 
                      src={selectedViolation.photo.startsWith("data:") ? selectedViolation.photo : `data:image/jpeg;base64,${selectedViolation.photo}`} 
                      alt="Violation Evidence" 
                      style={{ width: "100%", maxHeight: 320, objectFit: "contain", display: "block", borderRadius: 4 }} 
                    />
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: 36, paddingTop: 20, borderTop: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 24 }}>
                <div>
                  <div style={{ borderBottom: "1px solid #000", height: 36 }}></div>
                  <div style={{ textAlign: "center", fontSize: 11, color: "#666", marginTop: 6 }}>Authorized Signature</div>
                </div>
                <div>
                  <div style={{ borderBottom: "1px solid #000", height: 36 }}></div>
                  <div style={{ textAlign: "center", fontSize: 11, color: "#666", marginTop: 6 }}>Vendor Acknowledgment</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function ViolationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ViolationsContent />
    </Suspense>
  );
}
