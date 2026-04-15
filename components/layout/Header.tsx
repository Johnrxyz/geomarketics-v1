"use client";

import { Bell, Menu, Search, Settings } from "lucide-react";

interface HeaderProps {
  pageTitle: string;
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
  userName?: string;
  userRole?: string;
}

export default function Header({
  pageTitle,
  sidebarCollapsed,
  onSidebarToggle,
  userName = "Admin User",
  userRole = "Administrator",
}: HeaderProps) {
  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className={`app-header${sidebarCollapsed ? " sidebar-collapsed" : ""}`} role="banner">
      <div className="header-left">
        <button
          className="header-toggle-btn"
          onClick={onSidebarToggle}
          aria-label="Toggle sidebar navigation"
        >
          <Menu size={20} />
        </button>
        <h1 className="header-page-title">{pageTitle}</h1>
      </div>

      <div className="header-right">
        <button className="header-icon-btn" aria-label="Search">
          <Search size={18} />
        </button>

        <button className="header-icon-btn" aria-label="Notifications (5 unread)">
          <Bell size={18} />
          <span className="notif-badge" role="status" aria-label="5 unread notifications" />
        </button>

        <button className="header-icon-btn" aria-label="Settings">
          <Settings size={18} />
        </button>

        <div className="header-user" role="button" aria-label={`User menu for ${userName}`} tabIndex={0}>
          <div className="user-avatar" aria-hidden="true">{initials}</div>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role-badge">{userRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
