"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MapPin, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "vendor">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    // Simulate auth
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);

    if (role === "admin") {
      router.push("/map");
    } else {
      router.push("/vendor/profile");
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-shape login-bg-shape-1" />
        <div className="login-bg-shape login-bg-shape-2" />
        <div className="login-bg-shape login-bg-shape-3" />
      </div>

      <div className="login-container">
        {/* Branding */}
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <MapPin size={28} />
          </div>
          <div>
            <h1 className="login-app-name">GeoMarketics</h1>
            <p className="login-tagline">Market Governance System</p>
          </div>
        </div>

        {/* Card */}
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">Sign in to access the system</p>
          </div>

          {/* Role Selector */}
          <div className="role-selector" role="group" aria-label="Select your role">
            <button
              type="button"
              className={`role-btn${role === "admin" ? " active" : ""}`}
              onClick={() => setRole("admin")}
              aria-pressed={role === "admin"}
            >
              Administrator
            </button>
            <button
              type="button"
              className={`role-btn${role === "vendor" ? " active" : ""}`}
              onClick={() => setRole("vendor")}
              aria-pressed={role === "vendor"}
            >
              Vendor
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Error */}
            {error && (
              <div className="login-error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="form-group login-field">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div className="form-input-wrapper">
                <input
                  id="email"
                  type="email"
                  className={`form-input${error && !email ? " error" : ""}`}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  aria-required="true"
                  aria-describedby={error ? "login-error" : undefined}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group login-field">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="form-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`form-input has-icon-right${error && !password ? " error" : ""}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  aria-required="true"
                />
                <button
                  type="button"
                  className="form-input-icon-right btn"
                  style={{padding:"0",border:"none",background:"none",color:"var(--text-muted)"}}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Forgot */}
            <div className="login-forgot-row">
              <a href="#" className="login-forgot-link">Forgot Password?</a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-lg login-submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin-icon" style={{animation:"spin 0.8s linear infinite"}} />
                  Signing in...
                </>
              ) : (
                `Sign in as ${role === "admin" ? "Administrator" : "Vendor"}`
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="login-demo-hint">
            <span>Demo: use any valid email format + any password</span>
          </div>
        </div>

        {/* Footer */}
        <p className="login-footer-text">
          © {new Date().getFullYear()} GeoMarketics · LC Public Market Governance System
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-6);
          background: var(--color-accent);
          position: relative;
          overflow: hidden;
        }
        .login-bg { position: absolute; inset: 0; pointer-events: none; }
        .login-bg-shape {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,203,5,0.08);
        }
        .login-bg-shape-1 { width: 600px; height: 600px; top: -200px; right: -200px; }
        .login-bg-shape-2 { width: 350px; height: 350px; bottom: -100px; left: -100px; background: rgba(255,203,5,0.06); }
        .login-bg-shape-3 { width: 200px; height: 200px; top: 40%; left: 20%; background: rgba(255,255,255,0.04); }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-6);
        }

        .login-brand {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          color: var(--text-inverse);
        }

        .login-logo {
          width: 56px;
          height: 56px;
          background: var(--color-primary);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-accent);
          flex-shrink: 0;
          box-shadow: 0 4px 20px rgba(255,203,5,0.35);
        }

        .login-app-name {
          font-size: var(--text-2xl);
          font-weight: 800;
          color: var(--text-inverse);
          line-height: 1.2;
        }

        .login-tagline {
          font-size: var(--text-sm);
          color: rgba(255,255,255,0.65);
          margin-top: 2px;
        }

        .login-card {
          width: 100%;
          background: var(--bg-surface);
          border-radius: var(--radius-xl);
          padding: var(--space-8);
          box-shadow: var(--shadow-xl);
        }

        .login-card-header {
          margin-bottom: var(--space-6);
        }

        .login-title {
          font-size: var(--text-2xl);
          font-weight: 800;
          color: var(--color-accent);
        }

        .login-subtitle {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-top: var(--space-1);
        }

        .role-selector {
          display: flex;
          background: #F3F4F6;
          border-radius: var(--radius-sm);
          padding: 4px;
          margin-bottom: var(--space-6);
          gap: 4px;
        }

        .role-btn {
          flex: 1;
          padding: var(--space-2) var(--space-4);
          border-radius: 6px;
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .role-btn.active {
          background: var(--color-accent);
          color: var(--text-inverse);
          box-shadow: var(--shadow-sm);
        }

        .login-field {
          margin-bottom: var(--space-4);
        }

        .login-forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: var(--space-5);
        }

        .login-forgot-link {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--color-accent);
        }

        .login-forgot-link:hover {
          text-decoration: underline;
        }

        .login-submit {
          width: 100%;
          padding: var(--space-4);
          font-size: var(--text-md);
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--color-error-bg);
          color: var(--color-error);
          border-radius: var(--radius-sm);
          font-size: var(--text-sm);
          font-weight: 500;
          margin-bottom: var(--space-4);
        }

        .login-demo-hint {
          margin-top: var(--space-4);
          text-align: center;
          font-size: var(--text-xs);
          color: var(--text-muted);
          background: #F9FAFB;
          border-radius: var(--radius-sm);
          padding: var(--space-2) var(--space-4);
        }

        .login-footer-text {
          font-size: var(--text-xs);
          color: rgba(255,255,255,0.45);
          text-align: center;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
