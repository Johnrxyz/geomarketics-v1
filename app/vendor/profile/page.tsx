"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { CheckCircle, User, Phone, Mail, Store, Edit3, Save } from "lucide-react";
import { vendorsApi, getUser } from "@/lib/api";

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

export default function VendorProfilePage() {
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const user = getUser();

    vendorsApi.list()
      .then((data: any) => {
        const results = data?.results ?? data ?? [];
        // Try to match by user id or username/email
        let match: any = null;
        if (user) {
          match = results.find((v: any) =>
            (user.id && v.user === user.id) ||
            (user.vendor_id && v.id === user.vendor_id) ||
            (user.email && v.email?.toLowerCase() === user.email.toLowerCase()) ||
            (user.username && v.username?.toLowerCase() === user.username.toLowerCase())
          );
        }
        // Fall back to first result if no match
        if (!match && results.length > 0) match = results[0];

        if (match) {
          setProfile({
            id: match.id ?? null,
            name: match.full_name ?? match.name ?? user?.full_name ?? user?.name ?? "",
            contact: match.contact_number ?? match.contact ?? user?.contact ?? "",
            email: match.email ?? user?.email ?? "",
            stall: match.stall_number ?? "—",
            section: match.section_name ?? "—",
            category: match.category ?? "—",
            since: match.since
              ? new Date(match.since).toLocaleDateString("en-US", { month: "long", year: "numeric" })
              : match.created_at
              ? new Date(match.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
              : "—",
          });
        } else if (user) {
          setProfile((p) => ({
            ...p,
            name: user.full_name ?? user.name ?? user.username ?? "",
            email: user.email ?? "",
            contact: user.contact ?? "",
          }));
        }
      })
      .catch((err: any) => {
        setError(err?.detail ?? err?.message ?? "Failed to load profile.");
        // Still populate name/email from localStorage user
        if (user) {
          setProfile((p) => ({
            ...p,
            name: user.full_name ?? user.name ?? user.username ?? "",
            email: user.email ?? "",
          }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!profile.id) {
      // No vendor id — just show saved locally
      setSaved(true);
      setEditMode(false);
      setTimeout(() => setSaved(false), 3000);
      return;
    }
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
    <AppShell pageTitle="Vendor Profile" role="vendor" userName={profile.name || "Vendor"} userRole="Vendor">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">My Profile</h2>
          <p className="page-subtitle">View and manage your stall information</p>
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
              <Edit3 size={15} /> Edit Profile
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
            <div className="card-title">Stall Information</div>
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
          </div>
        </div>

      </div>
    </AppShell>
  );
}
