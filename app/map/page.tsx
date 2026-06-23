"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { Search, ChevronRight, ChevronUp, ChevronDown, SlidersHorizontal, List, X, ClipboardCheck, AlertTriangle, UserPlus, MessageSquare, Wrench, CheckCircle } from "lucide-react";
import MarketMap, {
  MarketStall,
  OCCUPANCY_CONFIG,
  OccupancyStatus,
  BuildingId,
  FloorId,
} from "@/components/map/MarketMap";
import { LEGACY_TO_OCCUPANCY, LEGACY_TO_COMPLIANCE, MapLayerId, MAP_LAYERS } from "@/components/map/types";
import { getLegendEntries } from "@/components/map/MapLegend";
import { stallsApi, violationsApi, sanitationApi } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";

const CATEGORIES = ["All", "Vegetables", "Meat", "Fish", "Dry Goods", "Cooked Food", "Fruits"];
const OCCUPANCY_STATUSES: ("All" | OccupancyStatus)[] = ["All", "owner", "rented", "storage", "surrendered_bolante", "vacant", "closed"];



function MapContent() {
  const { ready, user: authUser } = useAuthGuard();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [stalls, setStalls] = useState<MarketStall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStallId, setSelectedStallId] = useState<string | null>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [initialSelectDone, setInitialSelectDone] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | OccupancyStatus>("All");
  const [activeLayer, setActiveLayer] = useState<MapLayerId>("stall_status");

  // Action modal state
  type ActionType = "inspection" | "violation" | "assign" | "notice" | "workorder" | null;
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [actionStall, setActionStall] = useState<MarketStall | null>(null);
  const [actionForm, setActionForm] = useState<Record<string, string>>({});
  const [actionSaving, setActionSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);
  const [priorViolationCount, setPriorViolationCount] = useState<number | null>(null);
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // URL-synced floor only (unified view shows both buildings at once)
  const activeFloor = (searchParams.get("floor") ?? "1") as FloorId;

  const handleBuildingFloorChange = (_building: BuildingId, floor: FloorId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("floor", floor);
    router.push(`/map?${params.toString()}`, { scroll: false });
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"filters" | "directory">("directory");
  const [isMobile, setIsMobile] = useState(false);

  const role = authUser?.role === "admin" ? "admin" : "vendor";

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchStalls = useCallback(async () => {
    setLoading(true);
    try {
      const data = await stallsApi.list({ page_size: "1000" }) as { results: Record<string, unknown>[] };
      const items = (data.results || []) as Record<string, unknown>[];

      const STALL_W = 200;
      const STALL_H = 120;
      const COLS = 12;
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
          dbId: s.id as number,
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
          svg_cell_id: (s.svg_cell_id as string) || "",
          area_sqm: (s.area_sqm as number | null) ?? null,
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

  useEffect(() => {
    if (stalls.length > 0 && !initialSelectDone) {
      const targetStallNum = searchParams.get("stall");
      if (targetStallNum) {
        const targetStall = stalls.find(s => s.number === targetStallNum);
        if (targetStall) {
          if (targetStall.floor && targetStall.floor !== activeFloor) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("floor", targetStall.floor);
            router.replace(`/map?${params.toString()}`, { scroll: false });
            return; // Wait for URL to update, effect will re-run
          }
          setSelectedStallId(targetStall.id);
          setTimeout(() => setFocusTrigger(prev => prev + 1), 300);
        }
      }
      setInitialSelectDone(true);
    }
  }, [stalls, searchParams, initialSelectDone, activeFloor, router]);

  // Action handlers
  const openAction = async (action: ActionType, stall: MarketStall) => {
    setActionStall(stall);
    setActiveAction(action);
    setActionForm({});
    setActionSuccess(false);
    setPriorViolationCount(null);
    setCameraActive(false);
    setCameraError(null);

    // Auto-detect prior offences when opening a violation modal
    if (action === "violation") {
      if (stall.vendor !== "—" && stall.dbId) {
        try {
          const stallDetail: any = await stallsApi.get(stall.dbId);
          const vendorId = stallDetail?.vendor?.id;
          if (vendorId) {
            const data: any = await violationsApi.list({ vendor: vendorId.toString(), page_size: "100" });
            const results = data?.results ?? data ?? [];
            const count = Array.isArray(results) ? results.length : 0;
            setPriorViolationCount(count);
          } else {
            setPriorViolationCount(0);
          }
        } catch {
          setPriorViolationCount(0);
        }
      } else {
        setPriorViolationCount(0);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      setCameraError("Camera access denied. Please allow camera permissions or upload a photo instead.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setActionForm(f => ({ ...f, photo_file: dataUrl, photo_name: `evidence_${Date.now()}.jpg` }));
    stopCamera();
  };

  const closeAction = () => {
    stopCamera();
    setActiveAction(null);
    setActionStall(null);
    setActionForm({});
    setActionSuccess(false);
    setPriorViolationCount(null);
  };

  const submitAction = async () => {
    if (!actionStall) return;
    setActionSaving(true);
    try {
      if (activeAction === "violation") {
        const penaltySeverityMap: Record<string, string> = { "1st": "low", "2nd": "high", "3rd": "critical" };
        const autoOffence = priorViolationCount === null ? "1st"
          : priorViolationCount === 0 ? "1st"
          : priorViolationCount === 1 ? "2nd" : "3rd";

        // Fetch stall detail to get the vendor integer FK
        let vendorId: number | null = null;
        try {
          const stallDetail: any = await stallsApi.get(actionStall.dbId!);
          vendorId = stallDetail?.vendor?.id ?? null;
        } catch {}

        if (!vendorId) {
          throw new Error("This stall has no assigned vendor. Cannot issue a violation to a vacant stall.");
        }

        await violationsApi.create({
          vendor: vendorId,
          violation_type: actionForm.violation_type ?? "Others",
          description: `[${autoOffence} Offence] ${actionForm.description ?? ""}`.trim(),
          severity: penaltySeverityMap[autoOffence] ?? "medium",
          violation_date: new Date().toISOString().split("T")[0],
          photo: actionForm.photo_file || null,
        });

      } else if (activeAction === "inspection") {
        const session = await sanitationApi.createSession({
          stall: actionStall.dbId,
          result: actionForm.rating,
          notes: actionForm.notes,
        });
        // If session creation returns an id, do a bulk save record
        if (session && (session as any).id) {
          await sanitationApi.bulkSave((session as any).id, [{
            result: actionForm.rating,
            notes: actionForm.notes,
          }]);
        }
      } else {
        // notice, workorder, assign — simulate for now
        await new Promise(resolve => setTimeout(resolve, 700));
      }
      setActionSuccess(true);
      setTimeout(closeAction, 1800);
    } catch (err: any) {
      alert(err?.detail ?? err?.message ?? "Failed to submit. Please try again.");
    } finally {
      setActionSaving(false);
    }
  };

  if (!ready) return null;

  const filtered = stalls.filter((s) => {
    const matchSearch = !search ||
      s.number.toLowerCase().includes(search.toLowerCase()) ||
      s.vendor.toLowerCase().includes(search.toLowerCase()) ||
      (s.category ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || s.category === categoryFilter;
    const matchStatus = statusFilter === "All" || s.occupancy_status === statusFilter;
    // Unified view: show stalls from both buildings on the active floor
    const matchFloor = s.floor === activeFloor;
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
    )
  };

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
            initialFloor={activeFloor}
            onBuildingFloorChange={handleBuildingFloorChange}
            activeLayerId={activeLayer}
            onLayerChange={setActiveLayer}
            hideFloatingControls={true}
            unifiedFloorView={true}
            onLogInspection={(s) => openAction("inspection", s)}
            onIssueViolation={(s) => openAction("violation", s)}
            onAssignVendor={(s) => openAction("assign", s)}
            onSendNotice={(s) => openAction("notice", s)}
            onWorkOrder={(s) => openAction("workorder", s)}
          />
        </div>

        {/* ════════════════════════════════════════
            COMMAND CENTER — Floating UI Container
        ════════════════════════════════════════ */}
        <aside
          style={{
            position: "absolute",
            top: "calc(var(--header-height) + var(--space-3))",
            right: "var(--space-6)",
            width: "320px",
            maxWidth: "calc(100vw - 32px)",
            bottom: "var(--space-6)",
            display: "flex", flexDirection: "column", gap: "12px",
            zIndex: 10,
            pointerEvents: "none",
          }}
          aria-label="Map controls"
        >
          {/* Search Box */}
          <div style={{ pointerEvents: "auto", background: "white", borderRadius: "var(--radius-full)", padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", border: "1px solid #E2E8F0", flexShrink: 0 }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search stall or vendor…" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, border: "none", outline: "none", fontSize: "15px", fontWeight: 600, background: "transparent" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4 }}>
                <X size={16} />
              </button>
            )}
          </div>

          <style>{`
            .floating-results::-webkit-scrollbar { width: 6px; }
            .floating-results::-webkit-scrollbar-track { background: transparent; }
            .floating-results::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
          `}</style>

          <div className="floating-results" style={{ pointerEvents: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", paddingRight: "4px" }}>
            
            {/* Control Panel (Layers & Filters) */}
            <div style={{ background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(16px)", borderRadius: "var(--radius-lg)", padding: "16px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", border: "1px solid #E2E8F0", flexShrink: 0 }}>
              
              {/* Map Layers */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "8px" }}>Data Layer</div>
                <div style={{ position: "relative" }}>
                  <select
                    value={activeLayer}
                    onChange={(e) => setActiveLayer(e.target.value as MapLayerId)}
                    style={{
                      width: "100%", padding: "10px 12px",
                      border: "1px solid #E2E8F0", borderRadius: "10px",
                      fontSize: "13px", background: "white",
                      outline: "none", fontFamily: "inherit", fontWeight: 700, color: "var(--text-primary)",
                      appearance: "none", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                    }}
                  >
                    {MAP_LAYERS.filter(l => !l.adminOnly || role === "admin").map(l => (
                      <option key={l.id} value={l.id}>{l.icon} {l.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                </div>
              </div>

              {/* Category filters */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "8px" }}>Category</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {CATEGORIES.map(c => (
                    <Chip key={c} label={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)} />
                  ))}
                </div>
              </div>

              {/* Occupancy Status filters */}
              <div>
                <div style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "8px" }}>Status</div>
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
            </div>

            {/* Legend Component */}
            <div style={{ background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(16px)", padding: "16px", borderRadius: "var(--radius-lg)", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", border: "1px solid #E2E8F0", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: "var(--color-primary)" }} />
                Active Legend
              </div>
              <LegendGrid />
            </div>

            {/* Stall Directory */}
            <div style={{
              background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(16px)",
              borderRadius: "var(--radius-lg)",
              display: "flex", flexDirection: "column",
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)", border: "1px solid #E2E8F0",
              flexShrink: 0,
            }}>
              <div style={{ padding: "16px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Directory Results</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-primary)", background: "var(--color-primary-pale)", padding: "4px 10px", borderRadius: "var(--radius-full)" }}>
                  {loading ? "…" : filtered.length} stalls
                </span>
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto", padding: "8px" }}>
                {loading ? (
                  <div style={{ padding: "24px", textAlign: "center", fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>Loading stalls…</div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: "24px", textAlign: "center", fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>No stalls found</div>
                ) : filtered.map(stall => <StallItem key={stall.id} stall={stall} />)}
              </div>
            </div>

          </div>
        </aside>

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

      {/* ══ Universal Action Modal ══ */}
      {activeAction && actionStall && (() => {
        const actionConfig = {
          inspection: {
            title: "Log Inspection",
            icon: <ClipboardCheck size={18} style={{ color: "#374151" }} />,
            color: "#374151",
            bg: "#F3F4F6",
            fields: (
              <>
                <div className="form-group">
                  <label className="form-label">Inspection Rating</label>
                  <select className="form-input" value={actionForm.rating ?? ""} onChange={e => setActionForm(f => ({...f, rating: e.target.value}))}>
                    <option value="">Select rating…</option>
                    <option value="pass">✅ Pass</option>
                    <option value="fail">❌ Fail</option>
                    <option value="needs_followup">⚠️ Needs Follow-up</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assessor Notes</label>
                  <textarea className="form-input" rows={3} placeholder="Enter observations…" value={actionForm.notes ?? ""} onChange={e => setActionForm(f => ({...f, notes: e.target.value}))} style={{ resize: "vertical" }} />
                </div>
              </>
            ),
          },
          violation: {
            title: "Issue Violation — Warning Letter",
            icon: <AlertTriangle size={18} style={{ color: "#DC2626" }} />,
            color: "#DC2626",
            bg: "#FEF2F2",
            fields: (() => {
              const autoOffence = priorViolationCount === null ? null
                : priorViolationCount === 0 ? "1st"
                : priorViolationCount === 1 ? "2nd"
                : "3rd";
              const offence = autoOffence ?? "?";
              const penaltyMap: Record<string, string> = { "1st": "₱500.00", "2nd": "₱1,500.00", "3rd": "Revocation of Permit" };
              const penalty = penaltyMap[offence] ?? null;

              return (
                <>
                  {/* Pre-filled stall info */}
                  <div style={{ background: "#FFF1F2", border: "1px solid #FECACA", borderRadius: "var(--radius-md)", padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#991B1B", marginBottom: 2 }}>Stall No.</div><div style={{ fontWeight: 700, fontSize: 14 }}>{actionStall.number}</div></div>
                    <div><div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#991B1B", marginBottom: 2 }}>Section</div><div style={{ fontWeight: 700, fontSize: 14 }}>{actionStall.section}</div></div>
                    <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#991B1B", marginBottom: 2 }}>Vendor</div><div style={{ fontWeight: 700, fontSize: 14 }}>{actionStall.vendor !== "\u2014" ? actionStall.vendor : "Vacant / Unknown"}</div></div>
                  </div>

                  {/* Auto-detected offence number */}
                  <div style={{ borderRadius: "var(--radius-md)", padding: "10px 14px", border: `1px solid ${offence === "3rd" ? "#FECACA" : offence === "2nd" ? "#FDE68A" : "#BBF7D0"}`, background: offence === "3rd" ? "#FFF1F2" : offence === "2nd" ? "#FFFBEB" : "#F0FDF4" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: offence === "3rd" ? "#991B1B" : offence === "2nd" ? "#92400E" : "#166534", marginBottom: 2 }}>
                      {priorViolationCount === null ? "⏳ Checking offence history…" : `Auto-Detected: ${offence} Offence (${priorViolationCount} prior record${priorViolationCount !== 1 ? "s" : ""})`}
                    </div>
                    {penalty && <div style={{ fontSize: 18, fontWeight: 800, color: offence === "3rd" ? "#DC2626" : offence === "2nd" ? "#D97706" : "#16A34A" }}>{penalty}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Violation Type</label>
                    <select className="form-input" value={actionForm.violation_type ?? ""} onChange={e => setActionForm(f => ({...f, violation_type: e.target.value}))}>
                      <option value="">Select type…</option>
                      <optgroup label="Sanitation &amp; Cleanliness">
                        <option value="Unsanitary Conditions">Unsanitary Conditions</option>
                        <option value="Improper Waste Disposal">Improper Waste Disposal</option>
                        <option value="Pest / Rodent Presence">Pest / Rodent Presence</option>
                      </optgroup>
                      <optgroup label="Equipment &amp; Utilities">
                        <option value="Defective Light Bulb / Lighting">Defective Light Bulb / Lighting</option>
                        <option value="Tampered or Unfair Weighing Scale">Tampered or Unfair Weighing Scale</option>
                        <option value="Unauthorized Electrical Connection">Unauthorized Electrical Connection</option>
                        <option value="Broken / Damaged Stall Fixtures">Broken / Damaged Stall Fixtures</option>
                      </optgroup>
                      <optgroup label="Market Rules">
                        <option value="Obstruction of Aisle / Passageway">Obstruction of Aisle / Passageway</option>
                        <option value="Selling Prohibited Goods">Selling Prohibited Goods</option>
                        <option value="Operating Outside Designated Area">Operating Outside Designated Area</option>
                        <option value="Non-compliance with Market Rules">Non-compliance with Market Rules</option>
                      </optgroup>
                      <optgroup label="Financial">
                        <option value="Payment Arrears / Unpaid Rent">Payment Arrears / Unpaid Rent</option>
                        <option value="Expired Permit / Certifications">Expired Permit / Certifications</option>
                      </optgroup>
                      <optgroup label="Safety">
                        <option value="Safety Hazard">Safety Hazard</option>
                        <option value="Fire Hazard">Fire Hazard</option>
                      </optgroup>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description / Observations</label>
                    <textarea className="form-input" rows={3} placeholder="Describe the observed violation in detail…" value={actionForm.description ?? ""} onChange={e => setActionForm(f => ({...f, description: e.target.value}))} style={{ resize: "vertical" }} />
                  </div>

                  {/* Built-in Camera */}
                  <div className="form-group">
                    <label className="form-label">Photo Evidence</label>
                    {actionForm.photo_file ? (
                      <div key="photo-preview">
                        <img src={actionForm.photo_file} alt="Evidence" style={{ borderRadius: "var(--radius-md)", width: "100%", maxHeight: 200, objectFit: "cover", border: "1px solid #FECACA", display: "block" }} />
                        <button className="btn btn-ghost" onClick={() => setActionForm(f => { const n = {...f}; delete n.photo_file; delete n.photo_name; return n; })} style={{ marginTop: 6, width: "100%", justifyContent: "center", fontSize: 12, border: "1px solid var(--border-color)" }}>
                          🔄 Retake Photo
                        </button>
                      </div>
                    ) : cameraActive ? (
                      <div key="camera-active" style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", background: "#000" }}>
                        <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
                        <canvas ref={canvasRef} style={{ display: "none" }} />
                        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8 }}>
                          <button onClick={capturePhoto} style={{ background: "white", border: "3px solid #DC2626", borderRadius: "50%", width: 52, height: 52, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📷</button>
                          <button onClick={stopCamera} style={{ background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 8, color: "white", padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>✕ Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div key="camera-idle" style={{ display: "flex", gap: 8 }}>
                        <button onClick={startCamera} style={{ flex: 1, padding: "10px", border: "1px dashed #FECACA", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: 13, color: "#DC2626", fontWeight: 600, background: "#FFF5F5", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          📷 Open Camera
                        </button>
                        <label style={{ flex: 1, padding: "10px", border: "1px dashed #CBD5E1", borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 600, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          🖼 Upload File
                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const url = URL.createObjectURL(f); setActionForm(p => ({...p, photo_file: url, photo_name: f.name})); }}} />
                        </label>
                      </div>
                    )}
                    {cameraError && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 4 }}>{cameraError}</div>}
                  </div>
                </>
              );
            })(),
          },

          assign: {
            title: actionStall.vendor !== "—" ? "Reassign Vendor" : "Assign Vendor",
            icon: <UserPlus size={18} style={{ color: "#1D4ED8" }} />,
            color: "#1D4ED8",
            bg: "#EFF6FF",
            fields: (
              <>
                {actionStall.vendor !== "—" && (
                  <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: "var(--radius-md)", padding: "12px", marginBottom: "var(--space-3)", fontSize: "13px", color: "#92400E" }}>
                    ⚠️ Current occupant: <strong>{actionStall.vendor}</strong>. Reassigning will detach them from this stall.
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Vendor Name or ID</label>
                  <input className="form-input" type="text" placeholder="Enter vendor name or ID…" value={actionForm.vendor ?? ""} onChange={e => setActionForm(f => ({...f, vendor: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Assignment Notes (optional)</label>
                  <textarea className="form-input" rows={2} placeholder="e.g. Temporary assignment, valid until Dec 2025" value={actionForm.notes ?? ""} onChange={e => setActionForm(f => ({...f, notes: e.target.value}))} style={{ resize: "vertical" }} />
                </div>
              </>
            ),
          },
          notice: {
            title: "Send Notice",
            icon: <MessageSquare size={18} style={{ color: "#C026D3" }} />,
            color: "#C026D3",
            bg: "#FDF4FF",
            fields: (
              <>
                <div className="form-group">
                  <label className="form-label">Notice Type</label>
                  <select className="form-input" value={actionForm.type ?? ""} onChange={e => setActionForm(f => ({...f, type: e.target.value}))}>
                    <option value="">Select type…</option>
                    <option value="reminder">Payment Reminder</option>
                    <option value="warning">Official Warning</option>
                    <option value="inspection">Upcoming Inspection</option>
                    <option value="general">General Announcement</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input className="form-input" type="text" placeholder="Notice subject…" value={actionForm.subject ?? ""} onChange={e => setActionForm(f => ({...f, subject: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-input" rows={3} placeholder="Write your message here…" value={actionForm.message ?? ""} onChange={e => setActionForm(f => ({...f, message: e.target.value}))} style={{ resize: "vertical" }} />
                </div>
              </>
            ),
          },
          workorder: {
            title: "Create Work Order",
            icon: <Wrench size={18} style={{ color: "#D97706" }} />,
            color: "#D97706",
            bg: "#FFFBEB",
            fields: (
              <>
                <div className="form-group">
                  <label className="form-label">Priority Level</label>
                  <select className="form-input" value={actionForm.priority ?? ""} onChange={e => setActionForm(f => ({...f, priority: e.target.value}))}>
                    <option value="">Select priority…</option>
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High / Urgent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Issue Description</label>
                  <textarea className="form-input" rows={3} placeholder="Describe the maintenance issue…" value={actionForm.description ?? ""} onChange={e => setActionForm(f => ({...f, description: e.target.value}))} style={{ resize: "vertical" }} />
                </div>
              </>
            ),
          },
        };

        const cfg = actionConfig[activeAction];

        return (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16
          }}>
            <div style={{ background: "#fff", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: 480, boxShadow: "0 25px 80px rgba(0,0,0,0.25)" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid var(--border-color)", background: cfg.bg, borderRadius: "var(--radius-xl) var(--radius-xl) 0 0" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>{cfg.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: cfg.color }}>{cfg.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>Stall {actionStall.number} · {actionStall.section}</div>
                </div>
                <button onClick={closeAction} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4 }}><X size={18} /></button>
              </div>

              {/* Body */}
              <div style={{ padding: "24px" }}>
                {actionSuccess ? (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <CheckCircle size={48} style={{ color: "var(--color-success)", margin: "0 auto 12px" }} />
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-success)" }}>Submitted successfully!</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Action logged for Stall {actionStall.number}.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                      {cfg.fields}
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-6)" }}>
                      <button className="btn btn-ghost" onClick={closeAction} style={{ border: "1px solid var(--border-color)" }}>Cancel</button>
                      <button className="btn btn-primary" onClick={submitAction} disabled={actionSaving} style={{ background: cfg.color, borderColor: cfg.color }}>
                        {actionSaving ? "Submitting…" : "Submit"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </AppShell>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'inherit' }}>Loading map...</div>}>
      <MapContent />
    </Suspense>
  );
}
