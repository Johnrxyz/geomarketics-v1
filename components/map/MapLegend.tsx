"use client";

import { useState } from "react";
import {
  MapLayerId,
  MAP_LAYERS,
  OCCUPANCY_CONFIG,
  COMPLIANCE_CONFIG,
  OccupancyStatus,
  ComplianceStatus,
  MarketStall,
} from "./types";

interface MapLegendProps {
  activeLayer: MapLayerId;
  showAdminLayers: boolean;
  offsetLeft?: number;
  offsetBottom?: number;
  /** Optional: pass stalls to show count badges per status */
  stalls?: MarketStall[];
}

export default function MapLegend({
  activeLayer,
  showAdminLayers,
  offsetLeft = 20,
  offsetBottom = 140,
  stalls = [],
}: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  const entries = getLegendEntries(activeLayer);

  // Build count map for stall_status and compliance layers
  const countMap: Record<string, number> = {};
  if (activeLayer === "stall_status") {
    stalls.forEach((s) => {
      countMap[s.occupancy_status] = (countMap[s.occupancy_status] || 0) + 1;
    });
  } else if (activeLayer === "compliance") {
    stalls.forEach((s) => {
      const key = s.compliance_status ?? "na";
      countMap[key] = (countMap[key] || 0) + 1;
    });
  }

  const activeLayerData = MAP_LAYERS.find((l) => l.id === activeLayer);

  return (
    <div
      style={{
        position: "absolute",
        bottom: offsetBottom,
        left: offsetLeft,
        zIndex: 30,
        background: "rgba(8, 14, 30, 0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        minWidth: 210,
        overflow: "hidden",
        transition: "all 0.3s ease",
      }}
      role="region"
      aria-label="Map legend"
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "white",
        }}
        aria-expanded={!collapsed}
        aria-controls="legend-body"
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Colored dot matching the active layer */}
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background:
                activeLayer === "stall_status"
                  ? "#6366F1"
                  : activeLayer === "compliance"
                  ? "#F59E0B"
                  : activeLayer === "waste_risk"
                  ? "#EF4444"
                  : "#3B82F6",
              boxShadow: `0 0 8px ${
                activeLayer === "stall_status"
                  ? "#6366F1"
                  : activeLayer === "compliance"
                  ? "#F59E0B"
                  : activeLayer === "waste_risk"
                  ? "#EF4444"
                  : "#3B82F6"
              }88`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "rgba(255,255,255,0.85)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Legend
          </span>
          <span
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.35)",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            · {activeLayerData?.label}
          </span>
        </span>
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            transform: collapsed ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          ▲
        </span>
      </button>

      {/* Body */}
      {!collapsed && (
        <div id="legend-body" style={{ padding: "0 14px 12px" }}>
          {/* Status entries */}
          {entries.map((entry) => {
            const count = countMap[entry.key];
            return (
              <div
                key={entry.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                  padding: "4px 6px",
                  borderRadius: 8,
                  transition: "background 0.15s",
                }}
              >
                {/* Color chip */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: entry.shape === "ring" ? "50%" : 6,
                    background: entry.color,
                    border: `2px solid ${entry.border}`,
                    flexShrink: 0,
                    boxShadow:
                      entry.shape === "ring"
                        ? `0 0 0 3px ${entry.border}22`
                        : `0 2px 6px ${entry.border}44`,
                  }}
                />

                {/* Label */}
                <span
                  style={{
                    color: "rgba(255,255,255,0.80)",
                    fontSize: 12,
                    fontWeight: 500,
                    flex: 1,
                  }}
                >
                  {entry.label}
                </span>

                {/* Count badge */}
                {count !== undefined && count > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.5)",
                      padding: "2px 6px",
                      borderRadius: 100,
                      minWidth: 22,
                      textAlign: "center",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {count}
                  </span>
                )}
              </div>
            );
          })}

          {/* Divider */}
          <div
            style={{
              height: 1,
              background:
                "linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent)",
              margin: "8px 0",
            }}
          />

          {/* Selected stall indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px" }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: "transparent",
                border: "2px solid #6366F1",
                boxShadow: "0 0 8px #6366F188, inset 0 0 4px #6366F122",
                flexShrink: 0,
              }}
            />
            <span
              style={{ color: "rgba(255,255,255,0.80)", fontSize: 12, fontWeight: 500 }}
            >
              Selected Stall
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Legend Entries ────────────────────────────────────────────────────────────

export interface LegendEntry {
  key: string;
  label: string;
  color: string;
  border: string;
  shape: "square" | "ring";
}

export function getLegendEntries(layer: MapLayerId): LegendEntry[] {
  switch (layer) {
    case "stall_status":
      return (Object.keys(OCCUPANCY_CONFIG) as OccupancyStatus[]).map((key) => ({
        key,
        label: OCCUPANCY_CONFIG[key].label,
        color: OCCUPANCY_CONFIG[key].color,
        border: OCCUPANCY_CONFIG[key].border,
        shape: "square",
      }));

    case "compliance":
      return [
        ...(Object.keys(COMPLIANCE_CONFIG) as ComplianceStatus[]).map((key) => ({
          key,
          label: COMPLIANCE_CONFIG[key].label,
          color: COMPLIANCE_CONFIG[key].color,
          border: COMPLIANCE_CONFIG[key].border,
          shape: "square" as const,
        })),
        {
          key: "na",
          label: "Not Applicable",
          color: "#1E293B",
          border: "#334155",
          shape: "square" as const,
        },
      ];

    case "waste_risk":
      return [
        { key: "low",  label: "Low Risk",  color: "rgba(22,163,74,0.5)",  border: "#16A34A", shape: "square" },
        { key: "med",  label: "Moderate",  color: "rgba(245,158,11,0.5)", border: "#F59E0B", shape: "square" },
        { key: "high", label: "High Risk", color: "rgba(220,38,38,0.5)",  border: "#DC2626", shape: "square" },
      ];

    case "complaint_density":
      return [
        { key: "none", label: "No Complaints",    color: "rgba(30,41,59,0.6)",   border: "#334155", shape: "square" },
        { key: "low",  label: "Low (1–3)",        color: "rgba(59,130,246,0.4)",  border: "#3B82F6", shape: "square" },
        { key: "med",  label: "Moderate (4–10)",  color: "rgba(245,158,11,0.5)",  border: "#F59E0B", shape: "square" },
        { key: "high", label: "High (10+)",       color: "rgba(220,38,38,0.5)",   border: "#DC2626", shape: "square" },
      ];

    default:
      return [];
  }
}
