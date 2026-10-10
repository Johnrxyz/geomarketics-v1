"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { Megaphone, Calendar, AlertTriangle, Info, Bell, CheckCircle, Clock } from "lucide-react";
import { announcementsApi, getUser } from "@/lib/api";

interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  priority: "high" | "medium" | "low";
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  author_name?: string;
  created_at: string;
}

const PRIORITY_CONFIG: Record<string, { bg: string; border: string; badge: string; icon: any; label: string }> = {
  high:   { bg: "linear-gradient(135deg,#FEF2F2,#FFF7ED)", border: "#F87171", badge: "#DC2626", icon: AlertTriangle, label: "Urgent" },
  medium: { bg: "linear-gradient(135deg,#FFFBEB,#FFF7ED)", border: "#FCD34D", badge: "#D97706", icon: Bell,          label: "Notice" },
  low:    { bg: "linear-gradient(135deg,#F0FDF4,#ECFDF5)",  border: "#86EFAC", badge: "#16A34A", icon: Info,          label: "Info"   },
};

const CATEGORY_LABELS: Record<string, string> = {
  schedule:  "Schedule Change",
  holiday:   "Holiday Closure",
  inspection:"Inspection Date",
  advisory:  "Public Advisory",
  general:   "General",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return `${diffDays} days ago`;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

export default function VendorAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [activeFilter, setActiveFilter]   = useState<"all" | "high" | "medium" | "low">("all");

  const user = getUser();

  useEffect(() => {
    setIsLoading(true);
    announcementsApi
      .list({ is_active: "true" })
      .then((data: any) => {
        const results: Announcement[] = data.results ?? data ?? [];
        // Sort: high priority first, then by date
        results.sort((a, b) => {
          const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
          if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setAnnouncements(results);
      })
      .catch((err: any) => setError(err?.detail ?? err?.message ?? "Failed to load announcements."))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = activeFilter === "all"
    ? announcements
    : announcements.filter(a => a.priority === activeFilter);

  const urgentCount = announcements.filter(a => a.priority === "high").length;

  return (
    <AppShell
      pageTitle="Market Announcements"
      role="vendor"
      userName={user?.full_name || user?.username || "Vendor"}
      userRole="Vendor"
    >
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Market Announcements</h2>
          <p className="page-subtitle">Official updates and advisories from market administration</p>
        </div>
        {urgentCount > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#FEF2F2", border: "1px solid #F87171",
            borderRadius: "var(--radius-full)", padding: "6px 14px",
            color: "#DC2626", fontWeight: 700, fontSize: "var(--text-sm)"
          }}>
            <AlertTriangle size={15} />
            {urgentCount} urgent {urgentCount === 1 ? "notice" : "notices"}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#FEE2E2", color: "#991B1B", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
        {(["all", "high", "medium", "low"] as const).map(f => {
          const labels: Record<string, string> = { all: "All", high: "🔴 Urgent", medium: "🟡 Notice", low: "🟢 Info" };
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: "6px 16px", borderRadius: "var(--radius-full)",
                fontWeight: isActive ? 700 : 500, fontSize: "var(--text-sm)",
                border: isActive ? "2px solid var(--color-accent)" : "1px solid #E5E7EB",
                background: isActive ? "var(--color-accent)" : "white",
                color: isActive ? "var(--color-primary)" : "var(--text-secondary)",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: "var(--space-5)", opacity: 0.4, animation: "pulse 1.5s ease-in-out infinite" }}>
              <div style={{ height: 20, background: "#E5E7EB", borderRadius: 6, width: "60%", marginBottom: 10 }} />
              <div style={{ height: 14, background: "#E5E7EB", borderRadius: 6, width: "90%" }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "var(--space-12) var(--space-6)",
          background: "white", borderRadius: "var(--radius-lg)", border: "1px solid #E5E7EB"
        }}>
          <div style={{ width: 56, height: 56, background: "#F3F4F6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-4)" }}>
            <Megaphone size={24} color="#9CA3AF" />
          </div>
          <div style={{ fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--text-primary)", marginBottom: 6 }}>
            No announcements
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            {activeFilter === "all"
              ? "There are no active announcements from market administration at this time."
              : `No ${activeFilter}-priority announcements at this time.`}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {filtered.map(announcement => {
            const cfg = PRIORITY_CONFIG[announcement.priority] ?? PRIORITY_CONFIG.low;
            const IconComp = cfg.icon;
            const isExpiring = announcement.end_date
              ? new Date(announcement.end_date).getTime() - Date.now() < 86400000 * 3
              : false;

            return (
              <div
                key={announcement.id}
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  borderLeft: `4px solid ${cfg.border}`,
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--space-5) var(--space-6)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "";
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: cfg.border + "33",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <IconComp size={18} color={cfg.badge} />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: "var(--text-base)", color: "var(--text-primary)", margin: 0, lineHeight: 1.3 }}>
                        {announcement.title}
                      </h3>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{
                          background: cfg.badge, color: "white",
                          fontSize: "10px", fontWeight: 700, padding: "2px 8px",
                          borderRadius: "var(--radius-full)", textTransform: "uppercase", letterSpacing: "0.5px"
                        }}>
                          {cfg.label}
                        </span>
                        <span style={{
                          background: "rgba(0,0,0,0.06)", color: "var(--text-secondary)",
                          fontSize: "11px", fontWeight: 600, padding: "2px 8px",
                          borderRadius: "var(--radius-full)"
                        }}>
                          {CATEGORY_LABELS[announcement.category] ?? announcement.category}
                        </span>
                        {isExpiring && (
                          <span style={{
                            background: "#FEF3C7", color: "#D97706",
                            fontSize: "11px", fontWeight: 700, padding: "2px 8px",
                            borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", gap: 4
                          }}>
                            <Clock size={11} /> Expiring soon
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                      <Calendar size={12} /> {formatDate(announcement.created_at)}
                    </div>
                    {announcement.author_name && (
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                        by {announcement.author_name}
                      </div>
                    )}
                    {announcement.end_date && (
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                        Until {new Date(announcement.end_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Body */}
                <p style={{
                  marginTop: "var(--space-4)", color: "var(--text-secondary)",
                  fontSize: "var(--text-sm)", lineHeight: 1.7,
                  whiteSpace: "pre-wrap", margin: "var(--space-4) 0 0"
                }}>
                  {announcement.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      {!isLoading && filtered.length > 0 && (
        <div style={{
          marginTop: "var(--space-6)", padding: "var(--space-3) var(--space-4)",
          background: "#F9FAFB", borderRadius: "var(--radius-md)",
          fontSize: "var(--text-xs)", color: "var(--text-muted)",
          display: "flex", alignItems: "center", gap: 6
        }}>
          <CheckCircle size={13} color="#16A34A" />
          Showing {filtered.length} active {filtered.length === 1 ? "announcement" : "announcements"}.
          For urgent concerns, contact the Market Administration Office.
        </div>
      )}
    </AppShell>
  );
}
