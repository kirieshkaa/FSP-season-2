import { ApiError, request } from "./client";

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
  name?: string;
  x: number;
  y: number;
  z: number;
  weight?: number;
  quantity?: number;
  is_stackable?: boolean;
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
  result_code?: number;
  containers: PackedBox[];
  unpacked: string[];
}

export const mathModelApi = {
  solve: async (payload: SolveRequest): Promise<SolveResponse> => {
    try {
      return await request<SolveResponse>("/math-model/solve", {
        method: "POST",
        body: payload,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.detail as SolveResponse | undefined;
        if (body?.containers) return body;
      }
      throw err;
    }
  },
};
