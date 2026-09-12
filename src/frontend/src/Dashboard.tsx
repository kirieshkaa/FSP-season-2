import { useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import type { IconComp } from './icons.jsx'
import { BOXES, DESTINATIONS, PRODUCTS, STATUS, deriveStatus } from './data.js'
import type { Box, Product } from './data.js'
import {
  IconEdit, IconTrash, IconSearch, IconFilter, IconPlus, IconCheck, IconX,
  IconArrowUp, IconArrowDown, IconArrowUpDown
} from './icons.jsx'
import type { ShellApi } from './DashboardShell.jsx'

interface Props {
  api: ShellApi
}

const PAGE_SIZE = 6

type SortKey = 'sku' | 'name' | 'volume' | 'weight' | 'destination'
type SortOrder = 'asc' | 'desc'

function TableAction({ icon: I, title, danger, onClick }: { icon: IconComp; title: string; danger?: boolean; onClick?: () => void }): ReactElement {
  return (
    <button className={`table-action${danger ? ' danger' : ''}`} title={title} onClick={onClick}>
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
                  <span className={`box-tag box-${box.id.toLowerCase()}`}>{box.id}</span>
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
    <FormModal title={`Коробка ${box.id}`} sub="Редактирование конфигурации тары" onSave={save} onClose={onClose}>
      <div className="form-grid">
        <label className="form-field form-full">
          <span>Название</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
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
  const [id, setId] = useState(() => BOX_ID_PALETTE.find((x) => !boxes.some((b) => b.id === x)) ?? `B${boxes.length + 1}`)
  const [name, setName] = useState('')
  const [w, setW] = useState('')
  const [h, setH] = useState('')
  const [d, setD] = useState('')
  const [qty, setQty] = useState('0')
  const [maxWeight, setMaxWeight] = useState('')

  const idOk = id.trim() !== '' && !boxes.some((b) => b.id === id)
  const numsOk = [w, h, d, maxWeight].every((x) => x.trim() !== '' && Number(x) > 0) && Number(qty) >= 0
  const saveDisabled = !idOk || !numsOk

  function save(): void {
    if (saveDisabled) return
    const qtyN = Number(qty)
    onSave({
      id,
      name: name.trim() || `Коробка ${id}`,
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
          <span>Код</span>
          <input type="text" value={id} onChange={(e) => setId(e.target.value)} className={!idOk ? 'invalid' : ''} />
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
  api: ShellApi
  onEdit: (product: Product) => void
  onDelete: (sku: string) => void
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

function ProductsTable({ products, api, onEdit, onDelete }: ProductsProps): ReactElement {
  const { selection, toggle, confirm } = api
  const [query, setQuery] = useState('')
  const [dest, setDest] = useState('all')
  const [minW, setMinW] = useState('')
  const [maxW, setMaxW] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('sku')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [page, setPage] = useState(1)

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
        case 'weight': return (a.weight - b.weight) * dir
        case 'destination': return a.destination.localeCompare(b.destination, 'ru') * dir
      }
    })
  }, [products, query, dest, minW, maxW, sortKey, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [query, dest, minW, maxW, sortKey, sortOrder])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const allSelected = products.length > 0 && selection.length === products.length

  function setAll(on: boolean): void {
    if (on) {
      products.forEach((p) => {
        if (!selection.some((x) => x.sku === p.sku)) toggle(p)
      })
    } else {
      selection.forEach((p) => toggle(p))
    }
  }

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
              <th className="th-check">
                <input
                  type="checkbox"
                  className="row-check"
                  title="Выбрать все"
                  checked={allSelected}
                  onChange={(e) => setAll(e.target.checked)}
                />
              </th>
              <SortTh label="Артикул" k="sku" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Наименование" k="name" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Габариты Д×Ш×В" k="volume" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Вес" k="weight" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Пункт назначения" k="destination" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <th className="ta-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p) => {
              const checked = selection.some((x) => x.sku === p.sku)
              return (
                <tr key={p.sku} className={checked ? 'row-sel' : ''}>
                  <td className="td-check">
                    <input
                      type="checkbox"
                      className="row-check"
                      checked={checked}
                      onChange={() => toggle(p)}
                    />
                  </td>
                  <td className="cell-sku">{p.sku}</td>
                  <td className="cell-name">{p.name}</td>
                  <td>{p.g}</td>
                  <td>{p.weight} г</td>
                  <td><span className="dest-badge">{p.destination}</span></td>
                  <td className="ta-right">
                    <div className="table-actions">
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
          Показано {pageRows.length} из {filtered.length} товаров · всего {products.length}
        </span>
        <div className="pg-pages">
          <button className="pg-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</button>
          {pageButtons().map((p, i) =>
            p === '…' ? (
              <span className="pg-more" key={`m${i}`}>…</span>
            ) : (
              <button key={p} className={`pg-btn${p === safePage ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            )
          )}
          <button className="pg-btn" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>›</button>
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

/* ===== Page ===== */

export default function Dashboard({ api }: Props): ReactElement {
  const [boxes, setBoxes] = useState<Box[]>(() => [...BOXES])
  const [products, setProducts] = useState<Product[]>(() => [...PRODUCTS])
  const [editBox, setEditBox] = useState<Box | null>(null)
  const [addBoxOpen, setAddBoxOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [addProductOpen, setAddProductOpen] = useState(false)

  function deleteBox(id: string): void {
    setBoxes((cur) => cur.filter((x) => x.id !== id))
  }

  function deleteProduct(sku: string): void {
    setProducts((cur) => cur.filter((x) => x.sku !== sku))
    api.deselect(sku)
  }

  return (
    <div className="content">
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
        <BoxesTable boxes={boxes} onEdit={setEditBox} onDelete={deleteBox} />
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
        <ProductsTable products={products} api={api} onEdit={setEditProduct} onDelete={deleteProduct} />
      </section>

      {editBox && (
        <EditBoxModal box={editBox} onClose={() => setEditBox(null)} onSave={(b) => {
          setBoxes((cur) => cur.map((x) => (x.id === b.id ? b : x)))
        }} />
      )}
      {addBoxOpen && (
        <AddBoxModal boxes={boxes} onClose={() => setAddBoxOpen(false)} onSave={(b) => {
          setBoxes((cur) => [...cur, b])
        }} />
      )}
      {editProduct && (
        <EditProductModal product={editProduct} onClose={() => setEditProduct(null)} onSave={(p) => {
          setProducts((cur) => cur.map((x) => (x.sku === p.sku ? p : x)))
        }} />
      )}
      {addProductOpen && (
        <AddProductModal products={products} onClose={() => setAddProductOpen(false)} onSave={(p) => {
          setProducts((cur) => [...cur, p])
        }} />
      )}
    </div>
  )
}