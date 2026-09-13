import { request } from "./client";

export interface Box {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  depth: number;
  max_weight: number;
  available_count: number;
  wear_rate: number;
  created_at: string;
  updated_at: string;
}

export interface BoxCreatePayload {
  name: string;
  type: string;
  width: number;
  height: number;
  depth: number;
  max_weight: number;
  available_count?: number;
  wear_rate?: number;
}

export type BoxUpdatePayload = Partial<BoxCreatePayload>;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
}

export interface StockAdjustItem {
  id: string;
  delta: number;
}

export const boxesApi = {
  list: (params: ListParams = {}) =>
    request<Paginated<Box>>("/boxes", {
      query: { page: params.page, limit: params.limit },
    }),

  get: (id: string) => request<Box>(`/boxes/${id}`),

  create: (payload: BoxCreatePayload) =>
    request<Box>("/boxes", { method: "POST", body: payload }),

  update: (id: string, payload: BoxUpdatePayload) =>
    request<Box>(`/boxes/${id}`, { method: "PATCH", body: payload }),

  remove: (id: string) =>
    request<void>(`/boxes/${id}`, { method: "DELETE" }),

  adjustStock: (items: StockAdjustItem[]) =>
    request<{ items: Box[] }>("/boxes/stock-adjust", {
      method: "POST",
      body: { items },
    }),
};
