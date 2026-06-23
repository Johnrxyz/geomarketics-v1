"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

// Helper to format segments
function formatSegment(segment: string) {
  // Convert dashes to spaces, capitalize first letters
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  if (!pathname || pathname === "/" || pathname === "/dashboard") return null;

  const originalSegments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items with their full correct hrefs
  const items = originalSegments.map((segment, index) => {
    const href = `/${originalSegments.slice(0, index + 1).join("/")}`;
    return { segment, href };
  }).filter(item => item.segment !== "admin" && item.segment !== "vendor");

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: "var(--space-4)" }}>
      <ol style={{ 
        listStyle: "none", 
        padding: 0, 
        margin: 0, 
        display: "flex", 
        alignItems: "center", 
        flexWrap: "wrap",
        gap: "6px",
        fontSize: "13px",
        fontWeight: 500,
        color: "var(--text-muted)"
      }}>
        <li>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s" }} className="hover-text-primary">
            <Home size={14} />
          </Link>
        </li>
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const title = formatSegment(item.segment);

          return (
            <li key={item.href} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ChevronRight size={14} style={{ color: "var(--border-color)" }} />
              {isLast ? (
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {title}
                </span>
              ) : (
                <Link 
                  href={item.href} 
                  style={{ color: "var(--text-muted)", textDecoration: "none", transition: "color 0.2s" }}
                  className="hover-text-primary"
                >
                  {title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
