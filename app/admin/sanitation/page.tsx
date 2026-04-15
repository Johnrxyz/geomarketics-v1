"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AppShell from "@/components/layout/AppShell";
import Modal from "@/components/ui/Modal";
import { Save, CheckCircle, XCircle, Clock, Download, History, Plus, RotateCcw } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type CheckState = true | false | null; // true=✔ false=✖ null=empty

interface CheckColumns {
  id: CheckState;
  uniform: CheckState;
  hairnet: CheckState;
  apron: CheckState;
  boots: CheckState;
  mask: CheckState;
  permit: CheckState;
}

interface ChecklistRow {
  id: string;
  vendorId: string;
  name: string;
  stallNo: string;
  checks: CheckColumns;
  remarks: string;
}

interface SavedChecklist {
  id: string;
  date: string;
  section: string;
  inspector: string;
  rows: ChecklistRow[];
  savedAt: string;
}

// ─── Mock Vendor Data per Section ──────────────────────────────────────────

const VENDORS_BY_SECTION: Record<string, { vendorId: string; name: string; stallNo: string }[]> = {
  "Fish Section": [
    { vendorId: "v01", name: "Carlo Mendoza",  stallNo: "C-01" },
    { vendorId: "v02", name: "Elena Flores",   stallNo: "C-02" },
    { vendorId: "v03", name: "Ben Castillo",   stallNo: "C-03" },
    { vendorId: "v04", name: "Lena Bautista",  stallNo: "C-04" },
    { vendorId: "v05", name: "Mark Tolentino", stallNo: "C-05" },
    { vendorId: "v06", name: "Grace Aquino",   stallNo: "C-06" },
  ],
  "Meat Section": [
    { vendorId: "v10", name: "Pedro Garcia",   stallNo: "B-01" },
    { vendorId: "v11", name: "Ana Torres",     stallNo: "B-03" },
    { vendorId: "v12", name: "Rosa Navarro",   stallNo: "B-12" },
    { vendorId: "v13", name: "Tony Ramos",     stallNo: "B-05" },
    { vendorId: "v14", name: "Cory Dela Cruz", stallNo: "B-07" },
  ],
  "Vegetable Section": [
    { vendorId: "v20", name: "Maria Santos",   stallNo: "A-01" },
    { vendorId: "v21", name: "Luis Reyes",     stallNo: "A-03" },
    { vendorId: "v22", name: "Juan dela Cruz", stallNo: "A-04" },
    { vendorId: "v23", name: "Nena Cruz",      stallNo: "A-05" },
    { vendorId: "v24", name: "Beth Manalo",    stallNo: "A-06" },
    { vendorId: "v25", name: "Fred Santos",    stallNo: "A-08" },
    { vendorId: "v26", name: "Alma Villanueva",stallNo: "A-09" },
  ],
  "Cooked Food Section": [
    { vendorId: "v30", name: "Nena Cruz",      stallNo: "E-01" },
    { vendorId: "v31", name: "Tony Ramos",     stallNo: "E-02" },
    { vendorId: "v32", name: "Joy Mercado",    stallNo: "E-03" },
    { vendorId: "v33", name: "Dan Navarro",    stallNo: "E-04" },
  ],
  "Dry Goods Section": [
    { vendorId: "v40", name: "Ben Castillo",   stallNo: "D-01" },
    { vendorId: "v41", name: "Rita Santos",    stallNo: "D-02" },
    { vendorId: "v42", name: "Oscar Perez",    stallNo: "D-03" },
  ],
};

const SECTIONS = Object.keys(VENDORS_BY_SECTION);
const CHECK_KEYS: (keyof CheckColumns)[] = ["id","uniform","hairnet","apron","boots","mask","permit"];
const CHECK_LABELS: Record<keyof CheckColumns, string> = {
  id: "ID",
  uniform: "Uniform",
  hairnet: "Hair Net",
  apron: "Apron",
  boots: "Boots",
  mask: "Spit Guard / Mask",
  permit: "Bus. Permit",
};

const STORAGE_KEY = "geomarketics_sanitation_history";

// ─── Helpers ────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().split("T")[0];

const emptyChecks = (): CheckColumns => ({
  id: null, uniform: null, hairnet: null,
  apron: null, boots: null, mask: null, permit: null
});

const buildRows = (section: string): ChecklistRow[] =>
  (VENDORS_BY_SECTION[section] || []).map((v, i) => ({
    id: `row-${v.vendorId}`,
    vendorId: v.vendorId,
    name: v.name,
    stallNo: v.stallNo,
    checks: emptyChecks(),
    remarks: "",
  }));

const saveToStorage = (records: SavedChecklist[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {}
};

const loadFromStorage = (): SavedChecklist[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

// ─── Cell Toggle Button ─────────────────────────────────────────────────────

function CheckCell({
  value, onChange
}: { value: CheckState; onChange: (v: CheckState) => void }) {
  // Cycle: null → true → false → null
  const cycle = () => {
    if (value === null)  onChange(true);
    else if (value === true)  onChange(false);
    else onChange(null);
  };

  if (value === true) return (
    <button
      onClick={cycle}
      aria-label="Compliant — click to toggle"
      style={{
        width: 32, height: 26,
        background: "#DCFCE7", border: "1px solid #16A34A",
        borderRadius: 3, cursor: "pointer",
        color: "#16A34A", fontWeight: 700, fontSize: 15,
        lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >✔</button>
  );

  if (value === false) return (
    <button
      onClick={cycle}
      aria-label="Non-compliant — click to toggle"
      style={{
        width: 32, height: 26,
        background: "#FEE2E2", border: "1px solid #DC2626",
        borderRadius: 3, cursor: "pointer",
        color: "#DC2626", fontWeight: 700, fontSize: 15,
        lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >✖</button>
  );

  // null / empty
  return (
    <button
      onClick={cycle}
      aria-label="Not checked — click to toggle"
      style={{
        width: 32, height: 26,
        background: "#F9FAFB", border: "1px solid #D1D5DB",
        borderRadius: 3, cursor: "pointer",
        color: "#9CA3AF", fontSize: 13,
        lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >—</button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SanitationPage() {
  const [section, setSection]   = useState(SECTIONS[0]);
  const [date, setDate]         = useState(todayISO);
  const [inspector, setInspector] = useState("Inspector Cruz");
  const [rows, setRows]         = useState<ChecklistRow[]>(() => buildRows(SECTIONS[0]));
  const [history, setHistory]   = useState<SavedChecklist[]>([]);
  const [viewMode, setViewMode] = useState<"checklist" | "history">("checklist");
  const [historyEntry, setHistoryEntry] = useState<SavedChecklist | null>(null);
  const [toast, setToast]       = useState<"saved" | "error" | null>(null);
  const [isDirty, setIsDirty]   = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load history on mount
  useEffect(() => { setHistory(loadFromStorage()); }, []);

  // Rebuild rows when section changes
  useEffect(() => {
    setRows(buildRows(section));
    setIsDirty(false);
  }, [section]);

  const showToast = (type: "saved" | "error") => {
    setToast(type);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  // ── Row mutators ──────────────────────────────────────────────────────────

  const toggleCheck = useCallback((rowId: string, key: keyof CheckColumns, val: CheckState) => {
    setRows((prev) => prev.map((r) =>
      r.id === rowId ? { ...r, checks: { ...r.checks, [key]: val } } : r
    ));
    setIsDirty(true);
  }, []);

  const setRemarks = useCallback((rowId: string, val: string) => {
    setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, remarks: val } : r));
    setIsDirty(true);
  }, []);

  const resetRow = useCallback((rowId: string) => {
    setRows((prev) => prev.map((r) =>
      r.id === rowId ? { ...r, checks: emptyChecks(), remarks: "" } : r
    ));
    setIsDirty(true);
  }, []);

  const resetAll = () => {
    setRows(buildRows(section));
    setIsDirty(false);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveChecklist = () => {
    const record: SavedChecklist = {
      id: `cl-${Date.now()}`,
      date,
      section,
      inspector,
      rows,
      savedAt: new Date().toISOString(),
    };
    const updated = [record, ...history];
    saveToStorage(updated);
    setHistory(updated);
    setIsDirty(false);
    showToast("saved");
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalChecks = rows.reduce((sum, r) =>
    sum + CHECK_KEYS.filter((k) => r.checks[k] !== null).length, 0);
  const totalPossible = rows.length * CHECK_KEYS.length;
  const compliant = rows.reduce((sum, r) =>
    sum + CHECK_KEYS.filter((k) => r.checks[k] === true).length, 0);
  const noncompliant = rows.reduce((sum, r) =>
    sum + CHECK_KEYS.filter((k) => r.checks[k] === false).length, 0);
  const compliancePct = totalChecks > 0 ? Math.round((compliant / totalChecks) * 100) : 0;
  const vendorsChecked = rows.filter((r) => CHECK_KEYS.some((k) => r.checks[k] !== null)).length;

  // ── Column violation breakdown ────────────────────────────────────────────
  const colViolations = CHECK_KEYS.reduce((acc, k) => {
    acc[k] = rows.filter((r) => r.checks[k] === false).length;
    return acc;
  }, {} as Record<keyof CheckColumns, number>);

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = ["No","Name","Stall No",...CHECK_KEYS.map((k) => CHECK_LABELS[k]),"Remarks"];
    const body = rows.map((r, i) => [
      i+1, r.name, r.stallNo,
      ...CHECK_KEYS.map((k) => r.checks[k] === true ? "✔" : r.checks[k] === false ? "✖" : ""),
      r.remarks
    ]);
    const csv = [header, ...body].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sanitation_${section.replace(/\s/g,"_")}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render active history entry ────────────────────────────────────────────

  const displayRows = historyEntry ? historyEntry.rows : rows;
  const isReadOnly  = !!historyEntry;

  return (
    <AppShell pageTitle="Sanitation Checklist" role="admin" userName="Admin User" userRole="Administrator">
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9999,
            background: toast === "saved" ? "#16A34A" : "#DC2626",
            color: "white", borderRadius: 8,
            padding: "10px 18px",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            fontSize: 14, fontWeight: 600,
            animation: "slideInUp 0.2s ease",
          }}
        >
          {toast === "saved" ? <CheckCircle size={16}/> : <XCircle size={16}/>}
          {toast === "saved" ? "Checklist saved successfully!" : "Save failed. Try again."}
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title" style={{fontSize:"var(--text-xl)"}}>Sanitation Inspection Checklist</h2>
          <p className="page-subtitle">Lucena City Public Market — Daily Compliance Record</p>
        </div>
        <div className="page-header-actions">
          {isDirty && !isReadOnly && (
            <span style={{fontSize:12,color:"var(--color-warning)",fontWeight:600}}>● Unsaved changes</span>
          )}
          <button
            className={`btn ${viewMode === "history" ? "btn-accent" : "btn-ghost"}`}
            onClick={() => { setViewMode(viewMode === "history" ? "checklist" : "history"); setHistoryEntry(null); }}
          >
            <History size={14}/> History ({history.length})
          </button>
          <button className="btn btn-ghost" onClick={exportCSV}>
            <Download size={14}/> CSV
          </button>
          {!isReadOnly && (
            <button
              className="btn btn-primary"
              onClick={saveChecklist}
              disabled={!isDirty}
              style={{opacity: isDirty ? 1 : 0.5}}
            >
              <Save size={14}/> Save Record
            </button>
          )}
          {isReadOnly && (
            <button className="btn btn-ghost" onClick={() => setHistoryEntry(null)}>
              ← Back to Active
            </button>
          )}
        </div>
      </div>

      {/* ── Responsive styles ─────────────────────────────────────────────── */}
      <style>{`
        .sc-layout {
          display: flex;
          flex-direction: row;
          gap: 16px;
          align-items: flex-start;
        }
        .sc-left {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sc-right {
          width: 220px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sc-table-wrap {
          overflow: auto;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          background: white;
          min-height: 300px;
        }
        .sc-meta-bar {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          padding: 10px 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .sc-meta-field {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        /* Tablet: right panel goes below table */
        @media (max-width: 900px) {
          .sc-layout { flex-direction: column; }
          .sc-right {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
          }
          .sc-right > * { flex: 1 1 200px; }
        }
        /* Mobile: compact meta bar, smaller cells */
        @media (max-width: 600px) {
          .sc-meta-field label { font-size: 11px !important; }
          .sc-meta-field input,
          .sc-meta-field select { font-size: 12px !important; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 8px; }
          .page-header-actions { flex-wrap: wrap; }
        }
      `}</style>

      {/* ── Main Layout ───────────────────────────────────────────────────── */}
      <div className="sc-layout">

        {/* ══ LEFT: Checklist ══════════════════════════════════════════════ */}
        <div className="sc-left">

          {/* ── Metadata bar ─────────────────────────────────────────────── */}
          {viewMode === "checklist" && !isReadOnly && (
            <div className="sc-meta-bar">
              <div className="sc-meta-field">
                <label htmlFor="s-date" style={{fontSize:12, fontWeight:600, whiteSpace:"nowrap", color:"#374151"}}>
                  Date:
                </label>
                <input id="s-date" type="date" value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{fontSize:13, border:"1px solid #D1D5DB", borderRadius:4, padding:"3px 8px", outline:"none"}}
                />
              </div>
              <div className="sc-meta-field">
                <label htmlFor="s-section" style={{fontSize:12, fontWeight:600, whiteSpace:"nowrap", color:"#374151"}}>
                  Section:
                </label>
                <select id="s-section" value={section} onChange={(e) => setSection(e.target.value)}
                  style={{fontSize:13, border:"1px solid #D1D5DB", borderRadius:4, padding:"3px 8px", outline:"none", background:"white"}}
                >
                  {SECTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="sc-meta-field">
                <label htmlFor="s-inspector" style={{fontSize:12, fontWeight:600, whiteSpace:"nowrap", color:"#374151"}}>
                  Inspector:
                </label>
                <input id="s-inspector" value={inspector} onChange={(e) => setInspector(e.target.value)}
                  style={{fontSize:13, border:"1px solid #D1D5DB", borderRadius:4, padding:"3px 8px", outline:"none", width:130}}
                />
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsResetModalOpen(true)}
                title="Clear all checks" aria-label="Clear all checks" style={{flexShrink:0}}>
                <RotateCcw size={12}/> Reset All
              </button>
            </div>
          )}

          {/* ── History banner ────────────────────────────────────────────── */}
          {isReadOnly && historyEntry && (
            <div style={{
              background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:6,
              padding:"8px 14px", fontSize:13, color:"#1D4ED8",
              display:"flex", gap:16, alignItems:"center", flexWrap:"wrap"
            }}>
              <strong>Viewing saved record</strong>
              <span>Date: <b>{historyEntry.date}</b></span>
              <span>Section: <b>{historyEntry.section}</b></span>
              <span>Inspector: <b>{historyEntry.inspector}</b></span>
              <span style={{color:"#6B7280", fontSize:11}}>
                Saved: {new Date(historyEntry.savedAt).toLocaleString()}
              </span>
            </div>
          )}

          {/* ── Table ─────────────────────────────────────────────────────── */}
          <div className="sc-table-wrap">
            {/* Formal header above table */}
            {!isReadOnly && (
              <div style={{
                borderBottom:"2px solid #D1D5DB",
                padding:"8px 14px 6px",
                background:"#F9FAFB",
                display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6
              }}>
                <div>
                  <div style={{fontWeight:700, fontSize:13, color:"#111827"}}>
                    SANITATION INSPECTION REPORT
                  </div>
                  <div style={{fontSize:11, color:"#6B7280"}}>
                    Section: <b>{section}</b> &nbsp;|&nbsp; Date: <b>{date}</b> &nbsp;|&nbsp; Inspector: <b>{inspector}</b>
                  </div>
                </div>
                <div style={{fontSize:11, color:"#6B7280", textAlign:"right"}}>
                  Lucena City Public Market Authority<br/>
                  GeoMarketics Digital Record
                </div>
              </div>
            )}

            <table
              aria-label="Sanitation checklist table"
              style={{
                width:"100%", borderCollapse:"collapse",
                fontSize:12, tableLayout:"auto",
              }}
            >
              {/* Sticky header */}
              <thead>
                <tr style={{background:"#11296B", color:"white"}}>
                  <th scope="col" style={thStyle}>No.</th>
                  <th scope="col" style={{...thStyle, textAlign:"left", minWidth:130}}>Name</th>
                  <th scope="col" style={thStyle}>Stall No.</th>
                  {CHECK_KEYS.map((k) => (
                    <th key={k} scope="col" style={{...thStyle, minWidth:68}}>
                      {CHECK_LABELS[k]}
                      {colViolations[k] > 0 && (
                        <div style={{
                          display:"inline-block", marginLeft:4,
                          background:"#DC2626", color:"white",
                          borderRadius:"50%", width:14, height:14,
                          fontSize:9, fontWeight:700,
                          lineHeight:"14px", textAlign:"center",
                          verticalAlign:"middle",
                        }} aria-label={`${colViolations[k]} violations`}>
                          {colViolations[k]}
                        </div>
                      )}
                    </th>
                  ))}
                  <th scope="col" style={{...thStyle, textAlign:"left", minWidth:120}}>Remarks</th>
                  {!isReadOnly && <th scope="col" style={thStyle}>Reset</th>}
                </tr>
              </thead>

              <tbody>
                {displayRows.length === 0 && (
                  <tr>
                    <td colSpan={CHECK_KEYS.length + 5} style={{textAlign:"center", padding:32, color:"#9CA3AF"}}>
                      No vendors found for this section.
                    </td>
                  </tr>
                )}
                {displayRows.map((row, i) => {
                  const rowCompliant  = CHECK_KEYS.every((k) => row.checks[k] === true);
                  const rowViolation  = CHECK_KEYS.some((k) => row.checks[k] === false);
                  const rowBg         = rowCompliant ? "#F0FDF4" : rowViolation ? "#FFF7F7" : "white";

                  return (
                    <tr
                      key={row.id}
                      style={{
                        background: rowBg,
                        borderBottom:"1px solid #E5E7EB",
                        transition:"background 0.1s",
                      }}
                      onMouseEnter={(e) => { if (!rowCompliant && !rowViolation) (e.currentTarget as HTMLTableRowElement).style.background="#F9FAFB"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background=rowBg; }}
                    >
                      {/* No. */}
                      <td style={tdNum}>{i + 1}</td>

                      {/* Name */}
                      <td style={{...tdBase, textAlign:"left", fontWeight:600, color:"#111827"}}>
                        {row.name}
                      </td>

                      {/* Stall No */}
                      <td style={{...tdNum, fontFamily:"monospace"}}>
                        {row.stallNo}
                      </td>

                      {/* Check cells */}
                      {CHECK_KEYS.map((k) => (
                        <td key={k} style={{...tdBase, textAlign:"center", padding:"4px 6px"}}>
                          {isReadOnly ? (
                            <span style={{
                              fontSize:15, fontWeight:700,
                              color: row.checks[k] === true ? "#16A34A"
                                : row.checks[k] === false ? "#DC2626" : "#D1D5DB"
                            }}>
                              {row.checks[k] === true ? "✔" : row.checks[k] === false ? "✖" : "—"}
                            </span>
                          ) : (
                            <CheckCell
                              value={row.checks[k]}
                              onChange={(v) => toggleCheck(row.id, k, v)}
                            />
                          )}
                        </td>
                      ))}

                      {/* Remarks */}
                      <td style={{...tdBase, padding:"4px 6px"}}>
                        {isReadOnly ? (
                          <span style={{fontSize:11, color:"#6B7280"}}>{row.remarks || "—"}</span>
                        ) : (
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => setRemarks(row.id, e.target.value)}
                            placeholder="Notes…"
                            aria-label={`Remarks for ${row.name}`}
                            style={{
                              width:"100%", fontSize:11, border:"1px solid #E5E7EB",
                              borderRadius:3, padding:"3px 6px", outline:"none",
                              background:"transparent",
                              fontFamily:"inherit",
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor="#11296B")}
                            onBlur={(e)=> (e.currentTarget.style.borderColor="#E5E7EB")}
                          />
                        )}
                      </td>

                      {/* Reset */}
                      {!isReadOnly && (
                        <td style={{...tdBase, textAlign:"center", padding:"4px 6px"}}>
                          <button
                            onClick={() => resetRow(row.id)}
                            aria-label={`Reset row for ${row.name}`}
                            title="Clear this row"
                            style={{
                              background:"none", border:"1px solid #E5E7EB",
                              borderRadius:3, cursor:"pointer", padding:"2px 6px",
                              color:"#9CA3AF", fontSize:11,
                              lineHeight:"20px",
                            }}
                          >×</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ══ RIGHT PANEL ══════════════════════════════════════════════════ */}
        <div className="sc-right">

          {/* Summary Card */}
          <div style={{
            background:"white", border:"1px solid #E5E7EB", borderRadius:6,
            overflow:"hidden",
          }}>
            <div style={{
              background:"#11296B", color:"white",
              padding:"8px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.05em",
              textTransform:"uppercase",
            }}>Summary</div>
            <div style={{padding:"12px", display:"flex", flexDirection:"column", gap:8}}>
              <StatLine label="Vendors" value={`${vendorsChecked} / ${rows.length}`} />
              <StatLine label="Compliant ✔" value={compliant.toString()} color="#16A34A" />
              <StatLine label="Violations ✖" value={noncompliant.toString()} color="#DC2626" />
              <div style={{borderTop:"1px solid #F3F4F6", paddingTop:8}}>
                <div style={{display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4}}>
                  <span style={{color:"#6B7280"}}>Compliance Rate</span>
                  <span style={{fontWeight:700, color: compliancePct >= 80 ? "#16A34A" : compliancePct >= 50 ? "#D97706" : "#DC2626"}}>
                    {compliancePct}%
                  </span>
                </div>
                <div style={{height:6, background:"#F3F4F6", borderRadius:3, overflow:"hidden"}}>
                  <div style={{
                    height:"100%", borderRadius:3,
                    width:`${compliancePct}%`,
                    background: compliancePct >= 80 ? "#16A34A" : compliancePct >= 50 ? "#D97706" : "#DC2626",
                    transition:"width 0.3s",
                  }} role="progressbar" aria-valuenow={compliancePct} aria-valuemin={0} aria-valuemax={100}/>
                </div>
              </div>
            </div>
          </div>

          {/* Violations by Column */}
          <div style={{
            background:"white", border:"1px solid #E5E7EB", borderRadius:6, overflow:"hidden"
          }}>
            <div style={{
              background:"#DC2626", color:"white",
              padding:"8px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase"
            }}>Violations by Item</div>
            <div style={{padding:"10px 12px", display:"flex", flexDirection:"column", gap:5}}>
              {CHECK_KEYS.map((k) => (
                <div key={k} style={{display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11}}>
                  <span style={{color:"#374151"}}>{CHECK_LABELS[k]}</span>
                  <span style={{
                    fontWeight:700,
                    color: colViolations[k] > 0 ? "#DC2626" : "#16A34A",
                  }}>
                    {colViolations[k] > 0 ? colViolations[k] : "✔"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{
            background:"white", border:"1px solid #E5E7EB", borderRadius:6, padding:"10px 12px"
          }}>
            <div style={{fontSize:11, fontWeight:700, color:"#374151", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.04em"}}>Legend</div>
            {[
              { symbol:"✔", bg:"#DCFCE7", border:"#16A34A", color:"#16A34A", label:"Compliant" },
              { symbol:"✖", bg:"#FEE2E2", border:"#DC2626", color:"#DC2626", label:"Non-Compliant" },
              { symbol:"—", bg:"#F9FAFB", border:"#D1D5DB", color:"#9CA3AF", label:"Not Checked" },
            ].map(({ symbol, bg, border, color, label }) => (
              <div key={symbol} style={{display:"flex", alignItems:"center", gap:8, marginBottom:4}}>
                <div style={{
                  width:26, height:22, background:bg, border:`1px solid ${border}`,
                  borderRadius:3, display:"flex", alignItems:"center", justifyContent:"center",
                  color, fontWeight:700, fontSize:12, flexShrink:0,
                }}>{symbol}</div>
                <span style={{fontSize:11, color:"#6B7280"}}>{label}</span>
              </div>
            ))}
          </div>

          {/* History list (scrollable, right panel) */}
          {viewMode === "history" && (
            <div style={{
              flex:1, background:"white", border:"1px solid #E5E7EB", borderRadius:6,
              overflow:"hidden", display:"flex", flexDirection:"column", minHeight:150
            }}>
              <div style={{
                background:"#6B7280", color:"white",
                padding:"8px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase"
              }}>
                Saved Records
              </div>
              <div style={{overflowY:"auto", flex:1}}>
                {history.length === 0 && (
                  <div style={{padding:16, textAlign:"center", color:"#9CA3AF", fontSize:11}}>
                    No saved records yet.
                  </div>
                )}
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => { setHistoryEntry(h); setViewMode("checklist"); }}
                    style={{
                      width:"100%", textAlign:"left", padding:"8px 12px",
                      borderBottom:"1px solid #F3F4F6", background:"none", cursor:"pointer",
                      transition:"background 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background="#F9FAFB")}
                    onMouseLeave={(e) => (e.currentTarget.style.background="none")}
                    aria-label={`View record for ${h.section} on ${h.date}`}
                  >
                    <div style={{fontWeight:600, fontSize:11, color:"#111827"}}>{h.section}</div>
                    <div style={{fontSize:10, color:"#6B7280"}}>{h.date}</div>
                    <div style={{fontSize:10, color:"#9CA3AF"}}>By {h.inspector}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset All Checks"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", width: "100%" }}>
            <button className="btn btn-ghost" onClick={() => setIsResetModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ backgroundColor: "var(--color-error)", borderColor: "var(--color-error)" }} onClick={() => {
              resetAll();
              setIsResetModalOpen(false);
            }}>Reset All</button>
          </div>
        }
      >
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Are you sure you want to clear all checks for this section? This action cannot be undone.
        </p>
      </Modal>

    </AppShell>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────

function StatLine({ label, value, color = "#111827" }: { label:string; value:string; color?:string }) {
  return (
    <div style={{display:"flex", justifyContent:"space-between", fontSize:12}}>
      <span style={{color:"#6B7280"}}>{label}</span>
      <span style={{fontWeight:700, color}}>{value}</span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 6px",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  textAlign: "center",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 2,
  background: "#11296B",
  borderRight: "1px solid rgba(255,255,255,0.15)",
};

const tdBase: React.CSSProperties = {
  padding: "5px 6px",
  verticalAlign: "middle",
  borderRight: "1px solid #F3F4F6",
  fontSize: 12,
};

const tdNum: React.CSSProperties = {
  ...tdBase,
  textAlign: "center",
  color: "#6B7280",
  fontWeight: 600,
  width: 36,
};
