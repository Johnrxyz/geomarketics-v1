"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MapPin, AlertCircle, Loader2, X } from "lucide-react";
import { authApi } from "@/lib/api";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.login(username, password);
      const userRole = (data.user as { role: string }).role;

      if (userRole === "admin") {
        router.push("/map");
      } else if (userRole === "vendor") {
        router.push("/vendor/profile");
      } else {
        router.push("/public");
      }
      onClose();
    } catch (err: unknown) {
      const errObj = err as Record<string, unknown>;
      if (errObj?.non_field_errors) {
        setError(String((errObj.non_field_errors as string[])[0]));
      } else if (errObj?.detail) {
        setError(String(errObj.detail));
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      {/* Backdrop */}
      <div 
        style={{ position: "absolute", inset: 0, background: "rgba(10, 27, 74, 0.6)", backdropFilter: "blur(4px)" }} 
        onClick={onClose} 
      />
      
      {/* Modal Card */}
      <div style={{ position: "relative", width: "100%", maxWidth: "440px", background: "white", borderRadius: "var(--radius-xl)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden" }}>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{ position: "absolute", top: "16px", right: "16px", width: "32px", height: "32px", borderRadius: "50%", background: "#F3F4F6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6B7280", transition: "all 0.2s" }}
          onMouseOver={e => { e.currentTarget.style.background = "#E5E7EB"; e.currentTarget.style.color = "#111827"; }}
          onMouseOut={e => { e.currentTarget.style.background = "#F3F4F6"; e.currentTarget.style.color = "#6B7280"; }}
        >
          <X size={18} />
        </button>

        <div style={{ padding: "var(--space-8)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
            <div style={{ width: "48px", height: "48px", background: "var(--color-primary)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-accent)", flexShrink: 0, boxShadow: "0 4px 12px rgba(255,203,5,0.3)" }}>
              <MapPin size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--color-accent)", lineHeight: 1.2 }}>GeoMarketics</h1>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Portal Access</p>
            </div>
          </div>

          <div style={{ marginBottom: "var(--space-6)" }}>
            <h2 style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--text-primary)" }}>Welcome back</h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: "4px" }}>Sign in to manage the market system</p>
          </div>



          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", background: "#FEF2F2", color: "#DC2626", borderRadius: "6px", fontSize: "14px", fontWeight: 600, marginBottom: "16px" }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }} htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${error && !username ? "#DC2626" : "#E5E7EB"}`, borderRadius: "8px", fontSize: "15px", outline: "none", transition: "border-color 0.2s" }}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                onFocus={e => e.currentTarget.style.borderColor = "var(--color-primary)"}
                onBlur={e => e.currentTarget.style.borderColor = error && !username ? "#DC2626" : "#E5E7EB"}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }} htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  style={{ width: "100%", padding: "10px 40px 10px 14px", border: `1.5px solid ${error && !password ? "#DC2626" : "#E5E7EB"}`, borderRadius: "8px", fontSize: "15px", outline: "none", transition: "border-color 0.2s" }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  onFocus={e => e.currentTarget.style.borderColor = "var(--color-primary)"}
                  onBlur={e => e.currentTarget.style.borderColor = error && !password ? "#DC2626" : "#E5E7EB"}
                />
                <button
                  type="button"
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: "4px" }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "14px", background: "var(--color-primary)", color: "var(--color-accent)", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "opacity 0.2s", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div style={{ marginTop: "24px", textAlign: "center", fontSize: "12px", color: "var(--text-muted)", background: "#F9FAFB", padding: "8px 12px", borderRadius: "6px" }}>
            <strong>Demo:</strong> admin/admin123 | maria.santos/vendor123
          </div>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
