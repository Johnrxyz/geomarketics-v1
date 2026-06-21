"use client";

import { MarketStall, OccupancyStatus, OCCUPANCY_CONFIG } from "../types";

interface StallStatusLayerProps {
  stalls: MarketStall[];
  selectedStallId?: string | null;
  highlightedStallIds?: string[];
  onStallClick: (stall: MarketStall) => void;
}

export default function StallStatusLayer({
  stalls,
  selectedStallId,
  highlightedStallIds = [],
  onStallClick,
}: StallStatusLayerProps) {
  const hasHighlight = highlightedStallIds.length > 0;

  return (
    <>
      {stalls.map((stall) => {
        const conf = OCCUPANCY_CONFIG[stall.occupancy_status] ?? OCCUPANCY_CONFIG.vacant;
        const isSelected = selectedStallId === stall.id;
        const isHighlighted = hasHighlight && highlightedStallIds.includes(stall.id);
        const isDimmed = hasHighlight && !isHighlighted && !isSelected;
        const opacity = isDimmed ? 0.35 : 1;

        const scale = isSelected ? 1.5 : isHighlighted ? 1.2 : 1;
        const shadow = isSelected || isHighlighted
          ? "0 40px 60px rgba(0,0,0,0.5)"
          : "0 20px 40px rgba(0,0,0,0.25)";
        const borderColor = isSelected
          ? "#6366F1"
          : isHighlighted
          ? "#EF4444"
          : conf.border;

        return (
          <button
            key={stall.id}
            id={`stall-marker-${stall.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onStallClick(stall);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title={`Stall ${stall.number} · ${conf.label}`}
            aria-label={`Stall ${stall.number}, ${stall.vendor !== "—" ? stall.vendor : "Vacant"}, ${conf.label}`}
            style={{
              position: "absolute",
              left: stall.svg_x,
              top: stall.svg_y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              width: 140,
              height: 80,
              background: conf.color,
              border: `8px solid ${borderColor}`,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: conf.text,
              fontSize: "28px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: shadow,
              transition: "all 0.2s ease",
              zIndex: isSelected ? 10 : isHighlighted ? 5 : 1,
              opacity,
              outline: isSelected ? "4px solid #6366F1" : "none",
              outlineOffset: "2px",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  `translate(-50%, -50%) scale(${isHighlighted ? 1.3 : 1.15})`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  `translate(-50%, -50%) scale(${isHighlighted ? 1.2 : 1})`;
              }
            }}
          >
            {stall.number}
          </button>
        );
      })}
    </>
  );
}
