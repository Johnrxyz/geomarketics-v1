"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import { useDropzone } from "react-dropzone";
import {
  Upload, FileText, Trash2, CheckCircle, AlertCircle,
  User, Phone, Mail, Store, Edit3, Save
} from "lucide-react";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  status: "pending" | "approved" | "rejected";
  date: string;
}

const INITIAL_FILES: UploadedFile[] = [
  { id: "f1", name: "business_permit_2026.pdf", size: "512 KB", type: "Business Permit", status: "approved", date: "Jan 15, 2026" },
  { id: "f2", name: "sanitation_cert.pdf",      size: "238 KB", type: "Sanitation Certificate", status: "approved", date: "Jan 15, 2026" },
  { id: "f3", name: "rent_receipt_mar2026.pdf",  size: "124 KB", type: "Rent Receipt", status: "pending", date: "Mar 1, 2026" },
];

export default function VendorProfilePage() {
  const [editMode, setEditMode] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>(INITIAL_FILES);
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"], "image/*": [".jpg",".jpeg",".png"] },
    onDrop: (accepted) => {
      const newFiles: UploadedFile[] = accepted.map((f) => ({
        id: `f-${Date.now()}-${f.name}`,
        name: f.name,
        size: `${Math.round(f.size / 1024)} KB`,
        type: "Document",
        status: "pending",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    },
  });

  const handleSave = () => {
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const compliance = files.filter((f) => f.status === "approved").length;
  const total = files.length;
  const pct = total > 0 ? Math.round((compliance / total) * 100) : 0;

  return (
    <AppShell pageTitle="Vendor Profile" role="vendor" userName="Maria Santos" userRole="Vendor">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">My Profile</h2>
          <p className="page-subtitle">Manage your stall info and compliance documents</p>
        </div>
        <div className="page-header-actions">
          {saved && (
            <div className="alert-item alert-success" style={{paddingTop:"var(--space-2)",paddingBottom:"var(--space-2)"}}>
              <CheckCircle size={15} style={{color:"var(--color-success)"}} />
              <span style={{fontSize:"var(--text-sm)",fontWeight:600}}>Profile saved!</span>
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

      <div className="grid-2" style={{gap:"var(--space-6)"}}>
        {/* Left column */}
        <div style={{display:"flex",flexDirection:"column",gap:"var(--space-5)"}}>
          {/* Profile card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Personal Information</div>
              <User size={18} style={{color:"var(--text-muted)"}} />
            </div>
            <div className="card-body">
              {/* Avatar */}
              <div style={{
                display:"flex",alignItems:"center",gap:"var(--space-4)",
                padding:"var(--space-4)",background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",
                borderRadius:"var(--radius-md)",marginBottom:"var(--space-5)"
              }}>
                <div style={{
                  width:64,height:64,borderRadius:"50%",
                  background:"var(--color-accent)",color:"white",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:"var(--text-2xl)",fontWeight:800,flexShrink:0
                }} aria-hidden="true">MS</div>
                <div>
                  <div style={{fontSize:"var(--text-xl)",fontWeight:700}}>{profile.name}</div>
                  <div style={{fontSize:"var(--text-sm)",color:"var(--text-secondary)"}}>Vendor since {profile.since}</div>
                  <span className="badge badge-success badge-dot" style={{marginTop:"var(--space-1)"}}>Active Vendor</span>
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:"var(--space-4)"}}>
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
              <Store size={18} style={{color:"var(--text-muted)"}} />
            </div>
            <div className="card-body">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"var(--space-4)"}}>
                {[
                  { label:"Stall Number", value:profile.stall },
                  { label:"Section",      value:profile.section },
                  { label:"Category",     value:profile.category },
                  { label:"Vendor Since", value:profile.since },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{fontSize:"var(--text-xs)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",color:"var(--text-muted)",marginBottom:2}}>{label}</div>
                    <div style={{fontSize:"var(--text-sm)",fontWeight:600}}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Compliance Score */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Compliance Status</div>
              <CheckCircle size={18} style={{color: pct === 100 ? "var(--color-success)" : "var(--color-warning)"}} />
            </div>
            <div className="card-body">
              <div style={{display:"flex",alignItems:"center",gap:"var(--space-4)"}}>
                <div style={{
                  width:64,height:64,borderRadius:"50%",
                  background: pct === 100 ? "#DCFCE7" : "#FEF3C7",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  flexShrink:0
                }}>
                  <span style={{
                    fontSize:"var(--text-lg)",fontWeight:800,
                    color: pct === 100 ? "var(--color-success)" : "var(--color-warning)"
                  }}>{pct}%</span>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,marginBottom:"var(--space-2)"}}>
                    {compliance} of {total} documents approved
                  </div>
                  <div style={{height:8,background:"#E5E7EB",borderRadius:4,overflow:"hidden"}}>
                    <div style={{
                      height:"100%", width:`${pct}%`,
                      background: pct === 100 ? "var(--color-success)" : "var(--color-warning)",
                      borderRadius:4,transition:"width 0.5s ease"
                    }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
                  </div>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-muted)",marginTop:"var(--space-2)"}}>
                    {pct < 100 ? `${total - compliance} document(s) still pending` : "All documents approved ✓"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — Documents */}
        <div style={{display:"flex",flexDirection:"column",gap:"var(--space-5)"}}>
          {/* Upload */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Upload Documents</div>
              <Upload size={18} style={{color:"var(--text-muted)"}} />
            </div>
            <div className="card-body">
              <div {...getRootProps()} className={`dropzone${isDragActive ? " active" : ""}`}
                aria-label="Document upload area. Click or drag files here.">
                <input {...getInputProps()} aria-label="File upload input" />
                <div className="dropzone-icon"><Upload size={32} /></div>
                <p className="dropzone-label">
                  {isDragActive ? "Drop files here…" : "Drag & drop files, or click to browse"}
                </p>
                <p className="dropzone-hint">PDF, JPG, PNG · Max 10MB each</p>
              </div>
            </div>
          </div>

          {/* File List */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">My Documents</div>
              <span className="badge badge-neutral">{files.length} files</span>
            </div>
            <div className="card-body" style={{display:"flex",flexDirection:"column",gap:"var(--space-3)"}}>
              {files.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><FileText size={24} /></div>
                  <div className="empty-state-title">No documents yet</div>
                  <p className="empty-state-desc">Upload your permits and receipts above.</p>
                </div>
              ) : files.map((f) => (
                <div key={f.id} className="file-item">
                  <div className="file-item-icon">
                    <FileText size={18} />
                  </div>
                  <div className="file-item-info">
                    <div className="file-item-name">{f.name}</div>
                    <div className="file-item-meta">{f.type} · {f.size} · {f.date}</div>
                  </div>
                  <StatusBadge
                    variant={f.status as "pending"|"approved"|"rejected"}
                    label={f.status.charAt(0).toUpperCase()+f.status.slice(1)}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                    aria-label={`Delete ${f.name}`}
                  >
                    <Trash2 size={14} style={{color:"var(--color-error)"}} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements Checklist */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Required Documents</div>
              <AlertCircle size={18} style={{color:"var(--color-warning)"}} />
            </div>
            <div className="card-body" style={{display:"flex",flexDirection:"column",gap:"var(--space-3)"}}>
              {[
                { label: "Business Permit", required: true, done: true },
                { label: "Sanitation Certificate", required: true, done: true },
                { label: "Rent Receipts (current month)", required: true, done: true },
                { label: "Health Certificate", required: true, done: false },
                { label: "Tax Clearance", required: false, done: false },
              ].map((item) => (
                <div key={item.label} style={{display:"flex",alignItems:"center",gap:"var(--space-3)"}}>
                  <div style={{
                    width:20,height:20,borderRadius:"50%",flexShrink:0,
                    background: item.done ? "#DCFCE7" : "#F3F4F6",
                    display:"flex",alignItems:"center",justifyContent:"center"
                  }} aria-hidden="true">
                    {item.done
                      ? <CheckCircle size={13} style={{color:"var(--color-success)"}} />
                      : <div style={{width:6,height:6,borderRadius:"50%",background:"#D1D5DB"}} />
                    }
                  </div>
                  <span style={{
                    fontSize:"var(--text-sm)",
                    color: item.done ? "var(--text-secondary)" : "var(--text-primary)",
                    textDecoration: item.done ? "line-through" : "none",
                    flex:1
                  }}>{item.label}</span>
                  {item.required && !item.done && (
                    <span className="badge badge-error" style={{fontSize:"10px"}}>Required</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
