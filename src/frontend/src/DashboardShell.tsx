import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { NavId, PackTask, Product } from './data.js'
import { NAV_ITEMS, PRODUCTS, pickBox } from './data.js'
import { IconMenu, IconLogout, NavIcon } from './icons.jsx'
import PackingModal from './PackingModal.jsx'

export interface ShellApi {
  selection: Product[]
  toggle: (p: Product) => void
  deselect: (sku: string) => void
  setSelectionAll: (on: boolean) => void
  confirm: () => void
}

interface Props {
  activeNav: NavId
  onNav: (id: NavId) => void
  onLogout: () => void
  render: (api: ShellApi) => ReactNode
}

export default function DashboardShell({ activeNav, onNav, onLogout, render }: Props): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selection, setSelection] = useState<Product[]>([])
  const [pending, setPending] = useState<PackTask[] | null>(null)
  const [task, setTask] = useState<PackTask[] | null>(null)

  function go(id: NavId): void {
    setMenuOpen(false)
    onNav(id)
  }

  function toggle(p: Product): void {
    setSelection((cur) =>
      cur.some((x) => x.sku === p.sku) ? cur.filter((x) => x.sku !== p.sku) : [...cur, p]
    )
  }

  function deselect(sku: string): void {
    setSelection((cur) => cur.filter((x) => x.sku !== sku))
  }

  function setSelectionAll(on: boolean): void {
    setSelection(on ? [...PRODUCTS] : [])
  }

  function confirm(): void {
    if (selection.length === 0) return
    setPending(selection.map((p) => ({ product: p, box: pickBox(p) })))
  }

  function start(): void {
    if (!pending) return
    setTask(pending)
    setPending(null)
    setSelection([])
  }

  const api: ShellApi = { selection, toggle, deselect, setSelectionAll, confirm }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-btn burger-btn" title="Меню" onClick={() => setMenuOpen((v) => !v)}>
            <IconMenu />
          </button>
          <div className="topbar-title">Упаковка заказов</div>
        </div>
        <div className="topbar-right">
          {task && (
            <div className="quick-metric" title={task.map((t) => `${t.product.sku} → ${t.box.id}`).join('\n')}>
              <span className="qm-num">{task.length}</span>
              <span className="qm-label">{task.length === 1 ? 'товар в<br />упаковке' : 'товара в<br />упаковке'}</span>
            </div>
          )}
          <div className="user-chip">
            <div className="avatar">КЛ</div>
            <div className="user-meta">
              <span className="user-name">Иван К.</span>
              <span className="user-role">Упаковщик</span>
            </div>
          </div>
          <button className="icon-btn logout-btn" title="Выйти" onClick={onLogout}>
            <IconLogout />
          </button>
        </div>
      </header>

      <div className="dash-body">
        <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
          <nav className="side-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`side-item${activeNav === item.id ? ' active' : ''}`}
                onClick={() => go(item.id)}
              >
                <NavIcon id={item.id} />
                <span className="side-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="dash-main">{render(api)}</div>
      </div>

      {pending && (
        <PackingModal
          tasks={pending}
          onStart={start}
          onBack={() => setPending(null)}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  )
}