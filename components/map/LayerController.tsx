"use client";

import { useState } from "react";
import { MapLayerId, MAP_LAYERS } from "./types";

interface LayerControllerProps {
  activeLayer: MapLayerId;
  onLayerChange: (id: MapLayerId) => void;
  showAdminLayers: boolean;
  offsetTop?: number;
  offsetRight?: number;
}

export default function LayerController({
  activeLayer,
  onLayerChange,
  showAdminLayers,
  offsetTop = 20,
  offsetRight = 20,
}: LayerControllerProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleLayers = MAP_LAYERS.filter(
    (l) => !l.adminOnly || showAdminLayers
  );

  const activeLayerData = MAP_LAYERS.find((l) => l.id === activeLayer);

  return (
    <div
      style={{
        position: "absolute",
        top: offsetTop,
        right: offsetRight,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 8,
      }}
      role="group"
      aria-label="Map layer controls"
    >
      {/* Toggle pill button */}
      <button
        onClick={() => setExpanded((e) => !e)}
        title="Toggle map layers"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          background: expanded
            ? "rgba(99,102,241,0.9)"
            : "rgba(15,15,20,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${expanded ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 50,
          color: "white",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
          transition: "all 0.2s ease",
          whiteSpace: "nowrap",
        }}
        aria-expanded={expanded}
        aria-controls="layer-panel"
      >
        <span>{activeLayerData?.icon ?? "🗺️"}</span>
        <span>{activeLayerData?.label ?? "Layers"}</span>
        <span style={{
          fontSize: 10,
          transform: expanded ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }}>▼</span>
      </button>

      {/* Layer panel */}
      {expanded && (
        <div
          id="layer-panel"
          style={{
            background: "rgba(15,15,20,0.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            overflow: "hidden",
            minWidth: 240,
          }}
          role="menu"
        >
          <div style={{
            padding: "10px 14px 4px",
            fontSize: 10,
            color: "rgba(255,255,255,0.4)",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            Map Layers
          </div>

          {visibleLayers.map((layer, idx) => {
            const isActive = layer.id === activeLayer;
            return (
              <button
                key={layer.id}
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  onLayerChange(layer.id);
                  setExpanded(false);
                }}
                title={layer.description}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: isActive
                    ? "rgba(99,102,241,0.25)"
                    : "transparent",
                  border: "none",
                  borderTop: idx === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "left",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "transparent";
                }}
              >
                {/* Radio indicator */}
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: `2px solid ${isActive ? "#6366F1" : "rgba(255,255,255,0.3)"}`,
                  background: isActive ? "#6366F1" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}>
                  {isActive && (
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "white",
                    }} />
                  )}
                </div>

                {/* Icon + text */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{
                    color: isActive ? "white" : "rgba(255,255,255,0.75)",
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <span>{layer.icon}</span>
                    {layer.label}
                  </span>
                  <span style={{
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 11,
                    lineHeight: 1.4,
                  }}>
                    {layer.description}
                  </span>
                </div>

                {/* Admin badge */}
                {layer.adminOnly && (
                  <span style={{
                    marginLeft: "auto",
                    fontSize: 9,
                    fontWeight: 700,
                    background: "rgba(99,102,241,0.3)",
                    color: "#A5B4FC",
                    padding: "2px 6px",
                    borderRadius: 4,
                    flexShrink: 0,
                    letterSpacing: "0.04em",
                  }}>
                    ADMIN
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
