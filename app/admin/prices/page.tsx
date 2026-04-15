"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { Save, Download, Printer, History, ChevronDown, ChevronRight, CheckCircle, XCircle, RotateCcw, FileText } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PriceEntry {
  id: string;
  category: string;         // e.g. "I"
  categoryLabel: string;    // e.g. "IMPORTED RICE"
  commodity: string;
  specification: string;
  previousPrice: string;
  resp: [string, string, string, string, string]; // Resp 1–5
  remarks: string;
}

interface PriceReport {
  id: string;
  date: string;
  market: string;
  entries: PriceEntry[];
  savedAt: string;
}

// ─── Static Commodity Dataset ───────────────────────────────────────────────

type CommodityTemplate = Omit<PriceEntry, "id" | "resp" | "remarks">;

const COMMODITY_TEMPLATES: CommodityTemplate[] = [
  // I. IMPORTED RICE
  { category:"I",   categoryLabel:"IMPORTED RICE",           commodity:"Regular Milled Rice",      specification:"per kg",    previousPrice:"52.00" },
  { category:"I",   categoryLabel:"IMPORTED RICE",           commodity:"Well Milled Rice",         specification:"per kg",    previousPrice:"56.00" },
  { category:"I",   categoryLabel:"IMPORTED RICE",           commodity:"Special Rice",             specification:"per kg",    previousPrice:"65.00" },
  // II. LOCAL RICE
  { category:"II",  categoryLabel:"LOCAL RICE",              commodity:"Regular Milled Rice",      specification:"per kg",    previousPrice:"48.00" },
  { category:"II",  categoryLabel:"LOCAL RICE",              commodity:"Well Milled Rice",         specification:"per kg",    previousPrice:"53.00" },
  { category:"II",  categoryLabel:"LOCAL RICE",              commodity:"NFA Rice",                 specification:"per kg",    previousPrice:"27.00" },
  // III. CORN
  { category:"III", categoryLabel:"CORN",                    commodity:"White Corn Grits",         specification:"per kg",    previousPrice:"38.00" },
  { category:"III", categoryLabel:"CORN",                    commodity:"Yellow Corn",              specification:"per kg",    previousPrice:"35.00" },
  // IV. MEAT
  { category:"IV",  categoryLabel:"MEAT",                    commodity:"Beef — Kasim",             specification:"per kg",    previousPrice:"380.00" },
  { category:"IV",  categoryLabel:"MEAT",                    commodity:"Beef — Batok/Kenchi",      specification:"per kg",    previousPrice:"320.00" },
  { category:"IV",  categoryLabel:"MEAT",                    commodity:"Pork — Kasim",             specification:"per kg",    previousPrice:"280.00" },
  { category:"IV",  categoryLabel:"MEAT",                    commodity:"Pork — Liempo",            specification:"per kg",    previousPrice:"310.00" },
  { category:"IV",  categoryLabel:"MEAT",                    commodity:"Pork — Pigue",             specification:"per kg",    previousPrice:"290.00" },
  { category:"IV",  categoryLabel:"MEAT",                    commodity:"Chicken (Dressed)",        specification:"per kg",    previousPrice:"180.00" },
  { category:"IV",  categoryLabel:"MEAT",                    commodity:"Chicken Egg",              specification:"per piece", previousPrice:"8.00" },
  { category:"IV",  categoryLabel:"MEAT",                    commodity:"Duck Egg",                 specification:"per piece", previousPrice:"9.00" },
  // V. FISH & SEAFOOD
  { category:"V",   categoryLabel:"FISH & SEAFOOD",          commodity:"Bangus (Milkfish)",        specification:"per kg",    previousPrice:"180.00" },
  { category:"V",   categoryLabel:"FISH & SEAFOOD",          commodity:"Tilapia",                  specification:"per kg",    previousPrice:"130.00" },
  { category:"V",   categoryLabel:"FISH & SEAFOOD",          commodity:"Galunggong (Big)",         specification:"per kg",    previousPrice:"200.00" },
  { category:"V",   categoryLabel:"FISH & SEAFOOD",          commodity:"Galunggong (Small)",       specification:"per kg",    previousPrice:"160.00" },
  { category:"V",   categoryLabel:"FISH & SEAFOOD",          commodity:"Squid",                    specification:"per kg",    previousPrice:"220.00" },
  { category:"V",   categoryLabel:"FISH & SEAFOOD",          commodity:"Shrimp (Sugpo)",           specification:"per kg",    previousPrice:"480.00" },
  { category:"V",   categoryLabel:"FISH & SEAFOOD",          commodity:"Dried Fish (Tuyo)",        specification:"per kg",    previousPrice:"260.00" },
  // VI. VEGETABLES
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Ampalaya (Bitter Gourd)",  specification:"per kg",    previousPrice:"80.00" },
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Cabbage",                  specification:"per kg",    previousPrice:"60.00" },
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Carrots",                  specification:"per kg",    previousPrice:"90.00" },
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Eggplant",                 specification:"per kg",    previousPrice:"60.00" },
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Garlic (Local)",            specification:"per kg",    previousPrice:"220.00" },
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Garlic (Imported)",         specification:"per kg",    previousPrice:"180.00" },
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Ginger",                   specification:"per kg",    previousPrice:"160.00" },
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Onion (Red/Bombay)",       specification:"per kg",    previousPrice:"140.00" },
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Onion (White)",             specification:"per kg",    previousPrice:"120.00" },
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Potato",                   specification:"per kg",    previousPrice:"80.00" },
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Tomato",                   specification:"per kg",    previousPrice:"70.00" },
  { category:"VI",  categoryLabel:"VEGETABLES",              commodity:"Sweet Potato (Kamote)",    specification:"per kg",    previousPrice:"45.00" },
  // VII. FRUITS
  { category:"VII", categoryLabel:"FRUITS",                  commodity:"Banana (Lakatan)",         specification:"per kg",    previousPrice:"80.00" },
  { category:"VII", categoryLabel:"FRUITS",                  commodity:"Banana (Latundan)",        specification:"per kg",    previousPrice:"60.00" },
  { category:"VII", categoryLabel:"FRUITS",                  commodity:"Mango (Green)",            specification:"per kg",    previousPrice:"100.00" },
  { category:"VII", categoryLabel:"FRUITS",                  commodity:"Mango (Ripe)",             specification:"per kg",    previousPrice:"120.00" },
  { category:"VII", categoryLabel:"FRUITS",                  commodity:"Papaya (Green)",           specification:"per kg",    previousPrice:"40.00" },
  { category:"VII", categoryLabel:"FRUITS",                  commodity:"Pineapple",                specification:"per piece", previousPrice:"60.00" },
  // VIII. COOKING OIL
  { category:"VIII",categoryLabel:"COOKING OIL & FATS",      commodity:"Cooking Oil (Fortune)",   specification:"per liter", previousPrice:"85.00" },
  { category:"VIII",categoryLabel:"COOKING OIL & FATS",      commodity:"Cooking Oil (Minola)",    specification:"per liter", previousPrice:"90.00" },
  { category:"VIII",categoryLabel:"COOKING OIL & FATS",      commodity:"Margarine (Eden)",        specification:"per 100g",  previousPrice:"32.00" },
  // IX. SUGAR
  { category:"IX",  categoryLabel:"SUGAR",                   commodity:"Refined Sugar (Washed)",  specification:"per kg",    previousPrice:"78.00" },
  { category:"IX",  categoryLabel:"SUGAR",                   commodity:"Brown Sugar",             specification:"per kg",    previousPrice:"65.00" },
  { category:"IX",  categoryLabel:"SUGAR",                   commodity:"Raw Sugar",               specification:"per kg",    previousPrice:"55.00" },
  // X. CANNED GOODS
  { category:"X",   categoryLabel:"CANNED GOODS",            commodity:"Sardines (Mega Tuna)",    specification:"per 155g",  previousPrice:"22.00" },
  { category:"X",   categoryLabel:"CANNED GOODS",            commodity:"Sardines (555)",          specification:"per 155g",  previousPrice:"24.00" },
  { category:"X",   categoryLabel:"CANNED GOODS",            commodity:"Corned Beef (CDO)",       specification:"per 260g",  previousPrice:"65.00" },
  // XI. CONDIMENTS
  { category:"XI",  categoryLabel:"CONDIMENTS",              commodity:"Salt (Rock)",             specification:"per kg",    previousPrice:"20.00" },
  { category:"XI",  categoryLabel:"CONDIMENTS",              commodity:"Soy Sauce (Silver Swan)", specification:"per 350ml", previousPrice:"22.00" },
  { category:"XI",  categoryLabel:"CONDIMENTS",              commodity:"Vinegar (Datu Puti)",     specification:"per 350ml", previousPrice:"22.00" },
  { category:"XI",  categoryLabel:"CONDIMENTS",              commodity:"Fish Sauce (Rufina)",     specification:"per 350ml", previousPrice:"28.00" },
  { category:"XI",  categoryLabel:"CONDIMENTS",              commodity:"Bagoong (Barrio Fiesta)", specification:"per 250g",  previousPrice:"38.00" },
];

const REMARKS_OPTIONS = ["", "High", "Low", "Stable", "Unavailable", "Seasonal"];
const STORAGE_KEY = "geomarketics_price_reports";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().split("T")[0];

const buildEntries = (): PriceEntry[] =>
  COMMODITY_TEMPLATES.map((t, i) => ({
    id: `e-${i}`,
    ...t,
    resp: ["", "", "", "", ""],
    remarks: "",
  }));

const calcAvg = (resp: [string, string, string, string, string]): string => {
  const vals = resp.map((v) => parseFloat(v)).filter((v) => !isNaN(v) && v > 0);
  if (vals.length === 0) return "";
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
};

const getCategories = (entries: PriceEntry[]) => {
  const seen = new Set<string>();
  const order: string[] = [];
  entries.forEach((e) => { if (!seen.has(e.category)) { seen.add(e.category); order.push(e.category); } });
  return order;
};

const saveToStorage = (reports: PriceReport[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); } catch {}
};
const loadFromStorage = (): PriceReport[] => {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PriceMonitoringPage() {
  const [market, setMarket]   = useState("Lucena City Public Market");
  const [date, setDate]       = useState(todayISO);
  const [entries, setEntries] = useState<PriceEntry[]>(buildEntries);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<PriceReport[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewEntry, setViewEntry] = useState<PriceReport | null>(null);
  const [toast, setToast]     = useState<"saved" | "error" | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setHistory(loadFromStorage()); }, []);

  const showToast = (type: "saved" | "error") => {
    setToast(type);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  // ── Entry mutators ─────────────────────────────────────────────────────────

  const setResp = useCallback((id: string, idx: 0|1|2|3|4, val: string) => {
    setEntries((prev) => prev.map((e) =>
      e.id === id ? { ...e, resp: e.resp.map((r, i) => i === idx ? val : r) as [string,string,string,string,string] } : e
    ));
    setIsDirty(true);
  }, []);

  const setPrevPrice = useCallback((id: string, val: string) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, previousPrice: val } : e));
    setIsDirty(true);
  }, []);

  const setRemarks = useCallback((id: string, val: string) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, remarks: val } : e));
    setIsDirty(true);
  }, []);

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const expandAll  = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(getCategories(entries)));

  // ── Save ────────────────────────────────────────────────────────────────────

  const saveReport = () => {
    const report: PriceReport = {
      id: `pr-${Date.now()}`,
      date, market,
      entries,
      savedAt: new Date().toISOString(),
    };
    const updated = [report, ...history];
    saveToStorage(updated);
    setHistory(updated);
    setIsDirty(false);
    showToast("saved");
  };

  const resetForm = () => { setEntries(buildEntries()); setIsDirty(false); };

  // ── CSV Export ──────────────────────────────────────────────────────────────

  const exportCSV = (src: PriceEntry[] = entries) => {
    const hdr = ["Category","Commodity","Specification","Prev. Price","Resp.1","Resp.2","Resp.3","Resp.4","Resp.5","Average","Remarks"];
    const rows = src.map((e) => [
      `${e.category}. ${e.categoryLabel}`, e.commodity, e.specification, e.previousPrice,
      ...e.resp, calcAvg(e.resp), e.remarks
    ]);
    const csv = [hdr, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `price_report_${market.replace(/\s/g,"_")}_${date}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Print ───────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── Display data (active form or history entry) ────────────────────────────
  const displayEntries = viewEntry ? viewEntry.entries : entries;
  const isReadOnly     = !!viewEntry;
  const categories     = getCategories(displayEntries);

  return (
    <AppShell pageTitle="Price Monitoring" role="admin" userName="Admin User" userRole="Administrator">

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div role="alert" aria-live="polite" style={{
          position:"fixed", bottom:24, right:24, zIndex:9999,
          background: toast==="saved" ? "#16A34A" : "#DC2626",
          color:"white", borderRadius:8, padding:"10px 18px",
          display:"flex", alignItems:"center", gap:8,
          boxShadow:"0 4px 16px rgba(0,0,0,0.2)",
          fontSize:14, fontWeight:600, animation:"slideInUp 0.2s ease",
        }}>
          {toast==="saved" ? <CheckCircle size={16}/> : <XCircle size={16}/>}
          {toast==="saved" ? "Report saved!" : "Save failed. Try again."}
        </div>
      )}

      {/* ── Responsive styles ──────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .pm-table-wrap { overflow: visible !important; }
          body { font-size: 10pt; }
        }
        .pm-resp-input {
          width: 60px; text-align: right;
          border: 1px solid #D1D5DB; border-radius: 2px;
          padding: 2px 4px; font-size: 12px;
          font-family: inherit; outline: none;
          background: transparent;
        }
        .pm-resp-input:focus {
          border-color: #11296B;
          background: #EFF6FF;
        }
        .pm-prev-input {
          width: 68px; text-align: right;
          border: 1px solid #D1D5DB; border-radius: 2px;
          padding: 2px 4px; font-size: 12px;
          font-family: inherit; outline: none;
          background: #FFFBEB;
        }
        .pm-prev-input:focus { border-color: #D97706; background: #FEF3C7; }
        .pm-remarks-input {
          width: 100%; font-size: 11px;
          border: 1px solid #D1D5DB; border-radius: 2px;
          padding: 2px 4px; font-family: inherit; outline: none;
          background: transparent;
        }
        .pm-remarks-input:focus { border-color: #11296B; }
        tr.pm-data-row:hover td { background: #F0F9FF !important; }
        tr.pm-data-row td { transition: background 0.08s; }
        .pm-avg-cell { color: #11296B; font-weight: 700; }
        .pm-avg-high { color: #DC2626; }
        .pm-avg-low  { color: #16A34A; }
        @media (max-width: 768px) {
          .pm-header-meta { flex-direction: column; gap: 6px; }
          .pm-page-actions { flex-wrap: wrap; }
        }
      `}</style>

      {/* ── Page Actions Bar ──────────────────────────────────────────────── */}
      <div className="page-header no-print">
        <div className="page-header-left">
          <h2 className="page-title" style={{fontSize:"var(--text-xl)"}}>Price Monitoring Report Form</h2>
          <p className="page-subtitle">Lucena City Public Market Authority — {date}</p>
        </div>
        <div className="page-header-actions pm-page-actions">
          {isDirty && !isReadOnly && (
            <span style={{fontSize:12, color:"var(--color-warning)", fontWeight:600}}>● Unsaved</span>
          )}
          <button className={`btn ${showHistory ? "btn-accent" : "btn-ghost"}`}
            onClick={() => { setShowHistory(!showHistory); setViewEntry(null); }}>
            <History size={14}/> History ({history.length})
          </button>
          <button className="btn btn-ghost" onClick={() => exportCSV(displayEntries)}>
            <Download size={14}/> CSV
          </button>
          <button className="btn btn-ghost" onClick={handlePrint}>
            <Printer size={14}/> Print
          </button>
          {!isReadOnly && (
            <button className="btn btn-primary" onClick={saveReport}
              disabled={!isDirty} style={{opacity: isDirty ? 1 : 0.5}}>
              <Save size={14}/> Save Report
            </button>
          )}
          {isReadOnly && (
            <button className="btn btn-ghost" onClick={() => setViewEntry(null)}>← Back to Active</button>
          )}
        </div>
      </div>

      {/* History drawer */}
      {showHistory && !viewEntry && (
        <div className="no-print" style={{
          marginBottom:12,
          background:"white", border:"1px solid #E5E7EB", borderRadius:6, overflow:"hidden"
        }}>
          <div style={{background:"#6B7280", color:"white", padding:"6px 14px", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em"}}>
            Saved Reports
          </div>
          {history.length === 0 ? (
            <div style={{padding:16, textAlign:"center", color:"#9CA3AF", fontSize:12}}>No saved reports yet.</div>
          ) : (
            <div style={{display:"flex", flexWrap:"wrap", gap:8, padding:10}}>
              {history.map((h) => (
                <button key={h.id}
                  onClick={() => { setViewEntry(h); setShowHistory(false); }}
                  style={{
                    border:"1px solid #E5E7EB", borderRadius:4, padding:"6px 12px",
                    background:"white", cursor:"pointer", textAlign:"left", fontSize:12,
                  }}
                  onMouseEnter={(e)=>(e.currentTarget.style.background="#F9FAFB")}
                  onMouseLeave={(e)=>(e.currentTarget.style.background="white")}
                >
                  <div style={{fontWeight:600, color:"#111827"}}>{h.date}</div>
                  <div style={{fontSize:10, color:"#6B7280"}}>{h.market}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History view banner */}
      {isReadOnly && viewEntry && (
        <div className="no-print" style={{
          background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:6,
          padding:"8px 14px", fontSize:13, color:"#1D4ED8",
          display:"flex", gap:16, flexWrap:"wrap", alignItems:"center", marginBottom:12
        }}>
          <strong>Viewing saved report</strong>
          <span>Date: <b>{viewEntry.date}</b></span>
          <span>Market: <b>{viewEntry.market}</b></span>
          <span style={{color:"#6B7280", fontSize:11}}>Saved: {new Date(viewEntry.savedAt).toLocaleString()}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(viewEntry.entries)}>
            <Download size={12}/> Export
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          FORM HEADER (paper-form header block)
      ───────────────────────────────────────────────────────────────────── */}
      <div style={{
        background:"white", border:"1px solid #D1D5DB", borderRadius:"6px 6px 0 0",
        borderBottom:"none", padding:"12px 16px",
      }}>
        {/* Official header */}
        <div style={{textAlign:"center", marginBottom:10}}>
          <div style={{fontSize:12, fontWeight:600, color:"#374151"}}>Republic of the Philippines</div>
          <div style={{fontSize:11, color:"#6B7280"}}>Local Government Unit — City of Lucena</div>
          <div style={{fontSize:16, fontWeight:800, color:"#111827", letterSpacing:"0.04em", margin:"6px 0 2px"}}>
            PRICE MONITORING REPORT FORM
          </div>
        </div>

        {/* Meta row */}
        <div className="pm-header-meta" style={{display:"flex", gap:16, flexWrap:"wrap", alignItems:"center", justifyContent:"center"}}>
          <div style={{display:"flex", alignItems:"center", gap:6, fontSize:12}}>
            <label htmlFor="pm-market" style={{fontWeight:600, color:"#374151", whiteSpace:"nowrap"}}>Market:</label>
            {isReadOnly ? (
              <span style={{fontSize:12, color:"#111827"}}>{viewEntry?.market}</span>
            ) : (
              <input id="pm-market" value={market} onChange={(e)=>setMarket(e.target.value)}
                style={{fontSize:12, border:"none", borderBottom:"1px solid #D1D5DB", outline:"none", padding:"2px 4px", width:240}}
              />
            )}
          </div>
          <div style={{display:"flex", alignItems:"center", gap:6, fontSize:12}}>
            <label htmlFor="pm-date" style={{fontWeight:600, color:"#374151", whiteSpace:"nowrap"}}>Date:</label>
            {isReadOnly ? (
              <span>{viewEntry?.date}</span>
            ) : (
              <input id="pm-date" type="date" value={date} onChange={(e)=>setDate(e.target.value)}
                style={{fontSize:12, border:"none", borderBottom:"1px solid #D1D5DB", outline:"none", padding:"2px 4px"}}
              />
            )}
          </div>
          {!isReadOnly && (
            <div className="no-print" style={{display:"flex", gap:6, marginLeft:"auto"}}>
              <button className="btn btn-ghost btn-sm" onClick={expandAll}  title="Expand all">▼ All</button>
              <button className="btn btn-ghost btn-sm" onClick={collapseAll} title="Collapse all">▶ All</button>
              <button className="btn btn-ghost btn-sm" onClick={resetForm}  title="Clear all prices">
                <RotateCcw size={11}/> Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MAIN PRICE TABLE
      ───────────────────────────────────────────────────────────────────── */}
      <div className="pm-table-wrap" style={{
        overflowX:"auto",
        border:"1px solid #D1D5DB", borderRadius:"0 0 6px 6px",
        background:"white",
        maxHeight:"calc(100vh - 280px)",
        overflowY:"auto",
      }}>
        <table aria-label="Price monitoring report table" style={{
          width:"100%", borderCollapse:"collapse",
          fontSize:12, tableLayout:"auto", minWidth:820,
        }}>
          <thead>
            <tr style={{background:"#11296B", color:"white"}}>
              {/* Colspan group: identification */}
              <th rowSpan={2} scope="col" style={{...TH, width:36, borderRight:"1px solid rgba(255,255,255,0.3)"}}>Cat.</th>
              <th rowSpan={2} scope="col" style={{...TH, textAlign:"left", minWidth:160, borderRight:"1px solid rgba(255,255,255,0.3)"}}>Commodity</th>
              <th rowSpan={2} scope="col" style={{...TH, textAlign:"left", minWidth:80, borderRight:"1px solid rgba(255,255,255,0.3)"}}>Specification</th>
              <th rowSpan={2} scope="col" style={{...TH, minWidth:72, borderRight:"2px solid rgba(255,255,255,0.5)"}}>Prev. Price</th>
              {/* Respondents group header */}
              <th colSpan={5} scope="colgroup" style={{...TH, borderBottom:"1px solid rgba(255,255,255,0.3)", borderRight:"2px solid rgba(255,255,255,0.5)"}}>
                Current Prevailing Price (Respondents)
              </th>
              <th rowSpan={2} scope="col" style={{...TH, minWidth:56, borderRight:"1px solid rgba(255,255,255,0.3)"}}>Avg</th>
              <th rowSpan={2} scope="col" style={{...TH, textAlign:"left", minWidth:110}}>Source / Remarks</th>
            </tr>
            <tr style={{background:"#1A3680", color:"white"}}>
              {[1,2,3,4,5].map((n) => (
                <th key={n} scope="col" style={{
                  ...TH, minWidth:64, fontSize:10,
                  borderRight: n === 5 ? "2px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.2)"
                }}>Resp. {n}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {categories.map((cat) => {
              const catEntries = displayEntries.filter((e) => e.category === cat);
              const catLabel   = catEntries[0]?.categoryLabel ?? "";
              const isCollapsed = collapsed.has(cat);
              const catAvg     = catEntries.map((e) => calcAvg(e.resp)).filter(Boolean);
              const catPct     = catEntries.filter((e) => calcAvg(e.resp) !== "").length;

              return [
                /* Category header row */
                <tr key={`cat-${cat}`} style={{background:"#F1F5F9", cursor:"pointer"}}
                  onClick={() => toggleCollapse(cat)}
                >
                  <td colSpan={11} style={{
                    padding:"5px 10px", fontWeight:700, fontSize:12,
                    color:"#11296B", borderBottom:"1px solid #D1D5DB",
                    userSelect:"none",
                  }}>
                    <span className="no-print" style={{marginRight:6, color:"#6B7280", fontSize:10}}>
                      {isCollapsed ? "▶" : "▼"}
                    </span>
                    <span style={{marginRight:6}}>{cat}.</span>
                    {catLabel}
                    <span style={{marginLeft:10, fontSize:10, fontWeight:400, color:"#6B7280"}}>
                      ({catEntries.length} items
                      {catPct > 0 ? `, ${catPct} encoded` : ""})
                    </span>
                  </td>
                </tr>,

                /* Data rows (hide if collapsed) */
                ...(!isCollapsed ? catEntries.map((entry) => {
                  const avg = calcAvg(entry.resp);
                  const prev = parseFloat(entry.previousPrice);
                  const avgNum = parseFloat(avg);
                  const avgClass = !avg ? "" : avgNum > prev * 1.05 ? "pm-avg-high" : avgNum < prev * 0.95 ? "pm-avg-low" : "pm-avg-cell";

                  return (
                    <tr key={entry.id} className="pm-data-row">
                      {/* Cat label */}
                      <td style={{...TD, textAlign:"center", color:"#9CA3AF", fontSize:10, borderRight:"1px solid #E5E7EB"}}>{cat}</td>

                      {/* Commodity */}
                      <td style={{...TD, textAlign:"left", fontWeight:500, borderRight:"1px solid #E5E7EB"}}>
                        {entry.commodity}
                      </td>

                      {/* Specification */}
                      <td style={{...TD, textAlign:"left", color:"#6B7280", borderRight:"1px solid #E5E7EB"}}>
                        {entry.specification}
                      </td>

                      {/* Previous Price */}
                      <td style={{...TD, textAlign:"right", borderRight:"2px solid #E5E7EB", padding:"3px 6px"}}>
                        {isReadOnly ? (
                          <span style={{color:"#92400E"}}>{entry.previousPrice}</span>
                        ) : (
                          <input
                            type="text" inputMode="decimal"
                            className="pm-prev-input no-print"
                            value={entry.previousPrice}
                            onChange={(e) => setPrevPrice(entry.id, e.target.value)}
                            aria-label={`Previous price for ${entry.commodity}`}
                            onFocus={() => setFocusedCell(`${entry.id}-prev`)}
                            onBlur={() => setFocusedCell(null)}
                          />
                        )}
                      </td>

                      {/* Respondent inputs */}
                      {([0,1,2,3,4] as const).map((idx) => (
                        <td key={idx} style={{...TD, textAlign:"right", borderRight: idx===4 ? "2px solid #E5E7EB" : "1px solid #F3F4F6", padding:"3px 6px"}}>
                          {isReadOnly ? (
                            <span>{entry.resp[idx] || "—"}</span>
                          ) : (
                            <input
                              type="text" inputMode="decimal"
                              className="pm-resp-input"
                              value={entry.resp[idx]}
                              onChange={(e) => setResp(entry.id, idx, e.target.value)}
                              aria-label={`Respondent ${idx+1} price for ${entry.commodity}`}
                              onFocus={() => setFocusedCell(`${entry.id}-r${idx}`)}
                              onBlur={(e) => {
                                setFocusedCell(null);
                                const n = parseFloat(e.target.value);
                                if (!isNaN(n) && e.target.value !== "") {
                                  setResp(entry.id, idx, n.toFixed(2));
                                }
                              }}
                            />
                          )}
                        </td>
                      ))}

                      {/* Auto Average */}
                      <td style={{...TD, textAlign:"right", borderRight:"1px solid #E5E7EB", fontWeight:700, fontSize:11}}>
                        <span className={avgClass}>{avg || ""}</span>
                      </td>

                      {/* Remarks */}
                      <td style={{...TD, padding:"3px 6px"}}>
                        {isReadOnly ? (
                          <span style={{color:"#6B7280", fontSize:11}}>{entry.remarks || "—"}</span>
                        ) : (
                          <select
                            className="pm-remarks-input"
                            value={REMARKS_OPTIONS.includes(entry.remarks) ? entry.remarks : ""}
                            onChange={(e) => setRemarks(entry.id, e.target.value)}
                            aria-label={`Remarks for ${entry.commodity}`}
                          >
                            {REMARKS_OPTIONS.map((o) => (
                              <option key={o} value={o}>{o || "—"}</option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                }) : []),
              ];
            })}
          </tbody>

          {/* Footer totals row */}
          <tfoot>
            <tr style={{background:"#F9FAFB", borderTop:"2px solid #D1D5DB"}}>
              <td colSpan={4} style={{...TD, textAlign:"right", fontWeight:700, fontSize:11, color:"#374151"}}>
                Items encoded:
              </td>
              <td colSpan={5} style={{...TD, fontWeight:700, fontSize:11, color:"#11296B", textAlign:"center"}}>
                {displayEntries.filter((e) => e.resp.some((r) => r !== "")).length} / {displayEntries.length}
              </td>
              <td colSpan={2} style={{...TD, fontSize:10, color:"#6B7280", textAlign:"right"}}>
                Prepared by: Market Inspector
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </AppShell>
  );
}

// ─── Style constants ─────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: "6px 8px",
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: "0.04em",
  textAlign: "center",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 3,
};

const TD: React.CSSProperties = {
  padding: "4px 8px",
  verticalAlign: "middle",
  borderBottom: "1px solid #F3F4F6",
  fontSize: 12,
};
