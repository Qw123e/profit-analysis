import { redirectToLogin } from "@/utils/routes";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "@/services/authConfig";

export function handleUnauthorized() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  redirectToLogin();
}

function withAuthHeaders(headers?: HeadersInit): Headers {
  const next = new Headers(headers ?? {});
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    next.set("Authorization", `Bearer ${token}`);
  }
  return next;
}

export async function httpGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    credentials: "include"  // Include cookies for SSO
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
}

export async function httpPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
    credentials: "include"  // Include cookies for SSO
  });

  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return (await response.json()) as T;
}

export async function httpPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
    credentials: "include"  // Include cookies for SSO
  });
  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return (await response.json()) as T;
}

export async function httpDelete(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: withAuthHeaders(),
    credentials: "include"  // Include cookies for SSO
  });
  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
}
