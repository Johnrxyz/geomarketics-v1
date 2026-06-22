"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Map, Store, AlertCircle,
  BarChart2, Globe, Users, FileText,
  ChevronLeft, ChevronRight, LogOut, ClipboardCheck,
  FileWarning, Gavel, Brain, Activity, Megaphone
} from "lucide-react";

type Role = "admin" | "vendor" | "customer";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  sectionLabel?: string;
  items: NavItem[];
}

const adminNav: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
      { label: "Market Map", href: "/map", icon: <Map size={18} /> },
    ]
  },
  {
    sectionLabel: "Management",
    items: [
      { label: "Vendors", href: "/admin/vendors", icon: <Users size={18} /> },
      { label: "Documents", href: "/admin/documents", icon: <FileText size={18} /> },
      { label: "Sanitation", href: "/admin/sanitation", icon: <ClipboardCheck size={18} /> },
      { label: "Announcements", href: "/admin/announcements", icon: <Megaphone size={18} /> },
    ]
  },
  {
    sectionLabel: "Incidents & Reports",
    items: [
      { label: "Complaints", href: "/admin/complaints", icon: <AlertCircle size={18} /> },
      { label: "Blotters", href: "/admin/blotters", icon: <FileWarning size={18} /> },
      { label: "Violations", href: "/admin/violations", icon: <Gavel size={18} /> },
      { label: "Reports", href: "/admin/reports", icon: <BarChart2 size={18} /> },
    ]
  }
];

const vendorNav: NavSection[] = [
  {
    items: [
      { label: "My Profile", href: "/vendor/profile", icon: <Store size={18} /> },
      { label: "Market Map", href: "/map", icon: <Map size={18} /> },
      { label: "Documents", href: "/vendor/documents", icon: <FileText size={18} /> },
      { label: "My Complaints", href: "/vendor/complaints", icon: <AlertCircle size={18} /> },
      { label: "My Violations", href: "/vendor/violations", icon: <Gavel size={18} /> },
    ]
  }
];

const customerNav: NavSection[] = [
  {
    items: [
      { label: "My Complaints", href: "/consumer/complaints", icon: <AlertCircle size={18} /> },
    ]
  }
];

interface SidebarProps {
  role?: Role;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
}

export default function Sidebar({ role = "admin", collapsed, onToggle, mobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const navItems = role === "admin" ? adminNav : role === "vendor" ? vendorNav : customerNav;

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`} aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" aria-hidden="true">GM</div>
        <span className="sidebar-logo-text">GeoMarketics</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((section, idx) => (
          <div key={idx} style={{ marginBottom: section.sectionLabel ? "var(--space-2)" : 0 }}>
            {section.sectionLabel && !collapsed && (
              <div className="sidebar-section-label" style={{ marginTop: "var(--space-4)", paddingLeft: "20px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
                {section.sectionLabel}
              </div>
            )}
            {section.sectionLabel && collapsed && (
              <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "16px 12px 8px" }} />
            )}
            
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link${isActive ? " active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? item.label : undefined}
                  style={{
                    margin: "2px 8px",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    background: isActive ? "rgba(255, 203, 5, 0.9)" : "transparent",
                    color: isActive ? "#11296B" : "rgba(255, 255, 255, 0.7)",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <span className="sidebar-link-icon" aria-hidden="true" style={{ color: "inherit" }}>{item.icon}</span>
                  <span className="sidebar-link-text" style={{ fontWeight: isActive ? "700" : "500" }}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {!collapsed && <div className="sidebar-section-label" style={{ marginTop: "var(--space-4)", paddingLeft: "20px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>Public</div>}
        {collapsed && <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "16px 12px 8px" }} />}
        <Link
          href="/consumer"
          className={`sidebar-link${pathname === "/consumer" ? " active" : ""}`}
          title={collapsed ? "Consumer View" : undefined}
          style={{
            margin: "2px 8px",
            borderRadius: "12px",
            padding: "10px 12px",
            background: pathname === "/consumer" ? "rgba(255, 203, 5, 0.9)" : "transparent",
            color: pathname === "/consumer" ? "#11296B" : "rgba(255, 255, 255, 0.7)",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <span className="sidebar-link-icon" aria-hidden="true" style={{ color: "inherit" }}><Globe size={18} /></span>
          <span className="sidebar-link-text">Consumer View</span>
        </Link>
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottombar" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "16px 8px" }}>
        <button
          className="sidebar-link"
          style={{ 
            width: "100%", 
            marginBottom: "var(--space-2)",
            borderRadius: "12px",
            padding: "10px 12px",
            color: "rgba(255, 255, 255, 0.7)",
          }}
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </span>
          <span className="sidebar-link-text">Collapse</span>
        </button>
        <Link href="/login" className="sidebar-link" style={{ 
          borderRadius: "12px", 
          padding: "10px 12px",
          color: "rgba(255, 255, 255, 0.7)",
        }}>
          <span className="sidebar-link-icon" aria-hidden="true"><LogOut size={18} /></span>
          <span className="sidebar-link-text">Sign Out</span>
        </Link>
      </div>
    </aside>
  );
}
