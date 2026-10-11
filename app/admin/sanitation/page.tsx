"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import AppShell from "@/components/layout/AppShell";
import Modal from "@/components/ui/Modal";
import {
  Save, CheckCircle, XCircle, Clock, Download, History, Plus, RotateCcw,
  Search, Filter, LayoutGrid, Table as TableIcon, Check, CheckCheck, X,
  ChevronDown, ChevronUp, AlertTriangle, Sparkles, MessageSquare, ShieldCheck,
  User, Store
} from "lucide-react";
import { sanitationApi, vendorsApi, sectionsApi, getUser } from "@/lib/api";

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
  vendorId: number;
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

interface ApiSection {
  id: number;
  code: string;
  name: string;
}

const CHECK_KEYS: (keyof CheckColumns)[] = ["id", "uniform", "hairnet", "apron", "boots", "mask", "permit"];
const CHECK_LABELS: Record<keyof CheckColumns, string> = {
  id: "ID",
  uniform: "Uniform",
  hairnet: "Hair Net",
  apron: "Apron",
  boots: "Boots",
  mask: "Spit Guard / Mask",
  permit: "Bus. Permit",
};

// CHECK_KEY to API item name mapping
const CHECK_KEY_TO_NAME: Record<string, string> = {
  id: "id_verification", uniform: "uniform", hairnet: "hair_net",
  apron: "apron", boots: "boots", mask: "mask", permit: "business_permit",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().split("T")[0];

const emptyChecks = (): CheckColumns => ({
  id: null, uniform: null, hairnet: null,
  apron: null, boots: null, mask: null, permit: null
});

const buildRows = (vendors: any[]): ChecklistRow[] =>
  (vendors || []).map((v) => ({
    id: `row-${v.id}`,
    vendorId: v.id,
    name: v.full_name || `${v.first_name} ${v.last_name}`,
    stallNo: v.stall_number || "—",
    checks: emptyChecks(),
    remarks: "",
  }));

// ─── Cell Toggle Button (Table View) ────────────────────────────────────────

function CheckCell({
  value, onChange
}: { value: CheckState; onChange: (v: CheckState) => void }) {
  // Cycle: null → true → false → null
  const cycle = () => {
    if (value === null) onChange(true);
    else if (value === true) onChange(false);
    else onChange(null);
  };

  if (value === true) return (
    <button
      type="button"
      onClick={cycle}
      aria-label="Compliant — click to toggle"
      style={{
        width: 36, height: 30,
        background: "#DCFCE7", border: "1.5px solid #16A34A",
        borderRadius: 5, cursor: "pointer",
        color: "#16A34A", fontWeight: 800, fontSize: 16,
        lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.1s ease",
      }}
    >✔</button>
  );

  if (value === false) return (
    <button
      type="button"
      onClick={cycle}
      aria-label="Non-compliant — click to toggle"
      style={{
        width: 36, height: 30,
        background: "#FEE2E2", border: "1.5px solid #DC2626",
        borderRadius: 5, cursor: "pointer",
        color: "#DC2626", fontWeight: 800, fontSize: 16,
        lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.1s ease",
      }}
    >✖</button>
  );

  // null / empty
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label="Not checked — click to toggle"
      style={{
        width: 36, height: 30,
        background: "#F9FAFB", border: "1px solid #D1D5DB",
        borderRadius: 5, cursor: "pointer",
        color: "#9CA3AF", fontSize: 14, fontWeight: 700,
        lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.1s ease",
      }}
    >—</button>
  );
}

// ─── Inspection Chip (Mobile Card View) ─────────────────────────────────────

function InspectionChip({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: CheckState;
  onChange: (v: CheckState) => void;
  disabled?: boolean;
}) {
  const cycle = () => {
    if (disabled) return;
    if (value === null) onChange(true);
    else if (value === true) onChange(false);
    else onChange(null);
  };

  const isPass = value === true;
  const isFail = value === false;

  return (
    <button
      type="button"
      onClick={cycle}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 10px",
        borderRadius: "8px",
        minHeight: "44px",
        border: "1.5px solid",
        borderColor: isPass ? "#16A34A" : isFail ? "#DC2626" : "#E2E8F0",
        background: isPass ? "#F0FDF4" : isFail ? "#FEF2F2" : "#FFFFFF",
        color: isPass ? "#15803D" : isFail ? "#B91C1C" : "#334155",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        width: "100%",
        boxSizing: "border-box",
        boxShadow: isPass || isFail ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
      }}
      aria-label={`${label}: ${isPass ? "Passed" : isFail ? "Failed" : "Unchecked"} — tap to toggle`}
    >
      <span style={{ fontSize: "12px", fontWeight: 700, textAlign: "left", lineHeight: 1.2 }}>{label}</span>
      <span
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isPass ? "#16A34A" : isFail ? "#DC2626" : "#F1F5F9",
          color: isPass || isFail ? "white" : "#94A3B8",
          fontWeight: 800,
          fontSize: "13px",
          flexShrink: 0,
          marginLeft: "6px",
        }}
      >
        {isPass ? "✔" : isFail ? "✖" : "—"}
      </span>
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SanitationPage() {
  const [sections, setSections] = useState<ApiSection[]>([]);
  const [sectionId, setSectionId] = useState<string>("");
  const [date, setDate] = useState(todayISO);
  const [inspector, setInspector] = useState("");
  const [rows, setRows] = useState<ChecklistRow[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [history, setHistory] = useState<SavedChecklist[]>([]);
  const [viewMode, setViewMode] = useState<"checklist" | "history">("checklist");
  const [historyEntry, setHistoryEntry] = useState<SavedChecklist | null>(null);
  const [toast, setToast] = useState<"saved" | "error" | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [apiCheckItems, setApiCheckItems] = useState<Record<string, number>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ── Field Inspector Enhancements ───────────────────────────────────────────
  const [displayMode, setDisplayMode] = useState<"cards" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "violations" | "compliant">("all");
  const [isPassAllModalOpen, setIsPassAllModalOpen] = useState(false);
  const [expandedRemarks, setExpandedRemarks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDisplayMode(window.innerWidth >= 900 ? "table" : "cards");
    }
  }, []);

  useEffect(() => {
    const usr = getUser();
    setUser(usr);
    if (usr) {
      setInspector(usr.first_name ? `${usr.first_name} ${usr.last_name}` : usr.username);
    }
  }, []);

  // Load API metadata and history
  useEffect(() => {
    sectionsApi.list().then((data: any) => {
      const arr = Array.isArray(data) ? data : data.results || [];
      const activeSections = arr.filter((s: any) => s.stall_count > 0);
      const displaySections = activeSections.length > 0 ? activeSections : arr;
      setSections(displaySections);
      if (displaySections.length > 0) {
        setSectionId(String(displaySections[0].id));
      }
    }).catch(() => { });

    sanitationApi.checkItems().then((items: any) => {
      const map: Record<string, number> = {};
      (items || []).forEach((item: any) => { map[item.name] = item.id; });
      setApiCheckItems(map);
    }).catch(() => { });

    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await sanitationApi.sessions() as any;
      const sessionList = Array.isArray(res) ? res : res.results || [];

      const formattedHistory: SavedChecklist[] = sessionList.map((s: any) => ({
        id: String(s.id),
        date: s.date,
        section: s.section_name || `Section ${s.section}`,
        inspector: s.conducted_by_name || "Unknown",
        rows: [],
        savedAt: s.created_at,
      }));
      setHistory(formattedHistory);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const fetchFullSession = async (sessionId: string) => {
    try {
      const s = await sanitationApi.getSession(sessionId) as any;
      const revMap: Record<number, keyof CheckColumns> = {};
      Object.entries(CHECK_KEY_TO_NAME).forEach(([col, apiName]) => {
        const id = apiCheckItems[apiName];
        if (id) revMap[id] = col as keyof CheckColumns;
      });

      const rowsMap: Record<number, ChecklistRow> = {};
      (s.records || []).forEach((rec: any) => {
        const vId = rec.vendor;
        if (!rowsMap[vId]) {
          rowsMap[vId] = {
            id: `row-${vId}`,
            vendorId: vId,
            name: rec.vendor_name || "Unknown",
            stallNo: "—",
            checks: emptyChecks(),
            remarks: "",
          };
        }
        const colKey = revMap[rec.check_item];
        if (colKey) {
          rowsMap[vId].checks[colKey] = rec.status === "pass" ? true : rec.status === "fail" ? false : null;
          if (rec.remarks) {
            rowsMap[vId].remarks = rowsMap[vId].remarks ? `${rowsMap[vId].remarks} | ${rec.remarks}` : rec.remarks;
          }
        }
      });

      const entry: SavedChecklist = {
        id: String(s.id),
        date: s.date,
        section: s.section_name || `Section ${s.section}`,
        inspector: s.conducted_by_name || "Unknown",
        rows: Object.values(rowsMap),
        savedAt: s.created_at,
      };

      setHistoryEntry(entry);
      setViewMode("checklist");
    } catch (e) {
      console.error("Failed to fetch session", e);
    }
  };

  // Rebuild rows when section changes
  useEffect(() => {
    if (!sectionId) return;
    setIsLoading(true);
    vendorsApi.list({ stall__section: sectionId, is_active: "true" }).then((data: any) => {
      const vends = Array.isArray(data) ? data : data.results || [];
      setVendors(vends);
      setRows(buildRows(vends));
      setIsDirty(false);
    }).catch(() => {
      setVendors([]);
      setRows([]);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [sectionId]);

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

  const passAllRow = useCallback((rowId: string) => {
    setRows((prev) => prev.map((r) =>
      r.id === rowId ? {
        ...r,
        checks: { id: true, uniform: true, hairnet: true, apron: true, boots: true, mask: true, permit: true }
      } : r
    ));
    setIsDirty(true);
  }, []);

  const passAllSection = useCallback(() => {
    setRows((prev) => prev.map((r) => ({
      ...r,
      checks: { id: true, uniform: true, hairnet: true, apron: true, boots: true, mask: true, permit: true }
    })));
    setIsDirty(true);
  }, []);

  const resetAll = () => {
    setRows(buildRows(vendors));
    setIsDirty(false);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveChecklist = async () => {
    try {
      const session = await sanitationApi.createSession({ date, section: parseInt(sectionId, 10), notes: `Inspector: ${inspector}` }) as { id: number };

      const apiRecords: any[] = [];
      rows.forEach((row) => {
        CHECK_KEYS.forEach((key) => {
          const itemName = CHECK_KEY_TO_NAME[key];
          const itemId = apiCheckItems[itemName];
          if (itemId) {
            apiRecords.push({
              vendor: row.vendorId,
              check_item: itemId,
              status: row.checks[key] === true ? "pass" : row.checks[key] === false ? "fail" : "na",
              remarks: row.remarks,
            });
          }
        });
      });

      if (apiRecords.length > 0) {
        await sanitationApi.bulkSave(session.id, apiRecords);
      }

      setIsDirty(false);
      resetAll();
      showToast("saved");
      loadHistory();
    } catch (e) {
      console.error(e);
      showToast("error");
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalChecks = rows.reduce((sum, r) =>
    sum + CHECK_KEYS.filter((k) => r.checks[k] !== null).length, 0);
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
    const activeSectionName = sections.find(s => String(s.id) === sectionId)?.name || "Unknown";
    const header = ["No", "Name", "Stall No", ...CHECK_KEYS.map((k) => CHECK_LABELS[k]), "Remarks"];
    const body = rows.map((r, i) => [
      i + 1, r.name, r.stallNo,
      ...CHECK_KEYS.map((k) => r.checks[k] === true ? "✔" : r.checks[k] === false ? "✖" : ""),
      r.remarks
    ]);
    const csv = [header, ...body].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sanitation_${activeSectionName.replace(/\\s/g, "_")}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render active history entry ────────────────────────────────────────────

  const displayRows = historyEntry ? historyEntry.rows : rows;
  const isReadOnly = !!historyEntry;
  const activeSectionName = sections.find(s => String(s.id) === sectionId)?.name || "Unknown";

  // Filtered rows for fast inspector searching and triaging
  const filteredRows = useMemo(() => {
    return displayRows.filter((row) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.name.toLowerCase().includes(q);
        const matchesStall = row.stallNo.toLowerCase().includes(q);
        if (!matchesName && !matchesStall) return false;
      }
      if (filterStatus === "pending") {
        return CHECK_KEYS.some((k) => row.checks[k] === null);
      }
      if (filterStatus === "violations") {
        return CHECK_KEYS.some((k) => row.checks[k] === false);
      }
      if (filterStatus === "compliant") {
        return CHECK_KEYS.every((k) => row.checks[k] === true);
      }
      return true;
    });
  }, [displayRows, searchQuery, filterStatus]);

  const pendingCount = useMemo(() => {
    return displayRows.filter((r) => CHECK_KEYS.some((k) => r.checks[k] === null)).length;
  }, [displayRows]);

  const violationCount = useMemo(() => {
    return displayRows.filter((r) => CHECK_KEYS.some((k) => r.checks[k] === false)).length;
  }, [displayRows]);

  const compliantRowCount = useMemo(() => {
    return displayRows.filter((r) => CHECK_KEYS.every((k) => r.checks[k] === true)).length;
  }, [displayRows]);

  return (
    <AppShell pageTitle="Sanitation Checklist" role="admin" userName={inspector} userRole="Administrator">
      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position: "fixed", bottom: 80, right: 20, zIndex: 9999,
            background: toast === "saved" ? "#16A34A" : "#DC2626",
            color: "white", borderRadius: 8,
            padding: "10px 18px",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            fontSize: 14, fontWeight: 600,
            animation: "slideInUp 0.2s ease",
          }}
        >
          {toast === "saved" ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast === "saved" ? "Checklist saved successfully!" : "Save failed. Try again."}
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: "14px" }}>
        <div className="page-header-left">
          <h2 className="page-title" style={{ fontSize: "var(--text-xl)" }}>Sanitation Inspection Checklist</h2>
          <p className="page-subtitle">Lucena City Public Market — Daily Field Compliance Record</p>
        </div>
        <div className="page-header-actions">
          {isDirty && !isReadOnly && (
            <span style={{ fontSize: 12, color: "var(--color-warning)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#D97706" }} />
              Unsaved changes
            </span>
          )}
          <button
            className={`btn ${viewMode === "history" ? "btn-accent" : "btn-ghost"}`}
            onClick={() => { setViewMode(viewMode === "history" ? "checklist" : "history"); setHistoryEntry(null); }}
          >
            <History size={14} /> History ({history.length})
          </button>
          <button className="btn btn-ghost" onClick={exportCSV}>
            <Download size={14} /> CSV
          </button>
          {!isReadOnly && (
            <button
              className="btn btn-primary"
              onClick={saveChecklist}
              disabled={!isDirty}
              style={{ opacity: isDirty ? 1 : 0.5 }}
            >
              <Save size={14} /> Save Record
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
          width: 100%;
          max-width: 100%;
        }
        .sc-left {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 100%;
        }
        .sc-right {
          width: 250px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Top KPI Bar */
        .sc-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          width: 100%;
        }
        .sc-kpi-card {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .sc-kpi-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748B;
        }
        .sc-kpi-val {
          font-size: 20px;
          font-weight: 800;
          color: #0F172A;
          line-height: 1.2;
        }

        /* Inspector Toolbar */
        .sc-toolbar {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .sc-toolbar-left {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 260px;
        }
        .sc-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 160px;
          max-width: 280px;
        }
        .sc-search-wrap input {
          width: 100%;
          padding: 6px 10px 6px 30px;
          font-size: 12px;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          outline: none;
          background: #F8FAFC;
        }
        .sc-search-wrap input:focus {
          border-color: #2563EB;
          background: white;
        }
        .sc-pill-group {
          display: flex;
          align-items: center;
          gap: 4px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 2px;
        }
        .sc-filter-pill {
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          color: #475569;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .sc-filter-pill:hover {
          background: #F1F5F9;
        }
        .sc-filter-pill.active {
          background: #11296B;
          color: white;
          border-color: #11296B;
        }
        .sc-view-toggle {
          display: inline-flex;
          background: #F1F5F9;
          padding: 2px;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
        }
        .sc-view-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          border: none;
          background: transparent;
          color: #64748B;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sc-view-btn.active {
          background: white;
          color: #0F172A;
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
        }

        /* Card Mode Grid */
        .sc-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 12px;
          width: 100%;
        }
        .sc-vendor-card {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: all 0.15s ease;
        }
        .sc-vendor-card.compliant {
          border-color: #86EFAC;
          background: #F0FDF4;
        }
        .sc-vendor-card.violation {
          border-color: #FECACA;
          background: #FEF2F2;
        }
        .sc-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        .sc-chips-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        /* Table mode */
        .sc-table-wrap {
          overflow-x: auto;
          overflow-y: hidden;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          background: white;
          min-height: 300px;
          -webkit-overflow-scrolling: touch;
          width: 100%;
        }
        .sc-sticky-col-1 {
          position: sticky;
          left: 0;
          z-index: 3;
          background: inherit;
        }
        .sc-sticky-col-2 {
          position: sticky;
          left: 36px;
          z-index: 3;
          background: inherit;
        }
        .sc-sticky-col-3 {
          position: sticky;
          left: 176px;
          z-index: 3;
          background: inherit;
          box-shadow: 2px 0 4px -1px rgba(0,0,0,0.07);
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

        /* Sticky bottom bar for mobile inspector */
        .sc-sticky-bottom-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid #CBD5E1;
          padding: 10px 16px;
          display: none;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          z-index: 999;
          box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
        }

        /* Breakpoints */
        @media (max-width: 900px) {
          .sc-layout { flex-direction: column; padding-bottom: 74px; }
          .sc-right {
            width: 100%;
            flex-direction: row;
            flex-wrap: wrap;
          }
          .sc-right > * { flex: 1 1 200px; }
          .sc-sticky-bottom-bar { display: flex; }
        }

        @media (max-width: 600px) {
          .sc-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .sc-meta-field label { font-size: 11px !important; }
          .sc-meta-field input,
          .sc-meta-field select { font-size: 12px !important; }
          .page-header { flex-direction: column; align-items: flex-start; gap: 10px; }
          .page-header-actions { flex-wrap: wrap; width: 100%; gap: 6px; }
          .page-header-actions .btn { flex: 1; justify-content: center; min-width: 100px; font-size: 12px; padding: 6px 10px; }
          .sc-toolbar-left { min-width: 100%; }
          .sc-search-wrap { max-width: 100%; }
        }
      `}</style>

      {/* ── Top KPI Metrics Bar ───────────────────────────────────────────── */}
      <div className="sc-kpi-grid">
        <div className="sc-kpi-card">
          <span className="sc-kpi-title">Stalls Inspected</span>
          <div className="sc-kpi-val">{vendorsChecked} <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>/ {rows.length}</span></div>
          <span style={{ fontSize: 10, color: "#64748B" }}>
            {rows.length > 0 ? `${Math.round((vendorsChecked / rows.length) * 100)}% complete` : "No vendors"}
          </span>
        </div>
        <div className="sc-kpi-card">
          <span className="sc-kpi-title">Compliant Checks</span>
          <div className="sc-kpi-val" style={{ color: "#16A34A" }}>{compliant}</div>
          <span style={{ fontSize: 10, color: "#16A34A" }}>
            {compliantRowCount} stalls all pass
          </span>
        </div>
        <div className="sc-kpi-card">
          <span className="sc-kpi-title">Violations Detected</span>
          <div className="sc-kpi-val" style={{ color: noncompliant > 0 ? "#DC2626" : "#64748B" }}>{noncompliant}</div>
          <span style={{ fontSize: 10, color: noncompliant > 0 ? "#DC2626" : "#64748B" }}>
            {violationCount} stalls flagged
          </span>
        </div>
        <div className="sc-kpi-card">
          <span className="sc-kpi-title">Compliance Rate</span>
          <div className="sc-kpi-val" style={{ color: compliancePct >= 80 ? "#16A34A" : compliancePct >= 50 ? "#D97706" : "#DC2626" }}>
            {compliancePct}%
          </div>
          <div style={{ height: 4, background: "#E2E8F0", borderRadius: 2, overflow: "hidden", marginTop: 2 }}>
            <div
              style={{
                height: "100%",
                width: `${compliancePct}%`,
                background: compliancePct >= 80 ? "#16A34A" : compliancePct >= 50 ? "#D97706" : "#DC2626",
                borderRadius: 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Main Layout ───────────────────────────────────────────────────── */}
      <div className="sc-layout">

        {/* ══ LEFT: Checklist ══════════════════════════════════════════════ */}
        <div className="sc-left">

          {/* ── Metadata bar ─────────────────────────────────────────────── */}
          {viewMode === "checklist" && !isReadOnly && (
            <div className="sc-meta-bar">
              <div className="sc-meta-field">
                <label htmlFor="s-date" style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: "#374151" }}>
                  Date:
                </label>
                <input id="s-date" type="date" value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ fontSize: 13, border: "1px solid #D1D5DB", borderRadius: 4, padding: "3px 8px", outline: "none" }}
                />
              </div>
              <div className="sc-meta-field">
                <label htmlFor="s-section" style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: "#374151" }}>
                  Section:
                </label>
                <select id="s-section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}
                  style={{ fontSize: 13, border: "1px solid #D1D5DB", borderRadius: 4, padding: "3px 8px", outline: "none", background: "white" }}
                >
                  {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="sc-meta-field">
                <label htmlFor="s-inspector" style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", color: "#374151" }}>
                  Inspector:
                </label>
                <input id="s-inspector" value={inspector} onChange={(e) => setInspector(e.target.value)}
                  style={{ fontSize: 13, border: "1px solid #D1D5DB", borderRadius: 4, padding: "3px 8px", outline: "none", width: 130 }}
                />
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsResetModalOpen(true)}
                title="Clear all checks" aria-label="Clear all checks" style={{ flexShrink: 0, marginLeft: "auto" }}>
                <RotateCcw size={12} /> Reset All
              </button>
            </div>
          )}

          {/* ── History banner ────────────────────────────────────────────── */}
          {isReadOnly && historyEntry && (
            <div style={{
              background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6,
              padding: "8px 14px", fontSize: 13, color: "#1D4ED8",
              display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap"
            }}>
              <strong>Viewing saved record</strong>
              <span>Date: <b>{historyEntry.date}</b></span>
              <span>Section: <b>{historyEntry.section}</b></span>
              <span>Inspector: <b>{historyEntry.inspector}</b></span>
              <span style={{ color: "#6B7280", fontSize: 11 }}>
                Saved: {new Date(historyEntry.savedAt).toLocaleString()}
              </span>
            </div>
          )}

          {/* ── Inspector Toolbar ─────────────────────────────────────────── */}
          <div className="sc-toolbar">
            <div className="sc-toolbar-left">
              {/* Search input */}
              <div className="sc-search-wrap">
                <Search size={14} style={{ position: "absolute", left: 10, color: "#94A3B8" }} />
                <input
                  type="text"
                  placeholder="Search stall # or vendor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Filter vendors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#94A3B8" }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status filter pills */}
              <div className="sc-pill-group">
                <button
                  type="button"
                  className={`sc-filter-pill ${filterStatus === "all" ? "active" : ""}`}
                  onClick={() => setFilterStatus("all")}
                >
                  All ({displayRows.length})
                </button>
                <button
                  type="button"
                  className={`sc-filter-pill ${filterStatus === "pending" ? "active" : ""}`}
                  onClick={() => setFilterStatus("pending")}
                >
                  Needs Check ({pendingCount})
                </button>
                <button
                  type="button"
                  className={`sc-filter-pill ${filterStatus === "violations" ? "active" : ""}`}
                  onClick={() => setFilterStatus("violations")}
                  style={filterStatus === "violations" ? { background: "#DC2626", borderColor: "#DC2626", color: "white" } : {}}
                >
                  Violations ({violationCount})
                </button>
                <button
                  type="button"
                  className={`sc-filter-pill ${filterStatus === "compliant" ? "active" : ""}`}
                  onClick={() => setFilterStatus("compliant")}
                  style={filterStatus === "compliant" ? { background: "#16A34A", borderColor: "#16A34A", color: "white" } : {}}
                >
                  Passed ({compliantRowCount})
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Pass All Section Button */}
              {!isReadOnly && displayRows.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsPassAllModalOpen(true)}
                  style={{ color: "#16A34A", fontWeight: 700, borderColor: "#BBF7D0", background: "#F0FDF4" }}
                  title="Mark all vendors in this section as Passed"
                >
                  <CheckCheck size={14} /> Pass All Section
                </button>
              )}

              {/* View mode toggle (Cards vs Table) */}
              <div className="sc-view-toggle">
                <button
                  type="button"
                  className={`sc-view-btn ${displayMode === "cards" ? "active" : ""}`}
                  onClick={() => setDisplayMode("cards")}
                  title="Card View (Mobile-optimized tactile chips)"
                >
                  <LayoutGrid size={13} /> Cards
                </button>
                <button
                  type="button"
                  className={`sc-view-btn ${displayMode === "table" ? "active" : ""}`}
                  onClick={() => setDisplayMode("table")}
                  title="Table View (Full spreadsheet)"
                >
                  <TableIcon size={13} /> Table
                </button>
              </div>
            </div>
          </div>

          {/* ── CARD VIEW MODE ────────────────────────────────────────────── */}
          {displayMode === "cards" && (
            <div className="sc-card-grid">
              {isLoading && displayRows.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 48, background: "white", borderRadius: 8, color: "#94A3B8" }}>
                  Loading vendors for inspection...
                </div>
              )}
              {!isLoading && filteredRows.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 48, background: "white", borderRadius: 8, color: "#94A3B8" }}>
                  {searchQuery || filterStatus !== "all"
                    ? "No vendors match the current filter or search criteria."
                    : "No active vendors found for this section."}
                </div>
              )}
              {filteredRows.map((row, i) => {
                const rowCompliant = CHECK_KEYS.every((k) => row.checks[k] === true);
                const rowViolation = CHECK_KEYS.some((k) => row.checks[k] === false);
                const rowViolationsCount = CHECK_KEYS.filter((k) => row.checks[k] === false).length;
                const isRemarksExpanded = expandedRemarks[row.id] || !!row.remarks;

                return (
                  <div
                    key={row.id}
                    className={`sc-vendor-card ${rowCompliant ? "compliant" : rowViolation ? "violation" : ""}`}
                  >
                    {/* Header */}
                    <div className="sc-card-header">
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "#EEF2FF", color: "#1E3A8A",
                          fontWeight: 700, fontSize: 12,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, marginTop: 2
                        }}>
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", lineHeight: 1.2 }}>
                            {row.name}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <span style={{
                              fontFamily: "monospace", fontSize: 11, fontWeight: 700,
                              background: "#F1F5F9", color: "#475569",
                              padding: "1px 6px", borderRadius: 4
                            }}>
                              Stall #{row.stallNo}
                            </span>
                            {rowCompliant && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#16A34A", background: "#DCFCE7", padding: "1px 6px", borderRadius: 4 }}>
                                ✔ Compliant
                              </span>
                            )}
                            {rowViolation && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", background: "#FEE2E2", padding: "1px 6px", borderRadius: 4 }}>
                                ✖ {rowViolationsCount} {rowViolationsCount === 1 ? "Violation" : "Violations"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Header Actions */}
                      {!isReadOnly && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => passAllRow(row.id)}
                            style={{
                              background: rowCompliant ? "#DCFCE7" : "#F0FDF4",
                              border: "1px solid #86EFAC",
                              color: "#16A34A",
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                            title="Mark all 7 items as Passed"
                          >
                            <Check size={12} /> Pass All
                          </button>
                          <button
                            type="button"
                            onClick={() => resetRow(row.id)}
                            style={{
                              background: "none", border: "1px solid #E2E8F0",
                              borderRadius: 6, padding: "4px 6px", color: "#94A3B8",
                              fontSize: 11, cursor: "pointer",
                            }}
                            title="Clear vendor checks"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Chips Grid */}
                    <div className="sc-chips-grid">
                      {CHECK_KEYS.map((k) => (
                        <InspectionChip
                          key={k}
                          label={CHECK_LABELS[k]}
                          value={row.checks[k]}
                          disabled={isReadOnly}
                          onChange={(newVal) => toggleCheck(row.id, k, newVal)}
                        />
                      ))}
                    </div>

                    {/* Remarks Input / Display */}
                    <div style={{ borderTop: "1px dashed #E2E8F0", paddingTop: 8, marginTop: 2 }}>
                      {isReadOnly ? (
                        <div style={{ fontSize: 11, color: "#64748B" }}>
                          Remarks: {row.remarks || "—"}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <MessageSquare size={13} style={{ color: "#94A3B8", flexShrink: 0 }} />
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => setRemarks(row.id, e.target.value)}
                            placeholder="Add remarks / violation notes…"
                            style={{
                              flex: 1, fontSize: 12, border: "1px solid #E2E8F0",
                              borderRadius: 6, padding: "5px 8px", outline: "none",
                              background: "#F8FAFC",
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TABLE VIEW MODE ───────────────────────────────────────────── */}
          {displayMode === "table" && (
            <div className="sc-table-wrap">
              {!isReadOnly && (
                <div style={{
                  borderBottom: "2px solid #D1D5DB",
                  padding: "8px 14px 6px",
                  background: "#F9FAFB",
                  display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>
                      SANITATION INSPECTION REPORT
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>
                      Section: <b>{activeSectionName}</b> &nbsp;|&nbsp; Date: <b>{date}</b> &nbsp;|&nbsp; Inspector: <b>{inspector}</b>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", textAlign: "right" }}>
                    Lucena City Public Market Authority<br />
                    GeoMarketics Digital Record
                  </div>
                </div>
              )}

              <table
                aria-label="Sanitation checklist table"
                style={{
                  width: "100%", borderCollapse: "collapse",
                  fontSize: 12, tableLayout: "auto",
                }}
              >
                <thead>
                  <tr style={{ background: "#11296B", color: "white" }}>
                    <th scope="col" style={{ ...thStyle, ...stickyHeader1 }}>No.</th>
                    <th scope="col" style={{ ...thStyle, ...stickyHeader2, textAlign: "left", minWidth: 130 }}>Name</th>
                    <th scope="col" style={{ ...thStyle, ...stickyHeader3 }}>Stall No.</th>
                    {!isReadOnly && <th scope="col" style={{ ...thStyle, minWidth: 64 }}>Quick</th>}
                    {CHECK_KEYS.map((k) => (
                      <th key={k} scope="col" style={{ ...thStyle, minWidth: 68 }}>
                        {CHECK_LABELS[k]}
                        {colViolations[k] > 0 && (
                          <div style={{
                            display: "inline-block", marginLeft: 4,
                            background: "#DC2626", color: "white",
                            borderRadius: "50%", width: 14, height: 14,
                            fontSize: 9, fontWeight: 700,
                            lineHeight: "14px", textAlign: "center",
                            verticalAlign: "middle",
                          }} aria-label={`${colViolations[k]} violations`}>
                            {colViolations[k]}
                          </div>
                        )}
                      </th>
                    ))}
                    <th scope="col" style={{ ...thStyle, textAlign: "left", minWidth: 120 }}>Remarks</th>
                    {!isReadOnly && <th scope="col" style={thStyle}>Reset</th>}
                  </tr>
                </thead>

                <tbody>
                  {isLoading && displayRows.length === 0 && (
                    <tr>
                      <td colSpan={CHECK_KEYS.length + 6} style={{ textAlign: "center", padding: 32, color: "#9CA3AF" }}>
                        Loading vendors...
                      </td>
                    </tr>
                  )}
                  {!isLoading && filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={CHECK_KEYS.length + 6} style={{ textAlign: "center", padding: 32, color: "#9CA3AF" }}>
                        {searchQuery || filterStatus !== "all"
                          ? "No vendors match the current filter or search criteria."
                          : "No active vendors found for this section."}
                      </td>
                    </tr>
                  )}
                  {filteredRows.map((row, i) => {
                    const rowCompliant = CHECK_KEYS.every((k) => row.checks[k] === true);
                    const rowViolation = CHECK_KEYS.some((k) => row.checks[k] === false);
                    const rowBg = rowCompliant ? "#F0FDF4" : rowViolation ? "#FFF7F7" : "white";

                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: rowBg,
                          borderBottom: "1px solid #E5E7EB",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => { if (!rowCompliant && !rowViolation) (e.currentTarget as HTMLTableRowElement).style.background = "#F9FAFB"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}
                      >
                        <td style={{ ...tdNum, ...stickyCell1, background: rowBg }}>{i + 1}</td>
                        <td style={{ ...tdBase, ...stickyCell2, background: rowBg, textAlign: "left", fontWeight: 600, color: "#111827" }}>
                          {row.name}
                        </td>
                        <td style={{ ...tdNum, ...stickyCell3, background: rowBg, fontFamily: "monospace" }}>
                          {row.stallNo}
                        </td>
                        {!isReadOnly && (
                          <td style={{ ...tdBase, textAlign: "center", padding: "4px" }}>
                            <button
                              type="button"
                              onClick={() => passAllRow(row.id)}
                              style={{
                                background: "#DCFCE7", border: "1px solid #86EFAC",
                                borderRadius: 4, cursor: "pointer", padding: "2px 6px",
                                color: "#16A34A", fontSize: 10, fontWeight: 700,
                              }}
                              title="Pass all for this vendor"
                            >
                              ✔ All
                            </button>
                          </td>
                        )}
                        {CHECK_KEYS.map((k) => (
                          <td key={k} style={{ ...tdBase, textAlign: "center", padding: "4px 6px" }}>
                            {isReadOnly ? (
                              <span style={{
                                fontSize: 15, fontWeight: 700,
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
                        <td style={{ ...tdBase, padding: "4px 6px" }}>
                          {isReadOnly ? (
                            <span style={{ fontSize: 11, color: "#6B7280" }}>{row.remarks || "—"}</span>
                          ) : (
                            <input
                              type="text"
                              value={row.remarks}
                              onChange={(e) => setRemarks(row.id, e.target.value)}
                              placeholder="Notes…"
                              aria-label={`Remarks for ${row.name}`}
                              style={{
                                width: "100%", fontSize: 11, border: "1px solid #E5E7EB",
                                borderRadius: 3, padding: "3px 6px", outline: "none",
                                background: "transparent",
                                fontFamily: "inherit",
                              }}
                              onFocus={(e) => (e.currentTarget.style.borderColor = "#11296B")}
                              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                            />
                          )}
                        </td>
                        {!isReadOnly && (
                          <td style={{ ...tdBase, textAlign: "center", padding: "4px 6px" }}>
                            <button
                              onClick={() => resetRow(row.id)}
                              aria-label={`Reset row for ${row.name}`}
                              title="Clear this row"
                              style={{
                                background: "none", border: "1px solid #E5E7EB",
                                borderRadius: 3, cursor: "pointer", padding: "2px 6px",
                                color: "#9CA3AF", fontSize: 11,
                                lineHeight: "20px",
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
          )}
        </div>

        {/* ══ RIGHT PANEL ══════════════════════════════════════════════════ */}
        <div className="sc-right">

          <div style={{
            background: "white", border: "1px solid #E5E7EB", borderRadius: 6,
            overflow: "hidden",
          }}>
            <div style={{
              background: "#11296B", color: "white",
              padding: "8px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}>Summary</div>
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
              <StatLine label="Vendors" value={`${vendorsChecked} / ${rows.length}`} />
              <StatLine label="Compliant ✔" value={compliant.toString()} color="#16A34A" />
              <StatLine label="Violations ✖" value={noncompliant.toString()} color="#DC2626" />
              <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "#6B7280" }}>Compliance Rate</span>
                  <span style={{ fontWeight: 700, color: compliancePct >= 80 ? "#16A34A" : compliancePct >= 50 ? "#D97706" : "#DC2626" }}>
                    {compliancePct}%
                  </span>
                </div>
                <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${compliancePct}%`,
                    background: compliancePct >= 80 ? "#16A34A" : compliancePct >= 50 ? "#D97706" : "#DC2626",
                    transition: "width 0.3s",
                  }} role="progressbar" aria-valuenow={compliancePct} aria-valuemin={0} aria-valuemax={100} />
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: "white", border: "1px solid #E5E7EB", borderRadius: 6, overflow: "hidden"
          }}>
            <div style={{
              background: "#DC2626", color: "white",
              padding: "8px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase"
            }}>Violations by Item</div>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
              {CHECK_KEYS.map((k) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                  <span style={{ color: "#374151" }}>{CHECK_LABELS[k]}</span>
                  <span style={{
                    fontWeight: 700,
                    color: colViolations[k] > 0 ? "#DC2626" : "#16A34A",
                  }}>
                    {colViolations[k] > 0 ? colViolations[k] : "✔"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: "white", border: "1px solid #E5E7EB", borderRadius: 6, padding: "10px 12px"
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Legend</div>
            {[
              { symbol: "✔", bg: "#DCFCE7", border: "#16A34A", color: "#16A34A", label: "Compliant" },
              { symbol: "✖", bg: "#FEE2E2", border: "#DC2626", color: "#DC2626", label: "Non-Compliant" },
              { symbol: "—", bg: "#F9FAFB", border: "#D1D5DB", color: "#9CA3AF", label: "Not Checked" },
            ].map(({ symbol, bg, border, color, label }) => (
              <div key={symbol} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{
                  width: 26, height: 22, background: bg, border: `1px solid ${border}`,
                  borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center",
                  color, fontWeight: 700, fontSize: 12, flexShrink: 0,
                }}>{symbol}</div>
                <span style={{ fontSize: 11, color: "#6B7280" }}>{label}</span>
              </div>
            ))}
          </div>

          {viewMode === "history" && (
            <div style={{
              flex: 1, background: "white", border: "1px solid #E5E7EB", borderRadius: 6,
              overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 150
            }}>
              <div style={{
                background: "#6B7280", color: "white",
                padding: "8px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase"
              }}>
                Saved Records
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {history.length === 0 && (
                  <div style={{ padding: 16, textAlign: "center", color: "#9CA3AF", fontSize: 11 }}>
                    No saved records yet.
                  </div>
                )}
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => fetchFullSession(h.id)}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 12px",
                      borderBottom: "1px solid #F3F4F6", background: "none", cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    aria-label={`View record for ${h.section} on ${h.date}`}
                  >
                    <div style={{ fontWeight: 600, fontSize: 11, color: "#111827" }}>{h.section}</div>
                    <div style={{ fontSize: 10, color: "#6B7280" }}>{h.date}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF" }}>By {h.inspector}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Sticky Bottom Action Bar ──────────────────────────────── */}
      {!isReadOnly && (
        <div className="sc-sticky-bottom-bar">
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
              {vendorsChecked} of {rows.length} Stalls Checked
            </div>
            <div style={{ fontSize: 11, color: compliancePct >= 80 ? "#16A34A" : compliancePct >= 50 ? "#D97706" : "#DC2626", fontWeight: 600 }}>
              {compliancePct}% Compliance Rate
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={saveChecklist}
            disabled={!isDirty}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: isDirty ? "0 4px 12px rgba(17,41,107,0.3)" : "none",
              opacity: isDirty ? 1 : 0.5,
            }}
          >
            <Save size={16} /> Save Record
          </button>
        </div>
      )}

      {/* ── Reset All Modal ──────────────────────────────────────────────── */}
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

      {/* ── Pass All Section Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={isPassAllModalOpen}
        onClose={() => setIsPassAllModalOpen(false)}
        title="Pass All Vendors in Section"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", width: "100%" }}>
            <button className="btn btn-ghost" onClick={() => setIsPassAllModalOpen(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              style={{ backgroundColor: "#16A34A", borderColor: "#16A34A" }}
              onClick={() => {
                passAllSection();
                setIsPassAllModalOpen(false);
              }}
            >
              Confirm Pass All
            </button>
          </div>
        }
      >
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Are you sure you want to mark all <b>{rows.length}</b> vendors in <b>{activeSectionName}</b> as Passed (✔) across all sanitation items?
        </p>
      </Modal>

    </AppShell>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────

function StatLine({ label, value, color = "#111827" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "#6B7280" }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
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

const stickyHeader1: React.CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 4,
};

const stickyHeader2: React.CSSProperties = {
  position: "sticky",
  left: 36,
  zIndex: 4,
};

const stickyHeader3: React.CSSProperties = {
  position: "sticky",
  left: 176,
  zIndex: 4,
  boxShadow: "2px 0 4px -1px rgba(0,0,0,0.2)",
};

const stickyCell1: React.CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 2,
};

const stickyCell2: React.CSSProperties = {
  position: "sticky",
  left: 36,
  zIndex: 2,
};

const stickyCell3: React.CSSProperties = {
  position: "sticky",
  left: 176,
  zIndex: 2,
  boxShadow: "2px 0 4px -1px rgba(0,0,0,0.07)",
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

