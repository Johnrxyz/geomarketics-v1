"use client";

import { useEffect, useRef, useCallback } from "react";
import { MarketStall, OCCUPANCY_CONFIG, COMPLIANCE_CONFIG, MapLayerId } from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";

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

export default function InlineSvgFloorPlan({
  svgSrc,
  width,
  height,
  stalls,
  selectedStallId,
  highlightedStallIds = [],
  activeLayer,
  onStallClick,
  onLoad,
  style,
}: InlineSvgFloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stallMapRef = useRef<Map<string, MarketStall>>(new Map());
  const svgLoadedRef = useRef(false);

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

        rect.style.fill = fill;
        rect.style.stroke = stroke;
        rect.style.strokeWidth = "2";
        rect.style.transition = "all 0.2s ease";

        const isHighlighted = highlightedStallIds.includes(stall.id);
        const isSelected = selectedStallId === stall.id;

        if (isSelected) {
          rect.style.stroke = "#4F46E5";
          rect.style.strokeWidth = "4";
          rect.style.filter = "drop-shadow(0 0 12px rgba(99,102,241,0.6))";
        } else if (isHighlighted) {
          rect.style.stroke = "#10B981";
          rect.style.strokeWidth = "3";
        } else {
          rect.style.filter = "";
        }

        rect.style.opacity = "1";

        // Inject text labels
        const { cx, cy, w, h } = getRectCenter(rect);
        createTextLabel(svgEl, g, stall, textColor, cx, cy, w, h);
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
                rect.style.filter = "drop-shadow(0 0 12px rgba(99,102,241,0.6))";
              } else {
                rect.style.filter = "";
              }
            }
          }, true);

        }
      }

      svgLoadedRef.current = true;
      applyStallStyles();
      if (onLoad) onLoad();
    })();

    return () => { cancelled = true; };
  }, [svgSrc, width, height]);

  useEffect(() => {
    if (svgLoadedRef.current) applyStallStyles();
  }, [applyStallStyles]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: "all",
        ...style,
      }}
    />
  );
}
