"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { violationsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function VendorViolationsPage() {
  const { ready, user } = useAuthGuard("vendor");
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState<any | null>(null);

  const fetchViolations = useCallback(() => {
    setLoading(true);
    violationsApi.list()
      .then((data: any) => setViolations(data?.results ?? data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (ready) fetchViolations();
  }, [ready, fetchViolations]);

  if (!ready) return null;

  return (
    <AppShell pageTitle="My Violations" role="vendor" userName={user?.first_name || "Vendor"} userRole="Vendor">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">My Violations</h2>
          <p className="page-subtitle">View your recorded violations and penalties</p>
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
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {violations.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No violations recorded. Keep up the good work!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Violation Details Modal */}
      {selectedViolation && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 500, boxShadow: "0 25px 80px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: "#111827", fontWeight: 700 }}>Violation Details</h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{new Date(selectedViolation.violation_date || selectedViolation.created_at).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={() => setSelectedViolation(null)}
                style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface-color)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                ✕
              </button>
            </div>
            
            <div style={{ padding: "24px", overflowY: "auto" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, background: "var(--surface-color)", padding: 12, borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 4 }}>Type</div>
                  <div style={{ fontWeight: 600, color: "#111827" }}>{selectedViolation.violation_type}</div>
                </div>
                <div style={{ flex: 1, background: "var(--surface-color)", padding: 12, borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 4 }}>Status</div>
                  <div style={{ fontWeight: 600, color: "#111827" }}>{selectedViolation.status_display || selectedViolation.status}</div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8 }}>DESCRIPTION & NOTES</div>
                <div style={{ background: "var(--surface-color)", padding: 16, borderRadius: "var(--radius-md)", color: "#374151", fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {selectedViolation.description || "No specific details provided."}
                </div>
              </div>

              {selectedViolation.photo && (
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8 }}>EVIDENCE PHOTO</div>
                  <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-color)", background: "#000" }}>
                    <img 
                      src={selectedViolation.photo.startsWith("data:") ? selectedViolation.photo : `data:image/jpeg;base64,${selectedViolation.photo}`} 
                      alt="Violation Evidence" 
                      style={{ width: "100%", maxHeight: 300, objectFit: "contain", display: "block" }} 
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-color)", background: "var(--surface-color)", textAlign: "right" }}>
              <button className="btn-secondary" onClick={() => setSelectedViolation(null)}>Close Window</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
