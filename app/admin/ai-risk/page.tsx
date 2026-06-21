"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { aiRiskApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function AIRiskPage() {
  const { ready, user } = useAuthGuard("admin");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(() => {
    setLoading(true);
    aiRiskApi.list()
      .then((data: any) => setProfiles(data?.results ?? data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (ready) fetchProfiles();
  }, [ready, fetchProfiles]);

  const handleRecompute = async () => {
    setLoading(true);
    try {
      await aiRiskApi.recompute();
      fetchProfiles();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <AppShell pageTitle="AI Risk Analysis" role="admin" userName={user?.first_name || "Admin"} userRole="Administrator">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="page-header-left">
          <h2 className="page-title">AI Risk Analysis</h2>
          <p className="page-subtitle">View AI-generated risk profiles for vendors</p>
        </div>
        <button className="btn btn-primary" onClick={handleRecompute} disabled={loading}>
          {loading ? 'Processing...' : 'Recompute Risk'}
        </button>
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
                    <th style={{ padding: "12px 8px" }}>Risk Level</th>
                    <th style={{ padding: "12px 8px" }}>Risk Score</th>
                    <th style={{ padding: "12px 8px" }}>Factors</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border-color)", fontSize: "0.875rem" }}>
                      <td style={{ padding: "12px 8px" }}>{new Date(p.last_assessment_date || p.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 8px", fontWeight: 600 }}>{p.vendor_name || p.vendor}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <span className={`badge ${p.risk_level === 'high' ? 'badge-error' : p.risk_level === 'medium' ? 'badge-warning' : 'badge-success'}`}>
                          {p.risk_level}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px", fontWeight: 600 }}>{p.risk_score}</td>
                      <td style={{ padding: "12px 8px", maxWidth: 250, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={JSON.stringify(p.assessment_details)}>
                        {JSON.stringify(p.assessment_details)}
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No AI risk profiles generated yet.</td></tr>
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
