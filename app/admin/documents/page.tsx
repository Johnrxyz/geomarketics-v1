"use client";

import { useState, useEffect, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import { Search, Filter, Eye, CheckCircle, XCircle, FileText, Download, AlertTriangle } from "lucide-react";
import { documentsApi } from "@/lib/api";

interface Document {
  id: string;
  vendor: string;
  stall: string;
  docType: string;
  fileName: string;
  fileUrl?: string;
  submitted: string;
  status: "pending" | "approved" | "rejected" | "expired" | "resubmission_required";
  size: string;
  ocr_status?: string;
  detected_type?: string;
  confidence_score?: number | string;
  extracted_data?: any;
  validation_results?: any;
  pages?: any[];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actioning, setActioning] = useState(false);

  const fetchDocs = useCallback(() => {
    setLoading(true);
    setError(null);
    documentsApi.list()
      .then((data: any) => {
        const results = data?.results ?? data ?? [];
        const mapped: Document[] = results.map((d: any) => ({
          id: d.id?.toString() ?? "—",
          vendor: d.vendor_name ?? d.vendor ?? "—",
          stall: d.stall_number ?? d.stall ?? "—",
          docType: d.document_type ?? d.doc_type ?? d.docType ?? "Document",
          fileName: d.title ?? d.file_name ?? d.fileName ?? (d.file ? d.file.split('/').pop() : "document.png"),
          fileUrl: d.file,
          submitted: formatDate(d.submitted_at ?? d.created_at ?? d.submitted ?? ""),
          status: (d.status ?? "pending").toLowerCase() as Document["status"],
          size: d.file_size ?? d.size ?? "—",
          ocr_status: d.ocr_status,
          detected_type: d.detected_type,
          confidence_score: d.confidence_score,
          extracted_data: d.extracted_data,
          validation_results: d.validation_results,
          pages: d.pages,
        }));
        setDocs(mapped);
      })
      .catch((err: any) => {
        setError(err?.detail ?? err?.message ?? "Failed to load documents.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const filtered = docs.filter((d) => {
    const matchSearch = search === "" ||
      d.vendor.toLowerCase().includes(search.toLowerCase()) ||
      d.docType.toLowerCase().includes(search.toLowerCase()) ||
      d.stall.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = async (id: string, status: "approved" | "rejected" | "resubmission_required") => {
    setActioning(true);
    try {
      if (status === "approved") {
        await documentsApi.approve(id, reviewNotes || undefined);
      } else if (status === "rejected") {
        await documentsApi.reject(id, reviewNotes || undefined);
      } else if (status === "resubmission_required") {
        await documentsApi.requestResubmission(id, reviewNotes || undefined);
      }
      setDocs((prev) => prev.map((d) => d.id === id ? { ...d, status } : d));
      setPreviewDoc(null);
      setReviewNotes("");
    } catch (err: any) {
      alert(err?.detail ?? err?.message ?? `Failed to ${status} document.`);
    } finally {
      setActioning(false);
    }
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
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)"
      }}>
        {[
          { label:"Pending Review", value:pending,  color:"#F59E0B", bg:"#FEF3C7", icon:<FileText size={20}/> },
          { label:"Approved",       value:approved, color:"#16A34A", bg:"#DCFCE7", icon:<CheckCircle size={20}/> },
          { label:"Rejected/Resub", value:rejected + docs.filter(d => d.status === "resubmission_required").length, color:"#DC2626", bg:"#FEE2E2", icon:<XCircle size={20}/> },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{
            background:"white",borderRadius:"var(--radius-lg)",padding:"var(--space-4)",
            boxShadow:"var(--shadow-md)",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"var(--space-3)"
          }}>
            <div style={{
              width:40,height:40,borderRadius:"var(--radius-md)",background:bg,
              display:"flex",alignItems:"center",justifyContent:"center",color,flexShrink:0
            }} aria-hidden="true">{icon}</div>
            <div style={{ width: "100%" }}>
              <div style={{fontSize:"var(--text-2xl)",fontWeight:800}}>{loading ? "…" : value}</div>
              <div style={{fontSize:"var(--text-xs)",color:"var(--text-secondary)",overflowWrap:"break-word"}}>{label}</div>
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
          <option value="resubmission_required">Resubmission</option>
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
              {loading ? (
                <tr><td colSpan={8} style={{textAlign:"center",padding:"var(--space-10)",color:"var(--text-muted)"}}>Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={8} style={{textAlign:"center",padding:"var(--space-10)",color:"var(--color-error)"}}>{error}</td></tr>
              ) : filtered.length === 0 ? (
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
                    <StatusBadge variant={
                        doc.status === 'resubmission_required' ? 'warning' : 
                        doc.status === 'expired' ? 'error' :
                        doc.status as "pending"|"approved"|"rejected"
                      } label={doc.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setPreviewDoc(doc); setReviewNotes(""); }} aria-label={`Preview ${doc.fileName}`}>
                        <Eye size={13} /> Preview
                      </button>
                      {doc.status === "pending" && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => updateStatus(doc.id, "approved")} aria-label={`Approve ${doc.fileName}`} disabled={actioning}>
                            <CheckCircle size={13} /> Approve
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => updateStatus(doc.id, "rejected")} aria-label={`Reject ${doc.fileName}`} disabled={actioning}>
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
        onClose={() => { setPreviewDoc(null); setReviewNotes(""); }}
        title={`Document Preview — ${previewDoc?.fileName ?? ""}`}
        size="lg"
        footer={
          <>
            {previewDoc?.status === "pending" && (
              <>
                <button className="btn btn-danger" onClick={() => updateStatus(previewDoc!.id, "rejected")} disabled={actioning}>
                  <XCircle size={15} /> Reject
                </button>
                <button className="btn btn-warning" onClick={() => updateStatus(previewDoc!.id, "resubmission_required")} disabled={actioning}>
                  <AlertTriangle size={15} /> Request Resubmit
                </button>
                <button className="btn btn-success" onClick={() => updateStatus(previewDoc!.id, "approved")} disabled={actioning}>
                  <CheckCircle size={15} /> Approve
                </button>
              </>
            )}
            <div style={{ flex: 1 }} />
            {previewDoc?.fileUrl && (
              <a href={previewDoc.fileUrl} download className="btn btn-secondary">
                <Download size={15} /> Download
              </a>
            )}
          </>
        }
      >
        {previewDoc && (
          <div style={{ display: "flex", gap: "var(--space-6)" }}>
            {/* Image Preview Area */}
            <div style={{ flex: "2", background: "#f8fafc", borderRadius: "var(--radius-md)", overflow: "hidden", display: "flex", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-4)" }}>
              {previewDoc.pages && previewDoc.pages.length > 0 ? (
                previewDoc.pages.sort((a: any, b: any) => a.page_upload_order - b.page_upload_order).map((page: any, idx: number) => (
                  <div key={idx}>
                    <h4 style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>Page {page.page_upload_order}</h4>
                    <img src={page.file} alt={`Page ${page.page_upload_order}`} style={{ width: "100%", height: "auto", display: "block", borderRadius: "var(--radius-sm)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                  </div>
                ))
              ) : previewDoc.fileUrl ? (
                <img src={previewDoc.fileUrl} alt={previewDoc.fileName} style={{ width: "100%", height: "auto", display: "block" }} />
              ) : (
                <div style={{ padding: "var(--space-10)", textAlign: "center", color: "var(--text-muted)" }}>
                  <FileText size={48} style={{ margin: "0 auto var(--space-4)", opacity: 0.5 }} />
                  <p>No document file available for preview.</p>
                </div>
              )}
            </div>

            {/* Document metadata area */}
            <div style={{ flex: "1" }}>
              <div style={{
                display:"grid",gridTemplateColumns:"1fr 1fr",gap:"var(--space-3)",
                background:"#F8FAFC",padding:"var(--space-4)",borderRadius:"var(--radius-md)",
                border:"1px solid var(--border-light)"
              }}>
                <div>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-muted)",marginBottom:"2px"}}>Vendor</div>
                  <div style={{fontWeight:600}}>{previewDoc.vendor}</div>
                </div>
                <div>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-muted)",marginBottom:"2px"}}>Stall</div>
                  <div style={{fontWeight:600}}>{previewDoc.stall}</div>
                </div>
                <div>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-muted)",marginBottom:"2px"}}>Type</div>
                  <div>{previewDoc.docType}</div>
                </div>
                <div>
                  <div style={{fontSize:"var(--text-xs)",color:"var(--text-muted)",marginBottom:"2px"}}>Status</div>
                  <div>
                    <StatusBadge variant={
                        previewDoc.status === 'resubmission_required' ? 'warning' : 
                        previewDoc.status === 'expired' ? 'error' :
                        previewDoc.status as "pending"|"approved"|"rejected"
                      } label={previewDoc.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} />
                  </div>
                </div>
              </div>

              {/* OCR Details */}
              {(previewDoc.detected_type || previewDoc.ocr_status) && (
                <div style={{
                  marginTop: "var(--space-4)",
                  padding: "var(--space-4)",
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-light)"
                }}>
                  <h4 style={{fontSize: "var(--text-sm)", fontWeight: 600, marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: "var(--space-2)"}}>
                    <Search size={14} /> AI Verification
                  </h4>
                  
                  <div style={{display:"flex",flexDirection:"column",gap:"var(--space-2)"}}>
                    <div style={{display: "flex", justifyContent: "space-between"}}>
                      <span style={{fontSize: "var(--text-xs)", color: "var(--text-muted)"}}>OCR Status</span>
                      <span style={{fontSize: "var(--text-xs)", fontWeight: 600}}>{previewDoc.ocr_status || '—'}</span>
                    </div>
                    
                    {previewDoc.detected_type && (
                      <div style={{display: "flex", justifyContent: "space-between"}}>
                        <span style={{fontSize: "var(--text-xs)", color: "var(--text-muted)"}}>Detected Type</span>
                        <span style={{fontSize: "var(--text-xs)", fontWeight: 600}}>
                          {previewDoc.detected_type.replace('_', ' ')} 
                          ({Math.round(Number(previewDoc.confidence_score || 0) * 100)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {previewDoc.validation_results?.ocr_notes && (
                    <div style={{marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px dashed var(--border-light)"}}>
                      <div style={{fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: "var(--space-2)"}}>System Notes:</div>
                      <ul style={{margin: 0, paddingLeft: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-secondary)"}}>
                        {previewDoc.validation_results.ocr_notes.map((note: string, i: number) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div style={{marginTop:"var(--space-4)"}}>
                <label className="form-label" htmlFor="review-notes">Review Notes (optional)</label>
                <textarea
                  id="review-notes"
                  className="form-textarea"
                  placeholder="Add notes about this document…"
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
