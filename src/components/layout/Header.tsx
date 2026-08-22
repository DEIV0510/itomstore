import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronRight, Menu, MessageCircle, Search, ShoppingBag, Truck } from 'lucide-react'
import MobileMenu from '@/components/layout/MobileMenu'
import Wordmark from '@/components/ui/Wordmark'
import { NAV_EXTRA, NAV_MAIN } from '@/data/nav'
import type { NavItem } from '@/data/nav'
import { useEscape } from '@/hooks/useEscape'
import { useShop } from '@/lib/shop'
import { useStore } from '@/lib/store'
import { WA_GENERAL } from '@/lib/whatsapp'

/* Cobertura real de la tienda, la misma que vive en la configuracion. No hay promesas nuevas aqui. */
const ANUNCIOS = ['Domicilios en Barranquilla', 'Entregas en Valledupar', 'Envíos a toda Colombia']

/* Los enlaces que NO son categoria siguen viviendo en nav.ts. */
const INICIO: NavItem = NAV_MAIN.find((item) => item.to === '/') ?? { label: 'Inicio', to: '/' }

/* Cuantas categorias caben comodas en la barra: 4 desde lg y 2 mas desde xl.
   El resto (y los destacados) viven en el desplegable "Mas". */
const CATS_LG = 4
const CATS_XL = 2

const ICON_BTN =
  'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-silver-300 transition-all duration-300 ease-premium hover:bg-white/[0.07] hover:text-white active:scale-95 lg:h-10 lg:w-10'

export default function Header() {
  const { count, openCart, openSearch } = useStore()
  /* el menu de categorias se arma con lo que hay en la base de datos */
  const { categories } = useShop()
  const { pathname, search } = useLocation()

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [anuncio, setAnuncio] = useState(0)
  const moreRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const closeMore = useCallback(() => setMoreOpen(false), [])

  const catNav = useMemo<NavItem[]>(
    () => categories.map((c) => ({ label: c.name, to: `/categoria/${c.id}` })),
    [categories]
  )
  const navBase = useMemo<NavItem[]>(() => [INICIO, ...catNav.slice(0, CATS_LG)], [catNav])
  const navWide = useMemo<NavItem[]>(() => catNav.slice(CATS_LG, CATS_LG + CATS_XL), [catNav])
  const navMore = useMemo<NavItem[]>(
    () => [...catNav.slice(CATS_LG + CATS_XL), ...NAV_EXTRA],
    [catNav]
  )

  /* fondo solido + blur al bajar */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* la barra de anuncio rota en movil solo mientras esta visible */
  useEffect(() => {
    if (scrolled) return
    const id = window.setInterval(() => setAnuncio((i) => (i + 1) % ANUNCIOS.length), 4200)
    return () => window.clearInterval(id)
  }, [scrolled])

  /* al navegar se cierra el desplegable */
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname, search])

  /* clic fuera del desplegable */
  useEffect(() => {
    if (!moreOpen) return
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [moreOpen])

  useEscape(moreOpen, closeMore)

  const here = pathname + search
  const moreActive = navMore.some((item) => (item.to.includes('?') ? here === item.to : pathname === item.to))
  const cartLabel =
    count > 0
      ? `Abrir carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`
      : 'Abrir carrito, está vacío'

  const barLink = (item: NavItem, extra = '') => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `group relative inline-flex items-center whitespace-nowrap rounded-full px-2 py-2 text-[12px] font-medium transition-colors duration-300 ease-premium xl:px-3 xl:text-[13px] ${
          isActive ? 'text-silver-100' : 'text-silver-500 hover:text-silver-100'
        } ${extra}`
      }
    >
      {({ isActive }) => (
        <>
          <span>{item.label}</span>
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-2 bottom-0 h-px origin-left rounded-full bg-gradient-to-r from-gold-500/0 via-gold-400 to-gold-500/0 transition-transform duration-300 ease-premium xl:inset-x-3 ${
              isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-70 group-hover:scale-x-100'
            }`}
          />
        </>
      )}
    </NavLink>
  )

  const dropLink = (item: NavItem) => {
    const active = item.to.includes('?') ? here === item.to : pathname === item.to
    return (
      <Link
        to={item.to}
        onClick={closeMore}
        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-300 ease-premium ${
          active ? 'bg-white/[0.06] text-gold-300' : 'text-silver-300 hover:bg-white/[0.05] hover:text-white'
        }`}
      >
        <span className="truncate">{item.label}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-silver-700" aria-hidden="true" />
      </Link>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* ------------------------------------------------ barra de anuncio */}
        <div
          className={`overflow-hidden border-b bg-gold-500/[0.06] transition-[height,opacity] duration-300 ease-premium ${
            scrolled ? 'h-0 border-transparent opacity-0' : 'h-8 border-gold-500/10 opacity-100 sm:h-9'
          }`}
        >
          <div className="container-x flex h-8 items-center justify-center gap-2 text-[11px] font-medium text-gold-200/85 sm:h-9">
            <Truck className="h-3.5 w-3.5 shrink-0 text-gold-400/80" aria-hidden="true" />
            <span className="hidden sm:inline">{ANUNCIOS.join(' · ')}</span>
            <span key={anuncio} className="animate-fade-in truncate sm:hidden">
              {ANUNCIOS[anuncio]}
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------ barra principal */}
        <div
          className={`transition-all duration-300 ease-premium ${
            scrolled
              ? 'border-b border-hairline bg-ink/85 shadow-[0_20px_44px_-30px_rgba(0,0,0,1)] backdrop-blur-xl'
              : 'border-b border-transparent bg-gradient-to-b from-ink/90 via-ink/45 to-transparent'
          }`}
        >
          <div className="container-x flex h-16 items-center gap-1 sm:gap-2 lg:h-[76px] lg:gap-4">
            {/* hamburguesa (solo movil) */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              className={`${ICON_BTN} -ml-2 lg:hidden`}
            >
              <Menu className="h-[22px] w-[22px]" aria-hidden="true" />
            </button>

            {/* marca */}
            <Link
              to="/"
              aria-label="ITOMSTORE, ir al inicio"
              className="group flex min-w-0 shrink items-center rounded-2xl py-1 transition-opacity duration-300 ease-premium hover:opacity-90"
            >
              {/* movil: lockup compacto */}
              <Wordmark size="sm" className="lg:hidden" />

              {/* escritorio: lockup con microtexto */}
              <Wordmark size="md" withTagline className="hidden lg:inline-flex" />
            </Link>

            {/* navegacion (lg+) */}
            <nav aria-label="Principal" className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
              {navBase.map((item) => barLink(item))}
              {navWide.map((item) => barLink(item, 'hidden xl:inline-flex'))}

              <div ref={moreRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  aria-haspopup="true"
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-2 text-[12px] font-medium transition-colors duration-300 ease-premium xl:px-3 xl:text-[13px] ${
                    moreOpen || moreActive ? 'text-silver-100' : 'text-silver-500 hover:text-silver-100'
                  }`}
                >
                  Más
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-300 ease-premium ${moreOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {moreActive && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-2 bottom-0 h-px rounded-full bg-gradient-to-r from-gold-500/0 via-gold-400 to-gold-500/0 xl:inset-x-3"
                  />
                )}

                {moreOpen && (
                  <div
                    id="nav-mas"
                    className="surface-glass absolute left-1/2 top-[calc(100%+14px)] w-60 -translate-x-1/2 animate-fade-up overflow-hidden p-1.5"
                  >
                    <ul>
                      {navWide.map((item) => (
                        <li key={item.to} className="xl:hidden">
                          {dropLink(item)}
                        </li>
                      ))}
                      {navMore.map((item) => (
                        <li key={item.to}>{dropLink(item)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </nav>

            {/* acciones */}
            <div className="-mr-2 ml-auto flex items-center gap-0.5 sm:gap-1 lg:mr-0 lg:gap-1.5">
              <button type="button" onClick={openSearch} aria-label="Buscar productos" className={ICON_BTN}>
                <Search className="h-[19px] w-[19px]" aria-hidden="true" />
              </button>

              <a
                href={WA_GENERAL()}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escribirnos por WhatsApp"
                className={`${ICON_BTN} hidden sm:inline-flex`}
              >
                <MessageCircle className="h-[19px] w-[19px]" aria-hidden="true" />
              </a>

              <button type="button" onClick={openCart} aria-label={cartLabel} className={ICON_BTN}>
                <ShoppingBag className="h-[19px] w-[19px]" aria-hidden="true" />
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold-500 px-1 font-display text-[10px] font-extrabold leading-none text-ink shadow-goldglow lg:right-0.5 lg:top-0.5"
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>

              {/* CTA secundario: el dorado de la primera pantalla es el del hero */}
              <Link to="/catalogo" className="btn btn-sm btn-ghost ml-1.5 hidden lg:inline-flex">
                Comprar ahora
              </Link>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={closeMenu} />
    </>
  )
}
