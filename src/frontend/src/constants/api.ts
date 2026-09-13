/**
 * API configuration.
 *
 * In dev, requests go through the Vite proxy (`/api` -> backend), so the
 * default relative base works without any environment variable.
 * Override with `VITE_API_URL` when the API lives on another origin.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? "/api";

export const API_PREFIX = "/v1";

export const API_ROOT = `${API_BASE_URL}${API_PREFIX}`;

export const ACCESS_TOKEN_KEY = "fsp-access-token";
