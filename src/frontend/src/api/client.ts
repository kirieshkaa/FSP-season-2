import { ACCESS_TOKEN_KEY, API_ROOT } from "../constants/api";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getAccessToken(): string | null {
  if (accessToken === null) {
    accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return accessToken;
}

// Shared in-flight refresh promise: concurrent 401s trigger a single refresh.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_ROOT}/auth/refresh`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as { access_token?: string };
      if (!payload.access_token) return false;
      setAccessToken(payload.access_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${API_ROOT}${path}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function extractMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === "object") {
    const detail = (payload as Record<string, unknown>).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as Record<string, unknown>;
      if (typeof first?.msg === "string") return first.msg;
    }
    const message = (payload as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return `Request failed with status ${status}`;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, auth = true } = options;

  async function attempt(isRetry = false): Promise<Response> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";

    if (auth) {
      const token = getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(buildUrl(path, query), {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 401 && auth && !isRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return attempt(true);
    }

    return response;
  }

  const response = await attempt();

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractMessage(response.status, payload),
      payload,
    );
  }

  return payload as T;
}
