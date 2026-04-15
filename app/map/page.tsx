"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Search, X, ChevronRight, User, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ─── Dummy Data & Types ───────────────────────────────────────────────────────

interface Stall {
  id: string;
  number: string;
  section: string;
  vendor: string;
  category: string;
  status: "closed" | "rented" | "storage" | "ambulant" | "vacant" | "owner";
  // SVG Pixel Coordinates based on a 7800x5100 map
  x: number;
  y: number;
}

const STALLS: Stall[] = [
  { id: "stall-a01", number: "A-01", section: "Section A", vendor: "Maria Santos",    category: "Vegetables", status: "owner",   x: 1800, y: 1500 },
  { id: "stall-a02", number: "A-02", section: "Section A", vendor: "—",               category: "Vegetables", status: "vacant",  x: 2100, y: 1500 },
  { id: "stall-a03", number: "A-03", section: "Section A", vendor: "Luis Reyes",      category: "Vegetables", status: "closed",  x: 2400, y: 1500 },
  { id: "stall-a04", number: "A-04", section: "Section A", vendor: "Juan dela Cruz",  category: "Vegetables", status: "rented",  x: 2700, y: 1500 },
  
  { id: "stall-b01", number: "B-01", section: "Section B", vendor: "Pedro Garcia",    category: "Meat",       status: "owner",   x: 1800, y: 2500 },
  { id: "stall-b02", number: "B-02", section: "Section B", vendor: "—",               category: "Meat",       status: "vacant",  x: 2100, y: 2500 },
  { id: "stall-b03", number: "B-03", section: "Section B", vendor: "Ana Torres",      category: "Meat",       status: "storage", x: 2400, y: 2500 },
  { id: "stall-b12", number: "B-12", section: "Section B", vendor: "Rosa Navarro",    category: "Meat",       status: "rented",  x: 2700, y: 2500 },
  
  { id: "stall-c01", number: "C-01", section: "Section C", vendor: "Carlo Mendoza",   category: "Fish",       status: "owner",   x: 4800, y: 2000 },
  { id: "stall-c02", number: "C-02", section: "Section C", vendor: "Elena Flores",    category: "Fish",       status: "owner",   x: 5100, y: 2000 },
  { id: "stall-c03", number: "C-03", section: "Section C", vendor: "—",               category: "Fish",       status: "closed",  x: 5400, y: 2000 },
  
  { id: "stall-d01", number: "D-01", section: "Dry Goods", vendor: "Ben Castillo",    category: "Dry Goods",  status: "rented",  x: 4500, y: 3500 },
  { id: "stall-d02", number: "D-02", section: "Dry Goods", vendor: "—",               category: "Dry Goods",  status: "storage", x: 4800, y: 3500 },
  
  { id: "stall-e01", number: "E-01", section: "Cooked Food", vendor: "Nena Cruz",     category: "Food",       status: "ambulant",x: 6000, y: 4000 },
  { id: "stall-e02", number: "E-02", section: "Cooked Food", vendor: "Tony Ramos",    category: "Food",       status: "ambulant",x: 6300, y: 4000 },
];

const STATUS_MAP: Record<Stall["status"], { label: string; color: string; border: string; text: string }> = {
  closed:   { label: "Closed / No Op", color: "#9333EA", border: "#7E22CE", text: "#FFFFFF" }, // Purple
  rented:   { label: "With Renter",    color: "#F97316", border: "#C2410C", text: "#FFFFFF" }, // Orange
  storage:  { label: "Storage/Bodega", color: "#16A34A", border: "#15803D", text: "#FFFFFF" }, // Green
  ambulant: { label: "Ambulant Vendor",color: "#EAB308", border: "#B45309", text: "#FFFFFF" }, // Yellow
  vacant:   { label: "Vacant",         color: "#3B82F6", border: "#1D4ED8", text: "#FFFFFF" }, // Blue
  owner:    { label: "Owner Managed",  color: "#FFFFFF", border: "#D1D5DB", text: "#111827" }, // White
};

const CATEGORIES = ["All", "Vegetables", "Meat", "Fish", "Dry Goods", "Food"];
const STATUSES: Array<"All" | Stall["status"]> = ["All", "closed", "rented", "storage", "ambulant", "vacant", "owner"];

const SVG_WIDTH = 7800;
const SVG_HEIGHT = 5100;

// ─── Component ───────────────────────────────────────────────────────────────

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selected, setSelected] = useState<Stall | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  
  // Pan and Zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.15 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const isAnimating = useRef(false);

  const filtered = STALLS.filter((s) => {
    const matchSearch = !search ||
      s.number.toLowerCase().includes(search.toLowerCase()) ||
      s.vendor.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || s.category === categoryFilter;
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  // Fit initial scale based on container width
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      const initialScale = Math.max(width / SVG_WIDTH, 0.1);
      
      // Center map initially
      const initX = (width - SVG_WIDTH * initialScale) / 2;
      const initY = (height - SVG_HEIGHT * initialScale) / 2;
      
      setTransform({ x: initX, y: initY, scale: initialScale });
    }
  }, []);

  // ─── Pan & Zoom Handlers ───────────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Only left click
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    if (containerRef.current) containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    
    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    if (containerRef.current) containerRef.current.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current || isAnimating.current) return;

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    let newScale = transform.scale * Math.exp(delta);
    
    // Clamp scale
    if (newScale < 0.05) newScale = 0.05;
    if (newScale > 2) newScale = 2;
    
    // Zoom toward mouse pointer
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate new panning offsets to keep the point under the mouse exactly where it is
    const targetX = (mouseX - transform.x) / transform.scale;
    const targetY = (mouseY - transform.y) / transform.scale;
    
    const newX = mouseX - targetX * newScale;
    const newY = mouseY - targetY * newScale;

    setTransform({ x: newX, y: newY, scale: newScale });
  };

  // Fly to a stall when clicked
  const flyToStall = (stall: Stall) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const targetScale = 0.6; // zoomed in
    
    // Center of viewport
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    
    const newX = cx - (stall.x * targetScale);
    const newY = cy - (stall.y * targetScale);
    
    isAnimating.current = true;
    setTransform({ x: newX, y: newY, scale: targetScale });
    setSelected(stall);
    
    setTimeout(() => {
      isAnimating.current = false;
    }, 600); // Wait for transition
  };

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
                      {s === "All" ? "All Statuses" : STATUS_MAP[s].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="card">
            <div className="card-header" style={{ paddingBottom: "var(--space-3)" }}>
              <div className="card-title" style={{ fontSize: "var(--text-sm)" }}>Legend</div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {(Object.keys(STATUS_MAP) as Stall["status"][]).map((status) => {
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
                  <button key={stall.id} onClick={() => flyToStall(stall)}
                    style={{
                      width: "100%", padding: "var(--space-3) var(--space-4)",
                      textAlign: "left",
                      background: selected?.id === stall.id ? "var(--bg-secondary)" : "transparent",
                      borderBottom: "1px solid #F3F4F6",
                      cursor: "pointer",
                      transition: "background var(--transition-fast)",
                      display: "flex", alignItems: "center", gap: "var(--space-3)",
                    }}
                    aria-label={`View stall ${stall.number}, ${conf.label}`}
                    aria-pressed={selected?.id === stall.id}
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
        </aside>

        {/* ── Interactive SVG Map Container ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div 
            ref={containerRef}
            style={{
              flex: 1, borderRadius: "var(--radius-lg)", overflow: "hidden",
              boxShadow: "var(--shadow-lg)", position: "relative", minHeight: "400px",
              background: "#F3F4F6", // map background
              cursor: isDragging.current ? "grabbing" : "grab",
              touchAction: "none" // Prevent browser panning
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
            role="application"
            aria-label="Interactive Market Map Canvas"
          >
            
            {/* The transformed layer */}
            <div style={{
              transformOrigin: "0 0",
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transition: isAnimating.current ? "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
              position: "absolute",
              top: 0, left: 0,
              width: SVG_WIDTH, height: SVG_HEIGHT,
            }}>
              
              {/* Native SVG Map underlying layer */}
              <Image 
                src="/svg map.svg" 
                alt="Market Map" 
                width={SVG_WIDTH} 
                height={SVG_HEIGHT} 
                priority
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
              />

              {/* Dynamic Stall Overlays */}
              {STALLS.map(stall => {
                const conf = STATUS_MAP[stall.status];
                const isSelected = selected?.id === stall.id;

                return (
                  <button 
                    key={stall.id}
                    onClick={(e) => { e.stopPropagation(); flyToStall(stall); }}
                    style={{
                      position: "absolute",
                      left: stall.x,
                      top: stall.y,
                      transform: `translate(-50%, -50%) scale(${isSelected ? 1.5 : 1})`,
                      width: 140, height: 80, // Size relative to the giant 7800x5100 SVG map
                      background: conf.color,
                      border: `8px solid ${conf.border}`,
                      borderRadius: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: conf.text,
                      fontSize: "36px", fontWeight: "bold",
                      cursor: "pointer",
                      boxShadow: isSelected ? "0 40px 60px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.3)",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      zIndex: isSelected ? 10 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.15)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
                    }}
                    title={`Stall ${stall.number} - ${conf.label}`}
                  >
                    {stall.number}
                  </button>
                );
              })}

            </div>

            {/* Selected Stall Bottom Panel Overlay */}
            {selected && (
              <div style={{
                position: "absolute", bottom: "var(--space-6)", left: "50%",
                transform: "translateX(-50%)",
                background: "white", borderRadius: "12px",
                padding: "var(--space-4) var(--space-6)",
                boxShadow: "var(--shadow-xl)",
                display: "flex", alignItems: "center", gap: "var(--space-6)",
                minWidth: "360px", maxWidth: "90%", zIndex: 1000,
                border: `2px solid ${STATUS_MAP[selected.status].border}`,
                animation: "slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              }} role="region" aria-label="Selected stall details">

                <div style={{
                  width: 48, height: 48, borderRadius: "8px",
                  background: STATUS_MAP[selected.status].color,
                  border: `2px solid ${STATUS_MAP[selected.status].border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: STATUS_MAP[selected.status].text,
                  fontWeight: 800, fontSize: "16px", flexShrink: 0,
                }} aria-hidden="true">{selected.number}</div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827" }}>
                    {selected.number} <span style={{ color: "#6B7280", fontWeight: 600, fontSize: "14px" }}>· {selected.section}</span>
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: 2 }}>
                    <User size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} />
                    {selected.vendor !== "—" ? selected.vendor : "No vendor assigned"} <span style={{opacity:0.5}}>|</span> <span style={{fontWeight:600}}>{selected.category}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span 
                      className="badge" 
                      style={{ 
                        background: STATUS_MAP[selected.status].color, 
                        color: STATUS_MAP[selected.status].text,
                        border: `1px solid ${STATUS_MAP[selected.status].border}`,
                        padding: "4px 10px", borderRadius: "100px", fontSize: "12px"
                      }}
                    >
                      {STATUS_MAP[selected.status].label}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                  <Link href={`/admin/vendor/profile`} className="btn btn-primary" style={{ padding: "8px 16px" }}>
                    Manage
                  </Link>
                  <button className="btn btn-ghost" onClick={() => setSelected(null)}
                    aria-label="Close stall info" style={{ padding: "8px" }}>
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
            
            {/* Visual Helper Overlay (Optional instructions) */}
            {!selected && (
               <div style={{
                 position: "absolute", bottom: "var(--space-4)", left: "50%", transform: "translateX(-50%)",
                 background: "rgba(0,0,0,0.6)", color: "white", padding: "6px 12px", borderRadius: "20px",
                 fontSize: "12px", backdropFilter: "blur(4px)", pointerEvents: "none",
               }}>
                 Scroll to Zoom · Drag to Map
               </div>
            )}
            
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </AppShell>
  );
}
