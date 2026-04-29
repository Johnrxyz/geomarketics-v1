"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { CheckCircle, User, Phone, Mail, Store, Edit3, Save } from "lucide-react";

export default function VendorProfilePage() {
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    name: "Maria Santos",
    contact: "+63 917 123 4567",
    email: "maria.santos@email.com",
    stall: "A-01",
    section: "Section A",
    category: "Vegetables",
    since: "January 2020",
  });

  const handleSave = () => {
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AppShell pageTitle="Vendor Profile" role="vendor" userName="Maria Santos" userRole="Vendor">
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
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={15} /> Save Changes
              </button>
            </>
          ) : (
            <button className="btn btn-accent" onClick={() => setEditMode(true)}>
              <Edit3 size={15} /> Edit Profile
            </button>
          )}
        </div>
      </div>

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
              }} aria-hidden="true">MS</div>
              <div>
                <div style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>{profile.name}</div>
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
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
