/** API origin without trailing slash. */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://127.0.0.1:8000";
}
