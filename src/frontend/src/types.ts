export type Dimensions = {
  width: number;
  depth: number;
  height: number;
};

export type Point3D = {
  x: number;
  y: number;
  z: number;
};

export type BackendBox = {
  box_type: string;
  x: number;
  y: number;
  z: number;
  maxMass: number;
};

export type BackendProduct = {
  id: string;
  destination: string;
  x: number;
  y: number;
  z: number;
  mass: number;
  stackable: boolean;
};

export type BackendPlacement = {
  item_id: string;
  x: number;
  y: number;
  z: number;
  orientation: string;
};

export type BackendContainer = {
  box_type: string;
  placements: BackendPlacement[];
};

export type BackendPackingResult = {
  result_code: number;
  containers: BackendContainer[];
};

export type PackingItem = BackendProduct & {
  dimensions: Dimensions;
  position: Point3D;
  color: string;
  layer: number;
  orientation: string;
};

export type PackedContainer = {
  id: string;
  index: number;
  boxType: string;
  box: {
    dimensions: Dimensions;
    maxMass: number;
  };
  items: PackingItem[];
  fillRate: number;
};
