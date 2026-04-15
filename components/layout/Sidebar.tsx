"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Map, Store, FileText, AlertCircle,
  TrendingUp, BarChart2, Globe, Users, Settings,
  ChevronLeft, ChevronRight, LogOut, ShieldCheck, ClipboardCheck
} from "lucide-react";

type Role = "admin" | "vendor";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
  { label: "Market Map", href: "/map", icon: <Map size={18} /> },
  { label: "Vendor Management", href: "/admin/vendors", icon: <Users size={18} /> },
  // { label: "Documents",          href: "/admin/documents",    icon: <FileText size={18} /> },
  { label: "Sanitation", href: "/admin/sanitation", icon: <ClipboardCheck size={18} /> },
  { label: "Complaints", href: "/admin/complaints", icon: <AlertCircle size={18} /> },
  { label: "Price Monitoring", href: "/admin/prices", icon: <TrendingUp size={18} /> },
  { label: "Reports", href: "/admin/reports", icon: <BarChart2 size={18} /> },
];

const vendorNav: NavItem[] = [
  { label: "My Profile", href: "/vendor/profile", icon: <Store size={18} /> },
  { label: "My Documents", href: "/vendor/documents", icon: <FileText size={18} /> },
  { label: "Market Map", href: "/map", icon: <Map size={18} /> },
  { label: "Complaints", href: "/admin/complaints", icon: <AlertCircle size={18} /> },
];

interface SidebarProps {
  role?: Role;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
}

export default function Sidebar({ role = "admin", collapsed, onToggle, mobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const navItems = role === "admin" ? adminNav : vendorNav;

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`} aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" aria-hidden="true">GM</div>
        <span className="sidebar-logo-text">GeoMarketics</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main Menu</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${isActive ? " active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span>
              <span className="sidebar-link-text">{item.label}</span>
            </Link>
          );
        })}

        <div className="sidebar-section-label" style={{ marginTop: "var(--space-4)" }}>Public</div>
        <Link
          href="/public"
          className={`sidebar-link${pathname === "/public" ? " active" : ""}`}
          title={collapsed ? "Consumer View" : undefined}
        >
          <span className="sidebar-link-icon" aria-hidden="true"><Globe size={18} /></span>
          <span className="sidebar-link-text">Consumer View</span>
        </Link>
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottombar">
        <button
          className="sidebar-link"
          style={{ width: "100%", marginBottom: "var(--space-2)" }}
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="sidebar-link-icon" aria-hidden="true">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </span>
          <span className="sidebar-link-text">Collapse</span>
        </button>
        <Link href="/login" className="sidebar-link">
          <span className="sidebar-link-icon" aria-hidden="true"><LogOut size={18} /></span>
          <span className="sidebar-link-text">Sign Out</span>
        </Link>
      </div>
    </aside>
  );
}
