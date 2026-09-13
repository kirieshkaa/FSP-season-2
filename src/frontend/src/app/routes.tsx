import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { animate } from 'animejs'
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
  useLocation,
  useNavigate,
  useOutlet,
} from 'react-router-dom'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Dashboard, { type SelectionApi } from '../pages/Dashboard'
import AdminPanel from '../pages/AdminPanel'
import PackingPage from '../pages/PackingPage'
import Profile from '../pages/Profile'
import DefaultLayout from '../layout/DefaultLayout'
import ThemeSwitcher from '../components/layout/ThemeSwitcher'
import { useAuth } from '../context/AuthContext'
import type { Product } from '../data/mock'

function DashboardPage(): ReactElement {
  const [selection, setSelection] = useState<Product[]>([])
  const navigate = useNavigate()

  const api = useMemo<SelectionApi>(
    () => ({
      selection,
      toggle: (p: Product) =>
        setSelection((cur) =>
          cur.some((x) => x.sku === p.sku) ? cur.filter((x) => x.sku !== p.sku) : [...cur, p],
        ),
      deselect: (sku: string) => setSelection((cur) => cur.filter((x) => x.sku !== sku)),
      selectAll: (products: Product[]) =>
        setSelection((cur) => {
          const have = new Set(cur.map((x) => x.sku))
          const merged = [...cur]
          for (const p of products) {
            if (!have.has(p.sku)) {
              merged.push(p)
              have.add(p.sku)
            }
          }
          return merged
        }),
      clear: () => setSelection([]),
      confirm: () => {
        // localStorage (не sessionStorage): переживает F5 на странице упаковки
        const skus = selection.map((p) => p.sku)
        if (skus.length) localStorage.setItem('pack-selection', JSON.stringify(skus))
        else localStorage.removeItem('pack-selection')
        navigate('/packing')
      },
    }),
    [selection, navigate],
  )

  return <Dashboard api={api} />
}

function AuthLayout(): ReactElement {
  const cardRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    // Страница въезжает со своей стороны: /auth — слева, /register — справа.
    const fromLeft = location.pathname.split('/')[1] === 'auth'
    animate(card, {
      translateX: [fromLeft ? -70 : 70, 0],
      opacity: [0, 1],
      ease: 'outCubic',
      duration: 420,
    })
  }, [location.pathname])

  return (
    <main className="auth">
      <AuthBackground />
      <div className="auth-card" ref={cardRef}>
        {useOutlet()}
      </div>
      <ThemeSwitcher />
    </main>
  )
}

function AuthBackground(): ReactElement {
  return (
    <>
      <div className="bg-layer" />
      <div className="bg-layer" />
    </>
  )
}

function Protected({ children }: { children: ReactElement }): ReactElement {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="route-loading">Загрузка…</div>
  if (!isAuthenticated) return <Navigate to="/auth" replace />
  return children
}

function AdminOnly({ children }: { children: ReactElement }): ReactElement {
  const { isAdmin, loading } = useAuth()
  if (loading) return <div className="route-loading">Загрузка…</div>
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function shell(page: ReactElement, activeNav?: 'boxes' | 'products' | 'admin'): ReactElement {
  return <DefaultLayout activeNav={activeNav}>{page}</DefaultLayout>
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/auth" replace /> },
  { path: '/auth', element: <AuthLayout />, children: [{ index: true, element: <Login /> }] },
  { path: '/register', element: <AuthLayout />, children: [{ index: true, element: <Register /> }] },
  {
    path: '/dashboard',
    element: <Protected>{shell(<DashboardPage />, 'boxes')}</Protected>,
  },
  {
    path: '/packing',
    element: <Protected>{shell(<PackingPage />, 'products')}</Protected>,
  },
  {
    path: '/admin',
    element: <AdminOnly>{shell(<AdminPanel />, 'admin')}</AdminOnly>,
  },
  {
    path: '/profile',
    element: <Protected>{shell(<Profile />)}</Protected>,
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

export function AppRouter(): ReactElement {
  return <RouterProvider router={router} />
}
