"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, User, ZoomIn, ZoomOut, Expand } from "lucide-react";

// ─── Types & Constants ────────────────────────────────────────────────────────

export type StallStatus = "closed" | "rented" | "storage" | "ambulant" | "vacant" | "owner";

export interface MarketStall {
  id: string;
  number: string;
  section: string;
  vendor: string;
  category: string;
  status: StallStatus;
  x: number;
  y: number;
}

export const STATUS_MAP: Record<StallStatus, { label: string; color: string; border: string; text: string }> = {
  closed: { label: "Closed / No Op", color: "#9333EA", border: "#7E22CE", text: "#FFFFFF" }, // Purple
  rented: { label: "With Renter", color: "#F97316", border: "#C2410C", text: "#FFFFFF" }, // Orange
  storage: { label: "Storage/Bodega", color: "#16A34A", border: "#15803D", text: "#FFFFFF" }, // Green
  ambulant: { label: "Ambulant Vendor", color: "#EAB308", border: "#B45309", text: "#FFFFFF" }, // Yellow
  vacant: { label: "Vacant", color: "#3B82F6", border: "#1D4ED8", text: "#FFFFFF" }, // Blue
  owner: { label: "Owner Managed", color: "#FFFFFF", border: "#D1D5DB", text: "#111827" }, // White
};

const SVG_WIDTH = 7800;
const SVG_HEIGHT = 5100;

interface MarketMapProps {
  stalls: MarketStall[];
  selectedStallId?: string | null;
  onStallSelect?: (stall: MarketStall | null) => void;
  showAdminLinks?: boolean;
  padding?: { top: number; right: number; bottom: number; left: number };
  focusTrigger?: number;
}

export default function MarketMap({ stalls, selectedStallId, onStallSelect, showAdminLinks = false, padding, focusTrigger }: MarketMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<MarketStall | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.15 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const isAnimating = useRef(false);
  const lastSelectedId = useRef<string | null>(null);

  const lastFocusTrigger = useRef(0);

  // Sync internal selection with prop
  useEffect(() => {
    if (selectedStallId) {
      if (lastSelectedId.current !== selectedStallId || focusTrigger !== lastFocusTrigger.current) {
        const stall = stalls.find(s => s.id === selectedStallId);
        if (stall) flyToStall(stall);
      }
    } else if (selectedStallId === null) {
      setSelected(null);
    }
    lastSelectedId.current = selectedStallId || null;
    lastFocusTrigger.current = focusTrigger || 0;
  }, [selectedStallId, stalls, focusTrigger]);

  const fitMap = (animate = false) => {
    if (!containerRef.current) return;
    if (animate && isAnimating.current) return;
    
    const { width, height } = containerRef.current.getBoundingClientRect();
    const pTop = padding?.top || 0;
    const pRight = padding?.right || 0;
    const pBottom = padding?.bottom || 0;
    const pLeft = padding?.left || 0;

    const availableWidth = Math.max(width - pLeft - pRight, 100);
    const availableHeight = Math.max(height - pTop - pBottom, 100);

    const initialScale = Math.max(
      Math.min(availableWidth / SVG_WIDTH, availableHeight / SVG_HEIGHT),
      0.05
    );

    const initX = pLeft + (availableWidth - SVG_WIDTH * initialScale) / 2;
    const initY = pTop + (availableHeight - SVG_HEIGHT * initialScale) / 2;
    
    if (animate) {
      isAnimating.current = true;
      setTransform({ x: initX, y: initY, scale: initialScale });
      setTimeout(() => { isAnimating.current = false; }, 500);
    } else {
      setTransform({ x: initX, y: initY, scale: initialScale });
    }
  };

  // Fit initial scale based on container width
  const pTop = padding?.top || 0;
  const pRight = padding?.right || 0;
  const pBottom = padding?.bottom || 0;
  const pLeft = padding?.left || 0;

  useEffect(() => {
    fitMap(false);
  }, [pTop, pRight, pBottom, pLeft]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    if (containerRef.current) containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    if (containerRef.current) containerRef.current.releasePointerCapture(e.pointerId);
  };

  // Use a manual event listener for wheel to allow e.preventDefault() (non-passive)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheelImpl = (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimating.current) return;

      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;

      setTransform(prev => {
        let newScale = prev.scale * Math.exp(delta);
        if (newScale < 0.05) newScale = 0.05;
        if (newScale > 2) newScale = 2;

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const targetX = (mouseX - prev.x) / prev.scale;
        const targetY = (mouseY - prev.y) / prev.scale;

        const newX = mouseX - targetX * newScale;
        const newY = mouseY - targetY * newScale;

        return { x: newX, y: newY, scale: newScale };
      });
    };

    container.addEventListener("wheel", onWheelImpl, { passive: false });
    return () => container.removeEventListener("wheel", onWheelImpl);
  }, []);

  const flyToStall = (stall: MarketStall) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    const pTop = padding?.top || 0;
    const pRight = padding?.right || 0;
    const pBottom = padding?.bottom || 0;
    const pLeft = padding?.left || 0;

    const availableWidth = Math.max(rect.width - pLeft - pRight, 100);
    const availableHeight = Math.max(rect.height - pTop - pBottom, 100);

    const cx = pLeft + availableWidth / 2;
    const cy = pTop + availableHeight / 2;
    
    isAnimating.current = true;
    setIsTransitioning(true);
    
    setTimeout(() => {
      setTransform(prev => {
        const targetScale = Math.max(prev.scale, 1.5);
        const newX = cx - (stall.x * targetScale);
        const newY = cy - (stall.y * targetScale);
        return { x: newX, y: newY, scale: targetScale };
      });
      setSelected(stall);
    }, 10);
    
    setTimeout(() => { 
      isAnimating.current = false; 
      setIsTransitioning(false);
    }, 600);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setIsTransitioning(true);
    
    setTimeout(() => {
      setTransform(prev => {
        let newScale = prev.scale * (direction === 'in' ? 1.5 : 0.666);
        if (newScale < 0.05) newScale = 0.05;
        if (newScale > 2) newScale = 2;

        if (!containerRef.current) return prev;
        const rect = containerRef.current.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const targetX = (cx - prev.x) / prev.scale;
        const targetY = (cy - prev.y) / prev.scale;

        const newX = cx - targetX * newScale;
        const newY = cy - targetY * newScale;

        return { x: newX, y: newY, scale: newScale };
      });
    }, 10);
    
    setTimeout(() => { 
      isAnimating.current = false; 
      setIsTransitioning(false);
    }, 300); // Shorter animation for zoom buttons
  };

  const resetZoom = () => {
    fitMap(true);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%", height: "100%", borderRadius: "var(--radius-lg)", overflow: "hidden",
        boxShadow: "var(--shadow-lg)", position: "relative", minHeight: "400px",
        background: "#F3F4F6", cursor: isDragging.current ? "grabbing" : "grab",
        touchAction: "none"
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      role="application"
      aria-label="Interactive Market Map Canvas"
    >
      <div style={{
        transformOrigin: "0 0",
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transition: isTransitioning ? "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)" : "none",
        position: "absolute", top: 0, left: 0, width: SVG_WIDTH, height: SVG_HEIGHT,
      }}>
        <Image src="/svg map.svg" alt="Market Map" width={SVG_WIDTH} height={SVG_HEIGHT} priority style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }} />
        {stalls.map(stall => {
          const conf = STATUS_MAP[stall.status];
          const isSelected = selected?.id === stall.id;
          return (
            <button key={stall.id} 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (onStallSelect) onStallSelect(stall);
                else flyToStall(stall);
              }} 
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: "absolute", left: stall.x, top: stall.y,
                transform: `translate(-50%, -50%) scale(${isSelected ? 1.5 : 1})`,
                width: 140, height: 80, background: conf.color, border: `8px solid ${conf.border}`, borderRadius: 16,
                display: "flex", alignItems: "center", justifyContent: "center", color: conf.text, fontSize: "28px", fontWeight: "bold",
                cursor: "pointer", boxShadow: isSelected ? "0 40px 60px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.3)",
                transition: "transform 0.2s, box-shadow 0.2s", zIndex: isSelected ? 10 : 1
              }}
              onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as any).style.transform = "translate(-50%, -50%) scale(1.15)"; }}
              onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as any).style.transform = "translate(-50%, -50%) scale(1)"; }}
              title={`Stall ${stall.number} - ${conf.label}`}
            >
              {stall.number}
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={{
          position: "absolute", left: transform.x + selected.x * transform.scale,
          top: transform.y + selected.y * transform.scale - (40 * transform.scale) - 15,
          transform: "translate(-50%, -100%)", background: "white", borderRadius: "12px", padding: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "10px", width: "260px", zIndex: 1000,
          border: `2px solid ${STATUS_MAP[selected.status].border}`, animation: "popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)", cursor: "default"
        }} role="region" aria-label="Selected stall details" onPointerDown={(e) => e.stopPropagation()}>
          <div style={{ position: "absolute", bottom: "-7px", left: "50%", transform: "translateX(-50%) rotate(45deg)", width: "12px", height: "12px", background: "white", borderBottom: `2px solid ${STATUS_MAP[selected.status].border}`, borderRight: `2px solid ${STATUS_MAP[selected.status].border}`, borderBottomRightRadius: "2px", zIndex: 0 }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 36, height: 36, borderRadius: "8px", background: STATUS_MAP[selected.status].color, border: `2px solid ${STATUS_MAP[selected.status].border}`, display: "flex", alignItems: "center", justifyContent: "center", color: STATUS_MAP[selected.status].text, fontWeight: 800, fontSize: "11px", flexShrink: 0 }}>{selected.number}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selected.vendor !== "—" ? selected.vendor : "Vacant Stall"}</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: 2 }}>{selected.category} · {selected.section}</div>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); setSelected(null); if (onStallSelect) onStallSelect(null); }} style={{ padding: "4px", margin: "-4px -4px 0 0" }}><X size={16} /></button>
          </div>
          <div style={{ position: "relative", zIndex: 1, marginTop: "2px" }}>
            <span className="badge" style={{ background: STATUS_MAP[selected.status].color, color: STATUS_MAP[selected.status].text, border: `1px solid ${STATUS_MAP[selected.status].border}`, padding: "2px 8px", borderRadius: "100px", fontSize: "11px", display: "inline-block" }}>{STATUS_MAP[selected.status].label}</span>
          </div>
          {showAdminLinks && (
            <div style={{ display: "flex", position: "relative", zIndex: 1, marginTop: "4px" }}>
              <Link href={`/map/stall/${selected.id}`} className="btn btn-primary" style={{ flex: 1, padding: "8px", fontSize: "13px", justifyContent: "center" }}>View More Info</Link>
            </div>
          )}
        </div>
      )}

      {/* Zoom Controls */}
      <div style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 100
      }} onPointerDown={(e) => e.stopPropagation()}>
        <button
          onClick={() => handleZoom('in')}
          className="btn btn-primary"
          style={{ width: 40, height: 40, padding: 0, justifyContent: "center", borderRadius: "8px" }}
          aria-label="Zoom In"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={resetZoom}
          className="btn btn-primary"
          style={{ width: 40, height: 40, padding: 0, justifyContent: "center", borderRadius: "8px" }}
          aria-label="Reset Zoom"
          title="Reset Zoom"
        >
          <Expand size={20} />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="btn btn-primary"
          style={{ width: 40, height: 40, padding: 0, justifyContent: "center", borderRadius: "8px" }}
          aria-label="Zoom Out"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: translate(-50%, -90%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        }
      `}</style>
    </div>
  );
}
