"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AppShell from "@/components/layout/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  UploadCloud, Camera, FileText, AlertTriangle, RefreshCw,
  CheckCircle, XCircle, FilePlus, Send, Trash2, Clock
} from "lucide-react";
import { documentsApi } from "@/lib/api";

interface DocumentItem {
  id: string;
  document_type: string;
  document_type_display: string;
  title: string;
  file_size: string;
  status: string;
  status_display: string;
  ocr_status: string;
  validation_results: any;
  created_at: string;
  expiry_date: string;
}

// Page slot definition for contract uploads
interface PageSlot {
  label: string;
  file: File | null;
}

const INITIAL_CONTRACT_PAGES: PageSlot[] = [
  { label: "Page 1 — Agreement Cover", file: null },
  { label: "Page 2 — Terms & Conditions", file: null },
  { label: "Page 3 — Acknowledgment", file: null },
];

export default function VendorDocumentsPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState<"business_permit" | "contract">("business_permit");
  const [title, setTitle] = useState("");

  // Business Permit state
  const [bpFile, setBpFile] = useState<File | null>(null);
  const [bpUploading, setBpUploading] = useState(false);
  const bpFileRef = useRef<HTMLInputElement>(null);
  const bpCamRef = useRef<HTMLInputElement>(null);

  // Contract state
  const [contractPages, setContractPages] = useState<PageSlot[]>(INITIAL_CONTRACT_PAGES);
  const [incompleteContractId, setIncompleteContractId] = useState<string | null>(null);
  const [contractSubmitting, setContractSubmitting] = useState(false);
  const [pageUploading, setPageUploading] = useState<number | null>(null); // index of page currently uploading

  // Pre-declare refs for the 3 contract page file inputs (Rules of Hooks: no refs in loops)
  const pageRef0 = useRef<HTMLInputElement>(null);
  const pageRef1 = useRef<HTMLInputElement>(null);
  const pageRef2 = useRef<HTMLInputElement>(null);
  const pageRefs = [pageRef0, pageRef1, pageRef2];

  const fetchDocs = useCallback(() => {
    setLoading(true);
    documentsApi.list()
      .then((data: any) => {
        const results: DocumentItem[] = data?.results ?? data ?? [];
        setDocs(results);
        // Check if there's an incomplete contract draft to resume
        const incomplete = results.find(
          (d) => d.document_type === "contract" && d.status === "incomplete"
        );
        setIncompleteContractId(incomplete?.id ?? null);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ─── Business Permit Upload ──────────────────────────────────────────────────
  const handleBpSubmit = async () => {
    if (!bpFile) return;
    setBpUploading(true);
    const formData = new FormData();
    formData.append("file", bpFile);
    formData.append("document_type", "business_permit");
    formData.append("title", title || bpFile.name);
    try {
      await documentsApi.upload(formData);
      setTitle("");
      setBpFile(null);
      fetchDocs();
    } catch (err: any) {
      alert(err?.detail ?? err?.message ?? "Upload failed.");
    } finally {
      setBpUploading(false);
    }
  };

  const handleBpDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setBpFile(file);
  };

  // ─── Contract: Create or Resume Draft ────────────────────────────────────────
  const ensureContractDraft = async (): Promise<string> => {
    if (incompleteContractId) return incompleteContractId;
    // Create the parent contract document record (no file yet)
    const formData = new FormData();
    formData.append("document_type", "contract");
    formData.append("title", title || "Market Stall Contract");
    const doc = await documentsApi.upload(formData);
    const id = doc.id;
    setIncompleteContractId(id);
    fetchDocs();
    return id;
  };

  const handlePageUpload = async (slotIndex: number, file: File) => {
    setPageUploading(slotIndex);
    try {
      const contractId = await ensureContractDraft();
      await documentsApi.addPage(contractId, file);
      setContractPages((prev) => {
        const next = [...prev];
        next[slotIndex] = { ...next[slotIndex], file };
        return next;
      });
      fetchDocs();
    } catch (err: any) {
      alert(err?.detail ?? err?.error ?? err?.message ?? "Page upload failed.");
    } finally {
      setPageUploading(null);
    }
  };

  const removePageFile = (slotIndex: number) => {
    // Only remove locally — server-side removal would require a separate endpoint
    setContractPages((prev) => {
      const next = [...prev];
      next[slotIndex] = { ...next[slotIndex], file: null };
      return next;
    });
  };

  const allPagesUploaded = contractPages.every((p) => p.file !== null);

  const handleSubmitContract = async () => {
    if (!incompleteContractId) return;
    if (!allPagesUploaded) {
      alert("Please upload all 3 pages before submitting.");
      return;
    }
    setContractSubmitting(true);
    try {
      await documentsApi.submitContract(incompleteContractId);
      setContractPages(INITIAL_CONTRACT_PAGES);
      setIncompleteContractId(null);
      setTitle("");
      fetchDocs();
    } catch (err: any) {
      alert(err?.error ?? err?.detail ?? err?.message ?? "Submission failed.");
    } finally {
      setContractSubmitting(false);
    }
  };

  const pagesUploadedCount = contractPages.filter((p) => p.file !== null).length;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "approved": return "approved" as const;
      case "rejected": return "rejected" as const;
      case "resubmission_required": return "warning" as const;
      case "expired": return "error" as const;
      default: return "pending" as const;
    }
  };

  return (
    <AppShell pageTitle="My Documents" role="vendor" userName="Vendor User" userRole="Vendor">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
        <div>
          <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-accent)", margin: "0 0 var(--space-2) 0" }}>My Documents</h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>Upload and manage your compliance documents</p>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)" }}>

        {/* ── Upload Section ─────────────────────────────────────────────── */}
        <div className="card" style={{ flex: "1 1 300px", height: "fit-content", padding: "var(--space-6)" }}>
          <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--color-accent)", marginBottom: "var(--space-5)" }}>Upload New Document</h3>

          {/* Document Type Selector — Card style, no dropdown */}
          <div style={{ marginBottom: "var(--space-5)" }}>
            <label className="form-label" style={{ marginBottom: "var(--space-2)", display: "block" }}>What are you uploading?</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              {([
                { value: "business_permit", icon: "🏛️", label: "Business Permit", sub: "Single page" },
                { value: "contract",        icon: "📋", label: "Vendor Contract", sub: "3 pages required" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDocType(opt.value)}
                  style={{
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-lg)",
                    border: `2px solid ${docType === opt.value ? "var(--color-primary)" : "#E2E8F0"}`,
                    background: docType === opt.value ? "#EFF6FF" : "#F8FAFC",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{opt.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: docType === opt.value ? "var(--color-primary)" : "var(--color-accent)" }}>{opt.label}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── BRANCH: Business Permit vs Contract ───────────────────── */}
          {docType === "business_permit" ? (
            <>
              {/* Simple single-file dropzone */}
              <div
                onDrop={handleBpDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  border: `2px ${bpFile ? "solid #86EFAC" : "dashed #cbd5e1"}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-6)",
                  textAlign: "center",
                  background: bpFile ? "#F0FDF4" : "#f8fafc",
                  cursor: bpUploading ? "not-allowed" : "pointer",
                  marginBottom: "var(--space-4)",
                  transition: "all 0.2s"
                }}
                onClick={() => !bpUploading && bpFileRef.current?.click()}
              >
                {bpFile ? (
                  <>
                    <CheckCircle size={40} style={{ margin: "0 auto var(--space-2)", color: "#22C55E" }} />
                    <p style={{ fontWeight: 600, color: "var(--color-accent)", marginBottom: 4 }}>File Selected</p>
                    <p style={{ fontSize: "var(--text-xs)", color: "#15803D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bpFile.name}</p>
                  </>
                ) : (
                  <>
                    <UploadCloud size={40} style={{ margin: "0 auto var(--space-2)", color: "var(--text-muted)" }} />
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: "var(--space-1)" }}>Click or drag file to upload</p>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Supports JPG, PNG, PDF up to 10MB</p>
                    </div>
                  </>
                )}
              </div>
              
              <input ref={bpFileRef} type="file" accept="image/jpeg,image/png,application/pdf" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) setBpFile(e.target.files[0]); }} />
              
              {!bpFile && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", margin: "var(--space-4) 0" }}>
                    <div style={{ flex: 1, height: 1, background: "var(--border-color)" }}></div>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: 1, background: "var(--border-color)" }}></div>
                  </div>
                  <button className="btn btn-secondary w-full" onClick={() => bpCamRef.current?.click()} disabled={bpUploading} style={{ display: "flex", justifyContent: "center", gap: "var(--space-2)" }}>
                    <Camera size={18} /> Take Photo
                  </button>
                  <input ref={bpCamRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) setBpFile(e.target.files[0]); }} />
                </>
              )}

              {bpFile && (
                <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
                  <button 
                    className="btn btn-secondary flex-1" 
                    onClick={() => setBpFile(null)} 
                    disabled={bpUploading}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary flex-1" 
                    onClick={handleBpSubmit} 
                    disabled={bpUploading}
                    style={{ display: "flex", justifyContent: "center", gap: "var(--space-2)" }}
                  >
                    {bpUploading ? (
                      <><RefreshCw size={18} className="spin" /> Uploading...</>
                    ) : (
                      <><Send size={18} /> Submit Permit</>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Multi-page contract upload */}
              <div style={{
                background: "#EFF6FF",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3) var(--space-4)",
                marginBottom: "var(--space-4)",
                display: "flex",
                gap: "var(--space-2)",
                alignItems: "flex-start",
                fontSize: "var(--text-xs)",
                color: "#1D4ED8"
              }}>
                <FileText size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>3-Page Contract Required.</strong> Upload all three pages. Your progress is saved automatically — you can close and resume later.
                  {incompleteContractId && (
                    <span style={{ display: "block", marginTop: 4, color: "#15803D", fontWeight: 700 }}>
                      ✓ Draft found — resuming upload.
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: "var(--space-4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginBottom: 6 }}>
                  <span>Pages uploaded</span>
                  <span style={{ fontWeight: 700, color: pagesUploadedCount === 3 ? "#15803D" : "var(--color-accent)" }}>{pagesUploadedCount} / 3</span>
                </div>
                <div style={{ height: 6, background: "#E2E8F0", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(pagesUploadedCount / 3) * 100}%`, background: pagesUploadedCount === 3 ? "#22C55E" : "var(--color-primary)", borderRadius: 99, transition: "width 0.4s ease" }} />
                </div>
              </div>

              {/* Page Slots */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                {contractPages.map((slot, i) => {
                  const isUploading = pageUploading === i;
                  const hasFile = slot.file !== null;
                  const pageRef = pageRefs[i];
                  return (
                    <div key={i} style={{
                      border: `1.5px solid ${hasFile ? "#86EFAC" : "#CBD5E1"}`,
                      borderRadius: "var(--radius-md)",
                      padding: "var(--space-3) var(--space-4)",
                      background: hasFile ? "#F0FDF4" : "#F8FAFC",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      transition: "all 0.2s"
                    }}>
                      {/* Status icon */}
                      <div style={{ flexShrink: 0 }}>
                        {isUploading ? (
                          <RefreshCw size={20} className="spin" style={{ color: "var(--color-primary)" }} />
                        ) : hasFile ? (
                          <CheckCircle size={20} style={{ color: "#22C55E" }} />
                        ) : (
                          <FilePlus size={20} style={{ color: "#94A3B8" }} />
                        )}
                      </div>

                      {/* Label and file name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--color-accent)" }}>{slot.label}</div>
                        {hasFile && (
                          <div style={{ fontSize: "var(--text-xs)", color: "#15803D", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {slot.file!.name}
                          </div>
                        )}
                        {!hasFile && (
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>Not uploaded yet</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                        {hasFile ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "4px 8px", color: "#DC2626", fontSize: "var(--text-xs)" }}
                            onClick={() => removePageFile(i)}
                            title="Remove page"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: "var(--text-xs)", padding: "4px 10px" }}
                              disabled={isUploading}
                              onClick={() => pageRef.current?.click()}
                            >
                              {isUploading ? "Uploading..." : "Browse"}
                            </button>
                          </>
                        )}
                        <input
                          ref={pageRef}
                          type="file"
                          accept="image/jpeg,image/png,application/pdf"
                          style={{ display: "none" }}
                          onChange={(e) => { if (e.target.files?.[0]) handlePageUpload(i, e.target.files[0]); }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit Contract Button */}
              <button
                className={`btn w-full ${allPagesUploaded ? "btn-primary" : "btn-secondary"}`}
                disabled={!allPagesUploaded || contractSubmitting || !incompleteContractId}
                onClick={handleSubmitContract}
                style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "var(--space-2)", fontWeight: 700 }}
              >
                {contractSubmitting ? (
                  <><RefreshCw size={16} className="spin" /> Submitting...</>
                ) : allPagesUploaded ? (
                  <><Send size={16} /> Submit Contract for Review</>
                ) : (
                  <><Clock size={16} /> Upload all 3 pages to submit</>
                )}
              </button>
              {!allPagesUploaded && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textAlign: "center", marginTop: "var(--space-2)" }}>
                  Missing {3 - pagesUploadedCount} page{3 - pagesUploadedCount !== 1 ? "s" : ""}
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Documents List ──────────────────────────────────────────────── */}
        <div className="card" style={{ flex: "2 1 500px", padding: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 800, color: "var(--color-accent)", margin: 0 }}>Uploaded Documents</h3>
            <button className="btn btn-ghost btn-sm" onClick={fetchDocs} style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>Loading documents...</p>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-10)", background: "#f8fafc", borderRadius: "var(--radius-md)" }}>
              <FileText size={48} style={{ margin: "0 auto var(--space-3)", color: "#cbd5e1" }} />
              <p style={{ fontWeight: 600 }}>No documents found</p>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Upload your first document using the form.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {docs.map(doc => {
                const isIncomplete = doc.status === "incomplete";
                const isContract = doc.document_type === "contract";
                return (
                  <div key={doc.id} style={{
                    border: `1px solid ${isIncomplete ? "#FDE68A" : "var(--border-color)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-4)",
                    display: "flex", gap: "var(--space-4)", alignItems: "flex-start",
                    background: doc.status === "rejected" || doc.status === "resubmission_required" ? "#FEF2F2" : isIncomplete ? "#FFFBEB" : "white"
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "var(--radius-md)",
                      background: isIncomplete ? "#FEF3C7" : "#F1F5F9",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      <FileText size={24} style={{ color: isIncomplete ? "#D97706" : "var(--text-secondary)" }} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <h4 style={{ fontWeight: 600, fontSize: "var(--text-md)", margin: 0 }}>{doc.title || doc.document_type_display}</h4>
                        <StatusBadge
                          variant={getStatusVariant(doc.status)}
                          label={doc.status_display}
                        />
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginBottom: 8 }}>
                        <span>{doc.document_type_display}</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        {doc.expiry_date && (
                          <>
                            <span>•</span>
                            <span style={{ color: new Date(doc.expiry_date) < new Date() ? "var(--color-error)" : "inherit" }}>
                              Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Incomplete Contract Warning */}
                      {isIncomplete && isContract && (
                        <div style={{ background: "#FEF3C7", borderLeft: "3px solid #F59E0B", padding: "6px 10px", borderRadius: 4, fontSize: "var(--text-xs)", marginTop: 6 }}>
                          <div style={{ fontWeight: 700, color: "#B45309", display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                            <AlertTriangle size={12} /> Contract In Progress
                          </div>
                          <p style={{ margin: 0, color: "#92400E" }}>Switch to "Vendor Contract" above to resume uploading pages and submit.</p>
                        </div>
                      )}

                      {/* OCR Status */}
                      {doc.ocr_status === 'processing' && (
                        <div style={{ fontSize: "var(--text-xs)", color: "#2563EB", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                          <RefreshCw size={12} className="spin" /> Processing document content...
                        </div>
                      )}
                      {doc.ocr_status === 'failed' && (
                        <div style={{ fontSize: "var(--text-xs)", color: "#B91C1C", display: "flex", alignItems: "center", gap: 4, marginTop: 4, background: "#FEF2F2", padding: "4px 8px", borderRadius: 4 }}>
                          <XCircle size={12} /> OCR could not process this document — admin will review manually.
                        </div>
                      )}

                      {/* Validation Warnings */}
                      {doc.validation_results?.warnings?.length > 0 && (
                        <div style={{ background: "#FEF2F2", borderLeft: "3px solid #EF4444", padding: "6px 10px", borderRadius: 4, fontSize: "var(--text-xs)", marginTop: 8 }}>
                          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 4, color: "#B91C1C", marginBottom: 2 }}>
                            <XCircle size={12} /> Issues
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 16, color: "#991B1B" }}>
                            {doc.validation_results.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                      )}

                      {/* Type Mismatch Warning */}
                      {doc.validation_results?.type_mismatch && (
                        <div style={{ background: "#FFF7ED", borderLeft: "3px solid #F97316", padding: "8px 10px", borderRadius: 4, fontSize: "var(--text-xs)", marginTop: 8 }}>
                          <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4, color: "#C2410C", marginBottom: 2 }}>
                            <AlertTriangle size={12} /> Wrong Document Uploaded
                          </div>
                          <p style={{ margin: 0, color: "#9A3412" }}>
                            {doc.validation_results.type_mismatch_message ?? "The uploaded file doesn't match the selected document type. Please delete this and re-upload the correct document."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
