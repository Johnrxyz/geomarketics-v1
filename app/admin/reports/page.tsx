"use client";

import AppShell from "@/components/layout/AppShell";
import { useState } from "react";
import { Download, FileText, BarChart2, Filter, Printer, CheckCircle } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const occupancyData = [
  { name: "Occupied", value: 211, color: "#11296B" },
  { name: "Vacant",   value: 27,  color: "#FFCB05" },
  { name: "Reserved", value: 7,   color: "#F59E0B" },
  { name: "Flagged",  value: 3,   color: "#DC2626" },
];

const sectionData = [
  { section: "Section A", occupied: 54, vacant: 6 },
  { section: "Section B", occupied: 40, vacant: 8 },
  { section: "Section C", occupied: 45, vacant: 7 },
  { section: "Section D", occupied: 38, vacant: 2 },
  { section: "Section E", occupied: 22, vacant: 6 },
  { section: "Dry Goods", occupied: 12, vacant: 8 },
];

const complaintTrend = [
  { month: "Oct", total: 18 },
  { month: "Nov", total: 22 },
  { month: "Dec", total: 15 },
  { month: "Jan", total: 28 },
  { month: "Feb", total: 20 },
  { month: "Mar", total: 23 },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("occupancy");
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate]     = useState("2026-03-24");
  const [section, setSection]     = useState("All");
  const [summaryPeriod, setSummaryPeriod] = useState("monthly");
  const [generated, setGenerated] = useState(true);

  return (
    <AppShell pageTitle="Reports & Analytics" role="admin" userName="Admin User" userRole="Administrator">
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
              <select id="rpt-section" className="form-select" value={section}
                onChange={(e) => setSection(e.target.value)}>
                <option value="All">All Sections</option>
                <option>Section A</option>
                <option>Section B</option>
                <option>Section C</option>
                <option>Dry Goods</option>
                <option>Cooked Food</option>
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
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:"var(--space-4)"}} className="no-print">
            <button className="btn btn-accent" onClick={() => setGenerated(true)}>
              <BarChart2 size={15} /> Generate Report
            </button>
          </div>
        </div>
      </div>

      {generated && (
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
                Period: {startDate} — {endDate} · Section: {section} · Summary: <span style={{textTransform:"capitalize"}}>{summaryPeriod}</span>
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
              </div>
              <div className="card-body" style={{paddingTop:0}}>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={occupancyData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={55}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={true}
                      >
                        {occupancyData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{borderRadius:"8px",fontSize:"12px"}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
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
                    <BarChart data={sectionData}>
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
              </div>
            </div>
          </div>

          {/* Complaint trend */}
          <div className="card" style={{marginBottom:"var(--space-6)"}}>
            <div className="card-header">
              <div className="card-title">Complaint Trend (6 Months)</div>
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
                  {sectionData.map((s) => {
                    const total = s.occupied + s.vacant;
                    const rate  = Math.round((s.occupied / total) * 100);
                    return (
                      <tr key={s.section}>
                        <td style={{fontWeight:600}}>{s.section}</td>
                        <td>{total}</td>
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
        </>
      )}
      <style>{`
        @media print {
          .no-print, .page-header-actions, .app-sidebar, header { display: none !important; }
          .page-header { margin-bottom: 0 !important; }
          .card { box-shadow: none !important; border: 1px solid #ddd !important; break-inside: avoid; margin-bottom: 1rem !important; }
          body, .app-shell, .app-main { background: white !important; margin: 0 !important; padding: 0 !important; }
          .grid-2 { display: block !important; }
        }
      `}</style>
    </AppShell>
  );
}
