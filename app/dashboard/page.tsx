"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import StatCard from "@/components/ui/StatCard";
import {
  Store, Users, AlertCircle, FileText, CheckCircle,
  ArrowRight, Download, RefreshCw
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import { analyticsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

interface DashboardData {
  stats: {
    total_stalls: number;
    occupied_stalls: number;
    active_vendors: number;
    open_complaints: number;
    pending_documents: number;
    occupancy_rate: number;
  };
  section_occupancy: { section: string; name: string; total: number; occupied: number; occupancy_rate: number }[];
  complaints_by_category: { category: string; count: number }[];
  recent_complaints: { id: number; complaint_number: string; subject: string; category: string; status: string; vendor_name: string; stall_number: string; created_at: string }[];
  alerts: { type: string; message: string }[];
}

const statusColorMap: Record<string, { label: string }> = {
  open:      { label: "Open" },
  reviewing: { label: "Reviewing" },
  resolved:  { label: "Resolved" },
  dismissed: { label: "Dismissed" },
};

const SECTION_COLORS = ["#11296B", "#16A34A", "#F59E0B", "#7C3AED", "#2563EB", "#DC2626"];

export default function DashboardPage() {
  const { ready, user } = useAuthGuard("admin");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await analyticsApi.dashboard() as DashboardData;
      setData(result);
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch once auth is confirmed — prevents 403 from unauthenticated requests
  useEffect(() => { if (ready) fetchDashboard(); }, [ready, fetchDashboard]);

  const stats = data?.stats;

  // Show nothing while the auth check is in progress (avoids flash + API calls)
  if (!ready) return null;

  return (
    <AppShell pageTitle="Dashboard" role="admin" userName={user?.first_name || "Admin"} userRole="Administrator">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Market Overview</h2>
          <p className="page-subtitle">LC Public Market · {loading ? "Loading..." : "Live data"}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" style={{gap:"6px"}} onClick={fetchDashboard} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary" style={{gap:"6px"}}>
            <Download size={15} /> Export Data
          </button>
        </div>
      </div>

      {error && (
        <div style={{padding:"12px 16px",background:"#FEE2E2",color:"#991B1B",borderRadius:"8px",marginBottom:"16px",fontSize:"14px"}}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid-4" style={{marginBottom:"var(--space-8)"}}>
        <StatCard
          label="Total Stalls"
          value={loading ? "..." : String(stats?.total_stalls ?? 0)}
          icon={<Store size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          trend={2}
          trendLabel="vs last month"
        />
        <StatCard
          label="Occupied Stalls"
          value={loading ? "..." : String(stats?.occupied_stalls ?? 0)}
          icon={<CheckCircle size={24} />}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          trend={stats?.occupancy_rate ?? 0}
          trendLabel="occupancy rate"
          accentColor="#16A34A"
        />
        <StatCard
          label="Active Vendors"
          value={loading ? "..." : String(stats?.active_vendors ?? 0)}
          icon={<Users size={24} />}
          iconBg="#F3E8FF"
          iconColor="#7C3AED"
          trend={3}
          accentColor="#7C3AED"
        />
        <StatCard
          label="Open Complaints"
          value={loading ? "..." : String(stats?.open_complaints ?? 0)}
          icon={<AlertCircle size={24} />}
          iconBg="#FEE2E2"
          iconColor="#DC2626"
          trend={-8}
          trendLabel="vs last week"
          accentColor="#DC2626"
        />
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{marginBottom:"var(--space-8)"}}>
        {/* Complaints Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Complaints by Category</div>
              <div className="card-subtitle">Total logged complaints</div>
            </div>
            <Link href="/admin/complaints" className="btn btn-ghost btn-sm">
              View All <ArrowRight size={13} />
            </Link>
          </div>
          <div className="card-body" style={{paddingTop:"0"}}>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.complaints_by_category ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="category" tick={{fontSize:11}} stroke="#D1D5DB" />
                  <YAxis tick={{fontSize:11}} stroke="#D1D5DB" />
                  <Tooltip contentStyle={{borderRadius:"8px",border:"1px solid #E5E7EB",fontSize:"12px"}} />
                  <Bar dataKey="count" fill="#11296B" radius={[4,4,0,0]} name="Complaints" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2" style={{marginBottom:"var(--space-8)"}}>
        {/* Recent Complaints */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Complaints</div>
            <Link href="/admin/complaints" className="btn btn-ghost btn-sm">See all <ArrowRight size={13}/></Link>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table" aria-label="Recent complaints">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Stall</th>
                  <th scope="col">Issue</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{textAlign:"center",padding:"20px",color:"var(--text-muted)"}}>Loading...</td></tr>
                ) : (data?.recent_complaints ?? []).map((c) => {
                  const s = statusColorMap[c.status] ?? { label: c.status };
                  return (
                    <tr key={c.id}>
                      <td style={{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)"}}>{c.complaint_number}</td>
                      <td style={{fontWeight:600}}>{c.stall_number}</td>
                      <td style={{color:"var(--text-secondary)",maxWidth:"180px"}}>{c.subject}</td>
                      <td>
                        <span className={`badge badge-${c.status} badge-dot`}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Quick Actions */}
        <div style={{display:"flex", flexDirection:"column", gap:"var(--space-5)"}}>
          {/* Alerts */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">System Alerts</div>
            </div>
            <div className="card-body" style={{display:"flex",flexDirection:"column",gap:"var(--space-3)"}}>
              {loading ? (
                <div style={{color:"var(--text-muted)",fontSize:"var(--text-sm)"}}>Loading alerts...</div>
              ) : (data?.alerts ?? []).length === 0 ? (
                <div style={{color:"var(--text-muted)",fontSize:"var(--text-sm)"}}>No active alerts.</div>
              ) : (data?.alerts ?? []).map((alert, i) => (
                <div key={i} className={`alert-item alert-${alert.type}`}>
                  <AlertCircle size={16} style={{flexShrink:0,marginTop:2}} />
                  <div>
                    <strong style={{fontSize:"var(--text-sm)"}}>{alert.message}</strong>
                  </div>
                </div>
              ))}
              {stats?.pending_documents ? (
                <div className="alert-item alert-info">
                  <FileText size={16} style={{flexShrink:0,marginTop:2}} />
                  <div>
                    <strong style={{fontSize:"var(--text-sm)"}}>Monthly report due soon</strong>
                    <div style={{fontSize:"var(--text-xs)",color:"var(--text-secondary)"}}>Market summary pending</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header"><div className="card-title">Quick Actions</div></div>
            <div className="card-body" style={{display:"flex",flexDirection:"column",gap:"var(--space-3)"}}>
              <Link href="/map" className="btn btn-accent" style={{justifyContent:"flex-start",gap:"var(--space-3)"}}>
                <Store size={16} /> View Market Map
              </Link>
              <Link href="/admin/documents" className="btn btn-secondary" style={{justifyContent:"flex-start",gap:"var(--space-3)"}}>
                <FileText size={16} /> Review Documents
              </Link>
              <Link href="/admin/reports" className="btn btn-ghost" style={{justifyContent:"flex-start",gap:"var(--space-3)"}}>
                <FileText size={16} /> Generate Report
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stall Occupancy Summary */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Stall Occupancy by Section</div>
            <div className="card-subtitle">Real-time occupancy status across all market sections</div>
          </div>
        </div>
        <div className="card-body">
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"var(--space-4)"}}>
            {loading ? (
              <div style={{color:"var(--text-muted)",fontSize:"var(--text-sm)",gridColumn:"1/-1"}}>Loading...</div>
            ) : (data?.section_occupancy ?? []).map((s, i) => {
              const pct = s.occupancy_rate;
              const color = SECTION_COLORS[i % SECTION_COLORS.length];
              return (
                <div key={s.section} style={{
                  background:"#F9FAFB",
                  borderRadius:"var(--radius-md)",
                  padding:"var(--space-4)",
                  textAlign:"center",
                  border:"1px solid #E5E7EB"
                }}>
                  <div style={{
                    fontSize:"var(--text-xs)",color:"var(--text-secondary)",
                    fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",
                    marginBottom:"var(--space-2)"
                  }}>Section {s.section}</div>
                  <div style={{fontSize:"var(--text-2xl)",fontWeight:800,color}}>{pct}%</div>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-muted)",marginTop:"2px"}}>
                    {s.occupied}/{s.total} stalls
                  </div>
                  <div style={{
                    marginTop:"var(--space-3)",height:"4px",background:"#E5E7EB",
                    borderRadius:"2px",overflow:"hidden"
                  }}>
                    <div style={{
                      height:"100%",width:`${pct}%`,
                      background:color,borderRadius:"2px",
                      transition:"width 0.3s ease"
                    }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Section ${s.section} occupancy`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
