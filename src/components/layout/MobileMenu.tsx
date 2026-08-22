import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronRight, House, MessageCircle, Recycle, Repeat2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Wordmark from '@/components/ui/Wordmark'
import { CATEGORY_ICON } from '@/data/categoryIcons'
import { NAV_EXTRA, NAV_INFO, NAV_MAIN } from '@/data/nav'
import type { NavItem } from '@/data/nav'
import { useEscape } from '@/hooks/useEscape'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useLockScroll } from '@/hooks/useLockScroll'
import { useShop } from '@/lib/shop'
import { WA_GENERAL } from '@/lib/whatsapp'

interface Props {
  open: boolean
  onClose: () => void
}

/** Iconos de los enlaces que NO son categoria. Ruta nueva -> cae en ChevronRight. */
const ICONS_FIJOS: Record<string, LucideIcon | undefined> = {
  '/': House,
  '/catalogo?estado=usado': Recycle,
  '/permutas': Repeat2,
}

/** El unico enlace de nav.ts que no es categoria dentro de "Explora". */
const INICIO: NavItem = NAV_MAIN.find((item) => item.to === '/') ?? { label: 'Inicio', to: '/' }

export default function MobileMenu({ open, onClose }: Props) {
  const { pathname, search } = useLocation()
  /* categorias y datos de contacto vivos: se editan en /admin, no en el codigo */
  const { categories, settings } = useShop()
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const lastRoute = useRef(pathname + search)
  const [shown, setShown] = useState(false)

  useLockScroll(open)
  useEscape(open, onClose)
  useFocusTrap(open, panelRef)

  /* Inicio + las categorias publicadas, en el orden del panel */
  const explora = useMemo<NavItem[]>(
    () => [INICIO, ...categories.map((c) => ({ label: c.name, to: `/categoria/${c.id}` }))],
    [categories]
  )

  /* Un icono coherente por ruta: las categorias salen del mapa compartido. */
  const icons = useMemo<Record<string, LucideIcon | undefined>>(
    () => ({
      ...ICONS_FIJOS,
      ...Object.fromEntries(categories.map((c) => [`/categoria/${c.id}`, CATEGORY_ICON[c.icon]] as const)),
    }),
    [categories]
  )

  /* entrada deslizante: se activa un frame despues de montar */
  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [open])

  /* el foco entra a la capa */
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => closeRef.current?.focus(), 80)
    return () => window.clearTimeout(t)
  }, [open])

  /* al cambiar de ruta el menu se cierra solo */
  useEffect(() => {
    const route = pathname + search
    if (lastRoute.current === route) return
    lastRoute.current = route
    onClose()
  }, [pathname, search, onClose])

  if (!open) return null

  const here = pathname + search

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 h-full w-full cursor-default bg-ink/80 backdrop-blur-sm transition-opacity duration-300 ease-premium ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={panelRef}
        id="menu-movil"
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className={`absolute inset-y-0 left-0 flex w-[88vw] max-w-sm flex-col border-r border-hairline bg-carbon shadow-lift transition-transform duration-300 ease-premium ${
          shown ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* ------------------------------------------------------------ cabecera */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <Link
            to="/"
            onClick={onClose}
            aria-label="ITOMSTORE, ir al inicio"
            className="group flex min-w-0 items-center"
          >
            <Wordmark size="md" withTagline />
          </Link>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-white/[0.03] text-silver-300 transition-colors duration-300 ease-premium hover:border-gold-500/40 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* -------------------------------------------------------------- cuerpo */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5">
          <p className="eyebrow mb-2">Explora</p>
          <ul className="-mx-2">
            {explora.map((item, i) => {
              const Icon = icons[item.to] ?? ChevronRight
              return (
                <li key={item.to} className={i > 0 ? 'border-t border-hairline' : ''}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onClose}
                    style={{ animationDelay: `${40 + i * 35}ms` }}
                    className={({ isActive }) =>
                      `group flex animate-fade-up items-center gap-3.5 rounded-xl px-2 py-3 transition-colors duration-300 ease-premium ${
                        isActive ? 'text-gold-300' : 'text-silver-100 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors duration-300 ease-premium ${
                            isActive
                              ? 'border-gold-500/40 bg-gold-500/10 text-gold-300'
                              : 'border-hairline bg-white/[0.03] text-silver-500 group-hover:text-silver-100'
                          }`}
                        >
                          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{item.label}</span>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-premium ${
                            isActive ? 'text-gold-400' : 'text-silver-700 group-hover:translate-x-0.5'
                          }`}
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>

          {/* destacados */}
          <p className="eyebrow mb-2 mt-7">Destacados</p>
          <div className="grid grid-cols-2 gap-3">
            {NAV_EXTRA.map((item, i) => {
              const Icon = icons[item.to] ?? ChevronRight
              const active = here === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  style={{ animationDelay: `${400 + i * 45}ms` }}
                  className={`surface-glass flex animate-fade-up flex-col gap-2.5 p-3.5 transition-colors duration-300 ease-premium ${
                    active ? 'border-gold-500/40' : 'hover:border-gold-500/30'
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] ${active ? 'text-gold-300' : 'text-gold-400'}`}
                    aria-hidden="true"
                  />
                  <span className="text-[13px] font-semibold leading-tight text-silver-100">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* informacion */}
          <p className="eyebrow mb-1 mt-7">Información</p>
          <ul className="-mx-2">
            {NAV_INFO.map((item, i) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onClose}
                  style={{ animationDelay: `${500 + i * 30}ms` }}
                  className={`flex animate-fade-up items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-[13px] transition-colors duration-300 ease-premium ${
                    pathname === item.to ? 'text-gold-300' : 'text-silver-500 hover:text-silver-100'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-silver-700" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* --------------------------------------------------------------- CTA fijo */}
        <div className="shrink-0 border-t border-hairline bg-ink/70 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <a
            href={WA_GENERAL()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="btn btn-wa w-full px-4 text-[13px]"
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Escríbenos por WhatsApp
          </a>
          <p className="mt-2.5 text-center text-[11px] font-medium tracking-wide text-silver-700">
            {settings.brand.whatsappPretty}
          </p>
        </div>
      </div>
    </div>
  )
}
