export type NavId = 'boxes' | 'products' | 'receiving' | 'shipping' | 'reports' | 'admin'

export interface NavItem {
  id: NavId
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'boxes', label: 'Коробки' },
  { id: 'products', label: 'Товары' },
  { id: 'receiving', label: 'Приёмка' },
  { id: 'shipping', label: 'Отгрузка' },
  { id: 'reports', label: 'Отчёты' },
  { id: 'admin', label: 'Админ панель' }
]

export type BoxStatus = 'in' | 'low' | 'critical'

export interface Box {
  id: string
  name: string
  w: number
  h: number
  d: number
  qty: number
  maxWeight: number
  status: BoxStatus
}

export const BOXES: Box[] = [
  { id: 'S', name: 'Коробка S', w: 200, h: 150, d: 100, qty: 342, maxWeight: 5, status: 'in' },
  { id: 'M', name: 'Коробка M', w: 350, h: 250, d: 200, qty: 128, maxWeight: 10, status: 'in' },
  { id: 'L', name: 'Коробка L', w: 500, h: 400, d: 300, qty: 64, maxWeight: 15, status: 'low' },
  { id: 'XL', name: 'Коробка XL', w: 600, h: 500, d: 400, qty: 23, maxWeight: 25, status: 'low' },
  { id: 'XXL', name: 'Коробка XXL', w: 800, h: 600, d: 500, qty: 8, maxWeight: 40, status: 'critical' }
]

export function deriveStatus(qty: number): BoxStatus {
  if (qty < 10) return 'critical'
  if (qty < 25) return 'low'
  return 'in'
}

export interface StatusMeta {
  label: string
  cls: string
}

export const STATUS: Record<BoxStatus, StatusMeta> = {
  in: { label: 'В наличии', cls: 'ok' },
  low: { label: 'Мало', cls: 'warn' },
  critical: { label: 'Критично', cls: 'danger' }
}

export interface Product {
  sku: string
  name: string
  g: string
  weight: number
  w: number
  h: number
  d: number
  destination: string
}

export const DESTINATIONS: string[] = ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск', 'Краснодар']

export interface PackTask {
  product: Product
  box: Box
}

function fits(box: Box, p: Product): boolean {
  const b = [box.w, box.h, box.d].sort((x, y) => x - y)
  const q = [p.w, p.h, p.d].sort((x, y) => x - y)
  return q.every((v, i) => b[i] >= v)
}

export function pickBox(product: Product): Box {
  const box = BOXES.find((b) => fits(b, product))
  return box ?? BOXES[BOXES.length - 1]
}

export const PRODUCTS: Product[] = [
  { sku: 'SKU-001', name: 'Наушники Bluetooth Sony WH-1000XM5', g: '180 × 120 × 80', weight: 250, w: 180, h: 120, d: 80, destination: 'Москва' },
  { sku: 'SKU-002', name: 'Чехол для iPhone 14 Silicone Case', g: '165 × 85 × 15', weight: 45, w: 165, h: 85, d: 15, destination: 'Санкт-Петербург' },
  { sku: 'SKU-003', name: 'Зарядное устройство GaN 65W USB-C', g: '100 × 60 × 40', weight: 120, w: 100, h: 60, d: 40, destination: 'Казань' },
  { sku: 'SKU-004', name: 'Портативная колонка JBL Charge 5', g: '220 × 95 × 95', weight: 580, w: 220, h: 95, d: 95, destination: 'Москва' },
  { sku: 'SKU-005', name: 'USB-кабель Type-C 1.5 м', g: '120 × 50 × 20', weight: 30, w: 120, h: 50, d: 20, destination: 'Екатеринбург' },
  { sku: 'SKU-006', name: 'Защитное стекло Premium Pro 9H', g: '190 × 90 × 10', weight: 15, w: 190, h: 90, d: 10, destination: 'Новосибирск' },
  { sku: 'SKU-007', name: 'Механическая клавиатура RK Royal', g: '450 × 150 × 45', weight: 890, w: 450, h: 150, d: 45, destination: 'Краснодар' },
  { sku: 'SKU-008', name: 'Игровая мышь Logitech G102 Lightsync', g: '120 × 65 × 40', weight: 85, w: 120, h: 65, d: 40, destination: 'Москва' },
  { sku: 'SKU-009', name: 'Монитор для подбора габаритов AOC 24"', g: '540 × 330 × 60', weight: 2800, w: 540, h: 330, d: 60, destination: 'Санкт-Петербург' },
  { sku: 'SKU-010', name: 'Умная колонка Яндекс Станция Мини', g: '130 × 90 × 90', weight: 320, w: 130, h: 90, d: 90, destination: 'Казань' },
  { sku: 'SKU-011', name: 'Веб-камера Logitech C270 HD', g: '75 × 40 × 40', weight: 75, w: 75, h: 40, d: 40, destination: 'Екатеринбург' },
  { sku: 'SKU-012', name: 'Роутер TP-Link Archer AX10', g: '280 × 200 × 75', weight: 640, w: 280, h: 200, d: 75, destination: 'Новосибирск' }
]

export type UserStatus = 'approved' | 'pending' | 'rejected' | 'blocked'

export interface AdminUser {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
  status: UserStatus
  created_at: string
}

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  approved: 'Одобрен',
  pending: 'Ожидает',
  rejected: 'Отклонён',
  blocked: 'Заблокирован'
}

export const ADMIN_USERS: AdminUser[] = [
  { id: 'u001', username: 'Иван Кузнецов', email: 'ivan.k@example.com', role: 'admin', status: 'approved', created_at: '2025-11-02' },
  { id: 'u002', username: 'Алексей Смирнов', email: 'a.smirnov@example.com', role: 'user', status: 'approved', created_at: '2025-11-14' },
  { id: 'u003', username: 'Мария Петрова', email: 'm.petrova@example.com', role: 'user', status: 'pending', created_at: '2026-01-08' },
  { id: 'u004', username: 'Дмитрий Волков', email: 'd.volkov@example.com', role: 'user', status: 'approved', created_at: '2025-12-05' },
  { id: 'u005', username: 'Анна Соколова', email: 'a.sokolova@example.com', role: 'user', status: 'blocked', created_at: '2025-10-21' },
  { id: 'u006', username: 'Сергей Морозов', email: 's.morozov@example.com', role: 'user', status: 'approved', created_at: '2026-02-01' },
  { id: 'u007', username: 'Елена Васильева', email: 'e.vasilieva@example.com', role: 'user', status: 'pending', created_at: '2026-02-18' },
  { id: 'u008', username: 'Павел Зайцев', email: 'p.zaitsev@example.com', role: 'user', status: 'rejected', created_at: '2025-09-30' },
  { id: 'u009', username: 'Ольга Козлова', email: 'o.kozlova@example.com', role: 'user', status: 'approved', created_at: '2025-12-19' },
  { id: 'u010', username: 'Никита Орлов', email: 'n.orlov@example.com', role: 'user', status: 'pending', created_at: '2026-03-04' },
  { id: 'u011', username: 'Татьяна Федорова', email: 't.fedorova@example.com', role: 'user', status: 'blocked', created_at: '2025-11-27' },
  { id: 'u012', username: 'Роман Гусев', email: 'r.gusev@example.com', role: 'user', status: 'approved', created_at: '2026-01-19' }
]