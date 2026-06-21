"use client";

import { ZoneHeatData } from "../types";

interface WasteRiskLayerProps {
  zones: ZoneHeatData[];
  svgWidth: number;
  svgHeight: number;
}

// Maps a 0–1 normalized value to a green → yellow → red color
function riskColor(normalized: number): string {
  if (normalized < 0.4) {
    // Green → Yellow
    const t = normalized / 0.4;
    const r = Math.round(22 + t * (234 - 22));
    const g = Math.round(163 + t * (179 - 163));
    const b = Math.round(74 - t * 67);
    return `rgba(${r},${g},${b},0.45)`;
  } else {
    // Yellow → Red
    const t = (normalized - 0.4) / 0.6;
    const r = Math.round(234 + t * (220 - 234));
    const g = Math.round(179 - t * 165);
    const b = Math.round(7 - t * 3);
    return `rgba(${r},${g},${b},0.50)`;
  }
}

function riskLabel(normalized: number): string {
  if (normalized < 0.33) return "Low Risk";
  if (normalized < 0.66) return "Moderate";
  return "High Risk";
}

export default function WasteRiskLayer({ zones, svgWidth, svgHeight }: WasteRiskLayerProps) {
  if (!zones || zones.length === 0) return null;

  const maxValue = Math.max(...zones.map((z) => z.value), 1);

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: svgWidth,
        height: svgHeight,
        pointerEvents: "none",
        zIndex: 2,
      }}
      aria-hidden="true"
    >
      <defs>
        <filter id="waste-blur">
          <feGaussianBlur stdDeviation="40" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {zones.map((zone) => {
        const normalized = zone.value / maxValue;
        const color = riskColor(normalized);
        const cx = zone.center_x ?? svgWidth / 2;
        const cy = zone.center_y ?? svgHeight / 2;
        const radius = 200 + normalized * 300; // Radius scales with risk severity

        return (
          <g key={zone.zone_id}>
            {/* Heatmap blob */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill={color}
              filter="url(#waste-blur)"
            />
            {/* Zone label */}
            {zone.center_x && zone.center_y && (
              <g transform={`translate(${cx}, ${cy})`}>
                <rect
                  x={-60}
                  y={-20}
                  width={120}
                  height={38}
                  rx={8}
                  fill="rgba(0,0,0,0.55)"
                />
                <text
                  textAnchor="middle"
                  dy="-4"
                  fontSize={14}
                  fontWeight={700}
                  fill="white"
                  fontFamily="inherit"
                >
                  {zone.label}
                </text>
                <text
                  textAnchor="middle"
                  dy={14}
                  fontSize={11}
                  fill="rgba(255,255,255,0.8)"
                  fontFamily="inherit"
                >
                  {riskLabel(normalized)}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
