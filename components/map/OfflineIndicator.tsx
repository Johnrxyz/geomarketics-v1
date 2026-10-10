"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

/**
 * OfflineIndicator
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows a slim banner when the user loses network connectivity.
 * When connectivity returns, briefly shows a "Back online" message then fades.
 * Uses the navigator.onLine API + online/offline events.
 */
export default function OfflineIndicator() {
  const [status, setStatus] = useState<"online" | "offline" | "restored">("online");

  useEffect(() => {
    // Set initial state correctly
    if (!navigator.onLine) setStatus("offline");

    const handleOffline = () => setStatus("offline");
    const handleOnline  = () => {
      setStatus("restored");
      // Auto-hide the "Back online" banner after 3s
      setTimeout(() => setStatus("online"), 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online",  handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online",  handleOnline);
    };
  }, []);

  if (status === "online") return null;

  const isOffline   = status === "offline";
  const isRestored  = status === "restored";

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        borderRadius: 100,
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        background: isOffline
          ? "rgba(30,30,30,0.92)"
          : "rgba(22,163,74,0.92)",
        color: "#fff",
        border: isOffline
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(255,255,255,0.2)",
        animation: "offlineFadeIn 0.3s cubic-bezier(0.16,1,0.3,1)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes offlineFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {isOffline ? (
        <>
          <WifiOff size={15} />
          You&rsquo;re offline — map data may be outdated
        </>
      ) : (
        <>
          <Wifi size={15} />
          Back online
        </>
      )}
    </div>
  );
}
