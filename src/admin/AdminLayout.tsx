import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Boxes,
  Cog,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Percent,
  Repeat2,
  Search,
  ShoppingBag,
  Store,
  Tags,
  UserCog,
  Users2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { LOGO_MARK } from '@/lib/images'
import { useEscape } from '@/hooks/useEscape'
import { useLockScroll } from '@/hooks/useLockScroll'
import { Pill } from './ui/kit'
import AdminSearch from './AdminSearch'
import ForcePasswordChange from '@/admin/ForcePasswordChange'

interface NavEntry {
  to: string
  label: string
  icon: LucideIcon
  area?: string
  end?: boolean
}

const NAV: { group: string; items: NavEntry[] }[] = [
  {
    group: 'Resumen',
    items: [{ to: '/admin', label: 'Panel', icon: LayoutDashboard, end: true }],
  },
  {
    group: 'Catálogo',
    items: [
      { to: '/admin/productos', label: 'Productos', icon: Package, area: 'products' },
      { to: '/admin/inventario', label: 'Inventario', icon: Boxes, area: 'products' },
      { to: '/admin/categorias', label: 'Categorías', icon: Tags, area: 'categories' },
      { to: '/admin/promociones', label: 'Promociones', icon: Percent, area: 'promotions' },
    ],
  },
  {
    group: 'Ventas',
    items: [
      { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag, area: 'orders' },
      { to: '/admin/permutas', label: 'Permutas', icon: Repeat2, area: 'tradeins' },
      { to: '/admin/clientes', label: 'Clientes', icon: Users2, area: 'customers' },
    ],
  },
  {
    group: 'Sitio',
    items: [
      { to: '/admin/home', label: 'Portada', icon: ImageIcon, area: 'home' },
      { to: '/admin/configuracion', label: 'Configuración', icon: Cog, area: 'settings' },
      { to: '/admin/seo', label: 'SEO', icon: Search, area: 'settings' },
      { to: '/admin/usuarios', label: 'Usuarios', icon: UserCog, area: 'users' },
    ],
  },
]

export interface Alert {
  type: string
  level: 'info' | 'warn' | 'danger'
  text: string
  href: string
  count: number
}

export default function AdminLayout() {
  const { user, logout, can } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useLockScroll(menuOpen)
  useEscape(menuOpen, () => setMenuOpen(false))
  useEscape(bellOpen, () => setBellOpen(false))

  useEffect(() => setMenuOpen(false), [location.pathname])

  useEffect(() => {
    let alive = true
    const load = () =>
      api
        .get<{ alerts: Alert[] }>('/stats/alerts')
        .then((r) => alive && setAlerts(r.alerts ?? []))
        .catch(() => {})
    void load()
    const t = setInterval(load, 60000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [location.pathname])

  useEffect(() => {
    if (!bellOpen) return
    const onClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [bellOpen])

  const pending = alerts.reduce((a, x) => a + x.count, 0)

  async function onLogout() {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4" aria-label="Secciones del panel">
      {NAV.map((group) => {
        const items = group.items.filter((i) => !i.area || can(i.area))
        if (!items.length) return null
        return (
          <div key={group.group}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-silver-700">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors duration-200 ${
                        isActive
                          ? 'bg-gold-500/[0.12] text-gold-200'
                          : 'text-silver-500 hover:bg-white/[0.04] hover:text-silver-100'
                      }`
                    }
                  >
                    <item.icon size={17} aria-hidden strokeWidth={1.9} />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-ink">
      {/* ------------------------------------------------------- cabecera */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-carbon/95 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú del panel"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-hairline text-silver-300 transition-colors hover:border-gold-500/40 lg:hidden"
          >
            <Menu size={18} aria-hidden />
          </button>

          <Link to="/admin" className="flex min-w-0 shrink items-center gap-2.5" aria-label="ITOMSTORE Admin, ir al panel">
            <img src={LOGO_MARK} alt="" aria-hidden width={32} height={32} className="h-8 w-8 shrink-0" />
            <span className="hidden min-w-0 flex-col leading-none sm:flex">
              <span className="font-display text-[15px] font-extrabold tracking-tightest text-metal">ITOMSTORE</span>
              <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-label text-gold-400">Admin</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar en el panel"
              className="grid h-11 w-11 place-items-center rounded-xl border border-hairline text-silver-300 transition-colors hover:border-gold-500/40"
            >
              <Search size={17} aria-hidden />
            </button>

            <div ref={bellRef} className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((v) => !v)}
                aria-label={pending ? `Notificaciones: ${pending} pendientes` : 'Notificaciones'}
                aria-expanded={bellOpen}
                className="relative grid h-11 w-11 place-items-center rounded-xl border border-hairline text-silver-300 transition-colors hover:border-gold-500/40"
              >
                <Bell size={17} aria-hidden />
                {pending > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-ink">
                    {pending > 99 ? '99+' : pending}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-hairline bg-carbon p-2 shadow-lift">
                  {alerts.length === 0 ? (
                    <p className="px-3 py-6 text-center text-[13px] text-silver-500">Todo al día. Sin avisos.</p>
                  ) : (
                    <ul className="space-y-1">
                      {alerts.map((a) => (
                        <li key={a.type}>
                          <Link
                            to={a.href}
                            onClick={() => setBellOpen(false)}
                            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[13px] text-silver-300 transition-colors hover:bg-white/[0.05]"
                          >
                            <span>{a.text}</span>
                            <Pill tone={a.level === 'danger' ? 'red' : a.level === 'warn' ? 'orange' : 'gold'}>
                              {a.count}
                            </Pill>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <Link to="/" className="btn btn-sm btn-ghost hidden sm:inline-flex">
              <Store size={15} aria-hidden />
              Ver tienda
            </Link>

            <div className="hidden items-center gap-2.5 border-l border-hairline pl-3 md:flex">
              <span className="text-right leading-tight">
                <span className="block max-w-[10rem] truncate text-[13px] font-medium text-silver-100">{user?.name}</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-400">
                  {user?.role === 'admin' ? 'Administrador' : 'Editor'}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Cerrar sesión"
              className="grid h-11 w-11 place-items-center rounded-xl border border-hairline text-silver-300 transition-colors hover:border-red-400/50 hover:text-red-300"
            >
              <LogOut size={17} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-hairline lg:block">
          {sidebar}
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>

      {/* --------------------------------------------------- menu en movil */}
      {menuOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 cursor-default bg-ink/80 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú del panel"
            className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-hairline bg-carbon"
          >
            <div className="flex h-16 items-center justify-between border-b border-hairline px-4">
              <span className="font-display text-sm font-extrabold tracking-tightest text-metal">ITOMSTORE ADMIN</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
                className="grid h-10 w-10 place-items-center rounded-lg border border-hairline text-silver-400"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            {sidebar}
            <div className="border-t border-hairline p-4">
              <Link to="/" className="btn btn-sm btn-ghost w-full">
                <Store size={15} aria-hidden />
                Ver tienda
              </Link>
            </div>
          </div>
        </div>
      )}

      <AdminSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* se gestiona solo: tapa el panel mientras user.mustChange siga en true */}
      <ForcePasswordChange />
    </div>
  )
}
