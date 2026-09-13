import { request } from "./client";
import type { ListParams, Paginated } from "./boxes";

export interface Product {
  id: string;
  name: string;
  destination: string;
  x: number;
  y: number;
  z: number;
  weight: number;
  quantity: number;
  must_stay_upright: boolean;
  is_stackable: boolean;
  max_top_load: number;
  minimum_support_ratio: number;
  incompatible_tags: string[];
  allowed_rotations: string[] | null;
  is_floor_only: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ProductCreatePayload {
  name: string;
  destination: string;
  x: number;
  y: number;
  z: number;
  weight?: number;
  quantity?: number;
  must_stay_upright?: boolean;
  is_stackable?: boolean;
  max_top_load?: number;
  minimum_support_ratio?: number;
  incompatible_tags?: string[];
  allowed_rotations?: string[] | null;
  is_floor_only?: boolean;
  tags?: string[];
}

export type ProductUpdatePayload = Partial<ProductCreatePayload>;

export const productsApi = {
  list: (params: ListParams = {}) =>
    request<Paginated<Product>>("/products", {
      query: { page: params.page, limit: params.limit },
    }),

  get: (id: string) => request<Product>(`/products/${id}`),

  create: (payload: ProductCreatePayload) =>
    request<Product>("/products", { method: "POST", body: payload }),

  update: (id: string, payload: ProductUpdatePayload) =>
    request<Product>(`/products/${id}`, { method: "PATCH", body: payload }),

  remove: (id: string) =>
    request<void>(`/products/${id}`, { method: "DELETE" }),
};
