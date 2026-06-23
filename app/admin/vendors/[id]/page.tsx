"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { CheckCircle, User, Phone, Mail, Store, Edit3, Save, ArrowLeft } from "lucide-react";
import { vendorsApi, stallsApi } from "@/lib/api";

interface Profile {
  id: string | number | null;
  name: string;
  contact: string;
  email: string;
  stall: string;
  section: string;
  category: string;
  since: string;
}

const DEFAULT_PROFILE: Profile = {
  id: null,
  name: "",
  contact: "",
  email: "",
  stall: "—",
  section: "—",
  category: "—",
  since: "—",
};

function getInitials(name: string): string {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export default function AdminVendorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = use(params);
  
  const [editMode, setEditMode] = useState(searchParams.get("edit") === "true");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [newStallNumber, setNewStallNumber] = useState("");
  const [savingReassign, setSavingReassign] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    setError(null);

    vendorsApi.get(id)
      .then((data: any) => {
        setProfile({
          id: data.id ?? null,
          name: data.full_name ?? data.name ?? "",
          contact: data.contact_number ?? data.contact ?? "",
          email: data.email ?? "",
          stall: data.stall_number ?? data.stall?.stall_number ?? "—",
          section: data.section_name ?? data.stall?.section_name ?? "—",
          category: data.category ?? data.stall?.category ?? "—",
          since: data.since
            ? new Date(data.since).toLocaleDateString("en-US", { month: "long", year: "numeric" })
            : data.created_at
            ? new Date(data.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
            : "—",
        });
      })
      .catch((err: any) => {
        setError(err?.detail ?? err?.message ?? "Failed to load profile.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveReassign = async () => {
    if (!profile.id || !newStallNumber.trim()) return;
    setSavingReassign(true);
    try {
      // 1. Find the stall ID by its string number
      const stallData: any = await stallsApi.list({ search: newStallNumber.trim() });
      const results = stallData?.results ?? stallData ?? [];
      const exactMatch = results.find((s: any) => s.stall_number.toLowerCase() === newStallNumber.trim().toLowerCase());
      
      if (!exactMatch) {
        throw new Error(`Stall '${newStallNumber}' could not be found in the database.`);
      }

      // 2. Update the vendor with the actual integer stall ID
      await vendorsApi.update(profile.id, {
        stall: exactMatch.id
      });
      
      setProfile(p => ({ ...p, stall: exactMatch.stall_number }));
      setReassignModalOpen(false);
      setNewStallNumber("");
      
      // Show success
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err?.detail ?? err?.message ?? "Failed to reassign stall. Ensure the stall number is correct and vacant.");
    } finally {
      setSavingReassign(false);
    }
  };

  const handleSave = async () => {
    if (!profile.id) return;
    setSaving(true);
    try {
      await vendorsApi.update(profile.id, {
        full_name: profile.name,
        contact_number: profile.contact,
        email: profile.email,
      });
      setSaved(true);
      setEditMode(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err?.detail ?? err?.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell pageTitle="Vendor Profile" role="admin" userName="Admin User" userRole="Administrator">
      <div className="page-header">
        <div className="page-header-left">
          <button 
            className="btn btn-ghost" 
            onClick={() => router.back()} 
            style={{ padding: "6px 12px", marginBottom: "var(--space-2)", border: "1px solid var(--border-color)" }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="page-title">Vendor Profile</h2>
          <p className="page-subtitle">View and manage vendor details and stall assignment</p>
        </div>
        <div className="page-header-actions">
          {saved && (
            <div className="alert-item alert-success" style={{ paddingTop: "var(--space-2)", paddingBottom: "var(--space-2)" }}>
              <CheckCircle size={15} style={{ color: "var(--color-success)" }} />
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Profile saved!</span>
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
              <Edit3 size={15} /> Edit Details
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: "var(--space-4)", padding: "var(--space-3) var(--space-4)", background: "#FEE2E2", borderRadius: "var(--radius-md)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", maxWidth: 640 }}>

        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Personal Information</div>
            <User size={18} style={{ color: "var(--text-muted)" }} />
          </div>
          <div className="card-body">
            {/* Avatar */}
            <div style={{
              display: "flex", alignItems: "center", gap: "var(--space-4)",
              padding: "var(--space-4)", background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)",
              borderRadius: "var(--radius-md)", marginBottom: "var(--space-5)"
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "var(--color-accent)", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "var(--text-2xl)", fontWeight: 800, flexShrink: 0
              }} aria-hidden="true">{loading ? "…" : getInitials(profile.name)}</div>
              <div>
                <div style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>{loading ? "Loading..." : profile.name || "—"}</div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Vendor since {profile.since}</div>
                <span className="badge badge-success badge-dot" style={{ marginTop: "var(--space-1)" }}>Active Vendor</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="v-name">Full Name</label>
                <div className="form-input-wrapper">
                  <User size={15} className="form-input-icon" />
                  <input id="v-name" className="form-input has-icon-left"
                    value={profile.name}
                    readOnly={!editMode}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="v-contact">Contact Number</label>
                <div className="form-input-wrapper">
                  <Phone size={15} className="form-input-icon" />
                  <input id="v-contact" className="form-input has-icon-left"
                    value={profile.contact}
                    readOnly={!editMode}
                    onChange={(e) => setProfile((p) => ({ ...p, contact: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="v-email">Email Address</label>
                <div className="form-input-wrapper">
                  <Mail size={15} className="form-input-icon" />
                  <input id="v-email" type="email" className="form-input has-icon-left"
                    value={profile.email}
                    readOnly={!editMode}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stall Info */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Stall Assignment</div>
            <Store size={18} style={{ color: "var(--text-muted)" }} />
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              {[
                { label: "Stall Number", value: profile.stall },
                { label: "Section",      value: profile.section },
                { label: "Category",     value: profile.category },
                { label: "Vendor Since", value: profile.since },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{loading ? "…" : value}</div>
                </div>
              ))}
            </div>
            
            {editMode && (
               <div style={{ marginTop: "var(--space-5)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-color)" }}>
                  <button className="btn" onClick={() => setReassignModalOpen(true)} style={{ background: "#F3F4F6", width: "100%", justifyContent: "center", border: "1px solid #E5E7EB" }}>
                    <Store size={16} /> Reassign Stall
                  </button>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "var(--space-2)", textAlign: "center" }}>
                    Warning: Reassigning will detach the vendor from their current stall.
                  </p>
               </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Reassign Stall Modal ── */}
      {reassignModalOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 440, padding: "var(--space-6)", boxShadow: "0 25px 80px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "var(--space-4)" }}>Reassign Stall</div>
            <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
              Please enter the new stall number you wish to assign to <strong>{profile.name}</strong>.
            </p>
            <div className="form-group" style={{ marginBottom: "var(--space-6)" }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: "13px", marginBottom: 6 }}>New Stall Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. S1-05"
                value={newStallNumber}
                onChange={(e) => setNewStallNumber(e.target.value)}
                style={{ width: "100%", height: 42, borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", padding: "0 12px", fontSize: "14px" }}
              />
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Note: The stall must be vacant or you will receive an error.</p>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setReassignModalOpen(false)} style={{ border: "1px solid var(--border-color)" }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveReassign} disabled={savingReassign || !newStallNumber.trim()}>
                {savingReassign ? "Reassigning..." : "Confirm Reassignment"}
              </button>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}
