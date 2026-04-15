"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Search, X, ChevronRight, MapPin, User } from "lucide-react";
import Link from "next/link";

interface Stall {
  id: string;
  number: string;
  section: string;
  vendor: string;
  category: string;
  status: "occupied" | "vacant" | "flagged" | "reserved";
  // lat/lng pairs as a polygon (rectangle approximation per stall)
  lat: number;
  lng: number;
}

const STALLS: Stall[] = [
  { id: "stall-a01", number: "A-01", section: "Section A", vendor: "Maria Santos",    category: "Vegetables", status: "occupied", lat: 14.44220, lng: 121.02720 },
  { id: "stall-a02", number: "A-02", section: "Section A", vendor: "—",               category: "Vegetables", status: "vacant",   lat: 14.44250, lng: 121.02720 },
  { id: "stall-a03", number: "A-03", section: "Section A", vendor: "Luis Reyes",      category: "Vegetables", status: "occupied", lat: 14.44280, lng: 121.02720 },
  { id: "stall-a04", number: "A-04", section: "Section A", vendor: "Juan dela Cruz",  category: "Vegetables", status: "flagged",  lat: 14.44310, lng: 121.02720 },
  { id: "stall-b01", number: "B-01", section: "Section B", vendor: "Pedro Garcia",    category: "Meat",       status: "occupied", lat: 14.44220, lng: 121.02800 },
  { id: "stall-b02", number: "B-02", section: "Section B", vendor: "—",               category: "Meat",       status: "vacant",   lat: 14.44250, lng: 121.02800 },
  { id: "stall-b03", number: "B-03", section: "Section B", vendor: "Ana Torres",      category: "Meat",       status: "reserved", lat: 14.44280, lng: 121.02800 },
  { id: "stall-b12", number: "B-12", section: "Section B", vendor: "Rosa Navarro",    category: "Meat",       status: "flagged",  lat: 14.44310, lng: 121.02800 },
  { id: "stall-c01", number: "C-01", section: "Section C", vendor: "Carlo Mendoza",   category: "Fish",       status: "occupied", lat: 14.44220, lng: 121.02880 },
  { id: "stall-c02", number: "C-02", section: "Section C", vendor: "Elena Flores",    category: "Fish",       status: "occupied", lat: 14.44250, lng: 121.02880 },
  { id: "stall-c03", number: "C-03", section: "Section C", vendor: "—",               category: "Fish",       status: "vacant",   lat: 14.44280, lng: 121.02880 },
  { id: "stall-d01", number: "D-01", section: "Dry Goods", vendor: "Ben Castillo",    category: "Dry Goods",  status: "occupied", lat: 14.44340, lng: 121.02750 },
  { id: "stall-d02", number: "D-02", section: "Dry Goods", vendor: "—",               category: "Dry Goods",  status: "vacant",   lat: 14.44340, lng: 121.02790 },
  { id: "stall-e01", number: "E-01", section: "Cooked Food", vendor: "Nena Cruz",     category: "Food",       status: "occupied", lat: 14.44370, lng: 121.02820 },
  { id: "stall-e02", number: "E-02", section: "Cooked Food", vendor: "Tony Ramos",    category: "Food",       status: "occupied", lat: 14.44370, lng: 121.02860 },
];

const STATUS_COLORS: Record<string, string> = {
  occupied: "#11296B",
  vacant:   "#FFCB05",
  flagged:  "#DC2626",
  reserved: "#F59E0B",
};

const STATUS_BORDER: Record<string, string> = {
  occupied: "#0A1B4A",
  vacant:   "#E6B800",
  flagged:  "#B91C1C",
  reserved: "#D97706",
};

const STALL_SIZE = 0.00012; // ~13m side in degrees (approx)

const CATEGORIES = ["All", "Vegetables", "Meat", "Fish", "Dry Goods", "Food"];
const STATUSES: Array<"All" | Stall["status"]> = ["All", "occupied", "vacant", "flagged", "reserved"];

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);

  const [selected, setSelected] = useState<Stall | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = STALLS.filter((s) => {
    const matchSearch = !search ||
      s.number.toLowerCase().includes(search.toLowerCase()) ||
      s.vendor.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || s.category === categoryFilter;
    const matchStatus = statusFilter === "All" || s.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  // Initialize Leaflet map
  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      if (!mapContainerRef.current || mapRef.current) return;

      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (cancelled) return;

      const map = L.map(mapContainerRef.current, {
        center: [14.44290, 121.02790],
        zoom: 18,
        zoomControl: true,
      });

      mapRef.current = map;

      // OpenStreetMap tile layer — no API key required
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 22,
      }).addTo(map);

      // Draw stalls as rectangles
      STALLS.forEach((stall) => {
        const half = STALL_SIZE / 2;
        const bounds: [[number, number], [number, number]] = [
          [stall.lat - half, stall.lng - half],
          [stall.lat + half, stall.lng + half],
        ];

        const rect = L.rectangle(bounds, {
          color:       STATUS_BORDER[stall.status],
          fillColor:   STATUS_COLORS[stall.status],
          fillOpacity: 0.85,
          weight:      2,
        });

        // Tooltip on hover
        rect.bindTooltip(
          `<strong>Stall ${stall.number}</strong><br/>${stall.section} · ${stall.category}<br/>${stall.vendor !== "—" ? stall.vendor : "Vacant"}`,
          { direction: "top", offset: [0, -4], className: "leaflet-custom-tooltip" }
        );

        // Label marker (DivIcon)
        const labelIcon = L.divIcon({
          html: `<div style="
            background:${STATUS_COLORS[stall.status]};
            color:${stall.status === "vacant" ? "#92400E" : "#fff"};
            font-size:9px;font-weight:700;
            width:36px;height:36px;
            display:flex;align-items:center;justify-content:center;
            border-radius:5px;
            border:2px solid ${STATUS_BORDER[stall.status]};
            box-shadow:0 2px 6px rgba(0,0,0,0.25);
            cursor:pointer;
            font-family:Inter,Arial,sans-serif;
          ">${stall.number}</div>`,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([stall.lat, stall.lng], { icon: labelIcon });

        const handleClick = () => setSelected(stall);
        rect.on("click", handleClick);
        marker.on("click", handleClick);

        rect.on("mouseover", () => {
          rect.setStyle({ fillOpacity: 1, weight: 3 });
        });
        rect.on("mouseout", () => {
          rect.setStyle({ fillOpacity: 0.85, weight: 2 });
        });

        rect.addTo(map);
        marker.addTo(map);
        layersRef.current.push(rect, marker);
      });
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layersRef.current = [];
      }
    };
  }, []);

  // Fly to selected stall on map
  useEffect(() => {
    if (selected && mapRef.current) {
      mapRef.current.flyTo([selected.lat, selected.lng], 20, { duration: 0.8 });
    }
  }, [selected]);

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
                      {s === "All" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
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
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {(Object.entries(STATUS_COLORS) as [string, string][]).map(([status, color]) => (
                <div key={status} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: color, border: `2px solid ${STATUS_BORDER[status]}`,
                    flexShrink: 0
                  }} aria-hidden="true" />
                  <span style={{ fontSize: "var(--text-sm)", textTransform: "capitalize", color: "var(--text-secondary)" }}>
                    {status}
                  </span>
                </div>
              ))}
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
              ) : filtered.map((stall) => (
                <button key={stall.id} onClick={() => setSelected(stall)}
                  style={{
                    width: "100%", padding: "var(--space-3) var(--space-4)",
                    textAlign: "left",
                    background: selected?.id === stall.id ? "var(--bg-secondary)" : "transparent",
                    borderBottom: "1px solid #F3F4F6",
                    cursor: "pointer",
                    transition: "background var(--transition-fast)",
                    display: "flex", alignItems: "center", gap: "var(--space-3)",
                  }}
                  aria-label={`View stall ${stall.number}, ${stall.status}`}
                  aria-pressed={selected?.id === stall.id}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 4,
                    background: STATUS_COLORS[stall.status],
                    border: `2px solid ${STATUS_BORDER[stall.status]}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontSize: "9px", fontWeight: 700,
                    color: stall.status === "vacant" ? "#92400E" : "white",
                  }} aria-hidden="true">{stall.number}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{stall.number}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {stall.vendor !== "—" ? stall.vendor : "Vacant"} · {stall.category}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ flexShrink: 0, color: "var(--text-muted)" }} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Map Area ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{
            flex: 1, borderRadius: "var(--radius-lg)", overflow: "hidden",
            boxShadow: "var(--shadow-lg)", position: "relative", minHeight: "400px",
          }}>
            {/* Leaflet container */}
            <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }}
              aria-label="Interactive market map" role="application" />

            {/* Selected stall bottom panel */}
            {selected && (
              <div style={{
                position: "absolute", bottom: "var(--space-4)", left: "50%",
                transform: "translateX(-50%)",
                background: "white", borderRadius: "var(--radius-lg)",
                padding: "var(--space-4) var(--space-6)",
                boxShadow: "var(--shadow-xl)",
                display: "flex", alignItems: "center", gap: "var(--space-6)",
                minWidth: "360px", maxWidth: "90%", zIndex: 1000,
                animation: "slideInUp 0.2s ease",
              }} role="region" aria-label="Selected stall details">

                <div style={{
                  width: 44, height: 44, borderRadius: "var(--radius-sm)",
                  background: STATUS_COLORS[selected.status],
                  border: `2px solid ${STATUS_BORDER[selected.status]}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: selected.status === "vacant" ? "#92400E" : "white",
                  fontWeight: 800, fontSize: "var(--text-sm)", flexShrink: 0,
                }} aria-hidden="true">{selected.number}</div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "var(--text-md)", fontWeight: 700 }}>
                    {selected.number} · {selected.section}
                  </div>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                    <User size={12} style={{ display: "inline", marginRight: 4 }} />
                    {selected.vendor !== "—" ? selected.vendor : "No vendor assigned"}
                    {" · "}{selected.category}
                  </div>
                  <div style={{ marginTop: "var(--space-1)" }}>
                    <span className={`badge badge-${selected.status} badge-dot`} style={{ textTransform: "capitalize" }}>
                      {selected.status}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                  <Link href={`/map/stall/${selected.id}`} className="btn btn-accent btn-sm">
                    Details
                  </Link>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}
                    aria-label="Close stall info">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leaflet tooltip custom style */}
      <style>{`
        .leaflet-custom-tooltip {
          background: var(--color-accent);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-family: Inter, Arial, sans-serif;
          padding: 6px 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .leaflet-custom-tooltip::before {
          border-top-color: var(--color-accent);
        }
        .leaflet-container {
          font-family: Inter, Arial, sans-serif;
        }
      `}</style>
    </AppShell>
  );
}
