"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

type Role = "admin" | "vendor";

interface AppShellProps {
  children: React.ReactNode;
  pageTitle: string;
  role?: Role;
  userName?: string;
  userRole?: string;
  floatingSidebar?: boolean;
}

export default function AppShell({ children, pageTitle, role = "admin", userName, userRole, floatingSidebar = false }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
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
        />
        <main className="page-main" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
