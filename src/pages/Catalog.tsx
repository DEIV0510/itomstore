import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import ProductCard from '@/components/ui/ProductCard'
import EmptyState from '@/components/ui/EmptyState'
import { useSeo } from '@/lib/seo'
import { useLockScroll } from '@/hooks/useLockScroll'
import { useEscape } from '@/hooks/useEscape'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { CATEGORIES, PRODUCTS } from '@/data/catalog'
import { applyFilters, countActive, facets } from '@/lib/filters'
import type { FilterState, SortKey } from '@/lib/filters'
import type { Condition } from '@/lib/types'
import { CONDITION_LABEL, formatCOP } from '@/lib/format'
import { wa } from '@/lib/whatsapp'

/* ---------------------------------------------------------------------------
 * Catalogo con estado en la URL.
 * Parametros: q, cat, marca, estado, capacidad, min, max, orden, disponibles.
 * Las opciones se calculan con facets(): nunca se ofrece un filtro sin productos.
 * ------------------------------------------------------------------------- */

type PatchValue = string | string[] | null
type Patch = (updates: Record<string, PatchValue>) => void

const P = {
  q: 'q',
  cat: 'cat',
  brand: 'marca',
  condition: 'estado',
  capacity: 'capacidad',
  min: 'min',
  max: 'max',
  sort: 'orden',
  available: 'disponibles',
} as const

const FACETS = facets(PRODUCTS)

/** Categorias que hoy tienen al menos un producto publicado, en el orden del catalogo. */
const CAT_OPTIONS = CATEGORIES.filter((c) => FACETS.categories.includes(c.id))

const CONDITION_ORDER: Condition[] = ['nuevo', 'seminuevo', 'usado']
const CONDITION_OPTIONS = CONDITION_ORDER.filter((c) => FACETS.conditions.includes(c))

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'destacados', label: 'Destacados' },
  { value: 'precio-asc', label: 'Precio: menor a mayor' },
  { value: 'precio-desc', label: 'Precio: mayor a menor' },
  { value: 'nombre', label: 'Nombre' },
]

const TRUEY = new Set(['1', 'true', 'si', 'sí'])

const categoryName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? id

function isCondition(v: string): v is Condition {
  return v === 'nuevo' || v === 'seminuevo' || v === 'usado'
}

function isSort(v: string): v is SortKey {
  return SORTS.some((s) => s.value === v)
}

/** Acepta `?cat=iphone,watch` y tambien `?cat=iphone&cat=watch`. */
function readList(sp: URLSearchParams, key: string): string[] {
  const raw = sp.getAll(key).flatMap((v) => v.split(','))
  return [...new Set(raw.map((v) => v.trim()).filter(Boolean))]
}

function toNumber(raw: string | null): number | null {
  if (!raw) return null
  const digits = raw.replace(/\D+/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isFinite(n) && n > 0 ? n : null
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isPending, setIsPending] = useState(true)
  const closeSheetRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  /* ------------------------------------------------------- estado <- URL */
  const filters = useMemo<FilterState>(() => {
    const validCats = new Set<string>(CATEGORIES.map((c) => c.id))
    const orden = searchParams.get(P.sort) ?? ''
    return {
      q: searchParams.get(P.q) ?? '',
      cat: readList(searchParams, P.cat).filter((c) => validCats.has(c)),
      brand: readList(searchParams, P.brand).filter((b) => FACETS.brands.includes(b)),
      condition: readList(searchParams, P.condition).filter(isCondition),
      capacity: readList(searchParams, P.capacity),
      price: [toNumber(searchParams.get(P.min)), toNumber(searchParams.get(P.max))],
      onlyAvailable: TRUEY.has((searchParams.get(P.available) ?? '').toLowerCase()),
      sort: isSort(orden) ? orden : 'destacados',
    }
  }, [searchParams])

  const results = useMemo(() => applyFilters(PRODUCTS, filters), [filters])
  const active = countActive(filters)

  /** Valores de `?estado=` tal cual vienen en la URL, incluso los que no tienen faceta visible. */
  const conditionParams = useMemo(() => readList(searchParams, P.condition), [searchParams])

  /* ------------------------------------------------------- estado -> URL */
  const patch = useCallback<Patch>(
    (updates) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(updates)) {
            next.delete(key)
            if (Array.isArray(value)) {
              if (value.length) next.set(key, value.join(','))
            } else if (value) {
              next.set(key, value)
            }
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  /* --------------------------------------------- buscador con debounce */
  const urlQ = searchParams.get(P.q) ?? ''
  const [qInput, setQInput] = useState(urlQ)

  // si la URL cambia por fuera (chip, limpiar, enlace externo) el input la sigue
  useEffect(() => {
    setQInput(urlQ)
  }, [urlQ])

  useEffect(() => {
    const next = qInput.trim()
    if (next === urlQ) return
    const t = window.setTimeout(() => patch({ [P.q]: next || null }), 250)
    return () => window.clearTimeout(t)
  }, [qInput, urlQ, patch])

  /* ------------------------------- micro-carga: la tienda se siente viva */
  const signature = searchParams.toString()
  useEffect(() => {
    setIsPending(true)
    const t = window.setTimeout(() => setIsPending(false), 220)
    return () => window.clearTimeout(t)
  }, [signature])

  /* ---------------------------------------------- panel movil de filtros */
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  useLockScroll(sheetOpen)
  useEscape(sheetOpen, closeSheet)
  // el tabulador se queda dentro de la capa y vuelve al boton que la abrio
  useFocusTrap(sheetOpen, panelRef)
  useEffect(() => {
    if (sheetOpen) closeSheetRef.current?.focus()
  }, [sheetOpen])

  /* ------------------------------------------------------------------ SEO */
  const singleCat = filters.cat.length === 1 ? categoryName(filters.cat[0]) : null
  useSeo({
    title: singleCat
      ? `${singleCat} | Catálogo ITOMSTORE`
      : 'Catálogo completo | ITOMSTORE',
    description: singleCat
      ? `Mira lo que tenemos publicado en ${singleCat}. Confirmamos precio y disponibilidad por WhatsApp. Domicilios en Barranquilla, entregas en Valledupar y envíos a toda Colombia.`
      : 'Todo el catálogo de ITOMSTORE: iPhone, MacBook, iPad, Apple Watch, parlantes Bose, accesorios y Samsung. Filtra por categoría, marca y estado; confirmamos precio y disponibilidad por WhatsApp.',
    path: '/catalogo',
  })

  /* ------------------------------------------------- chips de filtros */
  const chips: { key: string; label: string; onRemove: () => void }[] = []
  if (filters.q) {
    chips.push({
      key: 'q',
      label: `“${filters.q}”`,
      onRemove: () => {
        setQInput('')
        patch({ [P.q]: null })
      },
    })
  }
  for (const c of filters.cat) {
    chips.push({
      key: `cat-${c}`,
      label: categoryName(c),
      onRemove: () => patch({ [P.cat]: filters.cat.filter((x) => x !== c) }),
    })
  }
  for (const b of filters.brand) {
    chips.push({
      key: `marca-${b}`,
      label: b,
      onRemove: () => patch({ [P.brand]: filters.brand.filter((x) => x !== b) }),
    })
  }
  // Se leen los valores crudos de ?estado= (no los ya validados) para que SIEMPRE haya un chip
  // con el que quitarlos, aunque esa opcion no exista hoy entre las facetas visibles del panel.
  for (const c of conditionParams) {
    chips.push({
      key: `estado-${c}`,
      label: CONDITION_LABEL[c] ?? c,
      onRemove: () => patch({ [P.condition]: conditionParams.filter((x) => x !== c) }),
    })
  }
  for (const c of filters.capacity) {
    chips.push({
      key: `capacidad-${c}`,
      label: c,
      onRemove: () => patch({ [P.capacity]: filters.capacity.filter((x) => x !== c) }),
    })
  }
  if (filters.onlyAvailable) {
    chips.push({
      key: 'disponibles',
      label: 'Solo disponibles',
      onRemove: () => patch({ [P.available]: null }),
    })
  }
  const [minPrice, maxPrice] = filters.price
  if (minPrice !== null || maxPrice !== null) {
    const label =
      minPrice !== null && maxPrice !== null
        ? `${formatCOP(minPrice)} – ${formatCOP(maxPrice)}`
        : minPrice !== null
          ? `Desde ${formatCOP(minPrice)}`
          : `Hasta ${formatCOP(maxPrice as number)}`
    chips.push({ key: 'precio', label, onRemove: () => patch({ [P.min]: null, [P.max]: null }) })
  }

  const total = results.length

  const emptyHref = wa(
    filters.q
      ? `Hola ITOMSTORE, busqué "${filters.q}" en la página y no encontré resultados. ¿Lo tienen disponible?`
      : 'Hola ITOMSTORE, no encontré en el catálogo de la página lo que estoy buscando. ¿Me ayudan a encontrarlo?'
  )

  function onSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    patch({ [P.q]: qInput.trim() || null })
  }

  return (
    <>
      {/* ------------------------------------------------------- cabecera */}
      <section className="glow-gold grain relative overflow-hidden border-b border-hairline bg-carbon pb-10 pt-8 sm:pb-14 sm:pt-12">
        <div className="container-x relative z-10">
          <nav aria-label="Ruta de navegación" className="mb-6 flex flex-wrap items-center gap-2 text-[12px] text-silver-700">
            <Link to="/" className="transition-colors hover:text-silver-100">
              Inicio
            </Link>
            <span aria-hidden>/</span>
            <span className="text-silver-500" aria-current="page">
              Catálogo
            </span>
          </nav>

          <p className="eyebrow mb-3 flex items-center gap-2.5">
            <span aria-hidden className="h-px w-7 bg-gradient-to-r from-gold-500 to-transparent" />
            Catálogo
          </p>
          <h1 className="title-xl text-metal">TODO EL CATÁLOGO</h1>
          <p className="body-lg mt-4 max-w-2xl">
            Todo lo que tenemos publicado en un solo lugar: equipos Apple, parlantes Bose, accesorios y gama alta
            Android. Confirmamos disponibilidad y precio por WhatsApp antes de cerrar la compra.
          </p>

          <form role="search" onSubmit={onSearchSubmit} className="mt-8 max-w-xl">
            <label htmlFor="catalogo-buscar" className="sr-only">
              Buscar en el catálogo
            </label>
            <div className="relative">
              <Search
                size={18}
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-silver-500"
              />
              <input
                id="catalogo-buscar"
                type="search"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Buscar iPhone, MacBook, Bose..."
                autoComplete="off"
                className="h-14 w-full rounded-2xl border border-hairline bg-graphite/80 pl-12 pr-14 text-[15px] text-silver-100 outline-none transition-colors duration-300 ease-premium placeholder:text-silver-700 focus:border-gold-500/50 focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-graphite"
              />
              {qInput && (
                <button
                  type="button"
                  onClick={() => setQInput('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-silver-500 transition-colors hover:bg-white/10 hover:text-silver-100"
                >
                  <X size={16} aria-hidden />
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* --------------------------------------------------- cuerpo */}
      <div className="container-x pb-20 pt-6 lg:pt-10">
        <div className="lg:flex lg:gap-10">
          <aside className="hidden lg:block lg:w-[260px] lg:shrink-0">
            <div className="lg:sticky lg:top-28">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">Filtros</h2>
                {active > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="flex min-h-[44px] items-center px-2 text-[12px] font-semibold text-gold-300 transition-colors hover:text-gold-200"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <FilterPanel scope="escritorio" filters={filters} patch={patch} />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {/* barra de resultados */}
            <div className="sticky top-[calc(var(--header-h)_+_10px)] z-20 mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-ink/85 p-2.5 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="btn btn-sm btn-ghost lg:hidden"
                aria-haspopup="dialog"
              >
                <SlidersHorizontal size={15} aria-hidden />
                Filtros{active > 0 ? ` (${active})` : ''}
              </button>

              <p aria-live="polite" className="pl-1 text-[13px] text-silver-500">
                <span className="font-display font-extrabold text-silver-100">{total}</span>{' '}
                {total === 1 ? 'producto' : 'productos'}
              </p>

              <div className="relative ml-auto">
                <label htmlFor="catalogo-orden" className="sr-only">
                  Ordenar productos
                </label>
                <select
                  id="catalogo-orden"
                  value={filters.sort}
                  onChange={(e) => patch({ [P.sort]: e.target.value === 'destacados' ? null : e.target.value })}
                  className="h-10 max-w-full appearance-none rounded-full border border-hairline bg-graphite pl-4 pr-9 text-[13px] font-semibold text-silver-100 transition-colors hover:border-gold-500/40"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-graphite text-silver-100">
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  aria-hidden
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-silver-500"
                />
              </div>
            </div>

            {/* chips activos */}
            {chips.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Quitar filtro ${chip.label}`}
                    className="btn btn-sm btn-ghost max-w-full font-normal"
                  >
                    <span className="max-w-[190px] truncate">{chip.label}</span>
                    <X size={13} aria-hidden className="shrink-0 text-silver-500" />
                  </button>
                ))}
                {(active > 0 || filters.q !== '') && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="btn btn-sm btn-ghost text-gold-300 hover:text-gold-200"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>
            )}

            {/* rejilla */}
            {isPending ? (
              <div aria-hidden className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton aspect-[4/5] rounded-2xl" />
                ))}
              </div>
            ) : total === 0 ? (
              <EmptyState
                title="No encontramos productos con esos filtros"
                blurb="Cuéntanos qué estás buscando y te confirmamos disponibilidad y precio por WhatsApp antes de cerrar la compra."
                waHref={emptyHref}
                waLabel="Preguntar por WhatsApp"
                secondary={
                  <button type="button" onClick={clearAll} className="btn btn-ghost w-full sm:w-auto">
                    Limpiar filtros
                  </button>
                }
              />
            ) : (
              <div className="grid animate-fade-in grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {results.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 4} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------- panel movil (bottom sheet) */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={closeSheet}
            className="absolute inset-0 h-full w-full cursor-default bg-ink/80 backdrop-blur-sm"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filtros-movil-titulo"
            className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-3xl border-t border-hairline bg-carbon shadow-lift animate-fade-up"
          >
            <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
              <h2 id="filtros-movil-titulo" className="font-display text-lg font-extrabold tracking-tightest text-silver-100">
                Filtros
              </h2>
              <button
                ref={closeSheetRef}
                type="button"
                onClick={closeSheet}
                aria-label="Cerrar filtros"
                className="grid h-11 w-11 place-items-center rounded-full border border-hairline text-silver-500 transition-colors hover:border-gold-500/45 hover:text-silver-100"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <FilterPanel scope="movil" filters={filters} patch={patch} />
            </div>

            <div
              className="grid grid-cols-2 gap-3 border-t border-hairline px-5 py-4"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
              <button type="button" onClick={clearAll} className="btn btn-ghost">
                Limpiar
              </button>
              <button type="button" onClick={closeSheet} className="btn btn-gold min-w-0 px-3 text-[13px]">
                <span className="min-w-0 truncate">Ver resultados ({total})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* =========================================================================
 * Panel de filtros: se usa igual en la columna lateral y en el panel movil.
 * `scope` evita ids duplicados cuando ambos estan montados.
 * ========================================================================= */

interface PanelProps {
  scope: string
  filters: FilterState
  patch: Patch
}

function FilterPanel({ scope, filters, patch }: PanelProps) {
  /** Cuantos productos quedarian si se activara esa opcion (con el resto de filtros puestos). */
  const countWith = (over: Partial<FilterState>) => applyFilters(PRODUCTS, { ...filters, ...over }).length

  const toggle = (key: string, list: string[], value: string) => {
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    patch({ [key]: next })
  }

  const onPrice = useCallback(
    (min: number | null, max: number | null) => {
      patch({ [P.min]: min === null ? null : String(min), [P.max]: max === null ? null : String(max) })
    },
    [patch]
  )

  return (
    <div className="rounded-2xl border border-hairline bg-graphite/50 px-3 py-1 sm:px-4">
      <Group id={`${scope}-categoria`} title="Categoría" badge={filters.cat.length}>
        {CAT_OPTIONS.map((c) => (
          <CheckRow
            key={c.id}
            label={c.name}
            checked={filters.cat.includes(c.id)}
            count={countWith({ cat: [c.id] })}
            onChange={() => toggle(P.cat, filters.cat, c.id)}
          />
        ))}
      </Group>

      <Group id={`${scope}-marca`} title="Marca" badge={filters.brand.length}>
        {FACETS.brands.map((b) => (
          <CheckRow
            key={b}
            label={b}
            checked={filters.brand.includes(b)}
            count={countWith({ brand: [b] })}
            onChange={() => toggle(P.brand, filters.brand, b)}
          />
        ))}
      </Group>

      <Group id={`${scope}-estado`} title="Estado" badge={filters.condition.length}>
        {CONDITION_OPTIONS.map((c) => (
          <CheckRow
            key={c}
            label={CONDITION_LABEL[c] ?? c}
            checked={filters.condition.includes(c)}
            count={countWith({ condition: [c] })}
            onChange={() => toggle(P.condition, filters.condition, c)}
          />
        ))}
        <p className="px-2 pb-1 pt-2 text-[11.5px] leading-relaxed text-silver-700">
          También conseguimos equipos usados y seminuevos: escríbenos y confirmamos disponibilidad y precio por
          WhatsApp.
        </p>
      </Group>

      {FACETS.capacities.length > 0 ? (
        <Group id={`${scope}-capacidad`} title="Capacidad" badge={filters.capacity.length}>
          {FACETS.capacities.map((c) => (
            <CheckRow
              key={c}
              label={c}
              checked={filters.capacity.includes(c)}
              count={countWith({ capacity: [c] })}
              onChange={() => toggle(P.capacity, filters.capacity, c)}
            />
          ))}
        </Group>
      ) : (
        <div className="border-t border-hairline py-4">
          <div className="flex min-h-[44px] items-center justify-between gap-3">
            <span className="font-display text-[15px] font-extrabold tracking-tightest text-silver-700">Capacidad</span>
            <span className="badge badge-muted">A consultar</span>
          </div>
          <p className="text-[11.5px] leading-relaxed text-silver-700">
            Todavía no publicamos las capacidades en la página. Se confirma por WhatsApp.
          </p>
        </div>
      )}

      <Group id={`${scope}-disponibilidad`} title="Disponibilidad" badge={filters.onlyAvailable ? 1 : 0}>
        <CheckRow
          label="Solo disponibles"
          checked={filters.onlyAvailable}
          count={countWith({ onlyAvailable: true })}
          onChange={() => patch({ [P.available]: filters.onlyAvailable ? null : '1' })}
        />
      </Group>

      <Group
        id={`${scope}-precio`}
        title="Precio"
        badge={filters.price[0] !== null || filters.price[1] !== null ? 1 : 0}
      >
        <PriceFilter scope={scope} value={filters.price} onChange={onPrice} />
      </Group>
    </div>
  )
}

/* --------------------------------------------------------- grupo plegable */

interface GroupProps {
  id: string
  title: string
  badge?: number
  children: ReactNode
}

function Group({ id, title, badge = 0, children }: GroupProps) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-t border-hairline py-2 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 text-left"
      >
        <span className="font-display text-[15px] font-extrabold tracking-tightest text-silver-100">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {badge > 0 && <span className="badge badge-gold">{badge}</span>}
          <ChevronDown
            size={16}
            aria-hidden
            className={`text-silver-500 transition-transform duration-300 ease-premium ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      {open && (
        <div id={id} className="pb-2">
          {children}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------ casilla de filtro */

interface CheckRowProps {
  label: string
  checked: boolean
  count: number
  onChange: () => void
}

function CheckRow({ label, checked, count, onChange }: CheckRowProps) {
  return (
    <label className="group flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-2 transition-colors duration-300 ease-premium hover:bg-white/[0.04]">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border transition-all duration-300 ease-premium peer-focus-visible:ring-2 peer-focus-visible:ring-gold-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-graphite ${
          checked
            ? 'border-gold-500 bg-gold-metal text-ink'
            : 'border-hairline bg-white/[0.05] text-transparent group-hover:border-silver-700'
        }`}
      >
        <Check size={12} strokeWidth={3.5} />
      </span>
      <span className={`min-w-0 flex-1 truncate text-[13.5px] ${checked ? 'text-silver-100' : 'text-silver-500'}`}>
        {label}
      </span>
      <span className="shrink-0 text-[12px] tabular-nums text-silver-700">{count}</span>
    </label>
  )
}

/* --------------------------------------------------------- rango de precio */

interface PriceProps {
  scope: string
  value: [number | null, number | null]
  onChange: (min: number | null, max: number | null) => void
}

function PriceFilter({ scope, value, onChange }: PriceProps) {
  const [vMin, vMax] = value
  const [min, setMin] = useState(vMin === null ? '' : String(vMin))
  const [max, setMax] = useState(vMax === null ? '' : String(vMax))

  useEffect(() => {
    setMin(vMin === null ? '' : String(vMin))
  }, [vMin])

  useEffect(() => {
    setMax(vMax === null ? '' : String(vMax))
  }, [vMax])

  useEffect(() => {
    const nextMin = toNumber(min)
    const nextMax = toNumber(max)
    if (nextMin === vMin && nextMax === vMax) return
    const t = window.setTimeout(() => onChange(nextMin, nextMax), 450)
    return () => window.clearTimeout(t)
  }, [min, max, vMin, vMax, onChange])

  const field =
    'h-11 w-full rounded-xl border border-hairline bg-white/[0.04] pl-7 pr-3 text-[13.5px] text-silver-100 outline-none transition-colors duration-300 ease-premium placeholder:text-silver-700 focus:border-gold-500/50 focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-graphite'

  return (
    <div className="px-2 pb-1">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor={`${scope}-precio-min`} className="mb-1.5 block text-[11.5px] text-silver-700">
            Mínimo
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-silver-700">
              $
            </span>
            <input
              id={`${scope}-precio-min`}
              type="number"
              inputMode="numeric"
              min={0}
              step={50000}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="0"
              className={field}
            />
          </div>
        </div>
        <div>
          <label htmlFor={`${scope}-precio-max`} className="mb-1.5 block text-[11.5px] text-silver-700">
            Máximo
          </label>
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-silver-700">
              $
            </span>
            <input
              id={`${scope}-precio-max`}
              type="number"
              inputMode="numeric"
              min={0}
              step={50000}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="Sin tope"
              className={field}
            />
          </div>
        </div>
      </div>
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-silver-700">
        Los productos sin precio publicado siempre aparecen en los resultados.
      </p>
    </div>
  )
}
