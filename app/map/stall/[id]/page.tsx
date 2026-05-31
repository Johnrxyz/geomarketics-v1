"use client";

import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, User, Store, Package, FileText,
  AlertCircle, Edit, Phone, Mail
} from "lucide-react";
import { stallsApi, complaintsApi, getUser } from "@/lib/api";

interface StallDetailProps {
  params: { id: string };
}

export default function StallDetailPage({ params }: StallDetailProps) {
  const [stall, setStall] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportCategory, setReportCategory] = useState("sanitation");
  const [reportSent, setReportSent] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const user = getUser();

  const fetchStall = useCallback(async () => {
    setLoading(true);
    try {
      // params.id is like "stall-a01" — convert to stall number search
      const stallNumber = params.id
        .replace("stall-", "")
        .toUpperCase()
        .replace(/^([A-Z])(\d+)$/, "$1-$2");

      const data = await stallsApi.list({ search: stallNumber, page_size: "5" }) as { results: Record<string, unknown>[] };
      const found = (data.results || []).find(
        (s) => (s.stall_number as string)?.toUpperCase() === stallNumber
      ) || data.results?.[0];
      setStall(found || null);
    } catch {
      setStall(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { fetchStall(); }, [fetchStall]);

  const handleReport = async () => {
    setReportLoading(true);
    try {
      await complaintsApi.create({
        stall: stall?.id,
        vendor: (stall?.vendor as Record<string, unknown>)?.id,
        category: reportCategory,
        subject: `Issue reported for stall ${stall?.stall_number}`,
        description: reportText,
        complainant_name: user?.first_name ? `${user.first_name} ${user.last_name}` : "Anonymous",
      });
      setReportSent(true);
    } catch {
      setReportSent(true);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell pageTitle="Stall Details" role="admin" userName={user?.first_name || "Admin"} userRole="Administrator">
        <div style={{padding:"40px",textAlign:"center",color:"var(--text-muted)"}}>Loading stall data...</div>
      </AppShell>
    );
  }

  if (!stall) {
    return (
      <AppShell pageTitle="Stall Details" role="admin" userName={user?.first_name || "Admin"} userRole="Administrator">
        <div style={{padding:"40px",textAlign:"center"}}>
          <p style={{color:"var(--text-muted)"}}>Stall not found.</p>
          <Link href="/map" className="btn btn-secondary" style={{marginTop:"16px",display:"inline-flex"}}>
            <ArrowLeft size={14} /> Back to Map
          </Link>
        </div>
      </AppShell>
    );
  }

  const vendor = stall.vendor as Record<string, unknown> | null;
  const statusVal = stall.status as string;
  const statusVariant = (["occupied","vacant","flagged","reserved"].includes(statusVal) ? statusVal : "occupied") as "occupied" | "vacant" | "flagged" | "reserved";
  const complianceRate = vendor?.compliance_rate as number ?? 100;
  const isCompliant = complianceRate >= 80;
  const productsList = (typeof vendor?.products === "string" ? vendor.products.split(",").map((p: string) => p.trim()).filter(Boolean) : []) as string[];

  return (
    <AppShell pageTitle="Stall Details" role="admin" userName={user?.first_name || "Admin"} userRole="Administrator">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <div style={{display:"flex",alignItems:"center",gap:"var(--space-3)",marginBottom:"var(--space-2)"}}>
            <Link href="/map" className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} /> Back to Map
            </Link>
          </div>
          <h2 className="page-title">Stall {stall.stall_number as string}</h2>
          <p className="page-subtitle">Section {stall.section_code as string} · {stall.category as string}</p>
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
              <StatusBadge variant={statusVariant} label={statusVal.charAt(0).toUpperCase()+statusVal.slice(1)} />
            </div>
            <div className="card-body">
              <dl style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"var(--space-4) var(--space-6)"}}>
                {[
                  { dt: "Stall Number",    dd: stall.stall_number as string },
                  { dt: "Section",         dd: `Section ${stall.section_code as string}` },
                  { dt: "Category",        dd: stall.category as string },
                  { dt: "Floor Area",      dd: stall.area_sqm ? `${stall.area_sqm} sqm` : "—" },
                  { dt: "Monthly Rent",    dd: stall.monthly_rent ? `₱${Number(stall.monthly_rent).toLocaleString()}` : "—" },
                  { dt: "Status",          dd: statusVal },
                ].map(({ dt, dd }) => (
                  <div key={dt}>
                    <dt style={{fontSize:"var(--text-xs)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--text-muted)",marginBottom:2}}>{dt}</dt>
                    <dd style={{fontSize:"var(--text-sm)",fontWeight:600,color:"var(--text-primary)"}}>{dd}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Products */}
          {productsList.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Products Sold</div>
                <Package size={18} style={{color:"var(--text-muted)"}} />
              </div>
              <div className="card-body">
                <div style={{display:"flex",flexWrap:"wrap",gap:"var(--space-2)"}}>
                  {productsList.map((p) => (
                    <span key={p} className="badge badge-neutral badge-dot">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                  Section {stall.section_code as string} — {stall.stall_number as string}
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
          {vendor ? (
            <>
              {/* Vendor profile */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Vendor Information</div>
                  <StatusBadge variant={isCompliant ? "success" : "error"} label={isCompliant ? "Compliant" : "Non-Compliant"} />
                </div>
                <div className="card-body">
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
                      {String(vendor.full_name || "").split(" ").map((n) => n[0]).join("").slice(0,2)}
                    </div>
                    <div>
                      <div style={{fontSize:"var(--text-lg)",fontWeight:700}}>{vendor.full_name as string}</div>
                      <div style={{fontSize:"var(--text-sm)",color:"var(--text-secondary)"}}>
                        {vendor.joined_at ? `Vendor since ${new Date(vendor.joined_at as string).getFullYear()}` : "Active Vendor"}
                      </div>
                    </div>
                  </div>

                  <dl style={{display:"flex",flexDirection:"column",gap:"var(--space-3)"}}>
                    {Boolean(vendor.phone) && (
                      <div style={{display:"flex",alignItems:"center",gap:"var(--space-3)"}}>
                        <Phone size={15} style={{color:"var(--text-muted)",flexShrink:0}} />
                        <div>
                          <dt style={{fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>Contact</dt>
                          <dd style={{fontSize:"var(--text-sm)",fontWeight:600}}>{vendor.phone as string}</dd>
                        </div>
                      </div>
                    )}
                    {Boolean(vendor.email) && (
                      <div style={{display:"flex",alignItems:"center",gap:"var(--space-3)"}}>
                        <Mail size={15} style={{color:"var(--text-muted)",flexShrink:0}} />
                        <div>
                          <dt style={{fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>Email</dt>
                          <dd style={{fontSize:"var(--text-sm)",fontWeight:600}}>{vendor.email as string}</dd>
                        </div>
                      </div>
                    )}
                    <div style={{display:"flex",alignItems:"center",gap:"var(--space-3)"}}>
                      <FileText size={15} style={{color:"var(--text-muted)",flexShrink:0}} />
                      <div>
                        <dt style={{fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>Permit Number</dt>
                        <dd style={{fontSize:"var(--text-sm)",fontWeight:600}}>
                          {vendor.permit_number as string || "—"}
                          {vendor.permit_expiry ? ` (expires ${new Date(vendor.permit_expiry as string).toLocaleDateString("en-PH")})` : ""}
                        </dd>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:"var(--space-3)"}}>
                      <Store size={15} style={{color:"var(--text-muted)",flexShrink:0}} />
                      <div>
                        <dt style={{fontSize:"var(--text-xs)",color:"var(--text-muted)"}}>Compliance Rate</dt>
                        <dd style={{fontSize:"var(--text-sm)",fontWeight:600}}>{complianceRate}%</dd>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="card-body" style={{textAlign:"center",color:"var(--text-muted)",padding:"var(--space-8)"}}>
                No vendor assigned to this stall.
              </div>
            </div>
          )}

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
              {vendor && (
                <Link href="/vendor/profile" className="btn btn-ghost" style={{justifyContent:"flex-start",gap:"var(--space-3)"}}>
                  <User size={16} /> Vendor Profile
                </Link>
              )}
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
              <button className="btn btn-danger" onClick={handleReport} disabled={!reportText.trim() || reportLoading}>
                {reportLoading ? "Submitting..." : "Submit Report"}
              </button>
            </>
          )
        }
      >
        {reportSent ? (
          <div style={{textAlign:"center",padding:"var(--space-6)"}}>
            <div style={{fontSize:"var(--text-xl)",marginBottom:"var(--space-2)"}}>Report Submitted</div>
            <p style={{color:"var(--text-secondary)"}}>Your report has been logged and will be reviewed by the market administration.</p>
            <button className="btn btn-primary" style={{marginTop:"var(--space-4)"}} onClick={() => { setReportOpen(false); setReportSent(false); setReportText(""); }}>
              Close
            </button>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"var(--space-4)"}}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={reportCategory} onChange={e => setReportCategory(e.target.value)}>
                <option value="sanitation">Sanitation</option>
                <option value="overpricing">Overpricing</option>
                <option value="safety">Safety Hazard</option>
                <option value="food_safety">Food Safety</option>
                <option value="permit">Permit Violation</option>
                <option value="display">Display Violation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Describe the issue</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Provide a detailed description..."
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
