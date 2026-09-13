import { request } from "./client";
import type { ListParams, Paginated } from "./boxes";

export type UserAction = "approve" | "reject" | "block" | "unblock";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export interface AdminUserListParams extends ListParams {
  status_filter?: string;
}

export interface UserActionResponse {
  ok: boolean;
  message: string;
  status: string;
}

export const adminApi = {
  listUsers: (params: AdminUserListParams = {}) =>
    request<Paginated<AdminUser>>("/admin/users", {
      query: {
        page: params.page,
        limit: params.limit,
        status_filter: params.status_filter,
      },
    }),

  applyAction: (userId: string, action: UserAction) =>
    request<UserActionResponse>(`/admin/users/${userId}/actions`, {
      method: "POST",
      body: { action },
    }),

  deleteUser: (userId: string) =>
    request<{ ok: boolean; message: string }>(`/admin/users/${userId}`, {
      method: "DELETE",
    }),

  getRequireApproval: () =>
    request<{ is_approval_required: boolean }>(
      "/admin/settings/require-approval",
    ),

  setRequireApproval: (isApprovalRequired: boolean) =>
    request<{ is_approval_required: boolean }>(
      "/admin/settings/require-approval",
      {
        method: "PUT",
        body: { is_approval_required: isApprovalRequired },
      },
    ),
};
