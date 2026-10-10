"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { X, ZoomIn, ZoomOut, Expand, ClipboardCheck, AlertTriangle, UserPlus, MessageSquare, Wrench, ExternalLink } from "lucide-react";
import PF from "pathfinding";

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
import OfflineIndicator from "./OfflineIndicator";

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EMPTY_IDS: string[] = [];
const EMPTY_POINTS: { x: number; y: number }[] = [];
const MAP_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

type NavigationRoute = {
  points: { x: number; y: number; label: string }[];
  totalDistanceMeters: number;
  /** Floor the route belongs to. When set, the route only renders/paths on that floor. */
  floor?: FloorId;
};

type RouteBounds = { minX: number; minY: number; maxX: number; maxY: number };

/** One stall's alert summary from /api/v1/stalls/alert-summary/ */
export interface AlertStall {
  stall_db_id: number;
  stall_number: string;
  svg_cell_id: string;
  building: string;
  floor: string;
  alerts: { type: 'complaint' | 'violation'; severity: string; count: number }[];
}

// Stable empty reference — prevents useEffect re-trigger when no alerts are passed
const EMPTY_ALERT_STALLS: AlertStall[] = [];

interface MarketMapProps {
  stalls: MarketStall[];
  zoneHeatData?: {
    waste_risk?: ZoneHeatData[];
    complaint_density?: ZoneHeatData[];
  };
  selectedStallId?: string | null;
  highlightedStallIds?: string[];
  navigationRoute?: NavigationRoute | null;
  onStallSelect?: (stall: MarketStall | null) => void;
  onGetDirections?: (stall: MarketStall) => void;
  onViewDetails?: (stall: MarketStall) => void;
  onLogInspection?: (stall: MarketStall) => void;
  onIssueViolation?: (stall: MarketStall) => void;
  onAssignVendor?: (stall: MarketStall) => void;
  onSendNotice?: (stall: MarketStall) => void;
  onWorkOrder?: (stall: MarketStall) => void;
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
  /** Admin alert data — one record per stall with open complaints or active violations */
  alertStalls?: AlertStall[];
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function MarketMap({
  stalls,
  zoneHeatData,
  selectedStallId,
  highlightedStallIds = EMPTY_IDS,
  navigationRoute,
  onStallSelect,
  onGetDirections,
  onViewDetails,
  onLogInspection,
  onIssueViolation,
  onAssignVendor,
  onSendNotice,
  onWorkOrder,
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
  alertStalls = EMPTY_ALERT_STALLS,
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
  // canvasRef points at the inner div whose CSS transform we mutate.
  // Writing to the DOM directly (applyTransform) costs zero React renders.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<MarketStall | null>(null);
  // React state — only used for fitMap/flyToStall animations that need
  // a CSS `transition`. Pointer events NEVER call setTransform directly.
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.15 });
  // Live transform value — always current, no render lag
  const transformRef = useRef({ x: 0, y: 0, scale: 0.15 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastMouse = useRef({ x: 0, y: 0 });
  const isAnimating = useRef(false);
  const lastSelectedId = useRef<string | null>(null);
  const lastFocusTrigger = useRef<number | undefined>(undefined);
  // Multi-touch tracking for native-feeling pinch zoom
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  // Momentum/inertia panning — like Waze: map glides after finger lifts
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const lastTimeRef = useRef(0);
  const momentumRafRef = useRef<number | null>(null);

  // State for intelligent pathfinding.
  // The detailed route carries the navigationRoute object it was computed for, so a
  // path from a previous route is never drawn (or fitted) against a newer one.
  // The grid carries the building/floor context it was built for, so pathfinding
  // never runs against a stale grid after a floor or building switch.
  const [navGrid, setNavGrid] = useState<{ grid: PF.Grid; key: string } | null>(null);
  const [detailedRoute, setDetailedRoute] = useState<{
    route: NavigationRoute;
    points: { x: number; y: number }[];
  } | null>(null);
  const [svgLoadCount, setSvgLoadCount] = useState(0);

  const floorKey = `${activeBuilding}/${activeFloor}/${unifiedFloorView ? "u" : "s"}`;
  const activeNavGrid = navGrid && navGrid.key === floorKey ? navGrid.grid : null;
  // A floor-tagged route is only drawn/pathfound/fitted while its floor is displayed
  const routeMatchesFloor = !navigationRoute?.floor || navigationRoute.floor === activeFloor;

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

  // ── applyTransform ────────────────────────────────────────────────────────
  // The critical hot path. Writes the CSS transform directly to the DOM
  // without going through React. Zero re-renders, ~60 fps even on low-end phones.
  // Also keeps transformRef and React state in sync depending on the call site:
  //   - During panning/momentum: only DOM + ref (no React render)
  //   - During fitMap/flyToStall: DOM + ref + React state (enables CSS transition)
  const applyTransform = useCallback((
    t: { x: number; y: number; scale: number },
    updateReactState = false
  ) => {
    transformRef.current = t;
    if (canvasRef.current) {
      canvasRef.current.style.transform =
        `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
    }
    if (updateReactState) setTransform(t);
  }, []);

  // -- Fit map to container -------------------------------------------------
  // When `bounds` is provided (route fitting), the view zooms to that bounding
  // box with padding instead of the whole floor plan.
  const fitMap = useCallback((animate = false, bounds?: RouteBounds) => {
    if (!containerRef.current) return;
    if (animate && isAnimating.current && !bounds) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const pTop = padding?.top || 0;
    const pRight = padding?.right || 0;
    const pBottom = padding?.bottom || 0;
    const pLeft = padding?.left || 0;
    const availW = Math.max(width - pLeft - pRight, 100);
    const availH = Math.max(height - pTop - pBottom, 100);

    let initX: number;
    let initY: number;
    let initialScale: number;

    if (bounds) {
      // SVG-space breathing room around the route so markers/labels aren't on the edge
      const PAD = 200;
      const bw = Math.max(bounds.maxX - bounds.minX, 1) + PAD * 2;
      const bh = Math.max(bounds.maxY - bounds.minY, 1) + PAD * 2;
      initialScale = Math.max(0.05, Math.min(Math.min(availW / bw, availH / bh), 1.2));
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      initX = pLeft + availW / 2 - cx * initialScale;
      initY = pTop + availH / 2 - cy * initialScale;
    } else {
      initialScale = Math.max(
        Math.min(availW / SVG_WIDTH, availH / CANVAS_HEIGHT),
        0.05
      );

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      if (unifiedFloorView) {
        // Zoom in to fill the width nicely to avoid excessive side whitespace.
        // On mobile, apply a multiplier so the stalls appear larger and more readable by default.
        initialScale = Math.max(
          (availW / SVG_WIDTH) * (isMobile ? 1.8 : 1),
          0.05
        );
      }

      initX = pLeft + (availW - SVG_WIDTH * initialScale) / 2;
      initY = pTop + (availH - CANVAS_HEIGHT * initialScale) / 2;
      if (unifiedFloorView) {
        // Center on the Main building (bottom portion)
        const mainCenterY = annexConfig.height + COMBINED_BRIDGE_GAP + SVG_HEIGHT / 2;
        initY = pTop + availH / 2 - mainCenterY * initialScale;
      }
    }

    if (animate) {
      isAnimating.current = true;
      setIsTransitioning(true);
      applyTransform({ x: initX, y: initY, scale: initialScale }, true);
      setTimeout(() => {
        isAnimating.current = false;
        setIsTransitioning(false);
      }, 500);
    } else {
      applyTransform({ x: initX, y: initY, scale: initialScale }, true);
    }
  }, [SVG_WIDTH, CANVAS_HEIGHT, SVG_HEIGHT, unifiedFloorView, annexConfig,
    padding?.top, padding?.right, padding?.bottom, padding?.left, applyTransform]);

  // Re-fit when building/floor changes (new SVG dimensions) or padding changes
  useEffect(() => { fitMap(false); }, [activeBuilding, activeFloor, fitMap]);

  // Zoom to the route's bounding box when directions are set; zoom back out on clear.
  // Waits for the A* result (when a grid exists) so the fit covers the real walking
  // path, and fits each route object exactly once.
  const lastFitRouteRef = useRef<NavigationRoute | null>(null);
  useEffect(() => {
    if (!navigationRoute || navigationRoute.points.length === 0) {
      if (lastFitRouteRef.current) {
        lastFitRouteRef.current = null;
        fitMap(true);
      }
      return;
    }
    if (lastFitRouteRef.current === navigationRoute) return;
    if (!routeMatchesFloor) return; // wait until the map switches to the route's floor
    const detailedReady = detailedRoute?.route === navigationRoute;
    if (activeNavGrid && !detailedReady) return; // re-runs when the A* path lands
    const pts = detailedReady ? detailedRoute!.points : navigationRoute.points;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    lastFitRouteRef.current = navigationRoute;
    fitMap(true, { minX, minY, maxX, maxY });
  }, [navigationRoute, detailedRoute, activeNavGrid, routeMatchesFloor, fitMap]);

  // -- Build Navigation Grid ----------------------------------------------
  useEffect(() => {
    if (!containerRef.current || svgLoadCount === 0) return;

    const timeoutId = setTimeout(() => {
      // Use a larger cell on mobile to cut grid computation cost ~44%.
      // Path accuracy is still sufficient for short aisle distances.
      const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
      const CELL_SIZE = isMobileDevice ? 25 : 20;
      const cols = Math.ceil(SVG_WIDTH / CELL_SIZE);
      const rows = Math.ceil(CANVAS_HEIGHT / CELL_SIZE);
      const grid = new PF.Grid(cols, rows);

      const allSvgs = containerRef.current!.querySelectorAll('svg');

      allSvgs.forEach(svgEl => {
        if (!svgEl.querySelector('g[data-cell-id]')) return;

        const parentDiv = svgEl.parentElement;
        if (!parentDiv) return;
        const containerLeft = parseFloat(parentDiv.style.left) || 0;
        const containerTop = parseFloat(parentDiv.style.top) || 0;

        const viewBoxAttr = svgEl.getAttribute('viewBox');
        const displayW = parseFloat(svgEl.getAttribute('width') || '0');
        const displayH = parseFloat(svgEl.getAttribute('height') || '0');

        let scale = 1, svgOffsetX = 0, svgOffsetY = 0;
        if (viewBoxAttr && displayW > 0 && displayH > 0) {
          const vb = viewBoxAttr.split(/[\s,]+/).map(Number);
          const vbW = vb[2] || displayW;
          const vbH = vb[3] || displayH;
          scale = Math.min(displayW / vbW, displayH / vbH);
          svgOffsetX = (displayW - vbW * scale) / 2;
          svgOffsetY = (displayH - vbH * scale) / 2;
        }

        const cellGroups = svgEl.querySelectorAll('g[data-cell-id]');
        cellGroups.forEach(g => {
          const cellId = g.getAttribute('data-cell-id');
          if (cellId === '0' || cellId === '1') return;

          const rect = g.querySelector('rect');
          if (!rect) return;

          const x = parseFloat(rect.getAttribute('x') || '0');
          const y = parseFloat(rect.getAttribute('y') || '0');
          const w = parseFloat(rect.getAttribute('width') || '0');
          const h = parseFloat(rect.getAttribute('height') || '0');
          const transform = rect.getAttribute('transform') || '';

          let minX: number, minY: number, maxX: number, maxY: number;
          const rotMatch = transform.match(/rotate\(([^)]+)\)/);
          if (rotMatch) {
            const parts = rotMatch[1].split(',').map(Number);
            const angle = (parts[0] || 0) * Math.PI / 180;
            const cx = parts.length > 1 ? parts[1] : x + w / 2;
            const cy = parts.length > 2 ? parts[2] : y + h / 2;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const corners: [number, number][] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
            const rotated = corners.map(([px, py]) => [
              cx + (px - cx) * cosA - (py - cy) * sinA,
              cy + (px - cx) * sinA + (py - cy) * cosA
            ]);
            minX = Math.min(...rotated.map(r => r[0]));
            maxX = Math.max(...rotated.map(r => r[0]));
            minY = Math.min(...rotated.map(r => r[1]));
            maxY = Math.max(...rotated.map(r => r[1]));
          } else {
            minX = x;
            maxX = x + w;
            minY = y;
            maxY = y + h;
          }

          const canvasMinX = minX * scale + svgOffsetX + containerLeft;
          const canvasMaxX = maxX * scale + svgOffsetX + containerLeft;
          const canvasMinY = minY * scale + svgOffsetY + containerTop;
          const canvasMaxY = maxY * scale + svgOffsetY + containerTop;

          const startCol = Math.max(0, Math.floor(canvasMinX / CELL_SIZE));
          const endCol = Math.min(cols - 1, Math.floor(canvasMaxX / CELL_SIZE));
          const startRow = Math.max(0, Math.floor(canvasMinY / CELL_SIZE));
          const endRow = Math.min(rows - 1, Math.floor(canvasMaxY / CELL_SIZE));

          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              grid.setWalkableAt(c, r, false);
            }
          }
        });
      });

      setNavGrid({ grid, key: floorKey });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [svgLoadCount, SVG_WIDTH, CANVAS_HEIGHT, floorKey]);

  // -- Compute Detailed Route ---------------------------------------------
  useEffect(() => {
    if (!navigationRoute || !activeNavGrid || navigationRoute.points.length < 2 || !routeMatchesFloor) {
      setDetailedRoute(null);
      return;
    }

    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
    const CELL_SIZE = isMobileDevice ? 25 : 20;
    const finder = new PF.AStarFinder({
      allowDiagonal: false,
      dontCrossCorners: true
    });

    let fullPath: { x: number, y: number }[] = [];
    const pts = navigationRoute.points;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      const gridClone = activeNavGrid.clone();

      let startX = Math.min(gridClone.width - 1, Math.max(0, Math.floor(p1.x / CELL_SIZE)));
      let startY = Math.min(gridClone.height - 1, Math.max(0, Math.floor(p1.y / CELL_SIZE)));
      let endX = Math.min(gridClone.width - 1, Math.max(0, Math.floor(p2.x / CELL_SIZE)));
      let endY = Math.min(gridClone.height - 1, Math.max(0, Math.floor(p2.y / CELL_SIZE)));

      // Instead of punching a massive hole in the grid (which causes shortcuts through adjacent stalls),
      // we find the nearest walkable cell (the aisle) and route from there!
      const findNearestWalkable = (cx: number, cy: number, maxDist = 45) => {
        if (gridClone.isWalkableAt(cx, cy)) return { x: cx, y: cy };
        for (let r = 1; r <= maxDist; r++) {
          for (let i = -r; i <= r; i++) {
            for (let j = -r; j <= r; j++) {
              // Only check the perimeter of the square radius
              if (Math.abs(i) === r || Math.abs(j) === r) {
                const nx = cx + i;
                const ny = cy + j;
                if (nx >= 0 && nx < gridClone.width && ny >= 0 && ny < gridClone.height) {
                  if (gridClone.isWalkableAt(nx, ny)) return { x: nx, y: ny };
                }
              }
            }
          }
        }
        return { x: cx, y: cy }; // Fallback
      };

      const startNode = findNearestWalkable(startX, startY);
      const endNode = findNearestWalkable(endX, endY);

      // Find path between the aisles
      const path = finder.findPath(startNode.x, startNode.y, endNode.x, endNode.y, gridClone);

      if (path.length > 0) {
        // Drop collinear grid nodes, then convert back to SVG coordinates
        const compressed = PF.Util.compressPath(path);
        const segmentPoints = compressed.map((node: number[]) => ({
          x: node[0] * CELL_SIZE + CELL_SIZE / 2,
          y: node[1] * CELL_SIZE + CELL_SIZE / 2
        }));

        // Remove the first point if it's not the very first segment to avoid duplicates
        if (i > 0 && segmentPoints.length > 0) {
          segmentPoints.shift();
        }
        fullPath = [...fullPath, ...segmentPoints];
      } else {
        // Fallback to straight line
        fullPath = [...fullPath, p1, p2];
      }
    }

    // Exact start/end
    if (fullPath.length > 0) {
      fullPath[0] = { x: pts[0].x, y: pts[0].y };
      fullPath[fullPath.length - 1] = { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
    }

    setDetailedRoute({ route: navigationRoute, points: fullPath });
  }, [navigationRoute, activeNavGrid, routeMatchesFloor]);

  // Points actually drawn for the current route — the A* path when it belongs to
  // this route, straight waypoint lines otherwise (grid unavailable / still computing).
  const routePathPoints = useMemo(() => {
    if (!navigationRoute) return EMPTY_POINTS;
    if (detailedRoute && detailedRoute.route === navigationRoute) return detailedRoute.points;
    return navigationRoute.points;
  }, [navigationRoute, detailedRoute]);

  // -- Pointer events -----------------------------------------------------
  // Soft pan bounds: never let the map be flung fully off-screen.
  const clampTransform = useCallback((t: { x: number; y: number; scale: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return t;
    const w = SVG_WIDTH * t.scale;
    const h = CANVAS_HEIGHT * t.scale;
    const M = 120; // px of map that must stay visible
    const minX = Math.min(M, w) - w;
    const maxX = rect.width - Math.min(M, w);
    const minY = Math.min(M, h) - h;
    const maxY = rect.height - Math.min(M, h);
    return {
      ...t,
      x: minX > maxX ? t.x : Math.min(Math.max(t.x, minX), maxX),
      y: minY > maxY ? t.y : Math.min(Math.max(t.y, minY), maxY),
    };
  }, [SVG_WIDTH, CANVAS_HEIGHT]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest("button, a, input, select, .stall-popup")) return;

    // Cancel any ongoing momentum animation
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
    velocityRef.current = { vx: 0, vy: 0 };

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2) {
      // Second finger down — switch from panning to pinch zoom
      const [p1, p2] = [...activePointers.current.values()];
      pinchRef.current = {
        dist: Math.max(Math.hypot(p2.x - p1.x, p2.y - p1.y), 1),
        midX: (p1.x + p2.x) / 2,
        midY: (p1.y + p2.y) / 2,
      };
      isDragging.current = false;
      hasDragged.current = true; // suppress the trailing click
      containerRef.current?.setPointerCapture(e.pointerId);
    } else if (activePointers.current.size === 1) {
      isDragging.current = true;
      hasDragged.current = false;
      dragStart.current = { x: e.clientX, y: e.clientY };
      lastMouse.current = { x: e.clientX, y: e.clientY };
      // Do not set pointer capture yet, to allow native clicks to pass through!
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch zoom with two active pointers
    if (pinchRef.current && activePointers.current.size >= 2) {
      const [p1, p2] = [...activePointers.current.values()];
      const dist = Math.max(Math.hypot(p2.x - p1.x, p2.y - p1.y), 1);
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const prevPinch = pinchRef.current;
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const prev = transformRef.current;
        let newScale = prev.scale * (dist / prevPinch.dist);
        newScale = Math.max(0.05, Math.min(3, newScale));
        const mx = prevPinch.midX - rect.left;
        const my = prevPinch.midY - rect.top;
        const tx = (mx - prev.x) / prev.scale;
        const ty = (my - prev.y) / prev.scale;
        applyTransform(clampTransform({
          x: (midX - rect.left) - tx * newScale,
          y: (midY - rect.top) - ty * newScale,
          scale: newScale,
        }));
      }
      pinchRef.current = { dist, midX, midY };
      return;
    }

    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;

    if (!hasDragged.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      hasDragged.current = true;
      // Now that we are actually dragging, capture the pointer
      containerRef.current?.setPointerCapture(e.pointerId);
    }

    if (hasDragged.current) {
      const now = performance.now();
      const dt = now - lastTimeRef.current;
      if (dt > 0) {
        const alpha = 0.6;
        velocityRef.current.vx = alpha * (e.clientX - lastMouse.current.x) / dt + (1 - alpha) * velocityRef.current.vx;
        velocityRef.current.vy = alpha * (e.clientY - lastMouse.current.y) / dt + (1 - alpha) * velocityRef.current.vy;
      }
      lastTimeRef.current = now;
      // Direct DOM write — no React render!
      applyTransform(clampTransform({
        ...transformRef.current,
        x: transformRef.current.x + (e.clientX - lastMouse.current.x),
        y: transformRef.current.y + (e.clientY - lastMouse.current.y),
      }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (containerRef.current?.hasPointerCapture?.(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }

    if (activePointers.current.size < 2) pinchRef.current = null;

    if (activePointers.current.size === 1) {
      // One finger lifted mid-pinch — hand off to single-finger panning without a jump
      const [p] = [...activePointers.current.values()];
      isDragging.current = true;
      lastMouse.current = { x: p.x, y: p.y };
      velocityRef.current = { vx: 0, vy: 0 };
    } else if (activePointers.current.size === 0) {
      isDragging.current = false;

      // ── Momentum / inertia panning ────────────────────────────────────
      // Only apply if we were actually dragging (not a tap) and on touch.
      const { vx, vy } = velocityRef.current;
      const speed = Math.hypot(vx, vy);
      if (hasDragged.current && speed > 0.2 && e.pointerType === "touch") {
        const FRICTION = 0.92;
        const MIN_SPEED = 0.05;
        let curVx = vx * 16;
        let curVy = vy * 16;

        const animate = () => {
          curVx *= FRICTION;
          curVy *= FRICTION;
          if (Math.hypot(curVx, curVy) < MIN_SPEED) {
            momentumRafRef.current = null;
            return;
          }
          // Direct DOM write — no React render during glide!
          applyTransform(clampTransform({
            ...transformRef.current,
            x: transformRef.current.x + curVx,
            y: transformRef.current.y + curVy,
          }));
          momentumRafRef.current = requestAnimationFrame(animate);
        };
        momentumRafRef.current = requestAnimationFrame(animate);
      }
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
      const prev = transformRef.current;
      let newScale = prev.scale * Math.exp(delta);
      newScale = Math.max(0.05, Math.min(3, newScale));
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const tx = (mx - prev.x) / prev.scale;
      const ty = (my - prev.y) / prev.scale;
      applyTransform(clampTransform({ x: mx - tx * newScale, y: my - ty * newScale, scale: newScale }));
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [clampTransform]);

  // ——————————————————————————————————————————————————————————————————————————————————————————————————
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
      const prev = transformRef.current;
      const targetScale = Math.max(prev.scale, 0.6);
      applyTransform({
        x: viewportCx - targetX * targetScale,
        y: viewportCy - targetY * targetScale,
        scale: targetScale,
      }, true);
      setSelected(stall);
    }, 10);
    setTimeout(() => {
      isAnimating.current = false;
      setIsTransitioning(false);
    }, 600);
  }, [padding?.top, padding?.right, padding?.bottom, padding?.left,
  annexConfig.height, unifiedFloorView, ANNEX_STANDALONE_X_OFFSET]);

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
    lastFocusTrigger.current = focusTrigger;
  }, [selectedStallId, stalls, focusTrigger, flyToStall]);

  // ——————————————————————————————————————————————————————————————————————————————————————————————————
  const handleZoom = (dir: "in" | "out") => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setIsTransitioning(true);
    setTimeout(() => {
      const prev = transformRef.current;
      let newScale = prev.scale * (dir === "in" ? 1.5 : 0.666);
      newScale = Math.max(0.05, Math.min(3, newScale));
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const tx = (cx - prev.x) / prev.scale;
      const ty = (cy - prev.y) / prev.scale;
      applyTransform({ x: cx - tx * newScale, y: cy - ty * newScale, scale: newScale }, true);
    }, 10);
    // Matches the 0.5s CSS transition — clearing the flag early would cut the
    // animation short and make the map snap to its final position.
    setTimeout(() => {
      isAnimating.current = false;
      setIsTransitioning(false);
    }, 520);
  };

  // ——————————————————————————————————————————————————————————————————————————————————————————————————
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("map_onboarding_seen");
    if (!seen) setShowOnboarding(true);
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem("map_onboarding_seen", "1");
  }, []);

  useEffect(() => {
    if (!showOnboarding) return;
    const timer = setTimeout(dismissOnboarding, 4000);
    return () => clearTimeout(timer);
  }, [showOnboarding, dismissOnboarding]);

  // ——————————————————————————————————————————————————————————————————————————————————————————————————
  // In unified view: Annex is on TOP, Main is below.
  // Main stalls get Y offset pushed down past Annex height + bridge gap.
  const MAIN_Y_OFFSET = unifiedFloorView ? annexConfig.height + COMBINED_BRIDGE_GAP : 0;

  // Memoized so the floor plan components (React.memo) skip re-rendering on pan/zoom
  const visibleStalls = useMemo(() => (
    unifiedFloorView
      ? stalls
        .filter((s) => s.floor === activeFloor)
        .map((s) => s.building === 'main'
          ? { ...s, svg_y: s.svg_y + MAIN_Y_OFFSET }
          : { ...s, svg_x: s.svg_x + ANNEX_X_OFFSET }
        )
      : stalls.filter(
        (s) => s.building === activeBuilding && s.floor === activeFloor
      )
  ), [stalls, unifiedFloorView, activeFloor, activeBuilding, MAIN_Y_OFFSET, ANNEX_X_OFFSET]);

  const mainStalls = useMemo(
    () => visibleStalls.filter(s => s.building === 'main' || !unifiedFloorView),
    [visibleStalls, unifiedFloorView]
  );
  const annexStalls = useMemo(
    () => visibleStalls.filter(s => s.building === 'annex'),
    [visibleStalls]
  );

  // ——————————————————————————————————————————————————————————————————————————————————————————————————
  const handleStallClick = useCallback((stall: MarketStall) => {
    if (hasDragged.current) return;
    // Haptic feedback on mobile when tapping a stall (10ms micro-pulse)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(10); } catch { /* not all browsers support this */ }
    }
    if (onStallSelect) onStallSelect(stall);
    else flyToStall(stall);
    dismissOnboarding();
  }, [onStallSelect, flyToStall, dismissOnboarding]);

  const handleSvgLoad = useCallback(() => setSvgLoadCount(c => c + 1), []);

  const mainFloorStyle = useMemo(() => ({
    top: unifiedFloorView ? annexConfig.height + COMBINED_BRIDGE_GAP : 0,
    left: ANNEX_STANDALONE_X_OFFSET,
  }), [unifiedFloorView, annexConfig.height, ANNEX_STANDALONE_X_OFFSET]);

  const annexFloorStyle = useMemo(() => ({ top: 0, left: 0 }), []);

  const pTop = padding?.top || 0;
  const pRight = padding?.right || 0;

  // ── Alert Ping Coords ─────────────────────────────────────────────────────
  // After the SVG loads (svgLoadCount increments), look up each alerted stall's
  // exact center using the same DOM approach as flyToStall. Positions are stored
  // in canvas-space SVG units (before the transform scale is applied).
  const [pingCoords, setPingCoords] = useState<
    { alert: AlertStall; cx: number; cy: number }[]
  >([]);

  useEffect(() => {
    if (!alertStalls.length || !containerRef.current || svgLoadCount === 0) {
      setPingCoords([]);
      return;
    }

    const coords: { alert: AlertStall; cx: number; cy: number }[] = [];

    for (const alert of alertStalls) {
      // Only show pings for the currently visible floor
      if (alert.floor !== activeFloor) continue;

      let cx = 0;
      let cy = 0;
      let found = false;

      if (alert.svg_cell_id && containerRef.current) {
        try {
          const domGroup = containerRef.current.querySelector(
            `g[data-cell-id="${alert.svg_cell_id}"]`
          );
          const domRect = domGroup?.querySelector('rect');
          if (domRect) {
            const rx = parseFloat(domRect.getAttribute('x') || '0');
            const ry = parseFloat(domRect.getAttribute('y') || '0');
            const rw = parseFloat(domRect.getAttribute('width') || '0');
            const rh = parseFloat(domRect.getAttribute('height') || '0');
            cx = rx + rw / 2;
            cy = ry + rh / 2;
            // Handle rotated rects
            const ta = domRect.getAttribute('transform') || '';
            const rm = ta.match(/rotate\(([^)]+)\)/);
            if (rm) {
              const parts = rm[1].split(',').map(Number);
              cx = parts[1] ?? cx;
              cy = parts[2] ?? cy;
            }
            found = true;
          }
        } catch { /* ignore — stall not on this floor's SVG */ }
      }

      if (!found) continue;

      // Apply same Y offset as visibleStalls for unified view
      if (alert.building === 'main' && unifiedFloorView) {
        cy += annexConfig.height + COMBINED_BRIDGE_GAP;
      } else if (alert.building === 'annex' && unifiedFloorView) {
        cx += ANNEX_X_OFFSET;
      } else if (alert.building === 'annex' && !unifiedFloorView) {
        cx += ANNEX_STANDALONE_X_OFFSET;
      }

      coords.push({ alert, cx, cy });
    }

    setPingCoords(coords);
  }, [alertStalls, svgLoadCount, activeFloor, unifiedFloorView,
    annexConfig.height, ANNEX_X_OFFSET, ANNEX_STANDALONE_X_OFFSET]);

  // Build a lookup from stall_number → AlertStall for the popup
  const alertByStallNumber = useMemo(() => {
    const m: Record<string, AlertStall> = {};
    for (const a of alertStalls) m[a.stall_number] = a;
    return m;
  }, [alertStalls]);

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
        userSelect: "none",
        WebkitUserSelect: "none",
        zIndex: 1,
      }}
      onPointerDown={(e) => {
        handlePointerDown(e);
        dismissOnboarding();
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDragStart={(e) => e.preventDefault()}
      role="application"
      aria-label={`Interactive Market Map — ${mapConfig.label}`}
    >
      {/* ── Stall Alert Ping keyframes (injected once) ─────────────────── */}
      <style>{`
        @keyframes stallPingRing {
          0%   { transform: scale(1);   opacity: 0.65; }
          70%  { transform: scale(2.6); opacity: 0.12; }
          100% { transform: scale(3.0); opacity: 0; }
        }
      `}</style>
      {/* ── Inner canvas — transform written directly to DOM via canvasRef ── */}
      <div
        ref={canvasRef}
        style={{
          transformOrigin: "0 0",
          // Initial transform — overwritten by applyTransform() during
          // interaction; only synced to React state for animated transitions.
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          position: "absolute",
          top: 0,
          left: 0,
          width: SVG_WIDTH,
          height: CANVAS_HEIGHT,
          opacity: mapTransitioning ? 0 : 1,
          // GPU composite layer — browser doesn't repaint on transform changes
          willChange: "transform",
          transition: isTransitioning
            ? `transform 0.5s ${MAP_EASE}, opacity 0.2s ease`
            : "opacity 0.2s ease",
        }}
      >
        {/* Main building floor plan - inline SVG with clickable stalls */}
        <InlineSvgFloorPlan
          svgSrc={mapConfig.src}
          width={mapConfig.width}
          height={SVG_HEIGHT}
          stalls={mainStalls}
          selectedStallId={selected?.id}
          highlightedStallIds={highlightedStallIds}
          activeLayer={activeLayer}
          onStallClick={handleStallClick}
          onLoad={handleSvgLoad}
          style={mainFloorStyle}
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
                stalls={annexStalls}
                selectedStallId={selected?.id}
                highlightedStallIds={highlightedStallIds}
                activeLayer={activeLayer}
                onStallClick={handleStallClick}
                onLoad={handleSvgLoad}
                style={annexFloorStyle}
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
                {Array.from({ length: 6 }).map((_, i) => (
                  <rect key={`l${i}`} x={SVG_WIDTH * 0.05 + i * (BX / 6.5)} y={H / 2 - 10} width={80} height={20} rx={4} fill="#D1D5DB" opacity={0.5} />
                ))}
                {/* Road lane dashes — right of bridge */}
                {Array.from({ length: 6 }).map((_, i) => (
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
                {Array.from({ length: 7 }).map((_, i) => (
                  <rect key={`lp${i}`} x={BX + 12} y={H * 0.18 + (H * 0.64 / 6) * i} width={18} height={H * 0.64 / 7} rx={3} fill="#78716C" />
                ))}
                {/* Right railing posts */}
                {Array.from({ length: 7 }).map((_, i) => (
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

        {/* -- Stall Alert Ping Overlay */}
        {pingCoords.length > 0 && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: SVG_WIDTH,
              height: CANVAS_HEIGHT,
              pointerEvents: 'none',
              zIndex: 4,
              overflow: 'visible',
            }}
          >
            {pingCoords.map(({ alert, cx, cy }, idx) => {
              const hasViolation = alert.alerts.some(a => a.type === 'violation');
              const hasComplaint = alert.alerts.some(a => a.type === 'complaint');
              const ringColor = hasViolation ? '#DC2626' : '#F97316';
              const dotColor = hasViolation ? '#DC2626' : '#F97316';
              const dotStroke = hasViolation ? '#FEE2E2' : '#FFEDD5';
              const inv = 1 / transform.scale;
              const BASE_R = 12 * inv;
              return (
                <g key={`ping-${alert.stall_db_id}-${idx}`}
                  style={{ transform: `translate(${cx}px, ${cy}px)` }}>
                  {([0, 0.7, 1.4] as number[]).map((delay, ri) => (
                    <circle
                      key={ri}
                      r={BASE_R}
                      fill="none"
                      stroke={ringColor}
                      strokeWidth={1.5 * inv}
                      style={{
                        animation: `stallPingRing 2.1s ${delay}s ease-out infinite`,
                        transformOrigin: '0 0',
                        opacity: 0,
                      }}
                    />
                  ))}
                  <circle r={5 * inv} fill={dotColor} stroke={dotStroke} strokeWidth={2 * inv} opacity={0.92} />
                  {hasViolation && hasComplaint && (
                    <circle cx={7 * inv} cy={-7 * inv} r={4 * inv} fill="#F97316" stroke="#FFEDD5" strokeWidth={1.5 * inv} opacity={0.92} />
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* â”€â”€ Navigation route overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {navigationRoute && navigationRoute.points.length > 1 && routeMatchesFloor && (() => {
          // Everything inside this SVG is scaled by the map transform, so sizes are
          // divided by the current scale to stay at a constant *screen* size.
          const inv = 1 / transform.scale;
          const ptsAttr = routePathPoints.map((p) => `${p.x},${p.y}`).join(" ");
          const markerTransition = isTransitioning ? `transform 0.5s ${MAP_EASE}` : "none";
          const waypoints = navigationRoute.points;
          return (
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: SVG_WIDTH,
                height: CANVAS_HEIGHT,
                pointerEvents: "none",
                zIndex: 5,
                overflow: "visible",
              }}
            >
              {/* Navy casing for contrast on the light floor plan */}
              <polyline
                points={ptsAttr}
                fill="none"
                stroke="#0A1B4A"
                strokeWidth={10 * inv}
                strokeOpacity={0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Animated gold dashed trail */}
              <polyline
                points={ptsAttr}
                fill="none"
                stroke="#FFCB05"
                strokeWidth={4.5 * inv}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${18 * inv} ${14 * inv}`}
                style={{
                  "--route-dash-period": `${32 * inv}px`,
                  animation: "routeDash 1s linear infinite",
                } as React.CSSProperties}
              />
              {/* Waypoint markers — inverse-scaled so they read at any zoom level */}
              {waypoints.map((p, i) => {
                const isStart = i === 0;
                const isEnd = i === waypoints.length - 1;
                return (
                  <g
                    key={i}
                    style={{
                      transform: `translate(${p.x}px, ${p.y}px) scale(${inv})`,
                      transition: markerTransition,
                    }}
                  >
                    <circle
                      r={14}
                      fill={isEnd ? "#FFCB05" : "#0A1B4A"}
                      stroke={isEnd ? "#0A1B4A" : "#FFCB05"}
                      strokeWidth={3}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={isEnd ? 15 : 13}
                      fontWeight={900}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fill={isEnd ? "#0A1B4A" : "#FFCB05"}
                    >
                      {isStart ? "S" : isEnd ? "★" : String(i)}
                    </text>
                    {/* Label pill with white halo, fixed screen size */}
                    <text
                      y={32}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={800}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fill="#0A1B4A"
                      stroke="#FFFFFF"
                      strokeWidth={3.5}
                      paintOrder="stroke"
                      strokeLinejoin="round"
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          );
        })()}
      </div>

      {/* â”€â”€ Stall popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {selected && (() => {
        const occupancyConf = OCCUPANCY_CONFIG[selected.occupancy_status];
        const complianceConf = selected.compliance_status
          ? COMPLIANCE_CONFIG[selected.compliance_status]
          : null;

        // Constant visual size regardless of zoom, clamped to the viewport so it
        // never renders off-screen when the stall sits near an edge.
        const BUBBLE_W = 280;
        const EDGE = 10;
        const halfW = BUBBLE_W / 2;
        const estH = showAdminLinks ? 320 : 220; // approximate bubble height
        const containerRect = containerRef.current?.getBoundingClientRect();
        const anchorX = transform.x + selected.svg_x * transform.scale;
        const anchorY = transform.y + selected.svg_y * transform.scale - 18;
        const clampedX = containerRect
          ? Math.min(Math.max(anchorX, halfW + EDGE), Math.max(containerRect.width - halfW - EDGE, halfW + EDGE))
          : anchorX;
        const clampedY = containerRect
          ? Math.min(Math.max(anchorY, estH + EDGE), Math.max(containerRect.height - EDGE, estH + EDGE))
          : anchorY;
        // Keep the caret pointing at the stall even when the bubble is clamped
        const caretShift = Math.max(-halfW + 24, Math.min(halfW - 24, anchorX - clampedX));

        return (
          <div
            key={selected.id}
            style={{
              position: "absolute",
              left: clampedX,
              top: clampedY,
              transform: `translate(-50%, -100%)`,
              transformOrigin: "bottom center",
              transition: isTransitioning ? `left 0.5s ${MAP_EASE}, top 0.5s ${MAP_EASE}` : "none",
              background: "rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: 16,
              padding: "16px",
              boxShadow: "0 8px 32px rgba(31, 38, 135, 0.15)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              width: 280,
              zIndex: 1000,
              border: `1px solid rgba(255, 255, 255, 0.4)`,
              borderTop: `2px solid ${occupancyConf.border}`, // Keep a hint of occupancy color at the top
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
              bottom: -6,
              left: `calc(50% + ${caretShift}px)`,
              transform: "translateX(-50%) rotate(45deg)",
              width: 12,
              height: 12,
              background: "rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderBottom: `1px solid rgba(255, 255, 255, 0.4)`,
              borderRight: `1px solid rgba(255, 255, 255, 0.4)`,
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
                    {selected.vendor !== "—" ? selected.vendor : "Vacant Stall"}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {selected.category} · {selected.section}
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
                  <span style={{ color: "#9CA3AF", fontSize: 11 }}>— N/A</span>
                )}
              </div>
            </div>

            {/* ── Alerts section (admin-only, shown when stall has active alerts) */}
            {showAdminLinks && (() => {
              const stallAlert = alertByStallNumber[selected.number];
              if (!stallAlert || !stallAlert.alerts.length) return null;
              const complaintAlert = stallAlert.alerts.find(a => a.type === 'complaint');
              const violationAlert = stallAlert.alerts.find(a => a.type === 'violation');
              return (
                <div style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #FECACA',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#DC2626', marginBottom: 2 }}>
                    ⚠ Active Alerts
                  </div>
                  {violationAlert && (
                    <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#374151', fontWeight: 600 }}>🔴 Active violations</span>
                      <span style={{ background: '#DC2626', color: 'white', fontWeight: 800, fontSize: 11, padding: '1px 8px', borderRadius: 100 }}>
                        {violationAlert.count}
                      </span>
                    </div>
                  )}
                  {complaintAlert && (
                    <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#374151', fontWeight: 600 }}>🟠 Open complaints</span>
                      <span style={{ background: '#F97316', color: 'white', fontWeight: 800, fontSize: 11, padding: '1px 8px', borderRadius: 100 }}>
                        {complaintAlert.count}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Actions */}
            {showAdminLinks ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: 4 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                  <button className="btn" onClick={() => onLogInspection?.(selected)} style={{ background: "#F3F4F6", color: "#374151", fontSize: 11, padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, border: "1px solid #E5E7EB" }}>
                    <ClipboardCheck size={14} /> Log Inspection
                  </button>
                  <button className="btn" onClick={() => onIssueViolation?.(selected)} style={{ background: "#FEF2F2", color: "#DC2626", fontSize: 11, padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, border: "1px solid #FECACA" }}>
                    <AlertTriangle size={14} /> Issue Violation
                  </button>
                  <button className="btn" onClick={() => onAssignVendor?.(selected)} style={{ background: "#EFF6FF", color: "#1D4ED8", fontSize: 11, padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, border: "1px solid #BFDBFE" }}>
                    <UserPlus size={14} /> {selected.vendor !== "—" ? "Reassign" : "Assign Vendor"}
                  </button>
                  <button className="btn" onClick={() => onSendNotice?.(selected)} style={{ background: "#FDF4FF", color: "#C026D3", fontSize: 11, padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, border: "1px solid #E9D5FF" }}>
                    <MessageSquare size={14} /> Send Notice
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-2)" }}>
                  {/*<button className="btn" onClick={() => onWorkOrder?.(selected)} style={{ background: "#FFFBEB", color: "#D97706", fontSize: 11, padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, border: "1px solid #FDE68A" }}>
                    <Wrench size={12} /> Work Order
                  </button>*/}
                  <Link href={`/admin/stalls/${selected.dbId}`} className="btn btn-primary" style={{ fontSize: 11, padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <ExternalLink size={14} /> Full Details
                  </Link>
                </div>
              </div>
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
        @keyframes routeDash {
          to { stroke-dashoffset: calc(-1 * var(--route-dash-period, 40px)); }
        }
        @keyframes swipeHint {
          0%   { transform: translateX(0px) rotate(0deg); }
          25%  { transform: translateX(-16px) rotate(-10deg); }
          75%  { transform: translateX(16px) rotate(10deg); }
          100% { transform: translateX(0px) rotate(0deg); }
        }
      `}</style>

      {/* Offline / low-signal banner — shown when the device loses connectivity */}
      <OfflineIndicator />
    </div>
  );
}

