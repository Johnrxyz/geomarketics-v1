"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { violationsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function VendorViolationsPage() {
  const { ready, user } = useAuthGuard("vendor");
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
                    </tr>
                  ))}
                  {violations.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No violations recorded. Keep up the good work!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
