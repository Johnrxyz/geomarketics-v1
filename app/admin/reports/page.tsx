"use client";

import AppShell from "@/components/layout/AppShell";
import { useState, useEffect, useCallback } from "react";
import { Download, FileText, BarChart2, Filter, Printer, CheckCircle, Sparkles } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { analyticsApi, sectionsApi, getUser, accomplishmentApi } from "@/lib/api";

interface ReportData {
  occupancy: { total: number; occupied: number; vacant: number; reserved: number; flagged: number; rate: number };
  section_report: { code: string; name: string; total: number; occupied: number; vacant: number; reserved: number; occupancy_rate: number }[];
  complaint_trend: { month: string; count: number }[];
  complaint_summary: { total: number; open: number; reviewing: number; resolved: number };
  vendor_compliance: { avg_rate: number; below_70: number };
}

const PIE_COLORS = ["#11296B", "#FFCB05", "#F59E0B", "#DC2626"];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("occupancy");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate]     = useState(new Date().toISOString().split("T")[0]);
  const [sectionFilter, setSectionFilter] = useState("All");
  const [summaryPeriod, setSummaryPeriod] = useState("monthly");
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [sections, setSections] = useState<{ id: number; code: string; name: string }[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);
  useEffect(() => {
    sectionsApi.list().then((data: unknown) => {
      const results = (data as { results?: { id: number; code: string; name: string }[] }).results || (data as { id: number; code: string; name: string }[]);
      setSections(Array.isArray(results) ? results : []);
    }).catch(() => {});
  }, []);

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { date_from: startDate, date_to: endDate };
      if (sectionFilter !== "All") {
        const sec = sections.find((s) => s.name === sectionFilter || s.code === sectionFilter);
        if (sec) params.section = String(sec.id);
      }
      const data = await analyticsApi.reports(params) as ReportData;
      setReportData(data);
      setGenerated(true);
    } catch {
      setGenerated(false);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, sectionFilter, sections]);

  const generateAndSaveReport = async () => {
    setSaving(true);
    try {
      await accomplishmentApi.generate({ period_start: startDate, period_end: endDate });
      alert("Report generated and saved to database successfully!");
    } catch (e) {
      alert("Failed to save report.");
    } finally {
      setSaving(false);
    }
  };

  const occupancyPie = reportData ? [
    { name: "Occupied",  value: reportData.occupancy.occupied,  color: PIE_COLORS[0] },
    { name: "Vacant",    value: reportData.occupancy.vacant,    color: PIE_COLORS[1] },
    { name: "Reserved",  value: reportData.occupancy.reserved,  color: PIE_COLORS[2] },
    { name: "Flagged",   value: reportData.occupancy.flagged,   color: PIE_COLORS[3] },
  ] : [];

  const sectionBarData = (reportData?.section_report ?? []).map((s) => ({
    section: `Sec ${s.code}`,
    occupied: s.occupied,
    vacant: s.vacant,
  }));

  const complaintTrend = (reportData?.complaint_trend ?? []).map((t) => ({
    month: t.month,
    total: t.count,
  }));

  const getPieInsight = () => {
    if (!reportData) return null;
    const rate = reportData.occupancy.rate;
    if (rate >= 90) return `Outstanding occupancy with ${rate}% of stalls occupied.`;
    if (rate < 60) return `Low occupancy (${rate}%). High vacancy rate detected.`;
    return `Occupancy is stable at ${rate}%.`;
  };

  const getBarInsight = () => {
    if (!reportData?.section_report || reportData.section_report.length === 0) return null;
    const sorted = [...reportData.section_report].sort((a, b) => b.occupancy_rate - a.occupancy_rate);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];
    if (highest && lowest && highest.occupancy_rate - lowest.occupancy_rate > 30) {
      return `Significant disparity: Section ${highest.code} is heavily utilized (${highest.occupancy_rate}%), while Section ${lowest.code} lags behind (${lowest.occupancy_rate}%).`;
    } else if (highest) {
      return `Section ${highest.code} has the highest occupancy rate at ${highest.occupancy_rate}%.`;
    }
    return null;
  };

  const getTrendInsight = () => {
    if (!reportData?.complaint_trend || reportData.complaint_trend.length < 2) return null;
    const current = reportData.complaint_trend[reportData.complaint_trend.length - 1].count;
    const previous = reportData.complaint_trend[reportData.complaint_trend.length - 2].count;
    if (current > previous) {
      return `Complaints have increased from ${previous} to ${current} in the latest month.`;
    } else if (current < previous) {
      return `Complaints have decreased from ${previous} to ${current} in the latest month. Great progress!`;
    }
    return `Complaints are stable compared to the previous month.`;
  };

  const getComplianceInsight = () => {
    if (!reportData?.vendor_compliance) return null;
    const below70 = reportData.vendor_compliance.below_70;
    if (below70 > 0) {
      return `Action required: ${below70} vendor(s) are below the 70% compliance threshold.`;
    }
    return `All vendors are meeting the minimum compliance threshold.`;
  };

  const pieInsight = getPieInsight();
  const barInsight = getBarInsight();
  const trendInsight = getTrendInsight();
  const complianceInsight = getComplianceInsight();

  return (
    <AppShell pageTitle="Reports & Analytics" role="admin" userName={user?.first_name || "Admin"} userRole="Administrator">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Reports & Analytics</h2>
          <p className="page-subtitle">Generate and export market data summaries</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </button>
          <button className="btn btn-ghost">
            <Download size={15} /> Export CSV
          </button>
          <button className="btn btn-primary">
            <FileText size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Report Filters */}
      <div className="card" style={{marginBottom:"var(--space-6)"}}>
        <div className="card-header">
          <div className="card-title">Report Filters</div>
          <Filter size={18} style={{color:"var(--text-muted)"}} />
        </div>
        <div className="card-body">
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"var(--space-4)",flexWrap:"wrap"}} className="no-print">
            <div className="form-group">
              <label className="form-label" htmlFor="rpt-type">Report Type</label>
              <select id="rpt-type" className="form-select" value={reportType}
                onChange={(e) => { setReportType(e.target.value); setGenerated(false); }}>
                <option value="occupancy">Stall Occupancy</option>
                <option value="complaints">Complaints Summary</option>
                <option value="prices">Price Analytics</option>
                <option value="vendors">Vendor Compliance</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="rpt-start">Start Date</label>
              <input id="rpt-start" type="date" className="form-input"
                value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="rpt-end">End Date</label>
              <input id="rpt-end" type="date" className="form-input"
                value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="rpt-section">Section</label>
              <select id="rpt-section" className="form-select" value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}>
                <option value="All">All Sections</option>
                {sections.map((s) => <option key={s.id} value={s.name}>Section {s.code} — {s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="rpt-period">Summary Period</label>
              <select id="rpt-period" className="form-select" value={summaryPeriod}
                onChange={(e) => { setSummaryPeriod(e.target.value); setGenerated(false); }}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:"var(--space-4)", gap:"var(--space-2)"}} className="no-print">
            <button className="btn btn-outline" onClick={generateAndSaveReport} disabled={loading || saving}>
              <FileText size={15} /> {saving ? "Saving..." : "Generate & Save Report"}
            </button>
            <button className="btn btn-accent" onClick={generateReport} disabled={loading || saving}>
              <BarChart2 size={15} /> {loading ? "Generating..." : "Preview Report"}
            </button>
          </div>
        </div>
      </div>

      {generated && reportData && (
        <>
          {/* Report Summary Banner */}
          <div style={{
            background:"linear-gradient(135deg,var(--color-accent),var(--color-accent-light))",
            borderRadius:"var(--radius-lg)",padding:"var(--space-6)",
            color:"white",marginBottom:"var(--space-6)",
            display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"var(--space-4)"
          }} role="region" aria-label="Report summary">
            <div>
              <div style={{fontSize:"var(--text-sm)",opacity:0.75,marginBottom:"var(--space-1)"}}>
                Report Generated · {new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
              </div>
              <div style={{fontSize:"var(--text-2xl)",fontWeight:800}}>
                {reportType === "occupancy" && "Stall Occupancy Report"}
                {reportType === "complaints" && "Complaints Summary Report"}
                {reportType === "prices" && "Price Analytics Report"}
                {reportType === "vendors" && "Vendor Compliance Report"}
              </div>
              <div style={{opacity:0.75,fontSize:"var(--text-sm)",marginTop:"var(--space-1)"}}>
                Period: {startDate} — {endDate} · Section: {sectionFilter} · Summary: <span style={{textTransform:"capitalize"}}>{summaryPeriod}</span>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"var(--space-2)",background:"rgba(255,203,5,0.15)",padding:"var(--space-3) var(--space-5)",borderRadius:"var(--radius-md)"}}>
              <CheckCircle size={20} style={{color:"var(--color-primary)"}} />
              <span style={{fontWeight:700,color:"var(--color-primary)"}}>Report Ready</span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid-2" style={{marginBottom:"var(--space-6)"}}>
            {/* Pie chart — Occupancy */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Stall Status Distribution</div>
                <div style={{fontSize:"var(--text-sm)",color:"var(--text-muted)"}}>
                  {reportData.occupancy.total} total stalls · {reportData.occupancy.rate}% occupied
                </div>
              </div>
              <div className="card-body" style={{paddingTop:0}}>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={occupancyPie}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={55}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={true}
                      >
                        {occupancyPie.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius:"8px",fontSize:"12px"}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {pieInsight && (
                  <div style={{ marginTop: "16px", padding: "12px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <Sparkles size={16} color="#7C3AED" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      <strong>Insight:</strong> {pieInsight}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Stacked bar — per section */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Occupancy by Section</div>
              </div>
              <div className="card-body" style={{paddingTop:0}}>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectionBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="section" tick={{fontSize:10}} stroke="#D1D5DB" />
                      <YAxis tick={{fontSize:11}} stroke="#D1D5DB" />
                      <Tooltip contentStyle={{borderRadius:"8px",fontSize:"12px"}} />
                      <Legend wrapperStyle={{fontSize:"12px"}} />
                      <Bar dataKey="occupied" name="Occupied" fill="#11296B" stackId="a" radius={[0,0,0,0]} />
                      <Bar dataKey="vacant"   name="Vacant"   fill="#FFCB05" stackId="a" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {barInsight && (
                  <div style={{ marginTop: "16px", padding: "12px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <Sparkles size={16} color="#7C3AED" style={{ flexShrink: 0, marginTop: "2px" }} />
                    <span style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      <strong>Insight:</strong> {barInsight}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Complaint trend */}
          <div className="card" style={{marginBottom:"var(--space-6)"}}>
            <div className="card-header">
              <div className="card-title">Complaint Trend (6 Months)</div>
              <div style={{fontSize:"var(--text-sm)",color:"var(--text-muted)"}}>
                Total: {reportData.complaint_summary.total} · Open: {reportData.complaint_summary.open} · Resolved: {reportData.complaint_summary.resolved}
              </div>
            </div>
            <div className="card-body" style={{paddingTop:0}}>
              <div style={{height:200}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={complaintTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" tick={{fontSize:11}} stroke="#D1D5DB" />
                    <YAxis tick={{fontSize:11}} stroke="#D1D5DB" />
                    <Tooltip contentStyle={{borderRadius:"8px",fontSize:"12px"}} />
                    <Line type="monotone" dataKey="total" name="Total Complaints" stroke="#DC2626" strokeWidth={2} dot={{r:4}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {trendInsight && (
                <div style={{ marginTop: "16px", padding: "12px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <Sparkles size={16} color="#7C3AED" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    <strong>Insight:</strong> {trendInsight}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Summary Table */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Summary Table</div>
              <button className="btn btn-ghost btn-sm">
                <Download size={13} /> Download
              </button>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table" aria-label="Occupancy summary by section">
                <thead>
                  <tr>
                    <th scope="col">Section</th>
                    <th scope="col">Total Stalls</th>
                    <th scope="col">Occupied</th>
                    <th scope="col">Vacant</th>
                    <th scope="col">Occupancy Rate</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.section_report.map((s) => {
                    const rate = s.occupancy_rate;
                    return (
                      <tr key={s.code}>
                        <td style={{fontWeight:600}}>Section {s.code} — {s.name}</td>
                        <td>{s.total}</td>
                        <td style={{color:"var(--color-accent)",fontWeight:600}}>{s.occupied}</td>
                        <td style={{color:"var(--color-warning)"}}>{s.vacant}</td>
                        <td>
                          <div style={{display:"flex",alignItems:"center",gap:"var(--space-3)"}}>
                            <div style={{flex:1,height:6,background:"#E5E7EB",borderRadius:3,overflow:"hidden"}}>
                              <div style={{
                                height:"100%",width:`${rate}%`,
                                background: rate >= 90 ? "var(--color-success)" : rate >= 70 ? "var(--color-warning)" : "var(--color-error)",
                                borderRadius:3
                              }} role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} />
                            </div>
                            <span style={{fontSize:"var(--text-xs)",fontWeight:700,minWidth:"32px"}}>{rate}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-dot ${rate >= 90 ? "badge-success" : rate >= 70 ? "badge-warning" : "badge-error"}`}>
                            {rate >= 90 ? "Excellent" : rate >= 70 ? "Good" : "Low"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendor Compliance Summary */}
          <div className="card" style={{marginTop:"var(--space-6)"}}>
            <div className="card-header">
              <div className="card-title">Vendor Compliance</div>
            </div>
            <div className="card-body">
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:"var(--space-4)"}}>
                <div style={{background:"#F9FAFB",borderRadius:"var(--radius-md)",padding:"var(--space-4)",textAlign:"center"}}>
                  <div style={{fontSize:"var(--text-2xl)",fontWeight:800,color:"var(--color-accent)"}}>{reportData.vendor_compliance.avg_rate}%</div>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-secondary)"}}>Average Compliance Rate</div>
                </div>
                <div style={{background:"#FEE2E2",borderRadius:"var(--radius-md)",padding:"var(--space-4)",textAlign:"center"}}>
                  <div style={{fontSize:"var(--text-2xl)",fontWeight:800,color:"#DC2626"}}>{reportData.vendor_compliance.below_70}</div>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-secondary)"}}>Vendors Below 70%</div>
                </div>
              </div>
              {complianceInsight && (
                <div style={{ marginTop: "16px", padding: "12px", background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "8px", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <Sparkles size={16} color="#7C3AED" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    <strong>Insight:</strong> {complianceInsight}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!generated && !loading && (
        <div style={{textAlign:"center",padding:"var(--space-12)",color:"var(--text-muted)"}}>
          <BarChart2 size={48} style={{margin:"0 auto var(--space-4)",opacity:0.3}} />
          <div style={{fontWeight:600,fontSize:"var(--text-lg)"}}>No Report Generated</div>
          <div style={{fontSize:"var(--text-sm)"}}>Select filters and click Generate Report to view analytics</div>
        </div>
      )}
    </AppShell>
  );
}
