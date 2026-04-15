"use client";

import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, User, Store, Package, FileText,
  AlertCircle, Edit, Phone, Mail
} from "lucide-react";

interface StallDetailProps {
  params: { id: string };
}

const STALL_DATA: Record<string, any> = {
  "stall-a01": {
    number: "A-01", section: "Section A", category: "Vegetables",
    status: "occupied", area: "12 sqm", monthlyRent: "₱3,200",
    vendor: {
      name: "Maria Santos", contact: "+63 917 123 4567",
      email: "maria.santos@email.com", since: "Jan 2020",
      permits: "Valid (expires Dec 2026)", compliance: "Compliant",
    },
    products: ["Ampalaya", "Sayote", "Kangkong", "Sitaw", "Kalabasa"],
    lastInspection: "Mar 15, 2026",
    notes: "Clean stall, all permits updated.",
  },
  "stall-b12": {
    number: "B-12", section: "Section B", category: "Meat",
    status: "flagged", area: "14 sqm", monthlyRent: "₱3,800",
    vendor: {
      name: "Rosa Navarro", contact: "+63 918 765 4321",
      email: "rosa.navarro@email.com", since: "Mar 2019",
      permits: "Valid (expires Jun 2026)", compliance: "Non-Compliant",
    },
    products: ["Pork", "Chicken", "Beef"],
    lastInspection: "Mar 10, 2026",
    notes: "Sanitation complaint filed Mar 23. Pending investigation.",
  },
};

const DEFAULT_STALL = {
  number: "A-01", section: "Section A", category: "Vegetables",
  status: "occupied", area: "12 sqm", monthlyRent: "₱3,200",
  vendor: {
    name: "Maria Santos", contact: "+63 917 123 4567",
    email: "maria.santos@email.com", since: "Jan 2020",
    permits: "Valid (expires Dec 2026)", compliance: "Compliant",
  },
  products: ["Ampalaya", "Sayote", "Kangkong", "Sitaw", "Kalabasa"],
  lastInspection: "Mar 15, 2026",
  notes: "Clean stall, all permits updated.",
};

export default function StallDetailPage({ params }: StallDetailProps) {
  const stall = STALL_DATA[params.id] || DEFAULT_STALL;
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSent, setReportSent] = useState(false);

  const statusVariant = stall.status as "occupied" | "vacant" | "flagged" | "reserved";
  const complianceVariant = stall.vendor.compliance === "Compliant" ? "success" : "error";

  return (
    <AppShell pageTitle="Stall Details" role="admin" userName="Admin User" userRole="Administrator">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <div style={{display:"flex",alignItems:"center",gap:"var(--space-3)",marginBottom:"var(--space-2)"}}>
            <Link href="/map" className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} /> Back to Map
            </Link>
          </div>
          <h2 className="page-title">Stall {stall.number}</h2>
          <p className="page-subtitle">{stall.section} · {stall.category}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={() => setReportOpen(true)}>
            <AlertCircle size={15} /> Report Issue
          </button>
          <button className="btn btn-accent">
            <Edit size={15} /> Edit Stall
          </button>
        </div>
      </div>

      <div className="grid-2" style={{gap:"var(--space-6)"}}>
        {/* Left: Stall Info */}
        <div style={{display:"flex",flexDirection:"column",gap:"var(--space-5)"}}>
          {/* Stall Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Stall Information</div>
              <StatusBadge variant={statusVariant} label={stall.status.charAt(0).toUpperCase()+stall.status.slice(1)} />
            </div>
            <div className="card-body">
              <dl style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"var(--space-4) var(--space-6)"}}>
                {[
                  { dt: "Stall Number",    dd: stall.number },
                  { dt: "Section",         dd: stall.section },
                  { dt: "Category",        dd: stall.category },
                  { dt: "Floor Area",      dd: stall.area },
                  { dt: "Monthly Rent",    dd: stall.monthlyRent },
                  { dt: "Last Inspection", dd: stall.lastInspection },
                ].map(({ dt, dd }) => (
                  <div key={dt}>
                    <dt style={{fontSize:"var(--text-xs)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--text-muted)",marginBottom:2}}>{dt}</dt>
                    <dd style={{fontSize:"var(--text-sm)",fontWeight:600,color:"var(--text-primary)"}}>{dd}</dd>
                  </div>
                ))}
              </dl>
              {stall.notes && (
                <div style={{
                  marginTop:"var(--space-4)",padding:"var(--space-3) var(--space-4)",
                  background:"#F9FAFB",borderRadius:"var(--radius-sm)",
                  borderLeft:"3px solid var(--color-primary)"
                }}>
                  <p style={{fontSize:"var(--text-sm)",color:"var(--text-secondary)"}}>{stall.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Products Sold</div>
              <Package size={18} style={{color:"var(--text-muted)"}} />
            </div>
            <div className="card-body">
              <div style={{display:"flex",flexWrap:"wrap",gap:"var(--space-2)"}}>
                {stall.products.map((p: string) => (
                  <span key={p} className="badge badge-neutral badge-dot">{p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Location card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Location</div>
              <MapPin size={18} style={{color:"var(--color-accent)"}} />
            </div>
            <div className="card-body">
              <div style={{
                background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",
                borderRadius:"var(--radius-md)",
                padding:"var(--space-8)",
                textAlign:"center",
                display:"flex",flexDirection:"column",alignItems:"center",gap:"var(--space-3)"
              }}>
                <MapPin size={32} style={{color:"var(--color-accent)"}} />
                <div style={{fontWeight:700,color:"var(--color-accent)"}}>
                  {stall.section} — {stall.number}
                </div>
                <Link href="/map" className="btn btn-secondary btn-sm">
                  View on Map
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Vendor Info */}
        <div style={{display:"flex",flexDirection:"column",gap:"var(--space-5)"}}>
          {/* Vendor profile */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Vendor Information</div>
              <StatusBadge variant={complianceVariant} label={stall.vendor.compliance} />
            </div>
            <div className="card-body">
              {/* Avatar row */}
              <div style={{
                display:"flex",alignItems:"center",gap:"var(--space-4)",
                padding:"var(--space-4)",background:"#F9FAFB",borderRadius:"var(--radius-md)",
                marginBottom:"var(--space-5)"
              }}>
                <div style={{
                  width:56,height:56,borderRadius:"50%",
                  background:"var(--color-accent)",color:"white",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"var(--text-xl)",fontWeight:800,flexShrink:0
                }} aria-hidden="true">
                  {stall.vendor.name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                </div>
                <div>
                  <div style={{fontSize:"var(--text-lg)",fontWeight:700}}>{stall.vendor.name}</div>
                  <div style={{fontSize:"var(--text-sm)",color:"var(--text-secondary)"}}>Vendor since {stall.vendor.since}</div>
                </div>
              </div>

              <dl style={{display:"flex",flexDirection:"column",gap:"var(--space-3)"}}>
                <div style={{display:"flex",alignItems:"center",gap:"var(--space-3)"}}>
                  <Phone size={15} style={{color:"var(--text-muted)",flexShrink:0}} />
                  <div>
                    <dt style={{fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>Contact</dt>
                    <dd style={{fontSize:"var(--text-sm)",fontWeight:600}}>{stall.vendor.contact}</dd>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"var(--space-3)"}}>
                  <Mail size={15} style={{color:"var(--text-muted)",flexShrink:0}} />
                  <div>
                    <dt style={{fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>Email</dt>
                    <dd style={{fontSize:"var(--text-sm)",fontWeight:600}}>{stall.vendor.email}</dd>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"var(--space-3)"}}>
                  <FileText size={15} style={{color:"var(--text-muted)",flexShrink:0}} />
                  <div>
                    <dt style={{fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>Permits</dt>
                    <dd style={{fontSize:"var(--text-sm)",fontWeight:600}}>{stall.vendor.permits}</dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>

          {/* Vendor Actions */}
          <div className="card">
            <div className="card-header"><div className="card-title">Actions</div></div>
            <div className="card-body" style={{display:"flex",flexDirection:"column",gap:"var(--space-3)"}}>
              <Link href="/admin/documents" className="btn btn-secondary" style={{justifyContent:"flex-start",gap:"var(--space-3)"}}>
                <FileText size={16} /> View Documents
              </Link>
              <Link href="/admin/complaints" className="btn btn-ghost" style={{justifyContent:"flex-start",gap:"var(--space-3)"}}>
                <AlertCircle size={16} /> View Complaints
              </Link>
              <Link href="/vendor/profile" className="btn btn-ghost" style={{justifyContent:"flex-start",gap:"var(--space-3)"}}>
                <User size={16} /> Vendor Profile
              </Link>
            </div>
          </div>

          {/* Compliance History */}
          <div className="card">
            <div className="card-header"><div className="card-title">Compliance History</div></div>
            <div className="card-body">
              {[
                { date: "Mar 2026", status: "Passed", note: "Sanitation inspection" },
                { date: "Feb 2026", status: "Passed", note: "Permit renewal" },
                { date: "Jan 2026", status: "Warning", note: "Exceeds display area" },
                { date: "Dec 2025", status: "Passed", note: "Annual audit" },
              ].map((h, i) => (
                <div key={i} style={{
                  display:"flex",alignItems:"center",gap:"var(--space-3)",
                  padding:"var(--space-3) 0",
                  borderBottom: i < 3 ? "1px solid #F3F4F6" : "none"
                }}>
                  <div style={{
                    width:8,height:8,borderRadius:"50%",flexShrink:0,
                    background: h.status === "Passed" ? "var(--color-success)" : "var(--color-warning)"
                  }} aria-hidden="true" />
                  <div style={{flex:1}}>
                    <div style={{fontSize:"var(--text-sm)",fontWeight:500}}>{h.note}</div>
                    <div style={{fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>{h.date}</div>
                  </div>
                  <span className={`badge ${h.status === "Passed" ? "badge-success" : "badge-warning"}`}>{h.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Report Issue Modal */}
      <Modal
        isOpen={reportOpen}
        onClose={() => { setReportOpen(false); setReportSent(false); setReportText(""); }}
        title="Report an Issue"
        footer={
          reportSent ? undefined : (
            <>
              <button className="btn btn-ghost" onClick={() => setReportOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => setReportSent(true)} disabled={!reportText.trim()}>
                Submit Report
              </button>
            </>
          )
        }
      >
        {reportSent ? (
          <div className="empty-state" style={{padding:"var(--space-8)"}}>
            <div className="empty-state-icon" style={{background:"#DCFCE7",color:"var(--color-success)"}}>
              <AlertCircle size={28} />
            </div>
            <div className="empty-state-title">Report Submitted</div>
            <p className="empty-state-desc">Your complaint has been logged and will be reviewed by the admin team.</p>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"var(--space-4)"}}>
            <div className="form-group">
              <label className="form-label" htmlFor="report-stall">Stall</label>
              <input id="report-stall" className="form-input" value={`${stall.number} — ${stall.vendor.name}`} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="report-issue">Description of Issue</label>
              <textarea
                id="report-issue"
                className="form-textarea"
                placeholder="Describe the issue in detail…"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={4}
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="report-type">Category</label>
              <select id="report-type" className="form-select">
                <option>Sanitation</option>
                <option>Overpricing</option>
                <option>Safety Hazard</option>
                <option>Permit Violation</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
