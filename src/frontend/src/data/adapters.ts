import type { Box as ApiBox, BoxCreatePayload } from '../api/boxes'
import type { Product as ApiProduct, ProductCreatePayload } from '../api/products'
import type { AdminUser as ApiAdminUser } from '../api/admin'
import type { AdminUser, Box, Product, UserStatus } from './mock'

/** Shorten an opaque id (e.g. a UUID) for display: `a1b2c3d4-…-9f0e`. */
export function shortId(id: string, head = 8, tail = 4): string {
  if (id.length <= head + tail + 1) return id
  return `${id.slice(0, head)}…${id.slice(-tail)}`
}

/** API box -> UI box (millimetres preserved, dimensions renamed). */
export function toUiBox(box: ApiBox): Box {
  return {
    id: box.id,
    name: box.name,
    type: box.type,
    w: box.width,
    h: box.height,
    d: box.depth,
    qty: box.available_count,
    maxWeight: box.max_weight,
    status: box.available_count < 10 ? 'critical' : box.available_count < 25 ? 'low' : 'in',
  }
}

/** API product -> UI product. UI `sku` is the server UUID; `g` is the formatted size. */
export function toUiProduct(product: ApiProduct): Product {
  return {
    sku: product.id,
    name: product.name,
    g: `${product.x} × ${product.y} × ${product.z}`,
    weight: product.weight,
    w: product.x,
    h: product.y,
    d: product.z,
    qty: product.quantity,
    destination: product.destination,
    mustStayUpright: product.must_stay_upright,
    isStackable: product.is_stackable,
    maxTopLoad: product.max_top_load,
    minSupportRatio: product.minimum_support_ratio,
    incompatibleTags: product.incompatible_tags,
    allowedRotations: product.allowed_rotations,
    isFloorOnly: product.is_floor_only,
    tags: product.tags,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  }
}

/** UI product -> create payload (UI `w/h/d` map back to x/y/z). */
export function toProductPayload(product: Product): ProductCreatePayload {
  return {
    name: product.name,
    destination: product.destination,
    x: product.w,
    y: product.h,
    z: product.d,
    weight: product.weight,
  }
}

/** UI box -> create payload (UI `w/h/d` map to width/height/depth). */
export function toBoxPayload(box: Box): BoxCreatePayload {
  return {
    name: box.name,
    type: box.type,
    width: box.w,
    height: box.h,
    depth: box.d,
    max_weight: box.maxWeight,
    available_count: box.qty,
  }
}

export function toUiAdminUser(user: ApiAdminUser): AdminUser {
  return {
    id: user.id,
    username: user.name,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'user',
    status: user.status as UserStatus,
    created_at: user.created_at,
  }
}
