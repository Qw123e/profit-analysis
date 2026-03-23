import type { AuthUser } from "@/services/authService";

const LOGGER_API_URL = process.env.NEXT_PUBLIC_LOGGER_API_URL ?? "/logger/api/log";
const LOGGER_SERVICE = process.env.NEXT_PUBLIC_LOGGER_SERVICE ?? "bi_poc";

interface LogEventInput {
  eventName: string;
  user?: AuthUser | null;
  eventProperties?: Record<string, unknown>;
}

export async function logEvent({ eventName, user, eventProperties }: LogEventInput): Promise<void> {
  if (typeof window === "undefined") return;

  const payload = {
    event_name: eventName,
    event_service: LOGGER_SERVICE,
    event_properties: {
      page_url: window.location.href,
      ...(eventProperties ?? {})
    },
    comp_id: user?.comp_id ?? null,
    user_nm: user?.user_nm ?? null,
    user_id: user?.user_id ?? null,
    dept_nm: user?.dept_nm ?? null,
    role: user?.role ?? null,
    is_active: user?.is_active ?? null,
    project_access: user?.projects ?? null
  };

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(LOGGER_API_URL, blob)) {
        return;
      }
    }
    await fetch(LOGGER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin"
    });
  } catch {
    // no-op: logging must never block UI
  }
}

export async function logPageView(user?: AuthUser | null, eventProperties?: Record<string, unknown>): Promise<void> {
  await logEvent({ eventName: "page_view", user, eventProperties });
}
