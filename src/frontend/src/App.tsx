import { useEffect, useRef, useState } from 'react'
import type { ThemeKey } from './themes.js'
import { THEMES, THEME_KEYS, STORAGE_KEY, getInitialTheme } from './themes.js'
import type { NavId } from './data.js'
import LoginCard from './LoginCard.jsx'
import ThemeSwitcher from './ThemeSwitcher.jsx'
import DashboardShell from './DashboardShell.jsx'
import Dashboard from './Dashboard.jsx'
import AdminPanel from './AdminPanel.jsx'

type View = 'login' | 'app' | 'admin'

const ADMIN_EMAIL = 'admin@ozon.ru'

export default function App() {
  const [theme, setTheme] = useState<ThemeKey>(getInitialTheme)
  const [view, setView] = useState<View>('login')
  const [activeNav, setActiveNav] = useState<NavId>('boxes')
  const appliedRef = useRef<ThemeKey>(getInitialTheme())
  const busyRef = useRef(false)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const bgARef = useRef<HTMLDivElement | null>(null)
  const bgBRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLDivElement | null>(null)
  const idleRef = useRef<HTMLDivElement | null>(null)

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

    const withCard = view === 'login'
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

  function handleLogin(email: string): void {
    setView(email.trim().toLowerCase() === ADMIN_EMAIL ? 'admin' : 'app')
  }

  function handleNav(id: NavId): void {
    if (id === 'admin') {
      setView('admin')
      return
    }
    setView('app')
    setActiveNav(id)
  }

  return (
    <>
      <div className="bg-layer" ref={bgARef} />
      <div className="bg-layer" ref={bgBRef} />

      {view === 'login' ? (
        <main className="auth">
          <div className="auth-card" ref={cardRef}>
            <LoginCard onSuccess={handleLogin} />
          </div>
        </main>
      ) : view === 'admin' ? (
        <AdminPanel onNav={handleNav} onLogout={() => setView('login')} />
      ) : (
        <DashboardShell
          activeNav={activeNav}
          onNav={handleNav}
          onLogout={() => setView('login')}
          render={(api) => <Dashboard api={api} />}
        />
      )}

      <ThemeSwitcher current={theme} onChange={changeTheme} />
    </>
  )
}