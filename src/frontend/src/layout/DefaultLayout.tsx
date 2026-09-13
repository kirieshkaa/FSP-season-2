import type { ReactElement, ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { NavId } from '../data/mock.js'
import { NAV_ITEMS } from '../data/mock.js'
import { IconLogout, IconBox, NavIcon } from '../components/ui/icons.jsx'
import { useAuth } from '../context/AuthContext'
import ThemeSwitcher from '../components/layout/ThemeSwitcher'

interface Props {
  children: ReactNode
}

const HEADER_NAV: { id: NavId; to: string }[] = [
  { id: 'boxes', to: '/boxes' },
  { id: 'products', to: '/products' },
  { id: 'admin', to: '/admin' },
]

/**
 * Authenticated app chrome: header with inline nav, avatar profile entry, content.
 */
export default function DefaultLayout({ children }: Props): ReactElement {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const displayName = user?.name ?? 'Пользователь'
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleLogout(): Promise<void> {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title"><IconBox />Упаковка заказов</div>
        </div>
        <nav className="header-nav" aria-label="Разделы">
          {HEADER_NAV.map((item) => {
            const label = NAV_ITEMS.find((n) => n.id === item.id)?.label ?? item.id
            return (
              <NavLink
                key={item.id}
                to={item.to}
                className={({ isActive }) => `header-nav-link${isActive ? ' active' : ''}`}
              >
                <NavIcon id={item.id} />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="topbar-right">
          <NavLink to="/profile" className="user-chip" title="Профиль">
            <div className="avatar">{initials || 'U'}</div>
          </NavLink>
          <button className="icon-btn logout-btn" title="Выйти" onClick={() => void handleLogout()}>
            <IconLogout />
          </button>
        </div>
      </header>

      <div className="dash-body">
        <div className="dash-main">{children}</div>
      </div>

      <ThemeSwitcher />
    </div>
  )
}