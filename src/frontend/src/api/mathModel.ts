import { request } from "./client";

export interface SolverBoxInput {
  width: number;
  height: number;
  depth: number;
  max_weight?: number;
  wear_rate?: number;
  count?: number;
}

export interface SolverItemInput {
  id: string;
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

export interface SolveRequest {
  items: SolverItemInput[];
  boxes: Record<string, SolverBoxInput>;
  solver_profile?: "fast" | "balanced" | "quality" | "exact_small";
  time_limit_ms?: number;
}

export interface Placement {
  item_id: string;
  x: number;
  y: number;
  z: number;
  orientation: string;
}

export interface PackedBox {
  box_type: string;
  placements: Placement[];
}

export interface SolveResponse {
  containers: PackedBox[];
  unpacked: string[];
}

export const mathModelApi = {
  solve: (payload: SolveRequest) =>
    request<SolveResponse>("/math-model/solve", {
      method: "POST",
      body: payload,
    }),
};
