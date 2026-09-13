import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { IconComp } from '../components/ui/icons.jsx'
import { DESTINATIONS } from '../data/mock.js'
import type { Product } from '../data/mock.js'
import {
  IconEdit, IconTrash, IconSearch, IconFilter, IconPlus, IconCheck, IconX, IconEye, IconBox,
  IconArrowUp, IconArrowDown, IconArrowUpDown
} from '../components/ui/icons.jsx'
import { productsApi } from '../api/products'
import { ApiError } from '../api/client'
import {
  toProductPayload,
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

type SortKey = 'name' | 'volume' | 'qty' | 'weight' | 'destination'
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

/* ===== Products ===== */

interface ProductsProps {
  products: Product[]
  total: number
  page: number
  loadingMore: boolean
  onPageChange: (p: number, append?: boolean) => void
  api: SelectionApi
  onEdit: (product: Product) => void
  onDelete: (sku: string) => void
  onView: (product: Product) => void
}

function SortTh({ label, k, sortKey, sortOrder, onClick }: {
  label: string
  k: SortKey
  sortKey: SortKey | null
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

function ProductsTable({ products, total, page, loadingMore, onPageChange, api, onEdit, onDelete, onView }: ProductsProps): ReactElement {
  const { selection, toggle, clear, selectAll, confirm } = api
  const [query, setQuery] = useState('')
  const [dest, setDest] = useState('all')
  const [minW, setMinW] = useState('')
  const [maxW, setMaxW] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

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
    if (!sortKey) return list
    const dir = sortOrder === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name, 'ru') * dir
        case 'volume': return (a.w * a.h * a.d - b.w * b.h * b.d) * dir
        case 'qty': return (a.qty - b.qty) * dir
        case 'weight': return (a.weight - b.weight) * dir
        case 'destination': return a.destination.localeCompare(b.destination, 'ru') * dir
      }
    })
  }, [products, query, dest, minW, maxW, sortKey, sortOrder])

  const pageRows = filtered
  const allVisibleSelected =
    pageRows.length > 0 && pageRows.every((p) => selection.some((x) => x.sku === p.sku))
  const someVisibleSelected = !allVisibleSelected && pageRows.some((p) => selection.some((x) => x.sku === p.sku))
  const selectAllRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someVisibleSelected
  }, [someVisibleSelected])

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
              <th className="sel-col">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="sel-all"
                  aria-label="Выбрать все отфильтрованные"
                  checked={allVisibleSelected}
                  onChange={() => (allVisibleSelected || someVisibleSelected ? clear() : selectAll(pageRows))}
                />
              </th>
              <SortTh label="Наименование" k="name" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Габариты Д×Ш×В" k="volume" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Кол-во" k="qty" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <SortTh label="Вес" k="weight" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <th>Штабелируемый</th>
              <SortTh label="Пункт назначения" k="destination" sortKey={sortKey} sortOrder={sortOrder} onClick={setSort} />
              <th className="ta-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p, index) => {
              const checked = selection.some((x) => x.sku === p.sku)
              return (
                <tr
                  key={p.sku}
                  className={`row-click row-enter${checked ? ' row-sel' : ''}`}
                  style={{ animationDelay: `${Math.min(index * 30, 450)}ms` }}
                  onClick={() => toggle(p)}
                >
                  <td
                    className="sel-col"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(p);
                    }}
                  >
                    <input type="checkbox" className="sel-all" checked={checked} readOnly />
                  </td>
                  <td className="cell-name">{p.name}</td>
                  <td>{p.g}</td>
                  <td className="cell-qty">{p.qty}</td>
                  <td>{p.weight} г</td>
                  <td>
                    {p.isStackable === undefined ? (
                      '—'
                    ) : (
                      <span className={`stackable-badge${p.isStackable ? ' yes' : ''}`}>
                        {p.isStackable ? 'Да' : 'Нет'}
                      </span>
                    )}
                  </td>
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
                <td colSpan={8} className="empty-cell">Ничего не найдено — измените условия поиска</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        {products.length < total && (
          <button className="btn-secondary btn-sm" disabled={loadingMore} onClick={() => onPageChange(page + 1, true)}>
            {loadingMore ? 'Загрузка…' : 'Показать больше'}
          </button>
        )}
      </div>

      <div className="selection-bar">
        <span className="sel-count">
          Выбрано: <b>{selection.length}</b>
        </span>
        <button className="btn-primary btn-sm" disabled={selection.length === 0} onClick={confirm}>
          <IconBox />
          Упаковать
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
  const [products, setProducts] = useState<Product[]>([])
  const [productTotal, setProductTotal] = useState(0)
  const [productPage, setProductPage] = useState(1)
  const [productLoading, setProductLoading] = useState(true)
  const [error, setError] = useState('')
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [viewProduct, setViewProduct] = useState<Product | null>(null)

  const firstProductLoad = useRef(true)

  const loadProductPage = useCallback(async (p: number, append = false) => {
    if (firstProductLoad.current) {
      firstProductLoad.current = false
      setProductLoading(true)
    }
    try {
      const res = await productsApi.list({ page: p, limit: PAGE_SIZE })
      const items = res.items.map(toUiProduct)
      setProducts((cur) => {
        if (!append) return items
        const have = new Set(cur.map((x) => x.sku))
        return [...cur, ...items.filter((x) => !have.has(x.sku))]
      })
      setProductTotal(res.total)
      setProductPage(res.page)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить товары')
    } finally {
      setProductLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProductPage(1)
  }, [loadProductPage])

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
    <div className="content content-single">
      {error && <div className="toast">{error}</div>}

      <section className="panel">
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
            loadingMore={productLoading}
            onPageChange={(p, append) => void loadProductPage(p, append)}
            api={api}
            onEdit={setEditProduct}
            onDelete={(sku) => void deleteProduct(sku)}
            onView={setViewProduct}
          />
        )}
      </section>

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
