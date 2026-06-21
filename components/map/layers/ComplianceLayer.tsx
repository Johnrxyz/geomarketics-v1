"use client";

import { MarketStall, ComplianceStatus, COMPLIANCE_CONFIG, OCCUPANCY_CONFIG } from "../types";

interface ComplianceLayerProps {
  stalls: MarketStall[];
  selectedStallId?: string | null;
  highlightedStallIds?: string[];
  onStallClick: (stall: MarketStall) => void;
}

// Neutral style for stalls with no compliance status (vacant/maintenance)
const NEUTRAL = {
  color: "#E5E7EB",
  border: "#D1D5DB",
  text: "#9CA3AF",
};

export default function ComplianceLayer({
  stalls,
  selectedStallId,
  highlightedStallIds = [],
  onStallClick,
}: ComplianceLayerProps) {
  const hasHighlight = highlightedStallIds.length > 0;

  return (
    <>
      {stalls.map((stall) => {
        const complianceConf = stall.compliance_status
          ? COMPLIANCE_CONFIG[stall.compliance_status]
          : null;
        const occupancyConf = OCCUPANCY_CONFIG[stall.occupancy_status];

        const isSelected = selectedStallId === stall.id;
        const isHighlighted = hasHighlight && highlightedStallIds.includes(stall.id);
        const isDimmed = hasHighlight && !isHighlighted && !isSelected;
        const opacity = isDimmed ? 0.35 : 1;

        const scale = isSelected ? 1.5 : isHighlighted ? 1.2 : 1;
        const shadow = isSelected || isHighlighted
          ? "0 40px 60px rgba(0,0,0,0.5)"
          : "0 20px 40px rgba(0,0,0,0.25)";

        // Compliance layer: color = compliance status, or neutral if not applicable
        const bgColor = complianceConf ? complianceConf.color : NEUTRAL.color;
        const borderColor = isSelected
          ? "#6366F1"
          : isHighlighted
          ? "#EF4444"
          : complianceConf
          ? complianceConf.border
          : NEUTRAL.border;
        const textColor = complianceConf ? complianceConf.text : NEUTRAL.text;

        return (
          <button
            key={stall.id}
            id={`stall-compliance-${stall.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onStallClick(stall);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title={`Stall ${stall.number} · ${complianceConf ? complianceConf.label : occupancyConf.label}`}
            aria-label={`Stall ${stall.number}, compliance: ${complianceConf ? complianceConf.label : "N/A"}`}
            style={{
              position: "absolute",
              left: stall.svg_x,
              top: stall.svg_y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              width: 140,
              height: 80,
              background: bgColor,
              border: `8px solid ${borderColor}`,
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: textColor,
              fontSize: "22px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: shadow,
              transition: "all 0.2s ease",
              zIndex: isSelected ? 10 : isHighlighted ? 5 : 1,
              opacity,
              outline: isSelected ? "4px solid #6366F1" : "none",
              outlineOffset: "2px",
              gap: 2,
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
            <span>{stall.number}</span>
            {/* Small compliance badge */}
            {complianceConf && (
              <span style={{
                fontSize: "10px",
                fontWeight: 700,
                background: "rgba(0,0,0,0.2)",
                borderRadius: 4,
                padding: "1px 5px",
                lineHeight: 1.2,
              }}>
                {complianceConf.label}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}
