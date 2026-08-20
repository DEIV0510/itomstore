import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, MessageCircle, PackageSearch, Search, X } from 'lucide-react'
import Img from '@/components/ui/Img'
import ConditionBadge from '@/components/ui/ConditionBadge'
import { useStore } from '@/lib/store'
import { useLockScroll } from '@/hooks/useLockScroll'
import { useEscape } from '@/hooks/useEscape'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { CATEGORIES, PRODUCTS } from '@/data/catalog'
import { CATEGORY_ICON } from '@/data/categoryIcons'
import { matchesQuery } from '@/lib/filters'
import { priceLabel } from '@/lib/format'
import { wa } from '@/lib/whatsapp'

/** Maximo de resultados visibles dentro del panel. */
const MAX_RESULTS = 6

/** Atajos de busqueda: cada uno devuelve resultados reales del catalogo. */
const QUICK = ['iPhone 17', 'MacBook', 'iPad', 'Apple Watch', 'Bose', 'Beats']

const CAT_NAME: Record<string, string> = CATEGORIES.reduce<Record<string, string>>((acc, c) => {
  acc[c.id] = c.name
  return acc
}, {})

export default function SearchOverlay() {
  const { searchOpen, closeSearch } = useStore()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)

  useLockScroll(searchOpen)
  useEscape(searchOpen, closeSearch)
  useFocusTrap(searchOpen, panelRef)

  const query = q.trim()

  const matches = useMemo(() => (query ? PRODUCTS.filter((p) => matchesQuery(p, query)) : []), [query])
  const results = useMemo(() => matches.slice(0, MAX_RESULTS), [matches])

  /* al abrir: consulta limpia y foco real dentro de la capa */
  useEffect(() => {
    if (!searchOpen) return
    setQ('')
    setActive(0)
    inputRef.current?.focus()
    const raf = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(raf)
  }, [searchOpen])

  /* cada consulta nueva vuelve a resaltar el primer resultado */
  useEffect(() => {
    setActive(0)
  }, [query])

  /* el resultado activo siempre visible dentro de la lista */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`#resultado-${active}`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, results.length])

  if (!searchOpen) return null

  function go(to: string) {
    closeSearch()
    navigate(to)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (results.length) setActive((i) => (i + 1) % results.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (results.length) setActive((i) => (i - 1 + results.length) % results.length)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const p = results[active]
      if (p) go(`/producto/${p.id}`)
      else if (query) go(`/catalogo?q=${encodeURIComponent(query)}`)
    }
  }

  const sinResultados = query.length > 0 && matches.length === 0

  return (
    <div className="fixed inset-0 z-[85] animate-fade-in bg-ink/85 backdrop-blur-md">
      {/* clic fuera = cerrar */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={closeSearch}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div className="container-x pointer-events-none relative z-10 mt-[7vh] max-w-2xl sm:mt-[12vh]">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Buscar productos"
          className="surface-glass pointer-events-auto flex max-h-[84vh] animate-fade-up flex-col overflow-hidden rounded-3xl sm:max-h-[74vh]"
        >
          {/* ------------------------------------------------------ entrada */}
          <div className="flex items-center gap-3 border-b border-hairline px-4 py-3 sm:px-5 sm:py-4">
            <Search size={20} className="shrink-0 text-gold-400" aria-hidden />
            <input
              ref={inputRef}
              id="buscador-itomstore"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Buscar iPhone 17..."
              aria-label="Buscar productos en ITOMSTORE"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="resultados-buscador"
              aria-autocomplete="list"
              aria-activedescendant={results.length ? `resultado-${active}` : undefined}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              className="min-w-0 flex-1 rounded-lg border-0 bg-transparent text-lg text-silver-100 placeholder:text-silver-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            />

            {q.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQ('')
                  inputRef.current?.focus()
                }}
                aria-label="Limpiar la búsqueda"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-silver-500 transition-colors hover:bg-white/5 hover:text-silver-100"
              >
                <X size={16} aria-hidden />
              </button>
            )}

            <button type="button" onClick={closeSearch} aria-label="Cerrar buscador" className="flex h-11 shrink-0 items-center">
              <kbd className="rounded-lg border border-hairline bg-white/[0.04] px-2 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-500 transition-colors hover:border-gold-500/40 hover:text-silver-100">
                Esc
              </kbd>
            </button>
          </div>

          {/* ---------------------------------------------------- contenido */}
          <div
            ref={listRef}
            className="max-h-[62vh] min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3 sm:py-3"
          >
            {/* resultados en vivo */}
            {results.length > 0 && (
              <>
                <div id="resultados-buscador" role="listbox" aria-label="Resultados de la búsqueda" className="flex flex-col gap-1">
                  {results.map((p, i) => (
                    <Link
                      key={p.id}
                      id={`resultado-${i}`}
                      to={`/producto/${p.id}`}
                      role="option"
                      aria-selected={i === active}
                      onClick={closeSearch}
                      onMouseEnter={() => setActive(i)}
                      className={`flex items-center gap-3 rounded-2xl border px-2.5 py-2.5 transition-colors duration-200 ease-premium sm:px-3
                                  ${i === active ? 'border-gold-500/40 bg-white/5' : 'border-transparent hover:bg-white/[0.03]'}`}
                    >
                      <Img
                        name={p.images[0]}
                        alt={`${p.name}${p.color ? ` color ${p.color}` : ''}`}
                        className="h-14 w-11 shrink-0 rounded-lg border border-hairline bg-carbon"
                        imgClassName="object-cover"
                        sizes="44px"
                        fallback={
                          <div className="grid h-full w-full place-items-center text-silver-700">
                            <PackageSearch size={16} aria-hidden />
                          </div>
                        }
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[15px] font-extrabold leading-tight text-silver-100">{p.name}</p>
                        <p className="mt-0.5 truncate text-[12px] text-silver-500">
                          {CAT_NAME[p.category] ?? p.brand}
                          {p.color ? ` · ${p.color}` : ''}
                        </p>
                        <div className="mt-1.5">
                          <ConditionBadge condition={p.condition} />
                        </div>
                      </div>

                      <span
                        className={`shrink-0 text-right font-display text-[13px] font-extrabold leading-tight sm:text-sm ${
                          p.price === null ? 'text-gold-300' : 'text-white'
                        }`}
                      >
                        {p.price === null ? 'A consultar' : priceLabel(p.price)}
                      </span>
                    </Link>
                  ))}
                </div>

                {matches.length > results.length && (
                  <Link
                    to={`/catalogo?q=${encodeURIComponent(query)}`}
                    onClick={closeSearch}
                    className="mt-1 flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-[13px] font-semibold text-gold-300 transition-colors hover:bg-white/[0.04]"
                  >
                    <span>Ver los {matches.length} resultados en el catálogo</span>
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                )}
              </>
            )}

            {/* sin resultados */}
            {sinResultados && (
              <div className="px-3 py-8 text-center sm:px-6 sm:py-10">
                <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-gold-500/25 bg-gold-500/10 text-gold-300">
                  <PackageSearch size={22} aria-hidden />
                </div>
                <p className="font-display text-lg font-extrabold tracking-tightest text-silver-100">
                  No encontramos «{query}»
                </p>
                <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-silver-500">
                  Puede que lo tengamos sin publicar todavía. Escríbenos y te confirmamos disponibilidad al instante.
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                  <a
                    href={wa(`Hola ITOMSTORE, estoy buscando ${query}. ¿Lo tienen disponible?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-wa w-full sm:w-auto"
                  >
                    <MessageCircle size={15} aria-hidden />
                    Preguntar por WhatsApp
                  </a>
                  <Link to="/catalogo" onClick={closeSearch} className="btn btn-sm btn-ghost w-full sm:w-auto">
                    Ver todo el catálogo
                  </Link>
                </div>
              </div>
            )}

            {/* estado inicial */}
            {query.length === 0 && (
              <div className="px-2 py-3 sm:px-2">
                <p className="eyebrow px-1">Búsquedas rápidas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setQ(term)
                        inputRef.current?.focus()
                      }}
                      className="btn btn-sm btn-ghost"
                    >
                      {term}
                    </button>
                  ))}
                </div>

                <p className="eyebrow mt-7 px-1">Explora por categoría</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CATEGORIES.map((c) => {
                    const Icon = CATEGORY_ICON[c.icon]
                    return (
                      <Link
                        key={c.id}
                        to={`/categoria/${c.id}`}
                        onClick={closeSearch}
                        className="flex min-h-[48px] items-center gap-2.5 rounded-2xl border border-hairline bg-white/[0.02] px-3 py-2.5 transition-all duration-300 ease-premium hover:border-gold-500/35 hover:bg-white/[0.06]"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-hairline bg-white/[0.04] text-gold-400">
                          <Icon size={15} aria-hidden />
                        </span>
                        <span className="min-w-0 truncate text-[13px] font-semibold text-silver-100">{c.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* --------------------------------------------------------- pie */}
          <div className="hairline-t hidden items-center justify-between gap-3 px-4 py-3 sm:flex sm:px-5">
            <p className="text-[12px] text-silver-700">
              {query.length === 0
                ? `${PRODUCTS.length} productos publicados`
                : `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}`}
            </p>
            <p className="text-[12px] text-silver-700">↑↓ para moverte · Enter para abrir · Esc para cerrar</p>
          </div>
        </div>
      </div>
    </div>
  )
}
