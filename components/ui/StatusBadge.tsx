import React from "react";

type BadgeVariant =
  | "occupied" | "vacant" | "flagged" | "reserved"
  | "success" | "error" | "warning" | "info"
  | "pending" | "approved" | "rejected"
  | "open" | "reviewing" | "resolved" | "neutral";

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
  dot?: boolean;
}

export default function StatusBadge({ variant, label, dot = true }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${variant}${dot ? " badge-dot" : ""}`}>
      {label}
    </span>
  );
}
