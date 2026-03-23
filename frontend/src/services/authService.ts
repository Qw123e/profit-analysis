import { AUTH_API_BASE, AUTH_TOKEN_KEY } from "./authConfig";

export interface AuthUser {
  user_id: string;
  username: string;
  role: string;
  is_active?: boolean;
  projects?: string[];
  // HR Information (from auth_service)
  comp_id?: string | null;
  user_nm?: string | null;
  dept_nm?: string | null;
}

export const authService = {
  login: async (payload: { username: string; password: string }): Promise<AuthUser> => {
    const formData = new URLSearchParams();
    formData.append("username", payload.username);
    formData.append("password", payload.password);

    const res = await fetch(`${AUTH_API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Login failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as AuthUser & { access_token?: string };
    if (data.access_token) {
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
    }
    return data;
  },

  logout: (): void => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  me: async (): Promise<AuthUser | null> => {
    // Try cookie-based auth first (for Microsoft OAuth SSO)
    try {
      const res = await fetch(`${AUTH_API_BASE}/me`, {
        method: "GET",
        credentials: "include"  // Include cookies
      });

      if (res.ok) {
        return (await res.json()) as AuthUser;
      }
    } catch (err) {
      // Cookie auth failed, try localStorage token
    }

    // Fallback to localStorage token (for username/password login)
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;

    const res = await fetch(`${AUTH_API_BASE}/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Auth check failed (${res.status}): ${text}`);
    }
    return (await res.json()) as AuthUser;
  }
};
