"use client";

import { useState } from "react";
import {
  MapLayerId,
  MapLayer,
  MAP_LAYERS,
  OCCUPANCY_CONFIG,
  COMPLIANCE_CONFIG,
  OccupancyStatus,
  ComplianceStatus,
} from "./types";

interface MapLegendProps {
  activeLayer: MapLayerId;
  showAdminLayers: boolean;
  offsetLeft?: number;
  offsetBottom?: number;
}

export default function MapLegend({
  activeLayer,
  showAdminLayers,
  offsetLeft = 20,
  offsetBottom = 140,
}: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  const entries = getLegendEntries(activeLayer);

  return (
    <div
      style={{
        position: "absolute",
        bottom: offsetBottom,
        left: offsetLeft,
        zIndex: 30,
        background: "rgba(15,15,20,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        minWidth: 200,
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
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.04em",
        }}
        aria-expanded={!collapsed}
        aria-controls="legend-body"
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>🗺️</span>
          <span>LEGEND</span>
        </span>
        <span style={{
          fontSize: 10,
          transform: collapsed ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }}>▲</span>
      </button>

      {/* Body */}
      {!collapsed && (
        <div id="legend-body" style={{ padding: "4px 14px 12px" }}>
          {/* Active layer label */}
          <div style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.45)",
            fontWeight: 600,
            letterSpacing: "0.06em",
            marginBottom: 8,
            textTransform: "uppercase",
          }}>
            {MAP_LAYERS.find((l) => l.id === activeLayer)?.label}
          </div>

          {/* Status entries */}
          {entries.map((entry) => (
            <div
              key={entry.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 7,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: entry.shape === "ring" ? "50%" : 6,
                  background: entry.color,
                  border: `3px solid ${entry.border}`,
                  flexShrink: 0,
                  boxShadow: entry.shape === "ring"
                    ? `0 0 0 3px ${entry.border}`
                    : undefined,
                }}
              />
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500 }}>
                {entry.label}
              </span>
            </div>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "8px 0" }} />

          {/* Selected stall — always shown */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              background: "transparent",
              border: "3px solid #6366F1",
              boxShadow: "0 0 0 2px #6366F1",
              flexShrink: 0,
            }} />
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500 }}>
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
          color: "#E5E7EB",
          border: "#D1D5DB",
          shape: "square",
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
        { key: "none", label: "No Complaints", color: "rgba(243,244,246,0.6)", border: "#D1D5DB", shape: "square" },
        { key: "low",  label: "Low (1–3)",      color: "rgba(59,130,246,0.4)",  border: "#3B82F6", shape: "square" },
        { key: "med",  label: "Moderate (4–10)",color: "rgba(245,158,11,0.5)",  border: "#F59E0B", shape: "square" },
        { key: "high", label: "High (10+)",     color: "rgba(220,38,38,0.5)",   border: "#DC2626", shape: "square" },
      ];

    default:
      return [];
  }
}
