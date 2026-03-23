"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";

import { authService } from "@/services/authService";
import { bootstrapService } from "@/services/bootstrapService";
import { dashboardService } from "@/services/dashboardService";
import { useAuth } from "@/hooks/useAuth";
import { logEvent } from "@/utils/logger";

export default function LoginPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { isAuthenticated, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboards");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const user = await authService.login({ username, password });
      logEvent({
        eventName: "login_success",
        user,
        eventProperties: { method: "password" }
      });
      mutate("auth/me", user, { revalidate: false });
      void mutate("bootstrap", bootstrapService.getBootstrap(), { revalidate: false });
      void mutate("dashboards", dashboardService.listDashboards(), { revalidate: false });
      router.replace("/dashboards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthLogin = () => {
    // Redirect to auth_service Microsoft OAuth login
    // After OAuth, redirect to login page which will auto-redirect to dashboards
    window.location.href = "/auth/microsoft/login?redirect_uri=/bi_poc/login";
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>BI Service Login</h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>
          Sign in with your assigned account.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <label style={styles.label}>
            Username
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label style={styles.label}>
            Password
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.button} disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>OR</span>
          <span style={styles.dividerLine}></span>
        </div>

        <button
          type="button"
          onClick={handleOAuthLogin}
          style={styles.oauthButton}
          disabled={submitting}
        >
          <svg style={styles.microsoftIcon} viewBox="0 0 23 23" fill="none">
            <path d="M0 0h11v11H0z" fill="#f25022"/>
            <path d="M12 0h11v11H12z" fill="#00a4ef"/>
            <path d="M0 12h11v11H0z" fill="#7fba00"/>
            <path d="M12 12h11v11H12z" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </button>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0b1220",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    color: "#e2e8f0"
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#111a2e",
    borderRadius: 12,
    padding: 24,
    border: "1px solid #1e2740",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.35)"
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    fontWeight: 600
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #1e2740",
    background: "#0e1629",
    color: "#e2e8f0",
    fontSize: 14
  },
  button: {
    marginTop: 6,
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer"
  },
  error: {
    background: "#2e1a1a",
    color: "#ffb3b3",
    borderRadius: 8,
    padding: 10,
    fontSize: 12
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
    marginBottom: 16
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "#1e2740"
  },
  dividerText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 600
  },
  oauthButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #1e2740",
    background: "#ffffff",
    color: "#5e5e5e",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s"
  },
  microsoftIcon: {
    width: 20,
    height: 20
  }
};
