"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { CheckCircle, User, Phone, Mail, Store, Edit3, Save, MapPin, Tag, Calendar, ShieldCheck } from "lucide-react";
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
        let match: any = null;
        if (user) {
          match = results.find((v: any) =>
            (user.id && v.user === user.id) ||
            (user.vendor_id && v.id === user.vendor_id) ||
            (user.email && v.email?.toLowerCase() === user.email.toLowerCase()) ||
            (user.username && v.username?.toLowerCase() === user.username.toLowerCase())
          );
        }
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
        const user = getUser();
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

  const stallStats = [
    { icon: <Store size={14} />,    label: "Stall",    value: profile.stall },
    { icon: <MapPin size={14} />,   label: "Section",  value: profile.section },
    { icon: <Tag size={14} />,      label: "Category", value: profile.category },
    { icon: <Calendar size={14} />, label: "Since",    value: profile.since },
  ];

  return (
    <AppShell pageTitle="Vendor Profile" role="vendor" userName={profile.name || "Vendor"} userRole="Vendor">
      {/* ── Page header ───────────────────────────────────────────── */}
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
        <div style={{ marginBottom: "var(--space-3)", padding: "var(--space-2) var(--space-4)", background: "#FEE2E2", borderRadius: "var(--radius-md)", color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
          {error}
        </div>
      )}

      {/* ── Responsive Two-column layout ─────────────────────────── */}
      <div className="vendor-profile-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "var(--space-4)", alignItems: "start" }}>

        {/* LEFT — Personal Info card */}
        <div className="card">
          {/* Compact identity strip */}
          <div style={{
            display: "flex", alignItems: "center", gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)",
            borderBottom: "1px solid var(--border-color)",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
              background: "var(--color-accent)", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "var(--text-lg)", fontWeight: 800,
            }} aria-hidden="true">
              {loading ? "…" : getInitials(profile.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {loading ? "Loading..." : profile.name || "—"}
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Since {profile.since}</div>
              <span className="badge badge-success badge-dot" style={{ marginTop: 2 }}>Active</span>
            </div>
            <ShieldCheck size={20} color="#16A34A" style={{ marginLeft: "auto", flexShrink: 0, opacity: 0.7 }} />
          </div>

          {/* Form fields — compact */}
          <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="v-name" style={{ marginBottom: 4 }}>Full Name</label>
              <div className="form-input-wrapper">
                <User size={14} className="form-input-icon" />
                <input id="v-name" className="form-input has-icon-left"
                  value={profile.name} readOnly={!editMode}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="v-contact" style={{ marginBottom: 4 }}>Contact Number</label>
              <div className="form-input-wrapper">
                <Phone size={14} className="form-input-icon" />
                <input id="v-contact" className="form-input has-icon-left"
                  value={profile.contact} readOnly={!editMode}
                  onChange={(e) => setProfile((p) => ({ ...p, contact: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="v-email" style={{ marginBottom: 4 }}>Email Address</label>
              <div className="form-input-wrapper">
                <Mail size={14} className="form-input-icon" />
                <input id="v-email" type="email" className="form-input has-icon-left"
                  value={profile.email} readOnly={!editMode}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Stall info card */}
        <div className="card">
          <div className="card-header" style={{ padding: "var(--space-3) var(--space-4)" }}>
            <div className="card-title" style={{ fontSize: "var(--text-sm)" }}>Stall Information</div>
            <Store size={16} style={{ color: "var(--text-muted)" }} />
          </div>
          <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {stallStats.map(({ icon, label, value }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: "var(--space-3)",
                padding: "var(--space-2) var(--space-3)",
                background: "#F8FAFC", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
              }}>
                <span style={{ color: "var(--color-primary)", display: "flex", flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", width: 64, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>{loading ? "…" : value}</span>
              </div>
            ))}
          </div>

          {/* Quick status summary */}
          <div style={{
            margin: "0 var(--space-4) var(--space-3)",
            padding: "var(--space-3)",
            background: "linear-gradient(135deg, #DCFCE7, #BBF7D0)",
            borderRadius: "var(--radius-md)",
            display: "flex", alignItems: "center", gap: "var(--space-2)",
          }}>
            <CheckCircle size={16} color="#16A34A" />
            <div>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "#15803D" }}>Active & Compliant</div>
            </div>
          </div>
        </div>
      </div>
      {editMode && <div className="mobile-only" style={{ height: 72 }} />}
      {editMode && (
        <div
          className="mobile-only"
          style={{
            position: "fixed",
            bottom: "calc(var(--mobile-nav-height, 60px) + var(--space-2))",
            left: "var(--space-3)",
            right: "var(--space-3)",
            background: "var(--color-surface, #ffffff)",
            padding: "var(--space-3)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.25), 0 8px 10px -6px rgba(0,0,0,0.2)",
            border: "1px solid var(--border-color)",
            zIndex: 90,
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "center",
          }}
        >
          <button
            className="btn btn-ghost"
            style={{ flex: 1, minHeight: 44 }}
            onClick={() => setEditMode(false)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2, minHeight: 44, fontWeight: 700 }}
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </AppShell>
  );
}
