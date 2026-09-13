import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { NavId } from '../data/mock.js'
import { NAV_ITEMS } from '../data/mock.js'
import { IconMenu, IconLogout, IconBox, NavIcon } from '../components/ui/icons.jsx'
import { useAuth } from '../context/AuthContext'
import ThemeSwitcher from '../components/layout/ThemeSwitcher'

interface Props {
  activeNav?: NavId
  children: ReactNode
}

/**
 * Authenticated app chrome: topbar + sidebar + routed content.
 * Sidebar items map to routes where they exist; the rest stay on /dashboard.
 */
export default function DefaultLayout({ activeNav = 'boxes', children }: Props): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const displayName = user?.name ?? 'Пользователь'
  const roleLabel = user?.role === 'admin' ? 'Администратор' : 'Упаковщик'
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleLogout(): Promise<void> {
    await logout()
    navigate('/auth', { replace: true })
  }

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-btn burger-btn" title="Меню" onClick={() => setMenuOpen((v) => !v)}>
            <IconMenu />
          </button>
          <div className="topbar-title"><IconBox />Упаковка заказов</div>
        </div>
        <div className="topbar-right">
          <NavLink to="/profile" className="user-chip" title="Профиль">
            <div className="avatar">{initials || 'U'}</div>
            <div className="user-meta">
              <span className="user-name">{displayName}</span>
              <span className="user-role">{roleLabel}</span>
            </div>
          </NavLink>
          <button className="icon-btn logout-btn" title="Выйти" onClick={() => void handleLogout()}>
            <IconLogout />
          </button>
        </div>
      </header>

      <div className="dash-body">
        <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
          <nav className="side-nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.id}
                to={item.id === 'admin' ? '/admin' : '/dashboard'}
                className={() =>
                  `side-item${activeNav === item.id ? ' active' : ''}`
                }
                onClick={() => setMenuOpen(false)}
              >
                <NavIcon id={item.id} />
                <span className="side-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="dash-main">{children}</div>
      </div>

      <ThemeSwitcher />
    </div>
  )
}
