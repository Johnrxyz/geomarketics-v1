"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Search, ChevronRight, ChevronDown } from "lucide-react";
import MarketMap, { MarketStall, STATUS_MAP } from "@/components/map/MarketMap";

// ─── Dummy Data ─────────────────────────────────────────────────────────────

const STALLS: MarketStall[] = [
  { id: "stall-a01", number: "A-01", section: "Section A", vendor: "Maria Santos", category: "Vegetables", status: "owner", x: 1950, y: 1300 },
  { id: "stall-a02", number: "A-02", section: "Section A", vendor: "—", category: "Vegetables", status: "vacant", x: 2250, y: 1300 },
  { id: "stall-a03", number: "A-03", section: "Section A", vendor: "Luis Reyes", category: "Vegetables", status: "closed", x: 2550, y: 1300 },
  { id: "stall-a04", number: "A-04", section: "Section A", vendor: "Juan dela Cruz", category: "Vegetables", status: "rented", x: 2850, y: 1300 },

  { id: "stall-b01", number: "B-01", section: "Section B", vendor: "Pedro Garcia", category: "Meat", status: "owner", x: 1950, y: 2900 },
  { id: "stall-b02", number: "B-02", section: "Section B", vendor: "—", category: "Meat", status: "vacant", x: 2250, y: 2900 },
  { id: "stall-b03", number: "B-03", section: "Section B", vendor: "Ana Torres", category: "Meat", status: "storage", x: 2550, y: 2900 },
  { id: "stall-b12", number: "B-12", section: "Section B", vendor: "Rosa Navarro", category: "Meat", status: "rented", x: 2850, y: 2900 },

  { id: "stall-c01", number: "C-01", section: "Section C", vendor: "Carlo Mendoza", category: "Fish", status: "owner", x: 4650, y: 1300 },
  { id: "stall-c02", number: "C-02", section: "Section C", vendor: "Elena Flores", category: "Fish", status: "owner", x: 4950, y: 1300 },
  { id: "stall-c03", number: "C-03", section: "Section C", vendor: "—", category: "Fish", status: "closed", x: 5250, y: 1300 },

  { id: "stall-d01", number: "D-01", section: "Dry Goods", vendor: "Ben Castillo", category: "Dry Goods", status: "rented", x: 4650, y: 2900 },
  { id: "stall-d02", number: "D-02", section: "Dry Goods", vendor: "—", category: "Dry Goods", status: "storage", x: 4950, y: 2900 },

  { id: "stall-e01", number: "E-01", section: "Cooked Food", vendor: "Nena Cruz", category: "Food", status: "ambulant", x: 6000, y: 2900 },
  { id: "stall-e02", number: "E-02", section: "Cooked Food", vendor: "Tony Ramos", category: "Food", status: "ambulant", x: 6300, y: 2900 },
];

const CATEGORIES = ["All", "Vegetables", "Meat", "Fish", "Dry Goods", "Food"];
const STATUSES = ["All", "closed", "rented", "storage", "ambulant", "vacant", "owner"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function MapPage() {
  const [selectedStallId, setSelectedStallId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  const filtered = STALLS.filter((s) => {
    const matchSearch = !search ||
      s.number.toLowerCase().includes(search.toLowerCase()) ||
      s.vendor.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || s.category === categoryFilter;
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <AppShell pageTitle="Interactive Market Map" role="admin" userName="Admin User" userRole="Administrator">
      <div style={{ display: "flex", gap: "var(--space-5)", height: "calc(100vh - var(--header-height) - var(--space-8)*2)" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: "300px", flexShrink: 0,
          display: "flex", flexDirection: "column", gap: "var(--space-4)",
          overflowY: "auto",
        }} aria-label="Stall filters and list">

          {/* Filters */}
          <div className="card">
            <div className="card-body" style={{ paddingBottom: "var(--space-4)" }}>
              <div className="search-input-wrapper" style={{ maxWidth: "100%", marginBottom: "var(--space-3)" }}>
                <Search size={15} className="search-icon" aria-hidden="true" />
                <input type="search" className="search-input"
                  placeholder="Search stall, vendor..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search stalls" />
              </div>
              <div className="form-group" style={{ marginBottom: "var(--space-2)" }}>
                <label className="form-label" htmlFor="cat-filter">Category</label>
                <select id="cat-filter" className="form-select" value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="status-filter">Status</label>
                <select id="status-filter" className="form-select" value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === "All" ? "All Statuses" : (STATUS_MAP[s as keyof typeof STATUS_MAP]?.label || s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stall List */}
          <div className="card" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div className="card-header">
              <div className="card-title" style={{ fontSize: "var(--text-sm)" }}>
                Stalls ({filtered.length})
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtered.length === 0 ? (
                <div className="empty-state" style={{ padding: "var(--space-8)" }}>
                  <div className="empty-state-title">No stalls found</div>
                </div>
              ) : filtered.map((stall) => {
                const conf = STATUS_MAP[stall.status];
                return (
                  <button key={stall.id} onClick={() => setSelectedStallId(stall.id)}
                    style={{
                      width: "100%", padding: "var(--space-3) var(--space-4)",
                      textAlign: "left",
                      background: selectedStallId === stall.id ? "var(--bg-secondary)" : "transparent",
                      borderBottom: "1px solid #F3F4F6",
                      cursor: "pointer",
                      transition: "background var(--transition-fast)",
                      display: "flex", alignItems: "center", gap: "var(--space-3)",
                    }}
                    aria-label={`View stall ${stall.number}, ${conf.label}`}
                    aria-pressed={selectedStallId === stall.id}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: conf.color,
                      border: `2px solid ${conf.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, fontSize: "10px", fontWeight: 700,
                      color: conf.text,
                    }} aria-hidden="true">{stall.number}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{stall.number}</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {stall.vendor !== "—" ? stall.vendor : "Vacant"} · {stall.category}
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ flexShrink: 0, color: "var(--text-muted)" }} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="card">
            <button 
              className="card-header" 
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              style={{ paddingBottom: isLegendOpen ? "var(--space-3)" : "var(--space-4)", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", border: "none", background: "transparent" }}
              aria-expanded={isLegendOpen}
            >
              <div className="card-title" style={{ fontSize: "var(--text-sm)" }}>Legend</div>
              {isLegendOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isLegendOpen && (
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingTop: 0 }}>
                {(Object.keys(STATUS_MAP) as (keyof typeof STATUS_MAP)[]).map((status) => {
                  const conf = STATUS_MAP[status];
                  return (
                    <div key={status} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4,
                        background: conf.color, border: `2px solid ${conf.border}`,
                        flexShrink: 0
                      }} aria-hidden="true" />
                      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                        {conf.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </aside>

        {/* ── Interactive SVG Map Container ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <MarketMap 
            stalls={STALLS} 
            selectedStallId={selectedStallId} 
            onStallSelect={(s) => setSelectedStallId(s ? s.id : null)}
            showAdminLinks={true}
          />
        </div>
      </div>
    </AppShell>
  );
}
