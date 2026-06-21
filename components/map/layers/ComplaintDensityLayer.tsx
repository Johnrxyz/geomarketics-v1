"use client";

import { ZoneHeatData } from "../types";

interface ComplaintDensityLayerProps {
  zones: ZoneHeatData[];
  svgWidth: number;
  svgHeight: number;
}

// 4-step color scale: white → light blue → orange → red
function densityColor(count: number): { bg: string; border: string; text: string } {
  if (count === 0) return { bg: "rgba(243,244,246,0.6)", border: "#D1D5DB", text: "#6B7280" };
  if (count <= 3) return { bg: "rgba(59,130,246,0.35)", border: "#3B82F6", text: "#1E40AF" };
  if (count <= 10) return { bg: "rgba(245,158,11,0.45)", border: "#F59E0B", text: "#92400E" };
  return { bg: "rgba(220,38,38,0.45)", border: "#DC2626", text: "#7F1D1D" };
}

function densityLabel(count: number): string {
  if (count === 0) return "No complaints";
  if (count <= 3) return "Low";
  if (count <= 10) return "Moderate";
  return "High";
}

export default function ComplaintDensityLayer({
  zones,
  svgWidth,
  svgHeight,
}: ComplaintDensityLayerProps) {
  if (!zones || zones.length === 0) return null;

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: svgWidth,
        height: svgHeight,
        pointerEvents: "none",
        zIndex: 3,
      }}
      aria-hidden="true"
    >
      {zones.map((zone) => {
        const style = densityColor(zone.value);
        const cx = zone.center_x ?? svgWidth / 2;
        const cy = zone.center_y ?? svgHeight / 2;

        return (
          <g key={zone.zone_id} transform={`translate(${cx},${cy})`}>
            {/* Zone bubble */}
            <circle
              cx={0}
              cy={0}
              r={90}
              fill={style.bg}
              stroke={style.border}
              strokeWidth={4}
              strokeDasharray={zone.value === 0 ? "8 4" : "none"}
            />
            {/* Complaint count */}
            <text
              textAnchor="middle"
              dy="-8"
              fontSize={36}
              fontWeight={900}
              fill={style.text}
              fontFamily="inherit"
            >
              {zone.value}
            </text>
            {/* Zone name */}
            <text
              textAnchor="middle"
              dy={14}
              fontSize={13}
              fontWeight={700}
              fill={style.text}
              fontFamily="inherit"
            >
              {zone.label}
            </text>
            {/* Density label */}
            <text
              textAnchor="middle"
              dy={30}
              fontSize={11}
              fill={style.text}
              fontFamily="inherit"
              opacity={0.75}
            >
              {densityLabel(zone.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
