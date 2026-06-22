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
  // Remove existing labels
  g.querySelectorAll(".stall-label").forEach(el => el.remove());

  const isSmall = Math.min(w, h) < 100;
  const numberSize = isSmall ? 16 : 22;
  const detailSize = isSmall ? 10 : 13;

  const areaText = stall.area_sqm ? `${stall.area_sqm}sqm` : "";

  // Stall number (bold, top area)
  const numEl = document.createElementNS(SVG_NS, "text");
  numEl.setAttribute("x", String(cx));
  numEl.setAttribute("y", String(cy - (areaText ? 6 : 0)));
  numEl.setAttribute("text-anchor", "middle");
  numEl.setAttribute("dominant-baseline", "central");
  numEl.setAttribute("font-size", String(numberSize));
  numEl.setAttribute("font-weight", "800");
  numEl.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
  numEl.setAttribute("fill", textColor);
  numEl.setAttribute("pointer-events", "none");
  numEl.classList.add("stall-label");
  numEl.textContent = stall.number;
  g.appendChild(numEl);

  // Area (smaller, below number)
  if (areaText && !isSmall) {
    const areaEl = document.createElementNS(SVG_NS, "text");
    areaEl.setAttribute("x", String(cx));
    areaEl.setAttribute("y", String(cy + numberSize * 0.7));
    areaEl.setAttribute("text-anchor", "middle");
    areaEl.setAttribute("dominant-baseline", "central");
    areaEl.setAttribute("font-size", String(detailSize));
    areaEl.setAttribute("font-weight", "600");
    areaEl.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
    areaEl.setAttribute("fill", textColor);
    areaEl.setAttribute("opacity", "0.8");
    areaEl.setAttribute("pointer-events", "none");
    areaEl.classList.add("stall-label");
    areaEl.textContent = areaText;
    g.appendChild(areaEl);
  }

  // Vendor name or status (bottom, if enough space)
  if (!isSmall && h > 80) {
    const label = stall.vendor !== "—" ? stall.vendor : OCCUPANCY_CONFIG[stall.occupancy_status]?.label ?? "";
    if (label) {
      const truncated = label.length > 14 ? label.slice(0, 12) + "…" : label;
      const vendorEl = document.createElementNS(SVG_NS, "text");
      vendorEl.setAttribute("x", String(cx));
      vendorEl.setAttribute("y", String(cy + numberSize * 0.7 + detailSize + 4));
      vendorEl.setAttribute("text-anchor", "middle");
      vendorEl.setAttribute("dominant-baseline", "central");
      vendorEl.setAttribute("font-size", String(detailSize - 1));
      vendorEl.setAttribute("font-weight", "500");
      vendorEl.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
      vendorEl.setAttribute("fill", textColor);
      vendorEl.setAttribute("opacity", "0.65");
      vendorEl.setAttribute("pointer-events", "none");
      vendorEl.classList.add("stall-label");
      vendorEl.textContent = truncated;
      g.appendChild(vendorEl);
    }
  }
}

export default function InlineSvgFloorPlan({
  svgSrc,
  width,
  height,
  stalls,
  selectedStallId,
  highlightedStallIds = [],
  activeLayer,
  onStallClick,
  style,
}: InlineSvgFloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContentRef = useRef<string | null>(null);
  const stallMapRef = useRef<Map<string, MarketStall>>(new Map());
  const svgLoadedRef = useRef(false);

  useEffect(() => {
    const map = new Map<string, MarketStall>();
    for (const stall of stalls) {
      if (stall.svg_cell_id) {
        map.set(stall.svg_cell_id, stall);
      }
    }
    stallMapRef.current = map;
  }, [stalls]);

  const applyStallStyles = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    const hasHighlight = highlightedStallIds.length > 0;

    const allCellGroups = svgEl.querySelectorAll<SVGGElement>("g[data-cell-id]");
    for (const g of allCellGroups) {
      const cellId = g.getAttribute("data-cell-id");
      if (!cellId || cellId === "0" || cellId === "1") continue;

      const stall = stallMapRef.current.get(cellId);
      const rect = g.querySelector("rect");
      if (!rect) continue;

      if (stall) {
        const { fill, stroke, text: textColor } = getStallColor(stall, activeLayer);
        const isSelected = selectedStallId === stall.id;
        const isHighlighted = hasHighlight && highlightedStallIds.includes(stall.id);
        const isDimmed = hasHighlight && !isHighlighted && !isSelected;

        rect.style.fill = fill;
        rect.style.stroke = isSelected ? "#6366F1" : stroke;
        rect.style.strokeWidth = isSelected ? "12" : "7";
        rect.style.opacity = isDimmed ? "0.35" : "1";
        rect.style.cursor = "pointer";
        rect.style.transition = "fill 0.2s, stroke 0.2s, opacity 0.2s";

        if (isSelected) {
          rect.style.filter = "drop-shadow(0 0 12px rgba(99,102,241,0.6))";
        } else {
          rect.style.filter = "";
        }

        g.style.pointerEvents = "all";

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

  const svgCache = new Map<string, string>();

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
              onStallClick(stall);
            } else {
              // Dev tool: easily get the cell ID of unmapped boxes for Django admin
              e.stopPropagation();
              console.log(`Unmapped SVG Cell ID: ${cellId}`);
              navigator.clipboard.writeText(cellId)
                .then(() => alert(`Copied SVG Cell ID to clipboard:\n${cellId}\n\nPaste this into the 'Svg cell id' field for a Stall in your Django Admin!`))
                .catch(() => alert(`SVG Cell ID:\n${cellId}\n\nManually copy this and paste it into the 'Svg cell id' field for a Stall in your Django Admin.`));
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
              if (stall && selectedStallId === stall.id) {
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
    })();

    return () => { cancelled = true; };
  }, [svgSrc, width, height, onStallClick]);

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
