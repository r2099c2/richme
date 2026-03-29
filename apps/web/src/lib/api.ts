import { clearToken, getToken } from "./auth";
import { getApiBase } from "./config";
import type {
  LoginResponse,
  PublicThemesByDateResponse,
  StockBulkRequest,
  ThemeRow,
} from "../types/api";

function apiUrl(suffix: string): string {
  const base = getApiBase();
  const path = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${base}/api/v1${path}`;
}

export async function fetchPublicThemesByDate(
  date: string,
  includeConcepts = false,
): Promise<PublicThemesByDateResponse> {
  const q = includeConcepts ? "?include_concepts=true" : "";
  const res = await fetch(apiUrl(`/public/themes/by-date/${date}${q}`));
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<PublicThemesByDateResponse>;
}

export async function loginAdmin(password: string): Promise<LoginResponse> {
  const res = await fetch(apiUrl("/admin/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = (await res.json().catch(() => ({}))) as LoginResponse & { detail?: string };
  if (!res.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : res.statusText);
  }
  return data as LoginResponse;
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 401) {
    clearToken();
    window.location.assign("/admin/login");
  }
  return res;
}

export async function fetchAdminThemes(): Promise<ThemeRow[]> {
  const res = await adminFetch("/admin/themes");
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<ThemeRow[]>;
}

export async function createTheme(body: Record<string, unknown>): Promise<ThemeRow> {
  const res = await adminFetch("/admin/themes", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<ThemeRow>;
}

export async function patchTheme(
  id: number,
  body: Record<string, unknown>,
): Promise<ThemeRow> {
  const res = await adminFetch(`/admin/themes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<ThemeRow>;
}

export async function postStocksBulk(body: StockBulkRequest): Promise<{ updated: number }> {
  const res = await adminFetch("/admin/stocks/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<{ updated: number }>;
}
