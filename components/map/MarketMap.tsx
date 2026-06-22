"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { X, ZoomIn, ZoomOut, Expand } from "lucide-react";

// Re-export types for backward compatibility
export type {
  MarketStall,
  OccupancyStatus,
  ComplianceStatus,
  BuildingId,
  FloorId,
  MapLayerId,
  ZoneHeatData,
} from "./types";

export {
  OCCUPANCY_CONFIG,
  COMPLIANCE_CONFIG,
  MAP_CONFIGS,
  MAP_LAYERS,
} from "./types";

import {
  MarketStall,
  BuildingId,
  FloorId,
  MapLayerId,
  ZoneHeatData,
  MAP_CONFIGS,
  ANNEX_CONFIGS,
  COMBINED_BRIDGE_GAP,
  OCCUPANCY_CONFIG,
  COMPLIANCE_CONFIG,
} from "./types";

import InlineSvgFloorPlan from "./InlineSvgFloorPlan";
import WasteRiskLayer from "./layers/WasteRiskLayer";
import ComplaintDensityLayer from "./layers/ComplaintDensityLayer";
import MapLegend from "./MapLegend";
import LayerController from "./LayerController";

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MarketMapProps {
  stalls: MarketStall[];
  zoneHeatData?: {
    waste_risk?: ZoneHeatData[];
    complaint_density?: ZoneHeatData[];
  };
  selectedStallId?: string | null;
  highlightedStallIds?: string[];
  navigationRoute?: {
    points: { x: number; y: number; label: string }[];
    totalDistanceMeters: number;
  } | null;
  onStallSelect?: (stall: MarketStall | null) => void;
  onGetDirections?: (stall: MarketStall) => void;
  onViewDetails?: (stall: MarketStall) => void;
  showAdminLinks?: boolean;
  showAdminLayers?: boolean;
  padding?: { top: number; right: number; bottom: number; left: number };
  focusTrigger?: number;
  activeLayerId?: MapLayerId;
  onLayerChange?: (layer: MapLayerId) => void;
  hideFloatingControls?: boolean;
  /** When true, shows Main + Annex on one unified canvas. Only floor tabs are shown (no building switcher). */
  unifiedFloorView?: boolean;
  /** Controlled externally for URL sync â€” defaults to main/1 internally */
  initialBuilding?: BuildingId;
  initialFloor?: FloorId;
  onBuildingFloorChange?: (building: BuildingId, floor: FloorId) => void;
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function MarketMap({
  stalls,
  zoneHeatData,
  selectedStallId,
  highlightedStallIds = [],
  navigationRoute,
  onStallSelect,
  onGetDirections,
  onViewDetails,
  showAdminLinks = false,
  showAdminLayers = false,
  padding,
  focusTrigger,
  activeLayerId,
  onLayerChange,
  hideFloatingControls = false,
  unifiedFloorView = false,
  initialBuilding = "main",
  initialFloor = "1",
  onBuildingFloorChange,
}: MarketMapProps) {
  // â”€â”€ Building / Floor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [activeBuilding, setActiveBuilding] = useState<BuildingId>(initialBuilding);
  const [activeFloor, setActiveFloor] = useState<FloorId>(initialFloor);
  const [mapTransitioning, setMapTransitioning] = useState(false);

  const mapConfig = MAP_CONFIGS[activeBuilding][activeFloor];

  const handleBuildingChange = useCallback((b: BuildingId) => {
    if (b === activeBuilding) return;
    setMapTransitioning(true);
    setTimeout(() => {
      setActiveBuilding(b);
      setMapTransitioning(false);
    }, 200);
    onBuildingFloorChange?.(b, activeFloor);
  }, [activeBuilding, activeFloor, onBuildingFloorChange]);

  const handleFloorChange = useCallback((f: FloorId) => {
    if (f === activeFloor) return;
    setMapTransitioning(true);
    setTimeout(() => {
      setActiveFloor(f);
      setMapTransitioning(false);
    }, 200);
    onBuildingFloorChange?.(activeBuilding, f);
  }, [activeBuilding, activeFloor, onBuildingFloorChange]);

  // Sync with external prop changes (URL navigation)
  useEffect(() => { setActiveBuilding(initialBuilding); }, [initialBuilding]);
  useEffect(() => { setActiveFloor(initialFloor); }, [initialFloor]);

  // -- Active Layer -------------------------------------------------------
  const [internalActiveLayer, setInternalActiveLayer] = useState<MapLayerId>("stall_status");
  const activeLayer = activeLayerId || internalActiveLayer;
  const setActiveLayer = (layer: MapLayerId) => {
    setInternalActiveLayer(layer);
    onLayerChange?.(layer);
  };

  // -- Pan / Zoom ----------------------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<MarketStall | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.15 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const isAnimating = useRef(false);
  const lastSelectedId = useRef<string | null>(null);
  const lastFocusTrigger = useRef(0);

  // When viewing Annex standalone, expand canvas to match the Main floor width
  // so both buildings appear at the same horizontal scale.
  const mainFloorWidth = MAP_CONFIGS.main[activeFloor].width;
  const SVG_WIDTH = (activeBuilding === 'annex' && !unifiedFloorView)
    ? mainFloorWidth
    : mapConfig.width;
  const SVG_HEIGHT = mapConfig.height;
  // Center Annex image horizontally within the wider canvas
  const annexConfig = ANNEX_CONFIGS[activeFloor];
  const ANNEX_STANDALONE_X_OFFSET = (activeBuilding === 'annex' && !unifiedFloorView)
    ? Math.floor((mainFloorWidth - mapConfig.width) / 2)
    : 0;
  const ANNEX_X_OFFSET = unifiedFloorView ? Math.floor((SVG_WIDTH - annexConfig.width) / 2) : 0;
  const CANVAS_HEIGHT = unifiedFloorView
    ? annexConfig.height + COMBINED_BRIDGE_GAP + SVG_HEIGHT
    : SVG_HEIGHT;

  // -- Fit map to container -------------------------------------------------
  const fitMap = useCallback((animate = false) => {
    if (!containerRef.current) return;
    if (animate && isAnimating.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const pTop = padding?.top || 0;
    const pRight = padding?.right || 0;
    const pBottom = padding?.bottom || 0;
    const pLeft = padding?.left || 0;
    const availW = Math.max(width - pLeft - pRight, 100);
    const availH = Math.max(height - pTop - pBottom, 100);
    let initialScale = Math.max(
      Math.min(availW / SVG_WIDTH, availH / CANVAS_HEIGHT),
      0.05
    );

    if (unifiedFloorView) {
      // Zoom in to fill the width nicely to avoid excessive side whitespace.
      // This makes the text much more readable by default. The user can always pan up to see the Annex.
      initialScale = Math.max(
        availW / SVG_WIDTH,
        0.05
      );
    }

    const initX = pLeft + (availW - SVG_WIDTH * initialScale) / 2;
    
    let initY = pTop + (availH - CANVAS_HEIGHT * initialScale) / 2;
    if (unifiedFloorView) {
      // Center on the Main building (bottom portion)
      const mainCenterY = annexConfig.height + COMBINED_BRIDGE_GAP + SVG_HEIGHT / 2;
      initY = pTop + availH / 2 - mainCenterY * initialScale;
    }
    if (animate) {
      isAnimating.current = true;
      setTransform({ x: initX, y: initY, scale: initialScale });
      setTimeout(() => { isAnimating.current = false; }, 500);
    } else {
      setTransform({ x: initX, y: initY, scale: initialScale });
    }
  }, [SVG_WIDTH, CANVAS_HEIGHT, unifiedFloorView]);

  // Re-fit when building/floor changes (new SVG dimensions)
  useEffect(() => { fitMap(false); }, [activeBuilding, activeFloor, fitMap]);
  useEffect(() => { fitMap(false); }, [padding?.top, padding?.right, padding?.bottom, padding?.left]);

  // -- Pointer events -----------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasDragged.current = false;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    // Do not set pointer capture yet, to allow native clicks to pass through!
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    
    if (!hasDragged.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      hasDragged.current = true;
      // Now that we are actually dragging, capture the pointer
      containerRef.current?.setPointerCapture(e.pointerId);
    }
    
    if (hasDragged.current) {
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    if (hasDragged.current) {
      containerRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  // Wheel zoom (non-passive to allow preventDefault)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimating.current) return;
      const delta = -e.deltaY * 0.001;
      setTransform((prev) => {
        let newScale = prev.scale * Math.exp(delta);
        newScale = Math.max(0.05, Math.min(3, newScale));
        const rect = container.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const tx = (mx - prev.x) / prev.scale;
        const ty = (my - prev.y) / prev.scale;
        return { x: mx - tx * newScale, y: my - ty * newScale, scale: newScale };
      });
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  // â”€â”€ Fly to stall â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const flyToStall = useCallback((stall: MarketStall) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pTop = padding?.top || 0;
    const pRight = padding?.right || 0;
    const pBottom = padding?.bottom || 0;
    const pLeft = padding?.left || 0;
    const availW = Math.max(rect.width - pLeft - pRight, 100);
    const availH = Math.max(rect.height - pTop - pBottom, 100);
    const viewportCx = pLeft + availW / 2;
    const viewportCy = pTop + availH / 2;

    // Default to database coords
    let targetX = stall.svg_x || 0;
    let targetY = stall.svg_y || 0;

    // Dynamically lookup real DOM SVG element to get exact box center
    if (stall.svg_cell_id) {
      try {
        const domGroup = containerRef.current.querySelector(`g[data-cell-id="${stall.svg_cell_id}"]`);
        const domRect = domGroup?.querySelector('rect');
        if (domRect) {
          const rx = parseFloat(domRect.getAttribute("x") || "0");
          const ry = parseFloat(domRect.getAttribute("y") || "0");
          const rw = parseFloat(domRect.getAttribute("width") || "0");
          const rh = parseFloat(domRect.getAttribute("height") || "0");
          
          let cx = rx + rw / 2;
          let cy = ry + rh / 2;

          // Handle rotated rects
          const transformAttr = domRect.getAttribute("transform") || "";
          const rotateMatch = transformAttr.match(/rotate\(([^)]+)\)/);
          if (rotateMatch) {
            const parts = rotateMatch[1].split(",").map(Number);
            cx = parts[1] ?? rx + rw / 2;
            cy = parts[2] ?? ry + rh / 2;
          }

          targetX = cx;
          targetY = cy;

          // Adjust to global canvas coordinates
          if (stall.building === 'main' && unifiedFloorView) {
            targetY += annexConfig.height + COMBINED_BRIDGE_GAP;
          }
          if (stall.building === 'annex' && !unifiedFloorView) {
            targetX += ANNEX_STANDALONE_X_OFFSET;
          }

          // Update the stall object with the true coordinates so the tooltip popup renders correctly
          stall.svg_x = targetX;
          stall.svg_y = targetY;
        }
      } catch (e) {
        console.error("Failed to find exact stall coordinates", e);
      }
    }

    // Fallback protection if still 0,0
    if (targetX === 0 && targetY === 0) return;

    isAnimating.current = true;
    setIsTransitioning(true);
    setTimeout(() => {
      setTransform((prev) => {
        const targetScale = Math.max(prev.scale, 0.6);
        return {
          x: viewportCx - targetX * targetScale,
          y: viewportCy - targetY * targetScale,
          scale: targetScale,
        };
      });
      setSelected(stall);
    }, 10);
    setTimeout(() => {
      isAnimating.current = false;
      setIsTransitioning(false);
    }, 600);
  }, [padding]);

  // Sync external selectedStallId
  useEffect(() => {
    if (selectedStallId) {
      if (
        lastSelectedId.current !== selectedStallId ||
        focusTrigger !== lastFocusTrigger.current
      ) {
        const stall = stalls.find((s) => s.id === selectedStallId);
        if (stall) flyToStall(stall);
      }
    } else if (selectedStallId === null) {
      setSelected(null);
    }
    lastSelectedId.current = selectedStallId || null;
    lastFocusTrigger.current = focusTrigger || 0;
  }, [selectedStallId, stalls, focusTrigger, flyToStall]);

  // â”€â”€ Zoom controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleZoom = (dir: "in" | "out") => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setIsTransitioning(true);
    setTimeout(() => {
      setTransform((prev) => {
        let newScale = prev.scale * (dir === "in" ? 1.5 : 0.666);
        newScale = Math.max(0.05, Math.min(3, newScale));
        if (!containerRef.current) return prev;
        const rect = containerRef.current.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const tx = (cx - prev.x) / prev.scale;
        const ty = (cy - prev.y) / prev.scale;
        return { x: cx - tx * newScale, y: cy - ty * newScale, scale: newScale };
      });
    }, 10);
    setTimeout(() => {
      isAnimating.current = false;
      setIsTransitioning(false);
    }, 300);
  };

  // â”€â”€ Onboarding micro-interaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("map_onboarding_seen");
    if (!seen) setShowOnboarding(true);
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem("map_onboarding_seen", "1");
  };

  useEffect(() => {
    if (!showOnboarding) return;
    const timer = setTimeout(dismissOnboarding, 4000);
    return () => clearTimeout(timer);
  }, [showOnboarding]);

  // â”€â”€ Filter stalls by current building + floor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // In unified view: Annex is on TOP, Main is below.
  // Main stalls get Y offset pushed down past Annex height + bridge gap.
  const MAIN_Y_OFFSET = unifiedFloorView ? annexConfig.height + COMBINED_BRIDGE_GAP : 0;

  const visibleStalls = unifiedFloorView
    ? stalls
        .filter((s) => s.floor === activeFloor)
        .map((s) => s.building === 'main'
          ? { ...s, svg_y: s.svg_y + MAIN_Y_OFFSET }
          : { ...s, svg_x: s.svg_x + ANNEX_X_OFFSET }
        )
    : stalls.filter(
        (s) => s.building === activeBuilding && s.floor === activeFloor
      );

  // â”€â”€ Handle stall click â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleStallClick = (stall: MarketStall) => {
    if (hasDragged.current) return;
    if (onStallSelect) onStallSelect(stall);
    else flyToStall(stall);
    dismissOnboarding();
  };

  const pTop = padding?.top || 0;
  const pRight = padding?.right || 0;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "var(--radius-lg, 12px)",
        overflow: "hidden",
        boxShadow: "var(--shadow-lg, 0 4px 24px rgba(0,0,0,0.15))",
        position: "relative",
        minHeight: 400,
        background: "#F3F4F6",
        cursor: isDragging.current ? "grabbing" : "grab",
        touchAction: "none",
        zIndex: 1,
      }}
      onPointerDown={(e) => {
        handlePointerDown(e);
        dismissOnboarding();
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="application"
      aria-label={`Interactive Market Map â€” ${mapConfig.label}`}
    >
      {/* â”€â”€ Scrollable canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        style={{
          transformOrigin: "0 0",
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: isTransitioning ? "transform 0.5s cubic-bezier(0.25,1,0.5,1)" : "none",
          position: "absolute",
          top: 0,
          left: 0,
          width: SVG_WIDTH,
          height: CANVAS_HEIGHT,
          opacity: mapTransitioning ? 0 : 1,
          transitionProperty: "opacity, transform",
          transitionDuration: mapTransitioning ? "0.2s" : isTransitioning ? "0.5s" : "0s",
        }}
      >
        {/* Main building floor plan - inline SVG with clickable stalls */}
        <InlineSvgFloorPlan
          svgSrc={mapConfig.src}
          width={mapConfig.width}
          height={SVG_HEIGHT}
          stalls={visibleStalls.filter(s => s.building === 'main' || !unifiedFloorView)}
          selectedStallId={selected?.id}
          highlightedStallIds={highlightedStallIds}
          activeLayer={activeLayer}
          onStallClick={handleStallClick}
          style={{
            top: unifiedFloorView ? annexConfig.height + COMBINED_BRIDGE_GAP : 0,
            left: ANNEX_STANDALONE_X_OFFSET,
          }}
        />

        {/* In unified mode: Annex ON TOP (centered), road + center bridge, then Main below */}
        {unifiedFloorView && (() => {
          const BW = 150;  // bridge walkway width in SVG units (~size of one stall)
          const BX = (SVG_WIDTH - BW) / 2 - BW; // bridge left x (shifted left by one bridge width)
          const H = COMBINED_BRIDGE_GAP;
          return (
            <>
              {/* Annex floor plan — inline SVG with clickable stalls */}
              <InlineSvgFloorPlan
                svgSrc={annexConfig.src}
                width={SVG_WIDTH}
                height={annexConfig.height}
                stalls={visibleStalls.filter(s => s.building === 'annex')}
                selectedStallId={selected?.id}
                highlightedStallIds={highlightedStallIds}
                activeLayer={activeLayer}
                onStallClick={handleStallClick}
                style={{ top: 0, left: 0 }}
              />
              {/* Road + bridge connector strip */}
              <svg
                viewBox={`0 0 ${SVG_WIDTH} ${H}`}
                width={SVG_WIDTH}
                height={H}
                style={{ position: "absolute", top: annexConfig.height, left: 0, pointerEvents: "none" }}
              >
                {/* Road surface — full width */}
                <rect x={0} y={0} width={SVG_WIDTH} height={H} fill="#78716C" />
                {/* Road lane dashes — left of bridge */}
                {Array.from({length: 6}).map((_, i) => (
                  <rect key={`l${i}`} x={SVG_WIDTH * 0.05 + i * (BX / 6.5)} y={H / 2 - 10} width={80} height={20} rx={4} fill="#D1D5DB" opacity={0.5} />
                ))}
                {/* Road lane dashes — right of bridge */}
                {Array.from({length: 6}).map((_, i) => (
                  <rect key={`r${i}`} x={BX + BW + 40 + i * ((SVG_WIDTH * 0.95 - BX - BW) / 6.5)} y={H / 2 - 10} width={80} height={20} rx={4} fill="#D1D5DB" opacity={0.5} />
                ))}
                {/* ROAD label left */}
                <text x={BX / 2} y={H * 0.55} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={32} fontWeight="700" fontFamily="system-ui,sans-serif" letterSpacing="4">ROAD</text>
                <text x={BX / 2} y={H * 0.72} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={22} fontFamily="system-ui,sans-serif">(below)</text>
                {/* ROAD label right */}
                <text x={BX + BW + (SVG_WIDTH - BX - BW) / 2} y={H * 0.55} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={32} fontWeight="700" fontFamily="system-ui,sans-serif" letterSpacing="4">ROAD</text>
                <text x={BX + BW + (SVG_WIDTH - BX - BW) / 2} y={H * 0.72} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={22} fontFamily="system-ui,sans-serif">(below)</text>

                {/* ── Bridge walkway in center ── */}
                {/* Walkway floor */}
                <rect x={BX} y={0} width={BW} height={H} fill="#D6D3D1" />
                {/* Walkway roof (darker shade top) */}
                <rect x={BX} y={0} width={BW} height={H * 0.18} fill="#A8A29E" />
                {/* Walkway bottom cap */}
                <rect x={BX} y={H * 0.82} width={BW} height={H * 0.18} fill="#A8A29E" />
                {/* Left railing posts */}
                {Array.from({length: 7}).map((_, i) => (
                  <rect key={`lp${i}`} x={BX + 12} y={H * 0.18 + (H * 0.64 / 6) * i} width={18} height={H * 0.64 / 7} rx={3} fill="#78716C" />
                ))}
                {/* Right railing posts */}
                {Array.from({length: 7}).map((_, i) => (
                  <rect key={`rp${i}`} x={BX + BW - 30} y={H * 0.18 + (H * 0.64 / 6) * i} width={18} height={H * 0.64 / 7} rx={3} fill="#78716C" />
                ))}
                {/* Left rail bar */}
                <rect x={BX + 8} y={H * 0.18} width={26} height={H * 0.64} rx={4} fill="#57534E" opacity={0.7} />
                {/* Right rail bar */}
                <rect x={BX + BW - 34} y={H * 0.18} width={26} height={H * 0.64} rx={4} fill="#57534E" opacity={0.7} />
                {/* Center floor stripe */}
                <rect x={BX + BW / 2 - 10} y={H * 0.2} width={20} height={H * 0.6} rx={4} fill="#C4B5A0" opacity={0.6} />
                {/* BRIDGE label */}
                <text
                  x={BX + BW / 2} y={H * 0.52}
                  textAnchor="middle"
                  fill="#44403C"
                  fontSize={46} fontWeight="900"
                  fontFamily="system-ui,sans-serif"
                  letterSpacing="8"
                  transform={`rotate(-90, ${BX + BW / 2}, ${H / 2})`}
                >BRIDGE</text>
              </svg>
            </>
          );
        })()}


        {/* â”€â”€ Zone layers (Waste Risk / Complaint Density) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeLayer === "waste_risk" && zoneHeatData?.waste_risk && (
          <WasteRiskLayer
            zones={zoneHeatData.waste_risk}
            svgWidth={SVG_WIDTH}
            svgHeight={SVG_HEIGHT}
          />
        )}
        {activeLayer === "complaint_density" && zoneHeatData?.complaint_density && (
          <ComplaintDensityLayer
            zones={zoneHeatData.complaint_density}
            svgWidth={SVG_WIDTH}
            svgHeight={SVG_HEIGHT}
          />
        )}

        {/* Stall layers are now rendered inline within the SVG floor plans above */}

        {/* â”€â”€ Navigation route overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {navigationRoute && navigationRoute.points.length > 1 && (
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: SVG_WIDTH,
              height: SVG_HEIGHT,
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="15" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <polyline
              points={navigationRoute.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="40 40"
              filter="url(#glow)"
              style={{ animation: "dash 1s linear infinite" }}
            />
            {navigationRoute.points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={30}
                fill={i === 0 ? "#10B981" : "#EF4444"}
                stroke="white"
                strokeWidth={8}
              />
            ))}
          </svg>
        )}
      </div>

      {/* â”€â”€ Stall popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {selected && (() => {
        const popupScale = Math.max(0.6, Math.min(1.2, transform.scale / 0.15));
        const occupancyConf = OCCUPANCY_CONFIG[selected.occupancy_status];
        const complianceConf = selected.compliance_status
          ? COMPLIANCE_CONFIG[selected.compliance_status]
          : null;

        return (
          <div
            style={{
              position: "absolute",
              left: transform.x + selected.svg_x * transform.scale,
              top: transform.y + selected.svg_y * transform.scale - 40 * transform.scale - 15,
              transform: `translate(-50%, -100%) scale(${popupScale})`,
              transformOrigin: "bottom center",
              background: "white",
              borderRadius: 14,
              padding: "16px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              width: 280,
              zIndex: 1000,
              border: `2px solid ${occupancyConf.border}`,
              animation: "popIn 0.2s cubic-bezier(0.16,1,0.3,1)",
              cursor: "default",
            }}
            role="region"
            aria-label={`Stall ${selected.number} details`}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Caret */}
            <div style={{
              position: "absolute",
              bottom: -7,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: 12,
              height: 12,
              background: "white",
              borderBottom: `2px solid ${occupancyConf.border}`,
              borderRight: `2px solid ${occupancyConf.border}`,
              borderBottomRightRadius: 2,
            }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: occupancyConf.color,
                  border: `2px solid ${occupancyConf.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: occupancyConf.text,
                  fontWeight: 800,
                  fontSize: 13,
                  flexShrink: 0,
                }}>
                  {selected.number}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {selected.vendor !== "â€”" ? selected.vendor : "Vacant Stall"}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {selected.category} Â· {selected.section}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(null);
                  onStallSelect?.(null);
                }}
                style={{ padding: 4, margin: "-4px -4px 0 0" }}
                aria-label="Close stall popup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Dual-status badges */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#6B7280", fontWeight: 600, width: 80, flexShrink: 0 }}>Occupancy:</span>
                <span style={{
                  background: occupancyConf.color,
                  color: occupancyConf.text,
                  padding: "2px 10px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  border: `1px solid ${occupancyConf.border}`,
                }}>
                  {occupancyConf.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#6B7280", fontWeight: 600, width: 80, flexShrink: 0 }}>Compliance:</span>
                {complianceConf ? (
                  <span style={{
                    background: complianceConf.color,
                    color: complianceConf.text,
                    padding: "2px 10px",
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 700,
                    border: `1px solid ${complianceConf.border}`,
                  }}>
                    {complianceConf.label}
                  </span>
                ) : (
                  <span style={{ color: "#9CA3AF", fontSize: 11 }}>â€” N/A</span>
                )}
              </div>
            </div>

            {/* Actions */}
            {showAdminLinks ? (
              <Link
                href={`/map/stall/${selected.id}`}
                className="btn btn-primary"
                style={{ padding: "8px", fontSize: 13, justifyContent: "center" }}
              >
                View More Info
              </Link>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {onViewDetails && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => onViewDetails(selected)}
                    style={{ flex: 1, padding: "8px", fontSize: 12, background: "#F3F4F6" }}
                  >
                    View Details
                  </button>
                )}
                {onGetDirections && (
                  <button
                    className="btn btn-primary"
                    onClick={() => onGetDirections(selected)}
                    style={{ flex: 1, padding: "8px", fontSize: 12, justifyContent: "center" }}
                  >
                    Get Directions
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* â”€â”€ Floating: Layer Controller â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!hideFloatingControls && (
        <div onPointerDown={(e) => e.stopPropagation()}>
          <LayerController
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
            showAdminLayers={showAdminLayers}
            offsetTop={(padding?.top || 0) + 16}
            offsetRight={(padding?.right || 0) + 16}
          />
        </div>
      )}

      {/* â”€â”€ Floating: Map Legend â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!hideFloatingControls && (
        <div onPointerDown={(e) => e.stopPropagation()}>
          <MapLegend
            activeLayer={activeLayer}
            showAdminLayers={showAdminLayers}
            offsetLeft={(padding?.left || 0) + 16}
            offsetBottom={(padding?.bottom || 0) + 130}
          />
        </div>
      )}

      {/* â”€â”€ Floating: Building / Floor Selectors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: (padding?.bottom || 0) + 16,
          left: (padding?.left || 0),
          right: (padding?.right || 0),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          zIndex: 30,
        }}
        role="group"
        aria-label="Building and floor navigation"
      >
        {/* Current map label */}
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(255,255,255,0.7)",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          padding: "4px 12px",
          borderRadius: 100,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          {mapConfig.label}
        </div>

        {/* Building selector â€” hidden in unified floor view */}
        {!unifiedFloorView && (
        <div style={{
          display: "flex",
          background: "rgba(15,15,20,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 50,
          padding: 4,
          gap: 4,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {(["main", "annex"] as BuildingId[]).map((b) => (
            <button
              key={b}
              onClick={() => handleBuildingChange(b)}
              style={{
                padding: "10px 22px",
                borderRadius: 50,
                border: "none",
                background: activeBuilding === b ? "#6366F1" : "transparent",
                color: activeBuilding === b ? "white" : "rgba(255,255,255,0.6)",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s ease",
                minWidth: 100,
                minHeight: 44,
              }}
              aria-pressed={activeBuilding === b}
              aria-label={`${b === "main" ? "Main Building" : "Annex"}`}
            >
              {b === "main" ? "ðŸ¢ Main" : "ðŸ¬ Annex"}
            </button>
          ))}
        </div>
        )}

        {/* Floor selector */}
        <div style={{
          display: "flex",
          background: "rgba(15,15,20,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 50,
          padding: 4,
          gap: 4,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {(["1", "2"] as FloorId[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFloorChange(f)}
              style={{
                padding: "10px 22px",
                borderRadius: 50,
                border: "none",
                background: activeFloor === f ? "#0EA5E9" : "transparent",
                color: activeFloor === f ? "white" : "rgba(255,255,255,0.6)",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s ease",
                minWidth: 100,
                minHeight: 44,
              }}
              aria-pressed={activeFloor === f}
              aria-label={`${f === "1" ? "First" : "Second"} Floor`}
            >
              {f === "1" ? "1st Floor" : "2nd Floor"}
            </button>
          ))}
        </div>
      </div>

      {/* â”€â”€ Zoom Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        style={{
          position: "absolute",
          bottom: (padding?.bottom || 0) + 130,
          right: (padding?.right || 0) + 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 30,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => handleZoom("in")}
          className="btn btn-primary"
          style={{ width: 44, height: 44, padding: 0, justifyContent: "center", borderRadius: 10 }}
          aria-label="Zoom in"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={() => fitMap(true)}
          className="btn btn-primary"
          style={{ width: 44, height: 44, padding: 0, justifyContent: "center", borderRadius: 10 }}
          aria-label="Fit map to screen"
          title="Fit Map"
        >
          <Expand size={20} />
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="btn btn-primary"
          style={{ width: 44, height: 44, padding: 0, justifyContent: "center", borderRadius: 10 }}
          aria-label="Zoom out"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
      </div>

      {/* â”€â”€ Onboarding drag hint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showOnboarding && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 50,
          }}
          aria-hidden="true"
        >
          <div style={{
            background: "rgba(15,15,20,0.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: 20,
            padding: "24px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            border: "1px solid rgba(255,255,255,0.12)",
          }}>
            <div style={{
              fontSize: 48,
              animation: "swipeHint 1.4s ease-in-out infinite",
            }}>
              ðŸ‘†
            </div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>
              Drag to explore the map
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              Pinch or scroll to zoom
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Keyframes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: translate(-50%, -90%) scale(0.95); }
          to   { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -80; }
        }
        @keyframes swipeHint {
          0%   { transform: translateX(0px) rotate(0deg); }
          25%  { transform: translateX(-16px) rotate(-10deg); }
          75%  { transform: translateX(16px) rotate(10deg); }
          100% { transform: translateX(0px) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

