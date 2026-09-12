import { useEffect, useRef, useState } from 'react'
import type { ThemeKey } from './themes.js'
import { THEMES, THEME_KEYS, STORAGE_KEY, getInitialTheme } from './themes.js'
import type { NavId } from './data.js'
import LoginCard from './LoginCard.jsx'
import ThemeSwitcher from './ThemeSwitcher.jsx'
import DashboardShell from './DashboardShell.jsx'
import Dashboard from './Dashboard.jsx'
import AdminPanel from './AdminPanel.jsx'
import PackingPage from './PackingPage'

type Route = 'auth' | 'dashboard' | 'packing'
type DashboardView = 'worker' | 'admin'

const ADMIN_EMAIL = 'admin@ozon.ru'
const ROUTES: Record<Route, string> = {
  auth: '/auth',
  dashboard: '/dashboard',
  packing: '/packing'
}

function getRouteFromPath(pathname: string): Route {
  if (pathname === ROUTES.dashboard) return 'dashboard'
  if (pathname === ROUTES.packing) return 'packing'
  return 'auth'
}

export default function App() {
  const [theme, setTheme] = useState<ThemeKey>(getInitialTheme)
  const [route, setRoute] = useState<Route>(() => getRouteFromPath(window.location.pathname))
  const [dashboardView, setDashboardView] = useState<DashboardView>('worker')
  const [activeNav, setActiveNav] = useState<NavId>('boxes')
  const appliedRef = useRef<ThemeKey>(getInitialTheme())
  const busyRef = useRef(false)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const bgARef = useRef<HTMLDivElement | null>(null)
  const bgBRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLDivElement | null>(null)
  const idleRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const normalizedRoute = getRouteFromPath(window.location.pathname)
    const normalizedPath = ROUTES[normalizedRoute]
    if (window.location.pathname !== normalizedPath) {
      window.history.replaceState(null, '', normalizedPath)
    }

    function handlePopState(): void {
      setRoute(getRouteFromPath(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    const t = THEMES[theme]
    document.body.classList.remove(...THEME_KEYS.map((k) => THEMES[k].cls))
    document.body.classList.add(t.cls)
    document.body.style.setProperty('--gradient-bg', t.gradient)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch (e) { /* ignore */ }
  }, [theme])

  useEffect(() => {
    const a = bgARef.current
    const b = bgBRef.current
    if (!a || !b) return
    const base = THEMES[getInitialTheme()].gradient
    a.style.background = base
    b.style.background = base
    a.style.opacity = '1'
    b.style.opacity = '0'
    activeRef.current = a
    idleRef.current = b
    return () => {
      if (anime) {
        anime.remove(a)
        anime.remove(b)
      }
    }
  }, [])

  function changeTheme(name: ThemeKey): void {
    if (!THEMES[name]) return
    if (name === appliedRef.current || busyRef.current) return

    const withCard = route === 'auth'
    if (!anime) {
      appliedRef.current = name
      setTheme(name)
      return
    }

    const card = cardRef.current
    const active = activeRef.current
    const idle = idleRef.current
    if (!active || !idle) return
    if (withCard && !card) return

    busyRef.current = true
    const target = name
    const cardOut = withCard ? 320 : 0

    idle.style.background = THEMES[target].gradient
    idle.style.opacity = '0'

    const tl = anime.timeline({ easing: 'easeInQuad' })
    if (withCard) {
      tl.add({
        targets: card,
        translateX: ['0%', '-100%'],
        opacity: [1, 0],
        rotate: [0, -3],
        duration: 320
      })
    }
    tl.add({
      targets: idle,
      opacity: [0, 1],
      easing: 'linear',
      duration: 600,
      begin: () => {
        appliedRef.current = target
        setTheme(target)
      }
    }, cardOut)
    if (withCard) {
      tl.add({
        targets: card,
        translateX: ['100%', '0%'],
        opacity: [0, 1],
        rotate: [-3, 0],
        easing: 'easeOutQuart',
        duration: 340
      }, cardOut)
    }

    tl.finished.then(() => {
      active.style.background = THEMES[target].gradient
      active.style.opacity = '1'
      idle.style.opacity = '0'
      activeRef.current = idle
      idleRef.current = active
      busyRef.current = false
    })
  }

  function navigate(nextRoute: Route): void {
    const nextPath = ROUTES[nextRoute]
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath)
    }
    setRoute(nextRoute)
  }

  function handleLogin(email: string): void {
    setDashboardView(email.trim().toLowerCase() === ADMIN_EMAIL ? 'admin' : 'worker')
    navigate('dashboard')
  }

  function handleNav(id: NavId): void {
    if (id === 'admin') {
      setDashboardView('admin')
      navigate('dashboard')
      return
    }
    setDashboardView('worker')
    setActiveNav(id)
    navigate('dashboard')
  }

  function handleStartPacking(): void {
    navigate('packing')
  }

  function handleLogout(): void {
    setDashboardView('worker')
    navigate('auth')
  }

  return (
    <>
      <div className="bg-layer" ref={bgARef} />
      <div className="bg-layer" ref={bgBRef} />

      {route === 'auth' ? (
        <main className="auth">
          <div className="auth-card" ref={cardRef}>
            <LoginCard onSuccess={handleLogin} />
          </div>
        </main>
      ) : route === 'packing' ? (
        <PackingPage />
      ) : dashboardView === 'admin' ? (
        <AdminPanel onNav={handleNav} onLogout={handleLogout} />
      ) : (
        <DashboardShell
          activeNav={activeNav}
          onNav={handleNav}
          onLogout={handleLogout}
          onStartPacking={handleStartPacking}
          render={(api) => <Dashboard api={api} />}
        />
      )}

      <ThemeSwitcher current={theme} onChange={changeTheme} />
    </>
  )
}
