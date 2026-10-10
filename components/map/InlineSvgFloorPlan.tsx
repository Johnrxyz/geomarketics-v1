"use client";

import { memo, useEffect, useRef, useCallback, useState } from "react";
import { MarketStall, OCCUPANCY_CONFIG, COMPLIANCE_CONFIG, MapLayerId } from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";
const EMPTY_IDS: string[] = [];

// All SVG floor plan sources — used for background prefetching after the
// active floor loads so that switching floors feels instant.
const ALL_SVG_SRCS = [
  "/MAIN_First_Floor.svg",
  "/MAIN_Second_Floor.svg",
  "/ANNEX_First_Floor.svg",
  "/ANNEX_Second_Floor.svg",
];

// ─── Skeleton Shimmer ────────────────────────────────────────────────────────
// Shown while the SVG is being fetched/parsed. Mimics a floor-plan grid
// so the user sees a meaningful placeholder instead of blank space.
function MapSkeleton({ width, height }: { width: number; height: number }) {
  // Generate fake stall blocks in a grid pattern for the shimmer
  const blocks: { x: number; y: number; w: number; h: number }[] = [];
  const cols = 8;
  const rows = 5;
  const padX = width * 0.08;
  const padY = height * 0.12;
  const cellW = (width - padX * 2) / cols;
  const cellH = (height - padY * 2) / rows;
  const gap = cellW * 0.12;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      blocks.push({
        x: padX + c * cellW + gap / 2,
        y: padY + r * cellH + gap / 2,
        w: cellW - gap,
        h: cellH - gap,
      });
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#F0F4F8",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`
        @keyframes svgShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .svg-skeleton-block {
          position: absolute;
          border-radius: 4px;
          background: linear-gradient(
            90deg,
            #E2E8F0 25%,
            #EEF2F7 50%,
            #E2E8F0 75%
          );
          background-size: 200% 100%;
          animation: svgShimmer 1.6s ease-in-out infinite;
        }
        .svg-skeleton-aisles {
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent calc(100% / 5 - 2px),
              rgba(203,213,225,0.4) calc(100% / 5 - 2px),
              rgba(203,213,225,0.4) calc(100% / 5)
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent calc(100% / 8 - 2px),
              rgba(203,213,225,0.4) calc(100% / 8 - 2px),
              rgba(203,213,225,0.4) calc(100% / 8)
            );
        }
      `}</style>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Aisle lines */}
        {Array.from({ length: rows + 1 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={(height / (rows + 1)) * i}
            x2={width}
            y2={(height / (rows + 1)) * i}
            stroke="#CBD5E1"
            strokeWidth={2}
            strokeOpacity={0.5}
          />
        ))}
        {Array.from({ length: cols + 1 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={(width / (cols + 1)) * i}
            y1={0}
            x2={(width / (cols + 1)) * i}
            y2={height}
            stroke="#CBD5E1"
            strokeWidth={2}
            strokeOpacity={0.5}
          />
        ))}
        {/* Shimmer stall blocks */}
        {blocks.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={6}
            fill="#E2E8F0"
            style={{
              animation: `svgShimmer 1.6s ease-in-out ${(i * 0.04) % 0.8}s infinite`,
            }}
          />
        ))}
      </svg>
      {/* Loading pill */}
      <div style={{
        position: "absolute",
        bottom: "12%",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(8px)",
        borderRadius: 100,
        padding: "8px 20px",
        fontSize: 13,
        fontWeight: 700,
        color: "#374151",
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#3B82F6",
          display: "inline-block",
          animation: "svgShimmer 1s ease-in-out infinite",
        }} />
        Loading floor plan…
      </div>
    </div>
  );
}

// Injected into each floor-plan SVG so the selected stall's gold ring can pulse.
// Animating stroke (not transform) keeps rotated stall rects oriented correctly.
const FLOOR_PLAN_CSS = `
  @keyframes stallPulseRing {
    0%   { stroke-width: 4;  stroke-opacity: 0.95; }
    70%  { stroke-width: 30; stroke-opacity: 0; }
    100% { stroke-width: 30; stroke-opacity: 0; }
  }
  .stall-pulse-ring {
    fill: none;
    stroke: #FFCB05;
    pointer-events: none;
    animation: stallPulseRing 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }
`;

interface InlineSvgFloorPlanProps {
  svgSrc: string;
  width: number;
  height: number;
  stalls: MarketStall[];
  selectedStallId?: string | null;
  highlightedStallIds?: string[];
  activeLayer: MapLayerId;
  onStallClick: (stall: MarketStall) => void;
  onLoad?: () => void;
  style?: React.CSSProperties;
}

function getStallColor(stall: MarketStall, layer: MapLayerId): { fill: string; stroke: string; text: string } {
  if (layer === "compliance" && stall.compliance_status) {
    const conf = COMPLIANCE_CONFIG[stall.compliance_status];
    return { fill: conf.color, stroke: conf.border, text: conf.text };
  }
  const conf = OCCUPANCY_CONFIG[stall.occupancy_status] ?? OCCUPANCY_CONFIG.vacant;
  return { fill: conf.color, stroke: conf.border, text: conf.text };
}

function getRectCenter(rect: SVGRectElement): { cx: number; cy: number; w: number; h: number } {
  const x = parseFloat(rect.getAttribute("x") || "0");
  const y = parseFloat(rect.getAttribute("y") || "0");
  const w = parseFloat(rect.getAttribute("width") || "0");
  const h = parseFloat(rect.getAttribute("height") || "0");

  const transform = rect.getAttribute("transform") || "";
  const rotateMatch = transform.match(/rotate\(([^)]+)\)/);

  if (rotateMatch) {
    const parts = rotateMatch[1].split(",").map(Number);
    const cx = parts[1] ?? x + w / 2;
    const cy = parts[2] ?? y + h / 2;
    // For 90° rotation, effective dimensions swap
    const angle = Math.abs(parts[0] ?? 0);
    if (angle === 90 || angle === 270) {
      return { cx, cy, w: h, h: w };
    }
    return { cx, cy, w, h };
  }

  return { cx: x + w / 2, cy: y + h / 2, w, h };
}

function createTextLabel(
  svgEl: SVGSVGElement,
  g: SVGGElement,
  stall: MarketStall,
  textColor: string,
  cx: number,
  cy: number,
  w: number,
  h: number,
) {
  let numEl = g.querySelector(".stall-label");
  if (numEl) {
    if (numEl.getAttribute("fill") !== textColor) {
      numEl.setAttribute("fill", textColor);
    }
    // Already created and positioned correctly
    return;
  }

  // Remove existing labels if any
  g.querySelectorAll(".stall-label").forEach(el => el.remove());

  // Make the number significantly larger
  const isSmall = Math.min(w, h) < 100;
  const numberSize = isSmall ? 24 : 36;

  // Stall number (bold, perfectly centered)
  numEl = document.createElementNS(SVG_NS, "text");
  numEl.setAttribute("x", String(cx));
  numEl.setAttribute("y", String(cy));
  numEl.setAttribute("text-anchor", "middle");
  numEl.setAttribute("dominant-baseline", "central");
  numEl.setAttribute("font-size", String(numberSize));
  numEl.setAttribute("font-weight", "900");
  numEl.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
  numEl.setAttribute("fill", textColor);
  numEl.setAttribute("pointer-events", "none");
  numEl.classList.add("stall-label");
  numEl.textContent = stall.number;
  g.appendChild(numEl);
}

const svgCache = new Map<string, string>();

function InlineSvgFloorPlan({
  svgSrc,
  width,
  height,
  stalls,
  selectedStallId,
  highlightedStallIds = EMPTY_IDS,
  activeLayer,
  onStallClick,
  onLoad,
  style,
}: InlineSvgFloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stallMapRef = useRef<Map<string, MarketStall>>(new Map());
  const svgLoadedRef = useRef(false);
  // Track whether the SVG has finished loading so the skeleton can be hidden
  const [svgReady, setSvgReady] = useState(svgCache.has(svgSrc));

  // Keep track of latest onStallClick to avoid stale closures without triggering useEffect
  const onStallClickRef = useRef(onStallClick);
  useEffect(() => {
    onStallClickRef.current = onStallClick;
  }, [onStallClick]);

  const selectedStallIdRef = useRef(selectedStallId);
  useEffect(() => {
    selectedStallIdRef.current = selectedStallId;
  }, [selectedStallId]);

  // Keep the stall map up to date
  useEffect(() => {
    const newMap = new Map<string, MarketStall>();
    stalls.forEach((s) => {
      if (s.svg_cell_id) newMap.set(s.svg_cell_id, s);
    });
    stallMapRef.current = newMap;
  }, [stalls]);

  const applyStallStyles = useCallback(() => {
    if (!containerRef.current || !svgLoadedRef.current) return;
    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;

    const cellGroups = svgEl.querySelectorAll("g[data-cell-id]");
    for (let i = 0; i < cellGroups.length; i++) {
      const g = cellGroups[i] as SVGGElement;
      const cellId = g.getAttribute("data-cell-id");
      const rect = g.querySelector("rect");
      if (!rect || !cellId) continue;

      if (cellId === "0" || cellId === "1") {
        rect.style.cursor = "default";
        continue;
      }

      const stall = stallMapRef.current.get(cellId);

      if (stall) {
        g.style.cursor = "pointer";
        g.style.pointerEvents = "all";
        const { fill, stroke, text: textColor } = getStallColor(stall, activeLayer);

        const isHighlighted = highlightedStallIds.includes(stall.id);
        const isSelected = selectedStallId === stall.id;

        rect.style.fill = fill;
        rect.style.fillOpacity = "1";
        rect.style.stroke = stroke;
        rect.style.strokeWidth = "2";
        rect.style.transition = "fill 0.2s ease, fill-opacity 0.2s ease, stroke 0.2s ease";

        let labelColor = textColor;

        if (isSelected) {
          // Brand navy border + pulsing gold ring (managed below)
          rect.style.stroke = "#0A1B4A";
          rect.style.strokeWidth = "4";
          rect.style.filter = "drop-shadow(0 0 12px rgba(255,203,5,0.65))";
        } else if (isHighlighted) {
          // Search results: subtle gold fill so they stand out from the rest
          rect.style.fill = "#FFCB05";
          rect.style.fillOpacity = "0.7";
          rect.style.stroke = "#0A1B4A";
          rect.style.strokeWidth = "3";
          rect.style.filter = "";
          labelColor = "#0A1B4A";
        } else {
          rect.style.filter = "";
        }

        // Pulsing gold ring on the selected stall
        const existingRing = g.querySelector(".stall-pulse-ring");
        if (isSelected && !existingRing) {
          const ring = rect.cloneNode(false) as SVGRectElement;
          ring.removeAttribute("style");
          ring.classList.add("stall-pulse-ring");
          g.appendChild(ring);
        } else if (!isSelected && existingRing) {
          existingRing.remove();
        }

        rect.style.opacity = "1";

        // Inject text labels
        const { cx, cy, w, h } = getRectCenter(rect);
        createTextLabel(svgEl, g, stall, labelColor, cx, cy, w, h);
      } else {
        rect.style.cursor = "default";
        rect.style.opacity = "0.6";
        g.style.pointerEvents = "none";
        // Remove any stale labels
        g.querySelectorAll(".stall-label").forEach(el => el.remove());
      }
    }
  }, [activeLayer, selectedStallId, highlightedStallIds, stalls]);

  // Fetch and inject the SVG
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // If already cached, mark as ready immediately (no skeleton needed)
    if (svgCache.has(svgSrc)) setSvgReady(true);

    let cancelled = false;

    (async () => {
      if (!svgCache.has(svgSrc)) {
        try {
          const res = await fetch(svgSrc);
          const text = await res.text();
          svgCache.set(svgSrc, text);
        } catch (e) {
          console.error(`Failed to fetch SVG: ${svgSrc}`, e);
          return;
        }
      }

      if (cancelled) return;
      const text = svgCache.get(svgSrc);

      if (text) {
        container.innerHTML = text;
        const svgEl = container.querySelector("svg");
        if (svgEl) {
          svgEl.setAttribute("width", String(width));
          svgEl.setAttribute("height", String(height));
          svgEl.style.display = "block";
          // Subtle off-white aisle background instead of the plain white draw.io export
          svgEl.style.background = "#F8FAFC";

          // Keyframes/styles for the selected-stall pulse ring
          const styleEl = document.createElementNS(SVG_NS, "style");
          styleEl.textContent = FLOOR_PLAN_CSS;
          svgEl.appendChild(styleEl);

          // Click via event delegation
          svgEl.addEventListener("click", (e) => {
            const target = e.target as SVGElement;
            const cellGroup = target.closest("g[data-cell-id]") as SVGGElement | null;
            if (!cellGroup) return;

            const cellId = cellGroup.getAttribute("data-cell-id");
            if (!cellId || cellId === "0" || cellId === "1") return;

            const stall = stallMapRef.current.get(cellId);
            if (stall) {
              e.stopPropagation();
              onStallClickRef.current(stall);
            } else {
              e.stopPropagation();
              navigator.clipboard.writeText(cellId).then(() => {
                console.log(`Unmapped SVG Cell ID copied to clipboard: ${cellId}`);
              });
            }
          });

          // Hover
          svgEl.addEventListener("mouseenter", (e) => {
            const target = e.target as SVGElement;
            const cellGroup = target.closest("g[data-cell-id]") as SVGGElement | null;
            if (!cellGroup) return;
            const cellId = cellGroup.getAttribute("data-cell-id");
            if (!cellId || cellId === "0" || cellId === "1") return;
            if (!stallMapRef.current.has(cellId)) return;
            const rect = cellGroup.querySelector("rect");
            if (rect) rect.style.filter = "brightness(1.15) drop-shadow(0 0 8px rgba(0,0,0,0.3))";
          }, true);

          svgEl.addEventListener("mouseleave", (e) => {
            const target = e.target as SVGElement;
            const cellGroup = target.closest("g[data-cell-id]") as SVGGElement | null;
            if (!cellGroup) return;
            const cellId = cellGroup.getAttribute("data-cell-id");
            if (!cellId || cellId === "0" || cellId === "1") return;
            const stall = stallMapRef.current.get(cellId);
            const rect = cellGroup.querySelector("rect");
            if (rect) {
              if (stall && selectedStallIdRef.current === stall.id) {
                rect.style.filter = "drop-shadow(0 0 12px rgba(255,203,5,0.65))";
              } else {
                rect.style.filter = "";
              }
            }
          }, true);

        }
      }

      svgLoadedRef.current = true;
      setSvgReady(true);
      applyStallStyles();
      if (onLoad) onLoad();

      // ── Background prefetch: load remaining floor SVGs while the user
      //    is looking at the current floor, so switching is instant.
      const prefetch = () => {
        ALL_SVG_SRCS.forEach((src) => {
          if (!svgCache.has(src)) {
            fetch(src)
              .then((r) => r.text())
              .then((t) => svgCache.set(src, t))
              .catch(() => {/* silent — prefetch is best-effort */});
          }
        });
      };
      // requestIdleCallback runs when the browser is idle — won't compete
      // with rendering or user interaction. Falls back to a 2s delay.
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(prefetch, { timeout: 5000 });
      } else {
        setTimeout(prefetch, 2000);
      }
    })();

    return () => { cancelled = true; };
  }, [svgSrc, width, height]);

  useEffect(() => {
    if (svgLoadedRef.current) applyStallStyles();
  }, [applyStallStyles]);

  return (
    <>
      {/* Skeleton shimmer — shown until SVG is fetched and injected */}
      {!svgReady && (
        <MapSkeleton width={width} height={height} />
      )}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          pointerEvents: "all",
          opacity: svgReady ? 1 : 0,
          transition: "opacity 0.4s ease",
          ...style,
        }}
      />
    </>
  );
}

// Memoized: with stable props from MarketMap, the floor plan (hundreds of DOM
// nodes) skips React re-renders entirely during pan/zoom.
export default memo(InlineSvgFloorPlan);
