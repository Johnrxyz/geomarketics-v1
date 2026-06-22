"use client";

import { useEffect, useRef, useState } from "react";
import { MarketStall, OccupancyStatus, OCCUPANCY_CONFIG } from "./types";
import { MapLayerId, MAP_LAYERS } from "./types";

interface MapStatsBarProps {
  stalls: MarketStall[];
  activeLayer: MapLayerId;
  activeFloor: string;
  offsetTop?: number;
  offsetLeft?: number;
}

// Animated number counter
function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRef = useRef(0);

  useEffect(() => {
    if (animRef.current) clearTimeout(animRef.current);
    const start = prevRef.current;
    const end = value;
    const duration = 600;
    const steps = 20;
    const stepMs = duration / steps;
    let step = 0;

    const tick = () => {
      step++;
      const progress = step / steps;
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (step < steps) {
        animRef.current = setTimeout(tick, stepMs);
      } else {
        prevRef.current = end;
      }
    };
    tick();
    return () => { if (animRef.current) clearTimeout(animRef.current); };
  }, [value]);

  return <>{display}</>;
}

export default function MapStatsBar({
  stalls,
  activeLayer,
  activeFloor,
  offsetTop = 16,
  offsetLeft = 16,
}: MapStatsBarProps) {
  const floorStalls = stalls.filter((s) => s.floor === activeFloor);
  const total = floorStalls.length;

  const occupiedCount = floorStalls.filter(
    (s) => s.occupancy_status === "owner" || s.occupancy_status === "rented"
  ).length;

  const vacantCount = floorStalls.filter(
    (s) => s.occupancy_status === "vacant"
  ).length;

  const flaggedCount = floorStalls.filter(
    (s) => s.compliance_status === "high_risk" || s.compliance_status === "warning"
  ).length;

  const occupancyPct = total > 0 ? Math.round((occupiedCount / total) * 100) : 0;

  const activeLayerLabel =
    MAP_LAYERS.find((l) => l.id === activeLayer)?.label ?? "Stall Status";
  const activeLayerIcon =
    MAP_LAYERS.find((l) => l.id === activeLayer)?.icon ?? "🗺️";

  return (
    <div
      style={{
        position: "absolute",
        top: offsetTop,
        left: offsetLeft,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
      aria-label="Map statistics"
      role="status"
    >
      {/* Main stats pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          background: "rgba(8, 14, 30, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          boxShadow: "0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Total */}
        <StatCell
          value={<AnimatedCount value={total} />}
          label="Total Stalls"
          accent="#6366F1"
          borderRight
        />

        {/* Occupied */}
        <StatCell
          value={<><AnimatedCount value={occupiedCount} /> <span style={{ fontSize: 10, opacity: 0.6 }}>({occupancyPct}%)</span></>}
          label="Occupied"
          accent="#10B981"
          borderRight
        />

        {/* Vacant */}
        <StatCell
          value={<AnimatedCount value={vacantCount} />}
          label="Vacant"
          accent="#94A3B8"
          borderRight
        />

        {/* Flagged */}
        <StatCell
          value={<AnimatedCount value={flaggedCount} />}
          label="Flagged"
          accent={flaggedCount > 0 ? "#EF4444" : "#6B7280"}
          pulse={flaggedCount > 0}
        />
      </div>

      {/* Active layer badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(8, 14, 30, 0.75)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 100,
          padding: "5px 12px",
          width: "fit-content",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        }}
      >
        <span style={{ fontSize: 13 }}>{activeLayerIcon}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(255,255,255,0.6)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {activeLayerLabel}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          · Floor {activeFloor}
        </span>
      </div>

      <style>{`
        @keyframes statsPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ── Stat cell sub-component ───────────────────────────────────────────────────

function StatCell({
  value,
  label,
  accent,
  borderRight,
  pulse,
}: {
  value: React.ReactNode;
  label: string;
  accent: string;
  borderRight?: boolean;
  pulse?: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        borderRight: borderRight ? "1px solid rgba(255,255,255,0.07)" : undefined,
        minWidth: 72,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: accent,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          gap: 4,
          animation: pulse ? "statsPulse 1.8s ease-in-out infinite" : undefined,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
}
