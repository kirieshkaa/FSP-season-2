import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { IconComp } from '../components/ui/icons.jsx'
import { DESTINATIONS, STATUS, deriveStatus } from '../data/mock.js'
import type { Box, Product } from '../data/mock.js'
import {
  IconEdit, IconTrash, IconSearch, IconFilter, IconPlus, IconCheck, IconX, IconEye,
  IconArrowUp, IconArrowDown, IconArrowUpDown
} from '../components/ui/icons.jsx'
import { boxesApi } from '../api/boxes'
import { productsApi } from '../api/products'
import { ApiError } from '../api/client'
import {
  toBoxPayload,
  toProductPayload,
  shortId,
  toUiBox,
  toUiProduct,
} from '../data/adapters'

export interface SelectionApi {
  selection: Product[]
  toggle: (p: Product) => void
  deselect: (sku: string) => void
  selectAll: (products: Product[]) => void
  clear: () => void
  confirm: () => void
}

interface Props {
  api: SelectionApi
}

const PAGE_SIZE = 10

type SortKey = 'sku' | 'name' | 'volume' | 'qty' | 'weight' | 'destination'
type SortOrder = 'asc' | 'desc'

function TableAction({ icon: I, title, danger, onClick }: { icon: IconComp; title: string; danger?: boolean; onClick?: () => void }): ReactElement {
  return (
    <button
      type="button"
      className={`table-action${danger ? ' danger' : ''}`}
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      <I />
    </button>
  )
}

function FormModal({ title, sub, children, onSave, onClose, saveLabel = 'Сохранить', saveDisabled = false }: {
  title: string
  sub: string
  children: ReactElement | ReactElement[]
  onSave: () => void
  onClose: () => void
  saveLabel?: string
  saveDisabled?: boolean
}): ReactElement {
  return (
    <div className="modal-wrap">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal modal-form">
        <div className="modal-head">
          <div>
            <h3 className="modal-title">{title}</h3>
            <p className="pack-sub">{sub}</p>
          </div>
          <button className="icon-btn modal-close" title="Закрыть" onClick={onClose}>
            <IconX />
          </button>
        </div>
        {children}
        <div className="pack-foot">
          <button className="btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn-primary btn-sm" onClick={onSave} disabled={saveDisabled}>{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}

/* ===== Boxes ===== */

interface BoxesProps {
  boxes: Box[]
  onEdit: (box: Box) => void
  onDelete: (id: string) => void
}

function BoxesTable({ boxes, onEdit, onDelete }: BoxesProps): ReactElement {
  return (
    <div className="table-scroll">
      <table className="data-table boxes-table">
        <thead>
          <tr>
            <th>Тип тары</th>
            <th>Д × Ш × В (мм)</th>
            <th>Макс. вес</th>
            <th>Кол-во (шт)</th>
            <th>Статус</th>
            <th className="ta-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          {boxes.map((box) => {
            const st = STATUS[box.status]
            return (
              <tr key={box.id} className={box.status === 'critical' ? 'row-critical' : ''}>
                <td className="cell-name">
                  <span className="box-tag" title={box.id}>{box.type || shortId(box.id)}</span>
                  <span className="box-name">{box.name}</span>
                </td>
                <td>{box.w} × {box.h} × {box.d}</td>
                <td>{box.maxWeight} кг</td>
                <td className={box.qty < 25 ? 'cell-qty warn' : 'cell-qty'}>
                  {box.qty}
                </td>
                <td><span className={`status-badge ${st.cls}`}>{st.label}</span></td>
                <td className="ta-right">
                  <div className="table-actions">
                    <TableAction icon={IconEdit} title="Редактировать" onClick={() => onEdit(box)} />
                    <TableAction icon={IconTrash} title="Удалить" danger onClick={() => onDelete(box.id)} />
                  </div>
                </td>
              </tr>
            )
          })}
          {boxes.length === 0 && (
            <tr>
              <td colSpan={6} className="empty-cell">Конфигураций нет — добавьте коробку</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

interface EditBoxProps {
  box: Box
  onSave: (b: Box) => void
  onClose: () => void
}

function EditBoxModal({ box, onSave, onClose }: EditBoxProps): ReactElement {
  const [name, setName] = useState(box.name)
  const [type, setType] = useState(box.type)
  const [w, setW] = useState(String(box.w))
  const [h, setH] = useState(String(box.h))
  const [d, setD] = useState(String(box.d))
  const [qty, setQty] = useState(String(box.qty))
  const [maxWeight, setMaxWeight] = useState(String(box.maxWeight))

  function save(): void {
    const qtyN = Math.max(0, Number(qty) || 0)
    onSave({
      ...box,
      name: name.trim() || box.name,
      type: type.trim() || box.type,
      w: Math.max(1, Number(w) || 1),
      h: Math.max(1, Number(h) || 1),
      d: Math.max(1, Number(d) || 1),
      qty: qtyN,
      maxWeight: Math.max(1, Number(maxWeight) || 1),
      status: deriveStatus(qtyN)
    })
    onClose()
  }

  return (
    <FormModal title={`Коробка ${box.type || box.id}`} sub="Редактирование конфигурации тары" onSave={save} onClose={onClose}>
      <div className="form-grid">
        <label className="form-field form-full">
          <span>Название</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="form-field form-full">
          <span>Тип (S, M, L, XL…)</span>
          <input type="text" maxLength={16} placeholder="M" value={type} onChange={(e) => setType(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Длина, мм</span>
          <input type="number" min="1" value={w} onChange={(e) => setW(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Ширина, мм</span>
          <input type="number" min="1" value={h} onChange={(e) => setH(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Высота, мм</span>
          <input type="number" min="1" value={d} onChange={(e) => setD(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Остаток, шт</span>
          <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Макс. вес, кг</span>
          <input type="number" min="1" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} />
        </label>
      </div>
    </FormModal>
  )
}

const BOX_ID_PALETTE = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL']

function AddBoxModal({ boxes, onSave, onClose }: { boxes: Box[]; onSave: (b: Box) => void; onClose: () => void }): ReactElement {
  const [id, setId] = useState(() => BOX_ID_PALETTE.find((x) => !boxes.some((b) => b.type === x)) ?? `B${boxes.length + 1}`)
  const [name, setName] = useState('')
  const [w, setW] = useState('')
  const [h, setH] = useState('')
  const [d, setD] = useState('')
  const [qty, setQty] = useState('0')
  const [maxWeight, setMaxWeight] = useState('')

  const idOk = id.trim() !== '' && !boxes.some((b) => b.type === id.trim())
  const numsOk = [w, h, d, maxWeight].every((x) => x.trim() !== '' && Number(x) > 0) && Number(qty) >= 0
  const saveDisabled = !idOk || !numsOk

  function save(): void {
    if (saveDisabled) return
    const qtyN = Number(qty)
    onSave({
      id,
      name: name.trim() || `Коробка ${id}`,
      type: id.trim(),
      w: Number(w),
      h: Number(h),
      d: Number(d),
      qty: qtyN,
      maxWeight: Number(maxWeight),
      status: deriveStatus(qtyN)
    })
    onClose()
  }

  return (
    <FormModal title="Новая коробка" sub="Добавление конфигурации тары" onSave={save} onClose={onClose} saveDisabled={saveDisabled}>
      <div className="form-grid">
        <label className="form-field">
          <span>Тип (S, M, L, XL…)</span>
          <input type="text" maxLength={16} value={id} onChange={(e) => setId(e.target.value)} className={!idOk ? 'invalid' : ''} />
        </label>
        <label className="form-field">
          <span>Название</span>
          <input type="text" placeholder="Коробка S" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Длина, мм</span>
          <input type="number" min="1" placeholder="200" value={w} onChange={(e) => setW(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Ширина, мм</span>
          <input type="number" min="1" placeholder="150" value={h} onChange={(e) => setH(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Высота, мм</span>
          <input type="number" min="1" placeholder="100" value={d} onChange={(e) => setD(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Остаток, шт</span>
          <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Макс. вес, кг</span>
          <input type="number" min="1" placeholder="5" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} />
        </label>
      </div>
    </FormModal>
  )
}

/* ===== Products ===== */

interface ProductsProps {
  products: Product[]
  total: number
  page: number
  onPageChange: (p: number) => void
  api: SelectionApi
  onEdit: (product: Product) => void
  onDelete: (sku: string) => void
  onView: (product: Product) => void
}

function SortTh({ label, k, sortKey, sortOrder, onClick }: {
  label: string
  k: SortKey
  sortKey: SortKey
  sortOrder: SortOrder
  onClick: (k: SortKey) => void
}): ReactElement {
  const active = sortKey === k
  return (
    <th>
      <button className="th-sort" onClick={() => onClick(k)}>
        {label}
        {active ? (sortOrder === 'asc' ? <IconArrowUp /> : <IconArrowDown />) : <IconArrowUpDown />}
      </button>
    </th>
  )
}

function ProductsTable({ products, total, page, onPageChange, api, onEdit, onDelete, onView }: ProductsProps): ReactElement {
  const { selection, toggle, confirm } = api
  const [query, setQuery] = useState('')
  const [dest, setDest] = useState('all')
  const [minW, setMinW] = useState('')
  const [maxW, setMaxW] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('sku')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const firstRender = useRef(true)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = products.filter((p) => {
      if (q && !p.sku.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) return false
      if (dest !== 'all' && p.destination !== dest) return false
      const min = minW.trim() === '' ? null : Number(minW)
      const max = maxW.trim() === '' ? null : Number(maxW)
      if (min !== null && p.weight < min) return false
      if (max !== null && p.weight > max) return false
      return true
    })
    const dir = sortOrder === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'sku': return a.sku.localeCompare(b.sku) * dir
        case 'name': return a.name.localeCompare(b.name, 'ru') * dir
        case 'volume': return (a.w * a.h * a.d - b.w * b.h * b.d) * dir
        case 'qty': return (a.qty - b.qty) * dir
        case 'weight': return (a.weight - b.weight) * dir
        case 'destination': return a.destination.localeCompare(b.destination, 'ru') * dir
      }
    })
  }, [products, query, dest, minW, maxW, sortKey, sortOrder])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    onPageChange(1)
  }, [query, dest, minW, maxW, sortKey, sortOrder])

  useEffect(() => {
    if (page > totalPages) onPageChange(totalPages)
  }, [page, totalPages])

  function setSort(k: SortKey): void {
    if (sortKey === k) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(k)
      setSortOrder('asc')
    }
  }

  function resetFilters(): void {
    setQuery('')
    setDest('all')
    setMinW('')
    setMaxW('')
  }

  function pageButtons(): (number | '…')[] {
    const pages: (number | '…')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }
    const first = 1
    const last = totalPages
    const window = [safePage - 1, safePage, safePage + 1].filter((p) => p >= first + 1 && p <= last - 1)
    const out: (number | '…')[] = [first]
    let prev = first
    for (const p of window) {
      if (p - prev > 1) out.push('…')
      out.push(p)
      prev = p
    }
    if (last - prev > 1) out.push('…')
    out.push(last)
    return out
  }

  return (
    <>
      <div className="panel-toolbar">
        <div className="search-box">
          <IconSearch />
          <input type="text" placeholder="Поиск по артикулу или названию" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className={`btn-filter${filtersOpen ? ' active' : ''}`} onClick={() => setFiltersOpen((v) => !v)}>
          <IconFilter />
          Фильтры
        </button>
      </div>

      {filtersOpen && (
        <div className="filter-row">
          <label className="filter-field">
            <span>Пункт назначения</span>
            <select value={dest} onChange={(e) => setDest(e.target.value)}>
              <option value="all">Все</option>
              {DESTINATIONS.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Вес от, г</span>
            <input type="number" min="0" placeholder="0" value={minW} onChange={(e) => setMinW(e.target.value)} />
          </label>
          <label className="filter-field">
            <span>Вес до, г</span>
            <input type="number" min="0" placeholder="∞" value={maxW} onChange={(e) => setMaxW(e.target.value)} />
          </label>
          <button className="btn-secondary btn-sm" onClick={resetFilters}>Сбросить</button>
        </div>
      )}

      <div className="table-scroll products-scroll">
        <table className="data-table products-table">
          <thead>
            <tr>
              <SortTh label="Артикул" k="sku" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Наименование" k="name" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Габариты Д×Ш×В" k="volume" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Кол-во" k="qty" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Вес" k="weight" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Пункт назначения" k="destination" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <th className="ta-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p) => {
              const checked = selection.some((x) => x.sku === p.sku)
              return (
                <tr key={p.sku} className={`row-click${checked ? ' row-sel' : ''}`} onClick={() => toggle(p)}>
                  <td className="cell-sku" title={p.sku}>{shortId(p.sku)}</td>
                  <td className="cell-name">{p.name}</td>
                  <td>{p.g}</td>
                  <td className="cell-qty">{p.qty}</td>
                  <td>{p.weight} г</td>
                  <td><span className="dest-badge">{p.destination}</span></td>
                  <td className="ta-right">
                    <div className="table-actions">
                      <TableAction icon={IconEye} title="Подробнее" onClick={() => onView(p)} />
                      <TableAction icon={IconEdit} title="Редактировать" onClick={() => onEdit(p)} />
                      <TableAction icon={IconTrash} title="Удалить" danger onClick={() => onDelete(p.sku)} />
                    </div>
                  </td>
                </tr>
              )
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-cell">Ничего не найдено — измените условия поиска</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span className="pg-info">
          Показано {pageRows.length} из {total} товаров · страница {safePage} из {totalPages}
        </span>
        <div className="pg-pages">
          <button className="pg-btn" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>‹</button>
          {pageButtons().map((p, i) =>
            p === '…' ? (
              <span className="pg-more" key={`m${i}`}>…</span>
            ) : (
              <button key={p} className={`pg-btn${p === safePage ? ' active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
            )
          )}
          <button className="pg-btn" disabled={safePage >= totalPages} onClick={() => onPageChange(safePage + 1)}>›</button>
        </div>
      </div>

      <div className="selection-bar">
        <span className="sel-count">
          Выбрано: <b>{selection.length}</b>
        </span>
        <button className="btn-primary btn-sm" disabled={selection.length === 0} onClick={confirm}>
          <IconCheck />
          Подтвердить
        </button>
      </div>
    </>
  )
}

interface EditProductProps {
  product: Product
  onSave: (p: Product) => void
  onClose: () => void
}

function EditProductModal({ product, onSave, onClose }: EditProductProps): ReactElement {
  const [name, setName] = useState(product.name)
  const [weight, setWeight] = useState(String(product.weight))
  const [w, setW] = useState(String(product.w))
  const [h, setH] = useState(String(product.h))
  const [d, setD] = useState(String(product.d))
  const [destination, setDestination] = useState(product.destination)

  function save(): void {
    const ww = Math.max(1, Number(w) || 1)
    const hh = Math.max(1, Number(h) || 1)
    const dd = Math.max(1, Number(d) || 1)
    onSave({
      ...product,
      name: name.trim() || product.name,
      weight: Math.max(0, Number(weight) || 0),
      w: ww,
      h: hh,
      d: dd,
      g: `${ww} × ${hh} × ${dd}`,
      destination
    })
    onClose()
  }

  return (
    <FormModal title={`Товар ${product.sku}`} sub="Редактирование карточки товара" onSave={save} onClose={onClose}>
      <div className="form-grid">
        <label className="form-field form-full">
          <span>Наименование</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Вес, г</span>
          <input type="number" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Пункт назначения</span>
          <select value={destination} onChange={(e) => setDestination(e.target.value)}>
            {DESTINATIONS.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Длина, мм</span>
          <input type="number" min="1" value={w} onChange={(e) => setW(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Ширина, мм</span>
          <input type="number" min="1" value={h} onChange={(e) => setH(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Высота, мм</span>
          <input type="number" min="1" value={d} onChange={(e) => setD(e.target.value)} />
        </label>
      </div>
    </FormModal>
  )
}

function AddProductModal({ products, onSave, onClose }: { products: Product[]; onSave: (p: Product) => void; onClose: () => void }): ReactElement {
  const sku = useMemo(() => {
    const max = products.reduce((m, p) => {
      const n = parseInt(p.sku.replace('SKU-', ''), 10)
      return Number.isFinite(n) ? Math.max(m, n) : m
    }, 0)
    return `SKU-${String(max + 1).padStart(3, '0')}`
  }, [products])

  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [w, setW] = useState('')
  const [h, setH] = useState('')
  const [d, setD] = useState('')
  const [destination, setDestination] = useState(DESTINATIONS[0])

  const saveDisabled = name.trim() === '' || weight.trim() === '' || [w, h, d].some((x) => x.trim() === '' || Number(x) <= 0)

  function save(): void {
    if (saveDisabled) return
    const ww = Number(w)
    const hh = Number(h)
    const dd = Number(d)
    onSave({
      sku,
      name: name.trim(),
      weight: Math.max(0, Number(weight)),
      w: ww,
      h: hh,
      d: dd,
      g: `${ww} × ${hh} × ${dd}`,
      qty: 1,
      destination
    })
    onClose()
  }

  return (
    <FormModal title="Новый товар" sub={`Артикул будет присвоен автоматически: ${sku}`} onSave={save} onClose={onClose} saveDisabled={saveDisabled}>
      <div className="form-grid">
        <label className="form-field form-full">
          <span>Наименование</span>
          <input type="text" placeholder="Например, Bluetooth-колонка" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Вес, г</span>
          <input type="number" min="0" placeholder="250" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Пункт назначения</span>
          <select value={destination} onChange={(e) => setDestination(e.target.value)}>
            {DESTINATIONS.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Длина, мм</span>
          <input type="number" min="1" placeholder="180" value={w} onChange={(e) => setW(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Ширина, мм</span>
          <input type="number" min="1" placeholder="120" value={h} onChange={(e) => setH(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Высота, мм</span>
          <input type="number" min="1" placeholder="80" value={d} onChange={(e) => setD(e.target.value)} />
        </label>
      </div>
    </FormModal>
  )
}

function ProductInfoModal({ product, onClose }: { product: Product; onClose: () => void }): ReactElement {
  const volume = product.w * product.h * product.d
  const yesNo = (v?: boolean): string => (v ? 'Да' : 'Нет')
  const joined = (v?: string[] | null): string => (v && v.length ? v.join(', ') : '')
  const fmtDate = (v?: string): string =>
    v ? new Date(v).toLocaleString('ru-RU') : ''
  const extra = (
    <>
      <div className="info-item">
        <span>Не кантовать</span>
        <b>{yesNo(product.mustStayUpright)}</b>
      </div>
      <div className="info-item">
        <span>Штабелируемый</span>
        <b>{yesNo(product.isStackable)}</b>
      </div>
      <div className="info-item">
        <span>Только на полу</span>
        <b>{yesNo(product.isFloorOnly)}</b>
      </div>
      <div className="info-item">
        <span>Макс. нагрузка сверху</span>
        <b>{product.maxTopLoad ? `${product.maxTopLoad} г` : '—'}</b>
      </div>
      <div className="info-item">
        <span>Мин. доля опоры</span>
        <b>{product.minSupportRatio ? `${product.minSupportRatio}` : '—'}</b>
      </div>
      <div className="info-item">
        <span>Теги</span>
        <b>{joined(product.tags) || '—'}</b>
      </div>
      <div className="info-item">
        <span>Несовместимо с тегами</span>
        <b>{joined(product.incompatibleTags) || '—'}</b>
      </div>
      <div className="info-item">
        <span>Допустимые повороты</span>
        <b>{joined(product.allowedRotations) || '—'}</b>
      </div>
      <div className="info-item">
        <span>Обновлён</span>
        <b>{fmtDate(product.updatedAt) || '—'}</b>
      </div>
    </>
  )
  return (
    <div className="modal-wrap">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal modal-form">
        <div className="modal-head">
          <div>
            <h3 className="modal-title">{product.name}</h3>
            <p className="pack-sub">{product.sku}</p>
          </div>
          <button type="button" className="icon-btn modal-close" title="Закрыть" onClick={onClose}>
            <IconX />
          </button>
        </div>
        <div className="info-grid">
          <div className="info-item">
            <span>Артикул</span>
            <b>{product.sku}</b>
          </div>
          <div className="info-item">
            <span>Наименование</span>
            <b>{product.name}</b>
          </div>
          <div className="info-item">
            <span>Кол-во на складе</span>
            <b>{product.qty} шт</b>
          </div>
          <div className="info-item">
            <span>Вес</span>
            <b>{product.weight} г</b>
          </div>
          <div className="info-item">
            <span>Габариты (Д × Ш × В)</span>
            <b>{product.w} × {product.h} × {product.d} мм</b>
          </div>
          <div className="info-item">
            <span>Объём</span>
            <b>{(volume / 1_000_000).toFixed(3)} м³</b>
          </div>
          <div className="info-item">
            <span>Пункт назначения</span>
            <b>{product.destination}</b>
          </div>
          {extra}
        </div>
        <div className="pack-foot">
          <button type="button" className="btn-primary btn-sm" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ api }: Props): ReactElement {
  const [boxes, setBoxes] = useState<Box[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productTotal, setProductTotal] = useState(0)
  const [productPage, setProductPage] = useState(1)
  const [productLoading, setProductLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editBox, setEditBox] = useState<Box | null>(null)
  const [addBoxOpen, setAddBoxOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [viewProduct, setViewProduct] = useState<Product | null>(null)

  const loadBoxes = useCallback(async () => {
    const page = await boxesApi.list({ page: 1, limit: 100 })
    setBoxes(page.items.map(toUiBox))
  }, [])

  const firstProductLoad = useRef(true)

  const loadProductPage = useCallback(async (p: number) => {
    if (firstProductLoad.current) {
      firstProductLoad.current = false
      setProductLoading(true)
    }
    try {
      const res = await productsApi.list({ page: p, limit: PAGE_SIZE })
      setProducts(res.items.map(toUiProduct))
      setProductTotal(res.total)
      setProductPage(res.page)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить товары')
    } finally {
      setProductLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError('')
      try {
        await loadBoxes()
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Не удалось загрузить данные')
      } finally {
        setLoading(false)
      }
    })()
  }, [loadBoxes])

  useEffect(() => {
    void loadProductPage(1)
  }, [loadProductPage])

  async function deleteBox(id: string): Promise<void> {
    try {
      await boxesApi.remove(id)
      await loadBoxes()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить коробку')
    }
  }

  async function deleteProduct(sku: string): Promise<void> {
    try {
      await productsApi.remove(sku)
      api.deselect(sku)
      await loadProductPage(productPage)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить товар')
    }
  }

  return (
    <div className="content">
      {error && <div className="toast">{error}</div>}

      <section className="panel left-panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Конфигурации коробок</h2>
            <p className="panel-sub">Типы упаковки и остатки на складе</p>
          </div>
          <button className="btn-primary btn-sm" onClick={() => setAddBoxOpen(true)}>
            <IconPlus />
            Добавить коробки
          </button>
        </div>
        {loading ? (
          <div className="route-loading">Загрузка…</div>
        ) : (
          <BoxesTable boxes={boxes} onEdit={setEditBox} onDelete={(id) => void deleteBox(id)} />
        )}
      </section>

      <section className="panel right-panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Товары на складе</h2>
            <p className="panel-sub">Отметьте товары — система подберёт тару</p>
          </div>
          <button className="btn-primary btn-sm" onClick={() => setAddProductOpen(true)}>
            <IconPlus />
            Добавить товар
          </button>
        </div>
        {productLoading ? (
          <div className="route-loading">Загрузка…</div>
        ) : (
          <ProductsTable
            products={products}
            total={productTotal}
            page={productPage}
            onPageChange={(p) => void loadProductPage(p)}
            api={api}
            onEdit={setEditProduct}
            onDelete={(sku) => void deleteProduct(sku)}
            onView={setViewProduct}
          />
        )}
      </section>

      {editBox && (
        <EditBoxModal
          box={editBox}
          onClose={() => setEditBox(null)}
          onSave={(b) => {
            void (async () => {
              try {
                await boxesApi.update(b.id, {
                  name: b.name,
                  type: b.type,
                  width: b.w,
                  height: b.h,
                  depth: b.d,
                  max_weight: b.maxWeight,
                  available_count: b.qty,
                })
                await loadBoxes()
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Не удалось сохранить коробку')
              }
            })()
          }}
        />
      )}
      {addBoxOpen && (
        <AddBoxModal
          boxes={boxes}
          onClose={() => setAddBoxOpen(false)}
          onSave={(b) => {
            void (async () => {
              try {
                await boxesApi.create(toBoxPayload(b))
                await loadBoxes()
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Не удалось создать коробку')
              }
            })()
          }}
        />
      )}
      {viewProduct && (
        <ProductInfoModal product={viewProduct} onClose={() => setViewProduct(null)} />
      )}
      {editProduct && (
        <EditProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSave={(p) => {
            void (async () => {
              try {
                await productsApi.update(p.sku, {
                  name: p.name,
                  destination: p.destination,
                  x: p.w,
                  y: p.h,
                  z: p.d,
                  weight: p.weight,
                })
                await loadProductPage(productPage)
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Не удалось сохранить товар')
              }
            })()
          }}
        />
      )}
      {addProductOpen && (
        <AddProductModal
          products={products}
          onClose={() => setAddProductOpen(false)}
          onSave={(p) => {
            void (async () => {
              try {
                await productsApi.create(toProductPayload(p))
                await loadProductPage(productPage)
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Не удалось создать товар')
              }
            })()
          }}
        />
      )}
    </div>
  )
}
