"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

type Role = "admin" | "vendor" | "customer";

interface AppShellProps {
  children: React.ReactNode;
  pageTitle: string;
  role?: Role;
  userName?: string;
  userRole?: string;
  floatingSidebar?: boolean;
  hideBreadcrumbs?: boolean;
}

export default function AppShell({ children, pageTitle, role = "admin", userName, userRole, floatingSidebar = false, hideBreadcrumbs = false }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent background scrolling and gesture conflicts when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      const prevOverflow = document.body.style.overflow;
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [mobileOpen]);

  return (
    <div className="app-shell">
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggle={() => {
          if (typeof window !== "undefined" && window.innerWidth <= 768) {
            setMobileOpen(false);
          } else {
            setCollapsed((c) => !c);
          }
        }}
        onClose={() => setMobileOpen(false)}
        mobileOpen={mobileOpen}
      />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: "calc(var(--z-sidebar) - 1)",
          }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`app-content${collapsed ? " sidebar-collapsed" : ""}${floatingSidebar ? " floating-sidebar" : ""}`}>
        <Header
          pageTitle={pageTitle}
          sidebarCollapsed={collapsed}
          onSidebarToggle={() => {
            if (window.innerWidth <= 768) {
              setMobileOpen((o) => !o);
            } else {
              setCollapsed((c) => !c);
            }
          }}
          userName={userName}
          userRole={userRole}
          role={role}
        />
        <main className="page-main" id="main-content">
          {!hideBreadcrumbs && <Breadcrumbs />}
          {children}
        </main>
      </div>
    </div>
  );
}
