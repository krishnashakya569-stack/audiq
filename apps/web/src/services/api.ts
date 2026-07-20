const DEV_API_BASE_URL = ["http://localhost", "5000/api"].join(":");
const PRODUCTION_API_BASE_URL = "/api";

function getApiBaseUrl() {
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_API_BASE_URL;
  }

  return process.env.NEXT_PUBLIC_API_URL || DEV_API_BASE_URL;
}

export const API_BASE_URL =
  getApiBaseUrl();

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export function buildApiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

export function resolveMediaUrl(value?: string) {
  if (!value) {
    return "";
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(value)) {
    const localUrl = new URL(value);
    return `${API_ORIGIN.replace(/\/$/, "")}${localUrl.pathname}${localUrl.search}`;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  if (value.startsWith("/api/") || value.startsWith("/media/")) {
    return `${API_ORIGIN.replace(/\/$/, "")}${value}`;
  }

  return value;
}
