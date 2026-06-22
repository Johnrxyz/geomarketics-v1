"use client";

import { Bell, Menu, Search, Settings, Check, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { notificationsApi } from "@/lib/api";

interface Notification {
  id: number;
  notification_type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

interface HeaderProps {
  pageTitle: string;
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
  userName?: string;
  userRole?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const typeIcon = {
  info: <Info size={14} />,
  warning: <AlertTriangle size={14} />,
  error: <XCircle size={14} />,
  success: <CheckCircle size={14} />,
};

export default function Header({
  pageTitle,
  sidebarCollapsed,
  onSidebarToggle,
  userName = "Admin User",
  userRole = "Administrator",
}: HeaderProps) {
  const initials = userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const [panelOpen, setPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Fetch unread count (poll every 30s)
  const fetchCount = useCallback(async () => {
    try {
      const data = await notificationsApi.unreadCount() as { count: number };
      setUnreadCount(data.count);
    } catch {
      // silently ignore (user may not be logged in on all pages)
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Fetch full list when panel opens
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.list() as Notification[];
      setNotifications(Array.isArray(data) ? data : (data as { results?: Notification[] }).results ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (panelOpen) {
      fetchNotifications();
    }
  }, [panelOpen, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    }
    if (panelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen]);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotifClick = (notif: Notification) => {
    if (!notif.is_read) {
      handleMarkRead(notif.id);
    }
    if (notif.link) {
      window.location.href = notif.link;
    }
  };

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

        {/* Notification Bell */}
        <div className="notif-wrapper">
          <button
            ref={bellRef}
            className={`header-icon-btn${panelOpen ? " active" : ""}`}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            aria-expanded={panelOpen}
            aria-haspopup="true"
            onClick={() => setPanelOpen((o) => !o)}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                className="notif-badge"
                role="status"
                aria-label={`${unreadCount} unread notifications`}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {panelOpen && (
            <div
              ref={panelRef}
              className="notif-panel"
              role="dialog"
              aria-label="Notifications"
            >
              {/* Panel Header */}
              <div className="notif-panel-header">
                <div className="notif-panel-title-row">
                  <span className="notif-panel-title">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="notif-panel-count">{unreadCount} unread</span>
                  )}
                </div>
                <div className="notif-panel-actions">
                  {unreadCount > 0 && (
                    <button
                      className="notif-mark-all-btn"
                      onClick={handleMarkAllRead}
                      disabled={markingAll}
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} />
                      {markingAll ? "Marking…" : "Mark all read"}
                    </button>
                  )}
                  <button
                    className="notif-close-btn"
                    onClick={() => setPanelOpen(false)}
                    aria-label="Close notifications"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Panel Body */}
              <div className="notif-panel-body">
                {loading ? (
                  <div className="notif-empty">
                    <div className="notif-spinner" />
                    <span>Loading notifications…</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notif-empty">
                    <Bell size={32} strokeWidth={1.5} />
                    <span>You're all caught up!</span>
                    <p>No notifications to show.</p>
                  </div>
                ) : (
                  <ul className="notif-list" role="list">
                    {notifications.map((notif) => (
                      <li
                        key={notif.id}
                        className={`notif-item${notif.is_read ? "" : " unread"} notif-type-${notif.notification_type}`}
                        onClick={() => handleNotifClick(notif)}
                        role="listitem"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleNotifClick(notif)}
                      >
                        <div className={`notif-type-dot notif-dot-${notif.notification_type}`}>
                          {typeIcon[notif.notification_type]}
                        </div>
                        <div className="notif-item-content">
                          <div className="notif-item-title">{notif.title}</div>
                          <div className="notif-item-message">{notif.message}</div>
                          <div className="notif-item-meta">
                            <span className="notif-item-time">{timeAgo(notif.created_at)}</span>
                          </div>
                        </div>
                        {!notif.is_read && (
                          <button
                            className="notif-read-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(notif.id);
                            }}
                            title="Mark as read"
                            aria-label="Mark as read"
                          >
                            <Check size={12} />
                          </button>
                        )}
                        {!notif.is_read && <div className="notif-unread-dot" />}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

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
