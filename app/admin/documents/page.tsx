"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { Search, Filter, Eye, CheckCircle, XCircle, FileText, Download } from "lucide-react";

interface Document {
  id: string;
  vendor: string;
  stall: string;
  docType: string;
  fileName: string;
  submitted: string;
  status: "pending" | "approved" | "rejected";
  size: string;
}

const DOCS: Document[] = [
  { id: "d1",  vendor: "Maria Santos",   stall: "A-01", docType: "Business Permit",        fileName: "business_permit_2026.pdf",    submitted: "Mar 1, 2026",  status: "approved", size: "512 KB" },
  { id: "d2",  vendor: "Juan dela Cruz", stall: "A-04", docType: "Sanitation Certificate",  fileName: "sanitation_cert_q1.pdf",      submitted: "Mar 3, 2026",  status: "pending",  size: "238 KB" },
  { id: "d3",  vendor: "Pedro Garcia",   stall: "B-01", docType: "Rent Receipt",            fileName: "rent_march2026.pdf",          submitted: "Mar 5, 2026",  status: "pending",  size: "124 KB" },
  { id: "d4",  vendor: "Rosa Navarro",   stall: "B-12", docType: "Health Certificate",      fileName: "health_cert_navarro.pdf",     submitted: "Mar 6, 2026",  status: "rejected", size: "340 KB" },
  { id: "d5",  vendor: "Ana Torres",     stall: "B-03", docType: "Business Permit",         fileName: "business_permit_torres.pdf",  submitted: "Mar 8, 2026",  status: "approved", size: "490 KB" },
  { id: "d6",  vendor: "Carlo Mendoza",  stall: "C-01", docType: "Rent Receipt",            fileName: "rent_receipt_mendoza.pdf",    submitted: "Mar 10, 2026", status: "pending",  size: "115 KB" },
  { id: "d7",  vendor: "Elena Flores",   stall: "C-02", docType: "Tax Clearance",           fileName: "tax_clearance_flores.pdf",    submitted: "Mar 12, 2026", status: "approved", size: "620 KB" },
  { id: "d8",  vendor: "Ben Castillo",   stall: "D-01", docType: "Business Permit",         fileName: "permit_castillo_2026.pdf",    submitted: "Mar 15, 2026", status: "pending",  size: "480 KB" },
];

export default function DocumentsPage() {
  const [docs, setDocs]           = useState<Document[]>(DOCS);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const filtered = docs.filter((d) => {
    const matchSearch = search === "" ||
      d.vendor.toLowerCase().includes(search.toLowerCase()) ||
      d.docType.toLowerCase().includes(search.toLowerCase()) ||
      d.stall.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = (id: string, status: "approved" | "rejected") => {
    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, status } : d));
    setPreviewDoc(null);
  };

  const pending  = docs.filter((d) => d.status === "pending").length;
  const approved = docs.filter((d) => d.status === "approved").length;
  const rejected = docs.filter((d) => d.status === "rejected").length;

  return (
    <AppShell pageTitle="Document Management" role="admin" userName="Admin User" userRole="Administrator">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Document Management</h2>
          <p className="page-subtitle">Review and verify vendor-submitted compliance documents</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"var(--space-4)",marginBottom:"var(--space-6)"}}>
        {[
          { label:"Pending Review", value:pending,  color:"#F59E0B", bg:"#FEF3C7", icon:<FileText size={20}/> },
          { label:"Approved",       value:approved, color:"#16A34A", bg:"#DCFCE7", icon:<CheckCircle size={20}/> },
          { label:"Rejected",       value:rejected, color:"#DC2626", bg:"#FEE2E2", icon:<XCircle size={20}/> },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{
            background:"white",borderRadius:"var(--radius-lg)",padding:"var(--space-5)",
            boxShadow:"var(--shadow-md)",display:"flex",alignItems:"center",gap:"var(--space-4)"
          }}>
            <div style={{
              width:44,height:44,borderRadius:"var(--radius-md)",background:bg,
              display:"flex",alignItems:"center",justifyContent:"center",color,flexShrink:0
            }} aria-hidden="true">{icon}</div>
            <div>
              <div style={{fontSize:"var(--text-2xl)",fontWeight:800}}>{value}</div>
              <div style={{fontSize:"var(--text-sm)",color:"var(--text-secondary)"}}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input type="search" className="search-input"
            placeholder="Search vendor, document type..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            aria-label="Search documents"
          />
        </div>
        <select className="form-select" style={{width:"auto"}} value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="All">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table" aria-label="Vendor documents table">
            <thead>
              <tr>
                <th scope="col">Vendor</th>
                <th scope="col">Stall</th>
                <th scope="col">Document Type</th>
                <th scope="col">File Name</th>
                <th scope="col">Submitted</th>
                <th scope="col">Size</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{textAlign:"center",padding:"var(--space-10)",color:"var(--text-muted)"}}>No documents found.</td></tr>
              ) : filtered.map((doc) => (
                <tr key={doc.id}>
                  <td style={{fontWeight:600}}>{doc.vendor}</td>
                  <td>
                    <span style={{
                      display:"inline-block",padding:"2px 8px",
                      background:"#EFF6FF",color:"#1D4ED8",
                      borderRadius:"var(--radius-sm)",fontSize:"var(--text-xs)",fontWeight:700
                    }}>{doc.stall}</span>
                  </td>
                  <td>{doc.docType}</td>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:"var(--space-2)"}}>
                      <FileText size={13} style={{color:"var(--text-muted)",flexShrink:0}} />
                      <span style={{fontSize:"var(--text-xs)",fontFamily:"var(--font-mono)"}}>{doc.fileName}</span>
                    </div>
                  </td>
                  <td style={{color:"var(--text-secondary)",fontSize:"var(--text-xs)"}}>{doc.submitted}</td>
                  <td style={{color:"var(--text-muted)",fontSize:"var(--text-xs)"}}>{doc.size}</td>
                  <td>
                    <StatusBadge variant={doc.status as "pending"|"approved"|"rejected"} label={doc.status.charAt(0).toUpperCase()+doc.status.slice(1)} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setPreviewDoc(doc)} aria-label={`Preview ${doc.fileName}`}>
                        <Eye size={13} /> Preview
                      </button>
                      {doc.status === "pending" && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => updateStatus(doc.id, "approved")} aria-label={`Approve ${doc.fileName}`}>
                            <CheckCircle size={13} /> Approve
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => updateStatus(doc.id, "rejected")} aria-label={`Reject ${doc.fileName}`}>
                            <XCircle size={13} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={`Document Preview — ${previewDoc?.fileName ?? ""}`}
        size="lg"
        footer={
          <>
            {previewDoc?.status === "pending" && (
              <>
                <button className="btn btn-danger" onClick={() => updateStatus(previewDoc!.id, "rejected")}>
                  <XCircle size={15} /> Reject
                </button>
                <button className="btn btn-success" onClick={() => updateStatus(previewDoc!.id, "approved")}>
                  <CheckCircle size={15} /> Approve
                </button>
              </>
            )}
            <button className="btn btn-ghost" onClick={() => setPreviewDoc(null)}>Close</button>
          </>
        }
      >
        {previewDoc && (
          <div>
            {/* Document metadata */}
            <div style={{
              display:"grid",gridTemplateColumns:"1fr 1fr",gap:"var(--space-3)",
              padding:"var(--space-4)",background:"#F9FAFB",borderRadius:"var(--radius-md)",
              marginBottom:"var(--space-5)", fontSize:"var(--text-sm)"
            }}>
              {[
                { label:"Vendor",    value:previewDoc.vendor },
                { label:"Stall",     value:previewDoc.stall },
                { label:"Type",      value:previewDoc.docType },
                { label:"Submitted", value:previewDoc.submitted },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-muted)",marginBottom:2}}>{label}</div>
                  <div style={{fontWeight:600}}>{value}</div>
                </div>
              ))}
            </div>

            {/* Document preview area */}
            <div style={{
              background:"#F0F4FF",borderRadius:"var(--radius-lg)",
              height:320,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:"var(--space-4)",
              border:"2px dashed #BFDBFE"
            }}>
              <FileText size={48} style={{color:"#2563EB"}} />
              <div style={{textAlign:"center"}}>
                <div style={{fontWeight:700,color:"var(--color-accent)",marginBottom:"var(--space-1)"}}>{previewDoc.fileName}</div>
                <div style={{fontSize:"var(--text-sm)",color:"var(--text-secondary)"}}>{previewDoc.size} · PDF Document</div>
              </div>
              <button className="btn btn-secondary btn-sm">
                <Download size={14} /> Download File
              </button>
            </div>

            <div style={{marginTop:"var(--space-4)"}}>
              <label className="form-label" htmlFor="review-notes">Review Notes (optional)</label>
              <textarea id="review-notes" className="form-textarea" placeholder="Add notes about this document…" rows={2} />
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
