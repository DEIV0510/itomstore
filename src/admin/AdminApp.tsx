import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Loading } from './ui/kit'
import AdminLayout from './AdminLayout'
import Login from './Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Products = lazy(() => import('./pages/Products'))
const Categories = lazy(() => import('./pages/Categories'))
const Inventory = lazy(() => import('./pages/Inventory'))
const Orders = lazy(() => import('./pages/Orders'))
const Customers = lazy(() => import('./pages/Customers'))
const TradeIns = lazy(() => import('./pages/TradeIns'))
const Promotions = lazy(() => import('./pages/Promotions'))
const HomeContent = lazy(() => import('./pages/HomeContent'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const Seo = lazy(() => import('./pages/Seo'))
const Users = lazy(() => import('./pages/Users'))

/**
 * Puerta del panel.
 *
 * Esto es comodidad de navegacion, NO la proteccion: la de verdad esta en el
 * servidor, donde cada ruta de /api valida la sesion y el rol. Aunque alguien
 * saltara este componente, la API seguiria respondiendo 401/403.
 */
function Guard({ area, children }: { area?: string; children: JSX.Element }) {
  const { user, loading, can } = useAuth()
  const location = useLocation()

  if (loading) return <Loading label="Comprobando tu sesión…" />
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  if (area && !can(area)) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-6 py-12 text-center">
        <p className="font-display text-xl font-extrabold text-red-200">Acceso no autorizado</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-red-200/80">
          Tu rol de <strong>editor</strong> no tiene permiso para esta sección. Pídele acceso a un administrador.
        </p>
      </div>
    )
  }
  return children
}

export default function AdminApp() {
  /** El panel nunca debe aparecer en buscadores. */
  useEffect(() => {
    document.title = 'ITOMSTORE ADMIN'
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const previous = meta?.getAttribute('content') ?? null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'robots'
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', 'noindex, nofollow')
    return () => {
      if (previous) meta?.setAttribute('content', previous)
    }
  }, [])

  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route
        element={
          <Guard>
            <AdminLayout />
          </Guard>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<Loading />}>
              <Dashboard />
            </Suspense>
          }
        />
        {(
          [
            ['productos', 'products', Products],
            ['categorias', 'categories', Categories],
            ['inventario', 'products', Inventory],
            ['pedidos', 'orders', Orders],
            ['clientes', 'customers', Customers],
            ['permutas', 'tradeins', TradeIns],
            ['promociones', 'promotions', Promotions],
            ['home', 'home', HomeContent],
            ['configuracion', 'settings', SettingsPage],
            ['seo', 'settings', Seo],
            ['usuarios', 'users', Users],
          ] as const
        ).map(([path, area, Component]) => (
          <Route
            key={path}
            path={path}
            element={
              <Guard area={area}>
                <Suspense fallback={<Loading />}>
                  <Component />
                </Suspense>
              </Guard>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
