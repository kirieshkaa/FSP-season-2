import { request } from "./client";

export type UserRole = "admin" | "user" | "worker";
export type UserStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "blocked";

export interface LoginPayload {
  name?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  role: string;
  user_id: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
}

export interface RefreshResponse {
  access_token: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email_masked: string;
  role: string;
  status: string;
  created_at: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface ChangeEmailPayload {
  email: string;
  password: string;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  register: (payload: RegisterPayload) =>
    request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  refresh: () =>
    request<RefreshResponse>("/auth/refresh", { auth: false }),

  logout: () =>
    request<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  me: () => request<UserProfile>("/auth/me"),

  changePassword: (payload: ChangePasswordPayload) =>
    request<{ ok: boolean; message: string }>("/auth/change-password", {
      method: "POST",
      body: payload,
    }),

  changeEmail: (payload: ChangeEmailPayload) =>
    request<{ ok: boolean; message: string }>("/auth/email", {
      method: "PATCH",
      body: payload,
    }),
};
