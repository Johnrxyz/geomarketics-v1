"use client";

import AppShell from "@/components/layout/AppShell";
import StatCard from "@/components/ui/StatCard";
import {
  Store, Users, AlertCircle, TrendingUp, FileText, CheckCircle,
  ArrowRight, Download, RefreshCw
} from "lucide-react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const priceTrendData = [
  { date: "Mar 1", vegetables: 42, meat: 180, fish: 210 },
  { date: "Mar 5", vegetables: 45, meat: 175, fish: 215 },
  { date: "Mar 10", vegetables: 38, meat: 185, fish: 205 },
  { date: "Mar 15", vegetables: 50, meat: 190, fish: 220 },
  { date: "Mar 20", vegetables: 48, meat: 182, fish: 218 },
  { date: "Mar 24", vegetables: 52, meat: 178, fish: 225 },
];

const complaintData = [
  { section: "Vegetables", complaints: 8 },
  { section: "Meat", complaints: 14 },
  { section: "Fish", complaints: 6 },
  { section: "Dry Goods", complaints: 4 },
  { section: "Cooked Food", complaints: 11 },
];

const recentComplaints = [
  { id: "CMP-001", stall: "B-12", vendor: "Maria Santos", issue: "Unsanitary display area", status: "open", date: "Mar 23, 2026" },
  { id: "CMP-002", stall: "A-04", vendor: "Juan dela Cruz", issue: "Overpricing fish by 40%", status: "reviewing", date: "Mar 22, 2026" },
  { id: "CMP-003", stall: "C-08", vendor: "Rosa Navarro", issue: "Blocking emergency exit", status: "resolved", date: "Mar 21, 2026" },
];

const statusColorMap: Record<string, { bg: string; color: string; label: string }> = {
  open:      { bg: "#FEE2E2", color: "#991B1B", label: "Open" },
  reviewing: { bg: "#FEF3C7", color: "#92400E", label: "Reviewing" },
  resolved:  { bg: "#DCFCE7", color: "#166534", label: "Resolved" },
};

export default function DashboardPage() {
  return (
    <AppShell pageTitle="Dashboard" role="admin" userName="Admin User" userRole="Administrator">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Market Overview</h2>
          <p className="page-subtitle">LC Public Market · Updated just now</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" style={{gap:"6px"}}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary" style={{gap:"6px"}}>
            <Download size={15} /> Export Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{marginBottom:"var(--space-8)"}}>
        <StatCard
          label="Total Stalls"
          value="248"
          icon={<Store size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          trend={2}
          trendLabel="vs last month"
        />
        <StatCard
          label="Occupied Stalls"
          value="211"
          icon={<CheckCircle size={24} />}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
          trend={5}
          trendLabel="occupancy rate"
          accentColor="#16A34A"
        />
        <StatCard
          label="Active Vendors"
          value="198"
          icon={<Users size={24} />}
          iconBg="#F3E8FF"
          iconColor="#7C3AED"
          trend={3}
          accentColor="#7C3AED"
        />
        <StatCard
          label="Open Complaints"
          value="23"
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
        {/* Price Trend Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Price Trends</div>
              <div className="card-subtitle">Average price (₱/kg) per category · March 2026</div>
            </div>
            <Link href="/admin/prices" className="btn btn-ghost btn-sm">
              View All <ArrowRight size={13} />
            </Link>
          </div>
          <div className="card-body" style={{paddingTop:"0"}}>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="date" tick={{fontSize:11}} stroke="#D1D5DB" />
                  <YAxis tick={{fontSize:11}} stroke="#D1D5DB" />
                  <Tooltip contentStyle={{borderRadius:"8px",border:"1px solid #E5E7EB",fontSize:"12px"}} />
                  <Legend wrapperStyle={{fontSize:"12px"}} />
                  <Line type="monotone" dataKey="vegetables" stroke="#16A34A" strokeWidth={2} dot={false} name="Vegetables" />
                  <Line type="monotone" dataKey="meat" stroke="#DC2626" strokeWidth={2} dot={false} name="Meat" />
                  <Line type="monotone" dataKey="fish" stroke="#2563EB" strokeWidth={2} dot={false} name="Fish" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Complaints Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Complaints by Section</div>
              <div className="card-subtitle">Total logged this month</div>
            </div>
            <Link href="/admin/complaints" className="btn btn-ghost btn-sm">
              View All <ArrowRight size={13} />
            </Link>
          </div>
          <div className="card-body" style={{paddingTop:"0"}}>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complaintData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="section" tick={{fontSize:11}} stroke="#D1D5DB" />
                  <YAxis tick={{fontSize:11}} stroke="#D1D5DB" />
                  <Tooltip contentStyle={{borderRadius:"8px",border:"1px solid #E5E7EB",fontSize:"12px"}} />
                  <Bar dataKey="complaints" fill="#11296B" radius={[4,4,0,0]} name="Complaints" />
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
                {recentComplaints.map((c) => {
                  const s = statusColorMap[c.status];
                  return (
                    <tr key={c.id}>
                      <td style={{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)"}}>{c.id}</td>
                      <td style={{fontWeight:600}}>{c.stall}</td>
                      <td style={{color:"var(--text-secondary)",maxWidth:"180px"}}>{c.issue}</td>
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
              <div className="alert-item alert-warning">
                <AlertCircle size={16} style={{color:"var(--color-warning)",flexShrink:0,marginTop:2}} />
                <div>
                  <strong style={{fontSize:"var(--text-sm)"}}>5 documents pending review</strong>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-secondary)"}}>Vendor permits need approval</div>
                </div>
              </div>
              <div className="alert-item alert-error">
                <AlertCircle size={16} style={{color:"var(--color-error)",flexShrink:0,marginTop:2}} />
                <div>
                  <strong style={{fontSize:"var(--text-sm)"}}>3 stalls overdue for sanitation</strong>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-secondary)"}}>Sections B and C require inspection</div>
                </div>
              </div>
              <div className="alert-item alert-info">
                <FileText size={16} style={{color:"var(--color-info)",flexShrink:0,marginTop:2}} />
                <div>
                  <strong style={{fontSize:"var(--text-sm)"}}>Monthly report due in 3 days</strong>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-secondary)"}}>March 2026 market summary</div>
                </div>
              </div>
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
                <TrendingUp size={16} /> Generate Report
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
            {[
              { section: "Section A", total: 60, occupied: 54, color: "#11296B" },
              { section: "Section B", total: 48, occupied: 40, color: "#16A34A" },
              { section: "Section C", total: 52, occupied: 45, color: "#F59E0B" },
              { section: "Section D", total: 40, occupied: 38, color: "#7C3AED" },
              { section: "Section E", total: 28, occupied: 22, color: "#2563EB" },
              { section: "Dry Goods", total: 20, occupied: 12, color: "#DC2626" },
            ].map((s) => {
              const pct = Math.round((s.occupied / s.total) * 100);
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
                  }}>{s.section}</div>
                  <div style={{
                    fontSize:"var(--text-2xl)",fontWeight:800,color:s.color
                  }}>{pct}%</div>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-muted)",marginTop:"2px"}}>
                    {s.occupied}/{s.total} stalls
                  </div>
                  {/* mini progress bar */}
                  <div style={{
                    marginTop:"var(--space-3)",height:"4px",background:"#E5E7EB",
                    borderRadius:"2px",overflow:"hidden"
                  }}>
                    <div style={{
                      height:"100%",width:`${pct}%`,
                      background:s.color,borderRadius:"2px",
                      transition:"width 0.3s ease"
                    }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.section} occupancy`} />
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
