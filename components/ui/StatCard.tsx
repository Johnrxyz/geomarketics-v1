"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: number; // positive = up, negative = down, 0 = flat
  trendLabel?: string;
  accentColor?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  iconBg = "#EFF6FF",
  iconColor = "#2563EB",
  trend,
  trendLabel,
  accentColor,
}: StatCardProps) {
  const trendIcon =
    trend === undefined ? null
    : trend > 0 ? <ArrowUp size={12} />
    : trend < 0 ? <ArrowDown size={12} />
    : <Minus size={12} />;

  const trendClass =
    trend === undefined ? ""
    : trend > 0 ? "trend-up"
    : trend < 0 ? "trend-down"
    : "";

  return (
    <div
      className="stat-card"
      style={accentColor ? { "--accent-bar": accentColor } as React.CSSProperties : undefined}
    >
      {accentColor && (
        <style>{`.stat-card::before { background: ${accentColor}; }`}</style>
      )}
      <div className="stat-card-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="stat-card-content">
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
        {trend !== undefined && (
          <div className={`stat-card-trend ${trendClass}`}>
            {trendIcon}
            {Math.abs(trend)}% {trendLabel ?? "vs last month"}
          </div>
        )}
      </div>
    </div>
  );
}
