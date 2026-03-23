const normalizeBasePath = (path: string) => {
  if (path === "/") return "";
  return path.endsWith("/") ? path.slice(0, -1) : path;
};

const normalizePath = (path: string) => {
  if (path === "/") return path;
  return path.endsWith("/") ? path.slice(0, -1) : path;
};

export const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH ?? "/bi_poc");
export const LOGIN_ROUTE = "/login";
export const LOGIN_PATH = `${BASE_PATH}${LOGIN_ROUTE}`;

export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const currentPath = normalizePath(window.location.pathname);
  const targetPath = normalizePath(LOGIN_PATH);
  if (currentPath === targetPath) return;
  window.location.href = LOGIN_PATH;
}
