"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { Search, ChevronRight, ChevronUp, ChevronDown, SlidersHorizontal, List, X } from "lucide-react";
import MarketMap, {
  MarketStall,
  OCCUPANCY_CONFIG,
  OccupancyStatus,
  BuildingId,
  FloorId,
} from "@/components/map/MarketMap";
import { LEGACY_TO_OCCUPANCY, LEGACY_TO_COMPLIANCE, MapLayerId, MAP_LAYERS } from "@/components/map/types";
import { getLegendEntries } from "@/components/map/MapLegend";
import { stallsApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

const CATEGORIES = ["All", "Vegetables", "Meat", "Fish", "Dry Goods", "Cooked Food", "Fruits"];
const OCCUPANCY_STATUSES: ("All" | OccupancyStatus)[] = ["All", "occupied", "vacant", "reserved", "maintenance"];



export default function MapPage() {
  const { ready, user: authUser } = useAuthGuard();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [stalls, setStalls] = useState<MarketStall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStallId, setSelectedStallId] = useState<string | null>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | OccupancyStatus>("All");
  const [activeLayer, setActiveLayer] = useState<MapLayerId>("stall_status");

  // URL-synced building + floor
  const activeBuilding = (searchParams.get("building") ?? "main") as BuildingId;
  const activeFloor = (searchParams.get("floor") ?? "1") as FloorId;

  const handleBuildingFloorChange = (building: BuildingId, floor: FloorId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("building", building);
    params.set("floor", floor);
    router.push(`/map?${params.toString()}`, { scroll: false });
  };

  // Mobile bottom drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"filters" | "directory">("directory");
  const [isMobile, setIsMobile] = useState(false);

  const role = authUser?.role === "admin" ? "admin" : "vendor";

  // Detect viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchStalls = useCallback(async () => {
    setLoading(true);
    try {
      const data = await stallsApi.list({ page_size: "200" }) as { results: Record<string, unknown>[] };
      const items = (data.results || []) as Record<string, unknown>[];

      // Fallback grid layout for stalls without SVG coordinates
      const STALL_W = 200;
      const STALL_H = 120;
      const COLS    = 12;
      const SEC_PAD = 400;
      const sectionIndex: Record<string, number> = {};
      const sectionCounter: Record<string, number> = {};
      let secOrder = 0;
      items.forEach((s) => {
        const sec = String(s.section_code ?? "?");
        if (!(sec in sectionIndex)) { sectionIndex[sec] = secOrder++; sectionCounter[sec] = 0; }
      });

      const mapped: MarketStall[] = items.map((s) => {
        const rawX = s.svg_x as number | null;
        const rawY = s.svg_y as number | null;
        const hasCoords = rawX != null && rawY != null && (rawX !== 0 || rawY !== 0);

        let svg_x: number, svg_y: number;
        if (hasCoords) {
          svg_x = rawX!; svg_y = rawY!;
        } else {
          const sec = String(s.section_code ?? "?");
          const idx = sectionCounter[sec]++;
          const col = idx % COLS;
          const row = Math.floor(idx / COLS);
          const secRow = sectionIndex[sec];
          svg_x = 300 + col * (STALL_W + 40);
          svg_y = 200 + secRow * (SEC_PAD + Math.ceil(Object.keys(sectionIndex).length) * 20) + row * (STALL_H + 30);
        }

        const legacyStatus = String(s.status ?? "vacant");

        return {
          id: `stall-${String(s.stall_number).toLowerCase().replace(/-/g, "")}`,
          number: s.stall_number as string,
          section: `Section ${s.section_code}`,
          vendor: (s.vendor_name as string) || "—",
          category: s.category as string,
          // New dual-status fields (use API values if present, else derive from legacy)
          occupancy_status: (s.occupancy_status as OccupancyStatus) ?? LEGACY_TO_OCCUPANCY[legacyStatus] ?? "vacant",
          compliance_status: (s.compliance_status as MarketStall["compliance_status"]) ?? LEGACY_TO_COMPLIANCE[legacyStatus] ?? null,
          svg_x,
          svg_y,
          polygon_data: (s.polygon_data as string | undefined),
          building: (s.building as BuildingId) ?? "main",
          floor: (s.floor as FloorId) ?? "1",
        };
      });

      setStalls(mapped);
    } catch {
      // fallback to empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (ready) fetchStalls(); }, [fetchStalls, ready]);

  if (!ready) return null;

  const filtered = stalls.filter((s) => {
    const matchSearch = !search ||
      s.number.toLowerCase().includes(search.toLowerCase()) ||
      s.vendor.toLowerCase().includes(search.toLowerCase()) ||
      (s.category ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || s.category === categoryFilter;
    const matchStatus = statusFilter === "All" || s.occupancy_status === statusFilter;
    // Only show stalls for the currently active building/floor
    const matchFloor = s.building === activeBuilding && s.floor === activeFloor;
    return matchSearch && matchCat && matchStatus && matchFloor;
  });

  // Map padding changes based on viewport
  const mapPadding = isMobile
    ? { top: 72, right: 16, bottom: drawerOpen ? 300 : 72, left: 16 }
    : { top: 80, right: 340, bottom: 20, left: 280 };

  /* ── Shared stall list item ── */
  const StallItem = ({ stall }: { stall: MarketStall }) => {
    const conf = OCCUPANCY_CONFIG[stall.occupancy_status] ?? OCCUPANCY_CONFIG.vacant;
    const isSelected = selectedStallId === stall.id;
    return (
      <button
        onClick={() => {
          setSelectedStallId(stall.id);
          setFocusTrigger(prev => prev + 1);
          if (isMobile) setDrawerOpen(false);
        }}
        style={{
          width: "100%", padding: "12px 14px", textAlign: "left",
          background: isSelected ? "var(--color-primary-pale)" : "transparent",
          borderRadius: "12px", marginBottom: "4px", cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex", alignItems: "center", gap: "var(--space-3)",
          border: isSelected ? "1px solid var(--color-primary)" : "1px solid transparent",
        }}
        aria-label={`View stall ${stall.number}, ${conf.label}`}
        aria-pressed={isSelected}
      >
        <div style={{
          width: 32, height: 32, borderRadius: "8px",
          background: conf.color, border: `2px solid ${conf.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, fontSize: "11px", fontWeight: 800, color: conf.text,
        }}>{stall.number}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-accent)" }}>{stall.number}</div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {stall.vendor !== "—" ? stall.vendor : "Vacant"} · {stall.category}
          </div>
        </div>
        <ChevronRight size={14} style={{ flexShrink: 0, color: isSelected ? "var(--color-accent)" : "var(--text-muted)" }} />
      </button>
    );
  };

  /* ── Chip button helper ── */
  const Chip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: "100px", fontSize: "12px", fontWeight: 600,
        border: active ? "2px solid var(--color-accent)" : "2px solid #E5E7EB",
        background: active ? "var(--color-accent)" : "white",
        color: active ? "white" : "var(--text-secondary)",
        cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );

  /* ── Sidebar legend — dynamically uses active layer ── */
  const LegendGrid = () => {
    const entries = getLegendEntries(activeLayer);
    return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-2) var(--space-3)",
      padding: "16px 20px",
    }}>
      {entries.map((conf) => (
        <div key={conf.key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: 14, height: 14, borderRadius: conf.shape === "ring" ? "50%" : 4, flexShrink: 0,
            background: conf.color, border: `2px solid ${conf.border}`,
          }} />
          <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", lineHeight: 1.2 }}>
            {conf.label}
          </span>
        </div>
      ))}
    </div>
  )};

  const glassStyle = {
    background: "rgba(255, 255, 255, 0.88)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.6)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
  };

  return (
    <AppShell
      pageTitle="Interactive Market Map"
      role={role}
      userName={authUser?.first_name || "User"}
      userRole={role === "admin" ? "Administrator" : "Vendor"}
      floatingSidebar={true}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>

        {/* ── Map canvas — lowest layer ── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <MarketMap
            stalls={stalls}
            selectedStallId={selectedStallId}
            onStallSelect={(s) => setSelectedStallId(s ? s.id : null)}
            showAdminLinks={role === "admin"}
            showAdminLayers={role === "admin"}
            padding={mapPadding}
            focusTrigger={focusTrigger}
            initialBuilding={activeBuilding}
            initialFloor={activeFloor}
            onBuildingFloorChange={handleBuildingFloorChange}
            activeLayerId={activeLayer}
            onLayerChange={setActiveLayer}
            hideFloatingControls={true}
          />
        </div>

        {/* ════════════════════════════════════════
            DESKTOP — right floating panel
        ════════════════════════════════════════ */}
        <aside
          className="map-desktop-panel"
          style={{
            position: "absolute",
            top: "calc(var(--header-height) + var(--space-4))",
            right: "var(--space-4)",
            width: "300px",
            bottom: "var(--space-4)",
            display: "flex", flexDirection: "column", gap: "var(--space-3)",
            zIndex: 10,
            pointerEvents: "none",
          }}
          aria-label="Map controls"
        >
          {/* Search + Filters */}
          <div style={{ ...glassStyle, borderRadius: "18px", padding: "16px", pointerEvents: "auto" }}>
            
            {/* Map Layers */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "6px" }}>Map Layer</div>
              <div style={{ position: "relative" }}>
                <select
                  value={activeLayer}
                  onChange={(e) => setActiveLayer(e.target.value as MapLayerId)}
                  style={{
                    width: "100%", padding: "8px 10px",
                    border: "1.5px solid #E5E7EB", borderRadius: "10px",
                    fontSize: "13px", background: "rgba(255,255,255,0.6)",
                    outline: "none", fontFamily: "inherit", fontWeight: 600, color: "var(--text-primary)",
                    appearance: "none", cursor: "pointer"
                  }}
                >
                  {MAP_LAYERS.filter(l => !l.adminOnly || role === "admin").map(l => (
                    <option key={l.id} value={l.id}>{l.icon} {l.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: "12px" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input
                type="search"
                placeholder="Search stall or vendor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "8px 10px 8px 32px",
                  border: "1.5px solid #E5E7EB", borderRadius: "10px",
                  fontSize: "13px", background: "rgba(255,255,255,0.6)",
                  outline: "none", fontFamily: "inherit",
                }}
                aria-label="Search stalls"
              />
            </div>

            {/* Category chips */}
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "6px" }}>Category</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {CATEGORIES.map(c => (
                  <Chip key={c} label={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)} />
                ))}
              </div>
            </div>

            {/* Occupancy Status chips */}
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "6px" }}>Occupancy Status</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {OCCUPANCY_STATUSES.map(s => (
                  <Chip
                    key={s}
                    label={s === "All" ? "All" : (OCCUPANCY_CONFIG[s as OccupancyStatus]?.label ?? s)}
                    active={statusFilter === s}
                    onClick={() => setStatusFilter(s)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Stall Directory */}
          <div style={{
            ...glassStyle, borderRadius: "18px",
            flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
            overflow: "hidden", pointerEvents: "auto",
          }}>
            <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Stall Directory</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", background: "rgba(0,0,0,0.06)", padding: "2px 8px", borderRadius: "10px" }}>
                {loading ? "…" : filtered.length}
              </span>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "8px" }}>
              {loading ? (
                <div className="empty-state" style={{ padding: "var(--space-6)" }}>
                  <div className="empty-state-title">Loading stalls…</div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state" style={{ padding: "var(--space-6)" }}>
                  <div className="empty-state-title">No stalls found</div>
                </div>
              ) : filtered.map(stall => <StallItem key={stall.id} stall={stall} />)}
            </div>
          </div>

          {/* Legend — always visible, compact inline grid */}
          <div style={{ ...glassStyle, borderRadius: "18px", pointerEvents: "auto" }}>
            <div style={{ padding: "12px 20px 4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--color-accent)" }} />
              <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Map Legend</span>
            </div>
            <LegendGrid />
          </div>
        </aside>

        {/* ════════════════════════════════════════
            MOBILE — floating search bar (top)
            z-index 150 = above map (1) and map controls (100),
            below app header (300)
        ════════════════════════════════════════ */}
        <div
          className="map-mobile-search"
          style={{
            position: "absolute",
            top: "calc(var(--header-height) + var(--space-3))",
            left: "var(--space-3)",
            right: "var(--space-3)",
            zIndex: 150,
            pointerEvents: "auto",
          }}
        >
          <div style={{
            ...glassStyle, borderRadius: "14px",
            padding: "8px 12px",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <Search size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              type="search"
              placeholder="Search stall or vendor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, border: "none", outline: "none",
                fontSize: "14px", background: "transparent",
                fontFamily: "inherit",
              }}
              aria-label="Search stalls"
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            MOBILE — bottom drawer
        ════════════════════════════════════════ */}
        <div
          className="map-mobile-drawer"
          style={{
            position: "absolute",
            left: 0, right: 0, bottom: 0,
            zIndex: 150,
            display: "flex", flexDirection: "column",
            transform: drawerOpen ? "translateY(0)" : "translateY(calc(100% - 56px))",
            transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
            maxHeight: "55vh",
          }}
        >
          {/* Drawer card */}
          <div style={{
            ...glassStyle,
            borderRadius: "20px 20px 0 0",
            display: "flex", flexDirection: "column",
            flex: 1, minHeight: 0, overflow: "hidden",
          }}>
            {/* Handle + toggle row */}
            <button
              onClick={() => setDrawerOpen(o => !o)}
              style={{
                padding: "12px 16px 0", border: "none", background: "transparent",
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                flexShrink: 0,
              }}
              aria-expanded={drawerOpen}
              aria-label={drawerOpen ? "Collapse drawer" : "Expand filters and directory"}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.15)" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-accent)" }}>
                  {drawerOpen ? "Filters & Directory" : `Filters & Directory  ·  ${filtered.length} stalls`}
                </span>
                {drawerOpen ? <ChevronDown size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronUp size={16} style={{ color: "var(--text-muted)" }} />}
              </div>
            </button>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}>
              {(["directory", "filters"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setMobileTab(tab); setDrawerOpen(true); }}
                  style={{
                    flex: 1, padding: "10px",
                    fontSize: "13px", fontWeight: 600,
                    border: "none", background: "transparent", cursor: "pointer",
                    color: mobileTab === tab ? "var(--color-accent)" : "var(--text-muted)",
                    borderBottom: mobileTab === tab ? "2px solid var(--color-accent)" : "2px solid transparent",
                    transition: "all 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}
                >
                  {tab === "directory" ? <List size={14} /> : <SlidersHorizontal size={14} />}
                  {tab === "directory" ? "Directory" : "Filters"}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {mobileTab === "filters" ? (
                <div style={{ padding: "16px" }}>
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "8px" }}>Category</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {CATEGORIES.map(c => (
                        <Chip key={c} label={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "8px" }}>Occupancy Status</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {OCCUPANCY_STATUSES.map(s => (
                        <Chip
                          key={s}
                          label={s === "All" ? "All" : (OCCUPANCY_CONFIG[s as OccupancyStatus]?.label ?? s)}
                          active={statusFilter === s}
                          onClick={() => setStatusFilter(s)}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Legend inside filters on mobile */}
                  <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "8px" }}>Legend</div>
                    <LegendGrid />
                  </div>
                </div>
              ) : (
                <div style={{ padding: "8px" }}>
                  {loading ? (
                    <div className="empty-state" style={{ padding: "var(--space-6)" }}>
                      <div className="empty-state-title">Loading stalls…</div>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="empty-state" style={{ padding: "var(--space-6)" }}>
                      <div className="empty-state-title">No stalls found</div>
                    </div>
                  ) : filtered.map(stall => <StallItem key={stall.id} stall={stall} />)}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
