"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import StatCard from "@/components/ui/StatCard";
import {
  Store, Users, AlertCircle, FileText, CheckCircle,
  ArrowRight, Download, RefreshCw, Lightbulb, TrendingUp, TrendingDown, Info, Sparkles, Megaphone, Phone, MessageSquare, Star, Activity, Minus, BarChart2
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceDot
} from "recharts";
import { analyticsApi, usersApi } from "@/lib/api";
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
  open: { label: "Open" },
  reviewing: { label: "Reviewing" },
  resolved: { label: "Resolved" },
  dismissed: { label: "Dismissed" },
};

const STAPLES_MOCK = [
  { id: 'rice', name: 'Rice (Well-milled)', price: 52, regionalAvg: 54, weeklyChange: -2.1, monthlyChange: 1.0, category: 'Staples' },
  { id: 'tomato', name: 'Tomato', price: 88, regionalAvg: 75, weeklyChange: 12.4, monthlyChange: 22.0, category: 'Vegetables' },
  { id: 'garlic', name: 'Garlic', price: 145, regionalAvg: 155, weeklyChange: -5.2, monthlyChange: 3.5, category: 'Vegetables' },
  { id: 'tilapia', name: 'Tilapia', price: 185, regionalAvg: 200, weeklyChange: -4.8, monthlyChange: -2.0, category: 'Protein' },
  { id: 'pork', name: 'Pork Belly', price: 340, regionalAvg: 335, weeklyChange: 3.1, monthlyChange: 5.0, category: 'Protein' },
  { id: 'onion', name: 'Red Onion', price: 110, regionalAvg: 112, weeklyChange: 0.5, monthlyChange: -4.2, category: 'Vegetables' },
];

const MARKETS_MOCK = [
  { id: 'tanza', name: 'Tanza Public Market', basketCost: 930 },
  { id: 'lipa', name: 'Lipa City Public Market', basketCost: 960 },
  { id: 'tanay', name: 'Tanay Public Market', basketCost: 910 },
  { id: 'imus', name: 'Imus Public Market', basketCost: 945 },
];

const HISTORICAL_DATA = [
  { date: 'May 24', price: 70 }, { date: 'May 25', price: 72 },
  { date: 'May 26', price: 70 }, { date: 'May 27', price: 75 },
  { date: 'May 28', price: 80 }, { date: 'May 29', price: 95 },
  { date: 'May 30', price: 90 }, { date: 'May 31', price: 85 },
  { date: 'Jun 1', price: 82 }, { date: 'Jun 2', price: 85 },
  { date: 'Jun 3', price: 88 }, { date: 'Today', price: 88 },
];

const SECTION_COLORS = ["#11296B", "#16A34A", "#F59E0B", "#7C3AED", "#2563EB", "#DC2626"];

export default function DashboardPage() {
  const { ready, user } = useAuthGuard("admin");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  // Price analytics state (migrated from consumer page)
  const [staples, setStaples] = useState<any[]>(STAPLES_MOCK);
  const [marketsData, setMarketsData] = useState<any[]>(MARKETS_MOCK);
  const [compareTarget, setCompareTarget] = useState('tanza');
  const [activeCommodity, setActiveCommodity] = useState<any>(STAPLES_MOCK[1]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Load admin phone number
  useEffect(() => {
    if (ready && user) {
      const phone = (user as any).phone ?? "";
      setAdminPhone(phone);
      setPhoneInput(phone);
    }
  }, [ready, user]);

  const savePhone = async () => {
    setPhoneSaving(true);
    try {
      await usersApi.updateMe({ phone: phoneInput });
      setAdminPhone(phoneInput);
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 3000);
    } catch (err: any) {
      alert(err?.detail ?? err?.message ?? "Failed to save phone number.");
    } finally {
      setPhoneSaving(false);
    }
  };

  // Only fetch once auth is confirmed
  useEffect(() => { if (ready) fetchDashboard(); }, [ready, fetchDashboard]);

  // Load live price data for the analytics panels
  useEffect(() => {
    async function loadPrices() {
      try {
        const { marketsApi, pricesApi } = await import('@/lib/api');
        const [apiMarketsRes, apiSnapshotsRes]: [any, any] = await Promise.all([
          marketsApi.list(),
          pricesApi.snapshots({ page_size: '5000' }),
        ]);
        const apiMarkets = apiMarketsRes.results || apiMarketsRes;
        const apiSnapshots = apiSnapshotsRes.results || apiSnapshotsRes;

        if (apiMarkets.length > 0 && apiSnapshots.length > 0) {
          const lucena = apiMarkets.find((m: any) => m.name.toLowerCase().includes('lucena'));
          const latestDate = apiSnapshots[0]?.survey_date;
          const commodities: string[] = Array.from(new Set(apiSnapshots.map((s: any) => s.commodity_name)));

          const liveStaples = commodities.map((cName: any) => {
            const snaps = apiSnapshots.filter((s: any) => s.commodity_name === cName);
            const lucenaSnaps = lucena ? snaps.filter((s: any) => s.market === lucena.id).sort((a: any, b: any) => new Date(b.survey_date).getTime() - new Date(a.survey_date).getTime()) : [];
            const price = lucenaSnaps.length > 0 ? parseFloat(lucenaSnaps[0].prevailing_price) : 0;
            const prev = lucenaSnaps.length > 1 ? parseFloat(lucenaSnaps[1].prevailing_price) : price;
            const regionalSnaps = snaps.filter((s: any) => s.survey_date === latestDate);
            const regionalAvg = regionalSnaps.length > 0 ? regionalSnaps.reduce((acc: number, s: any) => acc + (parseFloat(s.prevailing_price) || 0), 0) / regionalSnaps.length : 0;
            const weeklyChange = prev > 0 ? parseFloat(((price - prev) / prev * 100).toFixed(1)) : 0;
            const oldestLucena = lucenaSnaps.length > 1 ? parseFloat(lucenaSnaps[lucenaSnaps.length - 1].prevailing_price) : price;
            const monthlyChange = oldestLucena > 0 ? parseFloat(((price - oldestLucena) / oldestLucena * 100).toFixed(1)) : 0;
            return { id: cName.toLowerCase().replace(/\s+/g, '-'), name: cName, price, regionalAvg, weeklyChange, monthlyChange, category: snaps[0]?.category_name || 'Uncategorized' };
          }).filter((s: any) => s.price > 0);

          if (liveStaples.length > 0) setStaples(liveStaples);

          const liveMarkets = apiMarkets
            .filter((m: any) => !m.name.toLowerCase().includes('lucena') && !m.name.toLowerCase().includes('calabarzon'))
            .map((m: any) => {
              const marketSnaps = apiSnapshots.filter((s: any) => s.market === m.id && s.survey_date === latestDate);
              const basketCost = marketSnaps.reduce((acc: number, s: any) => acc + (parseFloat(s.prevailing_price) || 0), 0);
              return { id: m.id.toString(), name: m.name, basketCost };
            });

          if (liveMarkets.length > 0) {
            setMarketsData(liveMarkets);
            setCompareTarget(liveMarkets[0].id);
          }
        }
      } catch (e) {
        // Falls back to mock data silently
      }
    }
    if (ready) loadPrices();
  }, [ready]);

  // Derived values for price analytics
  const bestDealsList = staples
    .filter(s => s.regionalAvg > 0)
    .map(s => ({ ...s, savingsPercent: ((s.regionalAvg - s.price) / s.regionalAvg) * 100 }))
    .sort((a, b) => b.savingsPercent - a.savingsPercent)
    .slice(0, 3);

  const generateComparisonInsight = () => {
    const targetMarket = marketsData.find(m => m.id === compareTarget);
    if (!targetMarket || !targetMarket.basketCost) return 'Select a market to compare prices.';
    const lucenaBasket = staples.reduce((acc, s) => acc + s.price, 0);
    const diff = targetMarket.basketCost - lucenaBasket;
    if (Math.abs(diff) < 5) return `Prices in Lucena are practically identical to ${targetMarket.name} today.`;
    if (diff > 0) return `Good news! A basket of basic goods in Lucena is currently cheaper by ₱${diff.toFixed(2)} compared to ${targetMarket.name}.`;
    return `A basket of basic goods in Lucena is currently higher by ₱${Math.abs(diff).toFixed(2)} compared to ${targetMarket.name}.`;
  };

  const stats = data?.stats;

  // Show nothing while the auth check is in progress (avoids flash + API calls)
  if (!ready) return null;

  const getInsights = () => {
    if (!data) return [];
    const newInsights = [];

    if (stats) {
      if (stats.occupancy_rate >= 90) {
        newInsights.push({ type: 'success', title: 'High Occupancy', text: `Market occupancy is excellent at ${stats.occupancy_rate}%.`, icon: TrendingUp, color: '#16A34A', bg: '#DCFCE7' });
      } else if (stats.occupancy_rate < 60) {
        newInsights.push({ type: 'warning', title: 'Low Occupancy', text: `Market occupancy is low at ${stats.occupancy_rate}%. Consider vendor acquisition.`, icon: TrendingDown, color: '#DC2626', bg: '#FEE2E2' });
      } else {
        newInsights.push({ type: 'info', title: 'Stable Occupancy', text: `Market occupancy is stable at ${stats.occupancy_rate}%.`, icon: Info, color: '#2563EB', bg: '#EFF6FF' });
      }
    }

    if (data.section_occupancy && data.section_occupancy.length > 0) {
      const sorted = [...data.section_occupancy].sort((a, b) => b.occupancy_rate - a.occupancy_rate);
      const highest = sorted[0];
      const lowest = sorted[sorted.length - 1];
      if (highest && lowest && highest.occupancy_rate - lowest.occupancy_rate > 30) {
        newInsights.push({ type: 'warning', title: 'Occupancy Disparity', text: `Section ${highest.section} is heavily utilized (${highest.occupancy_rate}%), while Section ${lowest.section} lags behind (${lowest.occupancy_rate}%).`, icon: AlertCircle, color: '#F59E0B', bg: '#FEF3C7' });
      }
    }

    if (data.complaints_by_category && data.complaints_by_category.length > 0) {
      const top = [...data.complaints_by_category].sort((a, b) => b.count - a.count)[0];
      if (top && top.count > 0) {
        newInsights.push({ type: 'info', title: 'Complaint Trend', text: `"${top.category}" is the most common issue (${top.count} logs).`, icon: Lightbulb, color: '#7C3AED', bg: '#F3E8FF' });
      }
    }

    return newInsights;
  };

  const insights = getInsights();

  const getComplaintsInsight = () => {
    if (!data?.complaints_by_category || data.complaints_by_category.length === 0) return null;
    const top = [...data.complaints_by_category].sort((a, b) => b.count - a.count)[0];
    if (top && top.count > 0) {
      return `"${top.category}" is the most common issue with ${top.count} logs.`;
    }
    return null;
  };

  const getOccupancyInsight = () => {
    if (!data?.section_occupancy || data.section_occupancy.length === 0) return null;
    const sorted = [...data.section_occupancy].sort((a, b) => b.occupancy_rate - a.occupancy_rate);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    if (highest && lowest && highest.occupancy_rate - lowest.occupancy_rate > 30) {
      return `Section ${highest.section} is heavily utilized (${highest.occupancy_rate}%), while Section ${lowest.section} lags behind (${lowest.occupancy_rate}%).`;
    } else if (highest) {
      return `Section ${highest.section} currently leads occupancy with ${highest.occupancy_rate}%.`;
    }
    return null;
  };

  const complaintsInsight = getComplaintsInsight();
  const occupancyInsight = getOccupancyInsight();

  return (
    <AppShell pageTitle="Dashboard" role="admin" userName={user?.first_name || "Admin"} userRole="Administrator">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Market Overview</h2>
          <p className="page-subtitle">LC Public Market · {loading ? "Loading..." : "Live data"}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" style={{ gap: "6px" }} onClick={fetchDashboard} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary" style={{ gap: "6px" }}>
            <Download size={15} /> Export Data
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#FEE2E2", color: "#991B1B", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: "var(--space-8)" }}>
        <StatCard
          label="Total Stalls"
          value={loading ? "..." : String(stats?.total_stalls ?? 0)}
          icon={<Store size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
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
      <div className="grid-2" style={{ marginBottom: "var(--space-8)" }}>
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
          <div className="card-body" style={{ paddingTop: "0" }}>
            <div className="chart-container" style={{ minWidth: 0, minHeight: 200 }}>
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart data={data?.complaints_by_category ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="#D1D5DB" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#D1D5DB" />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: "12px" }} />
                    <Bar dataKey="count" fill="#11296B" radius={[4, 4, 0, 0]} name="Complaints" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ height: "100%", width: "100%" }} />}
            </div>
            {complaintsInsight && (
              <div style={{ marginTop: "16px", padding: "12px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <Sparkles size={16} color="#7C3AED" style={{ flexShrink: 0, marginTop: "2px" }} />
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  <strong>Insight:</strong> {complaintsInsight}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Automated Insights */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={18} color="#7C3AED" /> Insights
              </div>
              <div className="card-subtitle">AI-driven analysis of current data</div>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: "0", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", maxHeight: "300px" }}>
            {loading ? (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "20px" }}>Analyzing data...</div>
            ) : insights.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "20px" }}>No insights generated.</div>
            ) : (
              insights.map((insight, idx) => {
                const IconComponent = insight.icon;
                return (
                  <div key={idx} style={{ display: "flex", gap: "12px", padding: "12px", background: "#F9FAFB", borderRadius: "8px", border: "1px solid #E5E7EB", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "36px", height: "36px", borderRadius: "8px", background: insight.bg, color: insight.color, flexShrink: 0 }}>
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)", marginBottom: "4px" }}>{insight.title}</div>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>{insight.text}</div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2" style={{ marginBottom: "var(--space-8)" }}>
        {/* Recent Complaints */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Complaints</div>
            <Link href="/admin/complaints" className="btn btn-ghost btn-sm">See all <ArrowRight size={13} /></Link>
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
                  <tr><td colSpan={4} style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>Loading...</td></tr>
                ) : (data?.recent_complaints ?? []).map((c) => {
                  const s = statusColorMap[c.status] ?? { label: c.status };
                  return (
                    <tr key={c.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>{c.complaint_number}</td>
                      <td style={{ fontWeight: 600 }}>{c.stall_number}</td>
                      <td style={{ color: "var(--text-secondary)", maxWidth: "180px" }}>{c.subject}</td>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {/* Alerts */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">System Alerts</div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {loading ? (
                <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>Loading alerts...</div>
              ) : (data?.alerts ?? []).length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>No active alerts.</div>
              ) : (data?.alerts ?? []).map((alert, i) => (
                <div key={i} className={`alert-item alert-${alert.type}`}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ fontSize: "var(--text-sm)" }}>{alert.message}</strong>
                  </div>
                </div>
              ))}
              {stats?.pending_documents ? (
                <div className="alert-item alert-info">
                  <FileText size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ fontSize: "var(--text-sm)" }}>Monthly report due soon</strong>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Market summary pending</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header"><div className="card-title">Quick Actions</div></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <Link href="/map" className="btn btn-accent" style={{ justifyContent: "flex-start", gap: "var(--space-3)" }}>
                <Store size={16} /> View Market Map
              </Link>
              <Link href="/admin/announcements" className="btn btn-primary" style={{ justifyContent: "flex-start", gap: "var(--space-3)" }}>
                <Megaphone size={16} /> Manage Announcements
              </Link>
              <Link href="/admin/documents" className="btn btn-secondary" style={{ justifyContent: "flex-start", gap: "var(--space-3)" }}>
                <FileText size={16} /> Review Documents
              </Link>
              <Link href="/admin/reports" className="btn btn-ghost" style={{ justifyContent: "flex-start", gap: "var(--space-3)" }}>
                <FileText size={16} /> Generate Report
              </Link>

              {/* SMS Notification Status */}
              <div style={{
                marginTop: "var(--space-2)",
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: adminPhone ? "1px solid #BBF7D0" : "1px solid #FCA5A5",
                background: adminPhone ? "#F0FDF4" : "#FEF2F2",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <MessageSquare size={14} color={adminPhone ? "#16A34A" : "#DC2626"} />
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: adminPhone ? "#16A34A" : "#DC2626" }}>
                    SMS Notifications
                  </span>
                  {adminPhone && (
                    <span style={{ fontSize: 10, background: "#DCFCE7", color: "#16A34A", fontWeight: 700, padding: "1px 7px", borderRadius: "var(--radius-full)", marginLeft: "auto" }}>Active</span>
                  )}
                  {!adminPhone && (
                    <span style={{ fontSize: 10, background: "#FEE2E2", color: "#DC2626", fontWeight: 700, padding: "1px 7px", borderRadius: "var(--radius-full)", marginLeft: "auto" }}>Not Set</span>
                  )}
                </div>

                {adminPhone ? (
                  <div style={{ fontSize: "var(--text-xs)", color: "#166534" }}>
                    📱 {adminPhone} — you will receive an SMS when a complaint is filed.
                  </div>
                ) : (
                  <div style={{ fontSize: "var(--text-xs)", color: "#991B1B", marginBottom: 8 }}>
                    Set your phone number to receive SMS alerts for new complaints.
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Phone size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={e => setPhoneInput(e.target.value)}
                      placeholder="09XX XXX XXXX"
                      style={{
                        width: "100%", paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6,
                        borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)",
                        fontSize: "var(--text-xs)", background: "white",
                      }}
                      aria-label="Admin SMS phone number"
                    />
                  </div>
                  <button
                    onClick={savePhone}
                    disabled={phoneSaving || phoneInput === adminPhone}
                    style={{
                      padding: "6px 12px", borderRadius: "var(--radius-sm)", border: "none",
                      background: "var(--color-accent)", color: "white",
                      fontWeight: 700, fontSize: "var(--text-xs)", cursor: "pointer",
                      opacity: (phoneSaving || phoneInput === adminPhone) ? 0.5 : 1,
                    }}
                  >
                    {phoneSaved ? "✓ Saved" : phoneSaving ? "…" : "Save"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── Historical Price Intelligence (migrated from consumer page) ── */}
      <div className="card" style={{ marginBottom: "var(--space-8)" }}>
        <div className="card-header">
          <div>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <BarChart2 size={18} /> Historical Price Intelligence
            </div>
            <div className="card-subtitle">Interactive 30-day explorer with experimental forecasting</div>
          </div>
          <select
            className="form-select"
            style={{ width: 170, fontSize: "var(--text-sm)", fontWeight: 700 }}
            value={activeCommodity.id}
            onChange={e => {
              const found = staples.find(s => s.id === e.target.value) || STAPLES_MOCK.find(s => s.id === e.target.value);
              if (found) setActiveCommodity(found);
            }}
          >
            {(staples.length > 0 ? staples : STAPLES_MOCK).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="card-body">
          <div style={{ display: "flex", gap: "var(--space-6)", marginBottom: "var(--space-5)" }}>
            <div>
              <div style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>Current Price</div>
              <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: "var(--text-primary)" }}>₱{activeCommodity.price}</div>
            </div>
            <div>
              <div style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>30-Day High</div>
              <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: "#DC2626" }}>₱{activeCommodity.thirtyDayHigh ?? 95}</div>
            </div>
            <div>
              <div style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>30-Day Low</div>
              <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: "#16A34A" }}>₱{activeCommodity.thirtyDayLow ?? 70}</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <div style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>Weekly Change</div>
              <div style={{ fontSize: "var(--text-2xl)", fontWeight: 900, color: activeCommodity.weeklyChange > 0 ? "#DC2626" : activeCommodity.weeklyChange < 0 ? "#16A34A" : "var(--text-primary)" }}>
                {activeCommodity.weeklyChange > 0 ? "+" : ""}{activeCommodity.weeklyChange}%
              </div>
            </div>
          </div>
          <div style={{ height: 220, width: "100%", marginBottom: "var(--space-4)" }}>
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
                <AreaChart data={activeCommodity.historicalData || HISTORICAL_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashColorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D1D5DB" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#4B5563", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#4B5563", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Area type="monotone" dataKey="price" stroke="var(--color-accent)" strokeWidth={3} fillOpacity={1} fill="url(#dashColorPrice)" />
                  {activeCommodity.id === 'tomato' && <ReferenceDot x="May 29" y={95} r={5} fill="#DC2626" stroke="white" strokeWidth={2} />}
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ height: "100%", width: "100%" }} />}
          </div>
          <div style={{ background: "#F3F4F6", padding: "var(--space-4)", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {activeCommodity.id === 'tomato' && (
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Info size={16} color="#DC2626" style={{ marginTop: 2, flexShrink: 0 }} />
                <span><strong>Historical Insight:</strong> Price spike on May 29 due to regional supply constraints.</span>
              </div>
            )}
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Activity size={16} color="#8B5CF6" style={{ marginTop: 2, flexShrink: 0 }} />
              <span>
                <strong style={{ color: "#8B5CF6" }}>Experimental Forecast:</strong> If current trend continues, {activeCommodity.name} may {activeCommodity.weeklyChange > 0 ? 'increase by 4–6%' : 'decrease by 2–3%'} next week.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Price Analytics (migrated from consumer page) ── */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--color-accent)", marginBottom: "var(--space-5)", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <TrendingUp size={20} color="var(--color-primary)" /> Market Affordability & Price Trends
        </h3>

        {/* Row 1: Price Fairness Index + Best Deals */}
        <div className="grid-2" style={{ marginBottom: "var(--space-5)" }}>
          {/* Lucena Price Fairness Index */}
          <div className="card" style={{ padding: "var(--space-6)", background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)" }}>
            <div style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)", letterSpacing: "1px", marginBottom: "var(--space-3)" }}>Lucena Prices Index™ — Signature Metric</div>
            <div style={{ marginBottom: "var(--space-2)" }}>
              <span style={{ fontSize: "64px", fontWeight: 900, color: "var(--color-accent)", lineHeight: 1, letterSpacing: "-2px" }}>87</span>
              <span style={{ fontSize: "var(--text-xl)", color: "var(--text-muted)", fontWeight: 700 }}>/100</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: "var(--text-md)", color: "#16A34A", marginBottom: "var(--space-2)" }}>Fair Market Pricing</div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
              Indicates generally affordable staple goods and stable protein prices compared to the regional average, with some volatility in vegetables.
            </p>
          </div>

          {/* Best Deals Today */}
          <div className="card" style={{ padding: "var(--space-6)" }}>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              <Star size={18} color="var(--color-primary)" fill="var(--color-primary)" /> Best Deals Today (Lucena Rank)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {bestDealsList.map((deal, idx) => {
                const colors = [
                  { bg: "#F0FDF4", border: "#16A34A", text: "#166534", sub: "#15803D" },
                  { bg: "#EFF6FF", border: "#2563EB", text: "#1E3A8A", sub: "#1D4ED8" },
                  { bg: "#FFFBEB", border: "#D97706", text: "#92400E", sub: "#B45309" },
                ];
                const c = colors[idx % 3];
                return (
                  <div key={deal.id} style={{ padding: "var(--space-3) var(--space-4)", background: c.bg, borderRadius: "var(--radius-md)", borderLeft: `4px solid ${c.border}` }}>
                    <div style={{ fontSize: "var(--text-xs)", color: c.text, fontWeight: 700, textTransform: "uppercase" }}>🏆 #{idx + 1} Cheapest</div>
                    <div style={{ fontSize: "var(--text-md)", fontWeight: 800, color: c.text }}>{deal.name}</div>
                    <div style={{ fontSize: "var(--text-sm)", color: c.sub }}>{deal.savingsPercent > 0 ? `${deal.savingsPercent.toFixed(0)}% below region` : 'Near Regional Average'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Lucena vs + What Changed This Week */}
        <div className="grid-2">
          {/* Lucena vs Another Market */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Lucena vs</div>
              <select className="form-select" value={compareTarget} onChange={e => setCompareTarget(e.target.value)} style={{ width: 200, fontSize: "var(--text-sm)", fontWeight: 700 }}>
                {marketsData.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="card-body">
              <p style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.6, margin: 0 }}>
                {generateComparisonInsight()}
              </p>
            </div>
          </div>

          {/* What Changed This Week */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <Activity size={18} color="var(--color-primary)" /> What Changed This Week?
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {(() => {
                if (!staples.length) return null;
                const increases = [...staples].filter(s => s.weeklyChange > 0).sort((a, b) => b.weeklyChange - a.weeklyChange);
                const decreases = [...staples].filter(s => s.weeklyChange < 0).sort((a, b) => a.weeklyChange - b.weeklyChange);
                const mostVolatile = [...staples].filter(s => Math.abs(s.weeklyChange) > 0).sort((a, b) => Math.abs(b.weeklyChange) - Math.abs(a.weeklyChange))[0];
                const mostStable = [...staples].sort((a, b) => Math.abs(a.weeklyChange) - Math.abs(b.weeklyChange))[0];
                const items = [
                  { label: "Biggest Increase", icon: TrendingUp, bg: "#FEE2E2", color: "#DC2626", value: increases[0] ? `${increases[0].name} (+${increases[0].weeklyChange}%)` : "No increases" },
                  { label: "Biggest Decrease", icon: TrendingDown, bg: "#DCFCE7", color: "#16A34A", value: decreases[0] ? `${decreases[0].name} (${decreases[0].weeklyChange}%)` : "No decreases" },
                  { label: "Most Stable", icon: Minus, bg: "#F3F4F6", color: "#4B5563", value: mostStable ? `${mostStable.name} (${mostStable.weeklyChange === 0 ? "Unchanged" : mostStable.weeklyChange + "%"})` : "—" },
                  { label: "High Volatility", icon: Activity, bg: "#FEF3C7", color: "#D97706", value: mostVolatile ? mostVolatile.name : "Stable Market" },
                ];
                return items.map(({ label, icon: Icon, bg, color, value }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) 0", borderBottom: "1px solid #F3F4F6" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
                      <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
                    </div>
                  </div>
                ));
              })()}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "var(--space-4)" }}>
            {loading ? (
              <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", gridColumn: "1/-1" }}>Loading...</div>
            ) : (data?.section_occupancy ?? []).map((s, i) => {
              const pct = s.occupancy_rate;
              const color = SECTION_COLORS[i % SECTION_COLORS.length];
              return (
                <div key={s.section} style={{
                  background: "#F9FAFB",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-4)",
                  textAlign: "center",
                  border: "1px solid #E5E7EB"
                }}>
                  <div style={{
                    fontSize: "var(--text-xs)", color: "var(--text-secondary)",
                    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                    marginBottom: "var(--space-2)"
                  }}>Section {s.section}</div>
                  <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color }}>{pct}%</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "2px" }}>
                    {s.occupied}/{s.total} stalls
                  </div>
                  <div style={{
                    marginTop: "var(--space-3)", height: "4px", background: "#E5E7EB",
                    borderRadius: "2px", overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: color, borderRadius: "2px",
                      transition: "width 0.3s ease"
                    }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Section ${s.section} occupancy`} />
                  </div>
                </div>
              );
            })}
          </div>
          {occupancyInsight && (
            <div style={{ marginTop: "20px", padding: "12px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <Sparkles size={16} color="#7C3AED" style={{ flexShrink: 0, marginTop: "2px" }} />
              <span style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                <strong>Insight:</strong> {occupancyInsight}
              </span>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
