import axios from "axios";

const rawBackendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const BACKEND_URL = rawBackendUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("hf_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Resolves relative backend paths (/api/files/..., /api/music/...) to fully qualified URLs.
 */
export function apiFileUrl(path) {
  if (!path) return "";
  if (typeof path !== "string") return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  if (path.startsWith("/samples/") || path.startsWith("samples/")) {
    const pub = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
    const clean = path.startsWith("/") ? path : `/${path}`;
    return `${pub}${clean}`;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_URL}${cleanPath}`;
}

/**
 * Safely extracts user-friendly error messages from API responses or network errors.
 */
export function formatApiError(error, fallback = "An unexpected error occurred") {
  if (!error) return fallback;
  if (typeof error === "string") return error;

  const data = error.response?.data;
  if (data) {
    if (typeof data === "string") return data;
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((item) => (typeof item === "string" ? item : item.msg || JSON.stringify(item)))
        .join(", ");
    }
    if (data.detail && typeof data.detail === "object") {
      return JSON.stringify(data.detail);
    }
    if (typeof data.message === "string") return data.message;
    if (typeof data.error === "string") return data.error;
  }

  if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
    return `Cannot connect to server at ${BACKEND_URL}. Please ensure the backend is running.`;
  }

  if (error.message && typeof error.message === "string") {
    return error.message;
  }

  return fallback;
}

export default api;
