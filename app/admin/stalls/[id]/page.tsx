"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { CheckCircle, Store, MapPin, User, FileText, Activity, ArrowLeft, Edit3, Save, Layers } from "lucide-react";
import { stallsApi } from "@/lib/api";

interface StallProfile {
  id: string | number | null;
  stall_number: string;
  section_name: string;
  section_code: string;
  category: string;
  status: string;
  area_sqm: number | string;
  monthly_rent: number | string;
  building: string;
  floor: string;
  vendor: {
    id: number;
    full_name: string;
    phone: string;
    email: string;
  } | null;
}

const DEFAULT_PROFILE: StallProfile = {
  id: null,
  stall_number: "—",
  section_name: "—",
  section_code: "—",
  category: "—",
  status: "vacant",
  area_sqm: "",
  monthly_rent: "",
  building: "main",
  floor: "1",
  vendor: null,
};

function getInitials(name: string): string {
  if (!name || name === "—") return "?";
  return name.split(" ").map((p) => p[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export default function AdminStallProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = use(params);
  
  const [editMode, setEditMode] = useState(searchParams.get("edit") === "true");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stall, setStall] = useState<StallProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    setError(null);

    stallsApi.get(id)
      .then((data: any) => {
        setStall({
          id: data.id ?? null,
          stall_number: data.stall_number ?? "—",
          section_name: data.section_name ?? "—",
          section_code: data.section_code ?? "—",
          category: data.category ?? "—",
          status: data.status ?? "vacant",
          area_sqm: data.area_sqm ?? "",
          monthly_rent: data.monthly_rent ?? "",
          building: data.building ?? "main",
          floor: data.floor ?? "1",
          vendor: data.vendor ? {
            id: data.vendor.id,
            full_name: data.vendor.full_name || "—",
            phone: data.vendor.phone || "—",
            email: data.vendor.email || "—",
          } : null,
        });
      })
      .catch((err: any) => {
        setError(err?.detail ?? err?.message ?? "Failed to load stall profile.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!stall.id) return;
    setSaving(true);
    try {
      await stallsApi.update(stall.id, {
        category: stall.category,
        area_sqm: stall.area_sqm ? Number(stall.area_sqm) : null,
        monthly_rent: stall.monthly_rent ? Number(stall.monthly_rent) : null,
      });
      setSaved(true);
      setEditMode(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err?.detail ?? err?.message ?? "Failed to save stall details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell pageTitle="Stall Profile" role="admin" userName="Admin User" userRole="Administrator" hideBreadcrumbs={true}>
      <div className="page-header">
        <div className="page-header-left">
          <button 
            className="btn btn-ghost" 
            onClick={() => router.back()} 
            style={{ padding: "6px 12px", marginBottom: "var(--space-2)", border: "1px solid var(--border-color)" }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="page-title">Stall {stall.stall_number}</h2>
          <p className="page-subtitle">Manage physical stall specifications and occupancy</p>
        </div>
        <div className="page-header-actions">
          {saved && (
            <div className="alert-item alert-success" style={{ paddingTop: "var(--space-2)", paddingBottom: "var(--space-2)" }}>
              <CheckCircle size={15} style={{ color: "var(--color-success)" }} />
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Stall saved!</span>
            </div>
          )}
          {editMode ? (
            <>
              <button className="btn btn-ghost" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={15} /> {saving ? "Saving…" : "Save Changes"}
              </button>
            </>
          ) : (
            <button className="btn btn-accent" onClick={() => setEditMode(true)} disabled={loading}>
              <Edit3 size={15} /> Edit Specifications
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "var(--space-4)", padding: "var(--space-3) var(--space-4)", background: "#FEE2E2", borderRadius: "var(--radius-md)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "flex-start" }}>
        
        {/* Left Column: Specs & Details */}
        <div style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          
          {/* Overview Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Stall Overview</div>
              <Store size={18} style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>Status</div>
                  <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: "var(--radius-full)", fontSize: "12px", fontWeight: 700, background: stall.vendor ? "#DCFCE7" : "#F1F5F9", color: stall.vendor ? "#166534" : "#475569" }}>
                    {stall.vendor ? "Occupied" : "Vacant"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 4 }}>Location</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={14} style={{ color: "var(--color-primary)" }}/> 
                    {stall.building === 'main' ? 'Main Building' : 'Annex'}, Floor {stall.floor}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Specifications Form */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Physical & Financial Details</div>
              <Layers size={18} style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="s-category">Designated Category</label>
                  <div className="form-input-wrapper">
                    <Store size={15} className="form-input-icon" />
                    <input id="s-category" className="form-input has-icon-left"
                      value={stall.category}
                      readOnly={!editMode}
                      onChange={(e) => setStall((p) => ({ ...p, category: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Section Name</label>
                  <div className="form-input-wrapper">
                    <MapPin size={15} className="form-input-icon" />
                    <input className="form-input has-icon-left" value={stall.section_name} readOnly disabled style={{ background: "#F8FAFC" }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="s-area">Area (sqm)</label>
                  <div className="form-input-wrapper">
                    <Activity size={15} className="form-input-icon" />
                    <input id="s-area" type="number" className="form-input has-icon-left"
                      value={stall.area_sqm}
                      readOnly={!editMode}
                      onChange={(e) => setStall((p) => ({ ...p, area_sqm: e.target.value }))}
                      placeholder="e.g. 15.5"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="s-rent">Monthly Rent (₱)</label>
                  <div className="form-input-wrapper">
                    <FileText size={15} className="form-input-icon" />
                    <input id="s-rent" type="number" className="form-input has-icon-left"
                      value={stall.monthly_rent}
                      readOnly={!editMode}
                      onChange={(e) => setStall((p) => ({ ...p, monthly_rent: e.target.value }))}
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Occupant */}
        <div style={{ flex: "1 1 340px", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Current Occupant</div>
              <User size={18} style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="card-body">
              {stall.vendor ? (
                <>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "var(--space-3)",
                    padding: "var(--space-3)", background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)",
                    borderRadius: "var(--radius-md)", marginBottom: "var(--space-4)"
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: "var(--color-accent)", color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "16px", fontWeight: 800, flexShrink: 0
                    }} aria-hidden="true">{getInitials(stall.vendor.full_name)}</div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 700 }}>{stall.vendor.full_name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: 2 }}>{stall.vendor.phone || stall.vendor.email || "No contact info"}</div>
                    </div>
                  </div>
                  <Link href={`/admin/vendors/${stall.vendor.id}`} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                    View Vendor Profile
                  </Link>
                </>
              ) : (
                <div style={{ padding: "var(--space-6) 0", textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-3)" }}>
                    <User size={24} style={{ color: "#94A3B8" }} />
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}>Stall is currently vacant</div>
                  <button className="btn btn-ghost" style={{ marginTop: "var(--space-3)", border: "1px solid var(--border-color)", width: "100%", justifyContent: "center" }}>
                    Assign Vendor
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
