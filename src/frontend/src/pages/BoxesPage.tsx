import { useCallback, useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import type { IconComp } from '../components/ui/icons.jsx'
import { STATUS, deriveStatus } from '../data/mock.js'
import type { Box } from '../data/mock.js'
import {
  IconEdit, IconTrash, IconPlus, IconX,
} from '../components/ui/icons.jsx'
import { boxesApi } from '../api/boxes'
import { ApiError } from '../api/client'
import {
  toBoxPayload,
  shortId,
  toUiBox,
} from '../data/adapters'

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

export default function BoxesPage(): ReactElement {
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editBox, setEditBox] = useState<Box | null>(null)
  const [addBoxOpen, setAddBoxOpen] = useState(false)

  const loadBoxes = useCallback(async () => {
    const page = await boxesApi.list({ page: 1, limit: 100 })
    setBoxes(page.items.map(toUiBox))
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

  async function deleteBox(id: string): Promise<void> {
    try {
      await boxesApi.remove(id)
      await loadBoxes()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить коробку')
    }
  }

  return (
    <div className="content content-single">
      {error && <div className="toast">{error}</div>}

      <section className="panel">
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
                  max_weight: b.maxWeight * 1000,
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
    </div>
  )
}