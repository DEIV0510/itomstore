import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ExternalLink, Loader2, Minus, Plus, RefreshCw, Search, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useShop } from '@/lib/shop'
import { norm } from '@/lib/filters'
import type { Product } from '@/lib/types'
import { Empty, ErrorNote, Input, Loading, PageHead, Panel, Pill, useDebounced } from '@/admin/ui/kit'

/* =========================================================================
   Inventario.

   No hay endpoint propio: el stock vive dentro del producto, asi que se lee
   /products?all=1 (incluye borradores) y se escribe con PATCH /products/:id.

   stock === null -> el producto no lleva control de existencias
   stock === 0    -> agotado en la tienda
   ========================================================================= */

type Group = 'todos' | 'sin' | 'bajo' | 'libre'

const LOW_LIMIT = 3

/** 'ok' = con existencias holgadas; solo aparece dentro de «Todos». */
function groupOf(p: Product): 'sin' | 'bajo' | 'libre' | 'ok' {
  const stock = p.stock ?? null
  if (stock === null) return 'libre'
  if (stock <= 0) return 'sin'
  return stock <= LOW_LIMIT ? 'bajo' : 'ok'
}

const GROUPS: { value: Exclude<Group, 'todos'>; label: string; tone: string }[] = [
  { value: 'sin', label: 'Sin stock', tone: 'red' },
  { value: 'bajo', label: 'Stock bajo', tone: 'orange' },
  { value: 'libre', label: 'Sin control', tone: 'muted' },
]

/** 5 columnas alineadas: cabecera y filas comparten esta plantilla. */
const COLS = 'xl:grid-cols-[minmax(0,1fr)_9rem_8rem_13rem_9.5rem]'

export default function Inventory() {
  const { categories, refresh } = useShop()

  const [rows, setRows] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const [term, setTerm] = useState('')
  const q = useDebounced(term.trim(), 250)
  const [group, setGroup] = useState<Group>('todos')

  /** Estado de guardado por producto y mensaje de error de esa fila. */
  const [saving, setSaving] = useState<Record<string, 'saving' | 'ok'>>({})
  const [rowError, setRowError] = useState<Record<string, string>>({})

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const flash = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  /** Valor anterior de cada fila editada, para revertir si la API falla. */
  const previous = useRef<Record<string, number | null>>({})

  /* ------------------------------------------------------------- carga */

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get<{ products: Product[] }>('/products?all=1')
      .then((r) => {
        if (!alive) return
        setRows(r.products ?? [])
        setError(null)
      })
      .catch((e) => {
        if (!alive) return
        setError(e instanceof ApiError ? e.message : 'No pudimos cargar el inventario.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [tick])

  useEffect(() => {
    const pending = timers.current
    const flashes = flash.current
    return () => {
      Object.values(pending).forEach((t) => clearTimeout(t))
      Object.values(flashes).forEach((t) => clearTimeout(t))
    }
  }, [])

  /* ---------------------------------------------------------- guardado */

  const persist = useCallback(
    async (id: string, value: number | null) => {
      setSaving((s) => ({ ...s, [id]: 'saving' }))
      try {
        const { product } = await api.patch<{ product: Product }>(`/products/${id}`, { stock: value })
        delete previous.current[id]
        setRows((list) =>
          // si el usuario siguió tecleando hay otro guardado en camino: no le pisamos el número
          list.map((p) => (p.id === id ? (timers.current[id] ? { ...product, stock: p.stock } : product) : p))
        )
        setSaving((s) => ({ ...s, [id]: 'ok' }))
        clearTimeout(flash.current[id])
        flash.current[id] = setTimeout(() => {
          setSaving((s) => {
            const copy = { ...s }
            delete copy[id]
            return copy
          })
        }, 1800)
        // la tienda pública muestra «agotado» según este dato
        await refresh()
      } catch (e) {
        if (id in previous.current) {
          const back = previous.current[id]
          setRows((list) => list.map((p) => (p.id === id ? { ...p, stock: back } : p)))
          delete previous.current[id]
        }
        setSaving((s) => {
          const copy = { ...s }
          delete copy[id]
          return copy
        })
        setRowError((er) => ({ ...er, [id]: e instanceof ApiError ? e.message : 'No pudimos guardar el stock.' }))
      }
    },
    [refresh]
  )

  /** Cambio optimista + guardado con retardo, para no llamar a la API en cada tecla. */
  const commit = useCallback(
    (id: string, next: number | null) => {
      setRows((list) =>
        list.map((p) => {
          if (p.id !== id) return p
          if (!(id in previous.current)) previous.current[id] = p.stock ?? null
          return { ...p, stock: next }
        })
      )
      setRowError((er) => {
        if (!(id in er)) return er
        const copy = { ...er }
        delete copy[id]
        return copy
      })
      clearTimeout(timers.current[id])
      timers.current[id] = setTimeout(() => {
        delete timers.current[id]
        void persist(id, next)
      }, 500)
    },
    [persist]
  )

  /* ----------------------------------------------------------- filtros */

  const searched = useMemo(() => {
    const needle = norm(q)
    if (!needle) return rows
    return rows.filter((p) => norm(`${p.name} ${p.brand} ${p.sku ?? ''} ${p.id}`).includes(needle))
  }, [rows, q])

  const counts = useMemo(() => {
    const map = { sin: 0, bajo: 0, libre: 0 }
    for (const p of searched) {
      const g = groupOf(p)
      if (g !== 'ok') map[g] += 1
    }
    return map
  }, [searched])

  const list = useMemo(
    () => (group === 'todos' ? searched : searched.filter((p) => groupOf(p) === group)),
    [searched, group]
  )

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? id

  /* ------------------------------------------------------------ render */

  return (
    <>
      <PageHead
        title="Inventario"
        subtitle="Las existencias de cada producto, editables aquí mismo. Cada cambio se guarda solo y la tienda lo refleja al instante."
        actions={
          <button type="button" onClick={() => setTick((t) => t + 1)} className="btn btn-sm btn-ghost">
            <RefreshCw size={15} aria-hidden />
            Actualizar
          </button>
        }
      />

      <Panel className="mb-5 px-4 py-3.5">
        <p className="text-[13px] leading-relaxed text-silver-500">
          El stock es opcional. Si lo dejas vacío, el producto no lleva control de existencias y siempre aparece
          disponible. Con 0 la tienda lo muestra como agotado y no deja agregarlo al carrito.
        </p>
      </Panel>

      {error && (
        <div className="mb-5">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {/* ------------------------------------------------ grupos y buscador */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <GroupCard
          label="Todos"
          count={searched.length}
          tone="gold"
          active={group === 'todos'}
          onClick={() => setGroup('todos')}
        />
        {GROUPS.map((g) => (
          <GroupCard
            key={g.value}
            label={g.label}
            count={counts[g.value]}
            tone={g.tone}
            active={group === g.value}
            onClick={() => setGroup(group === g.value ? 'todos' : g.value)}
          />
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-700"
          />
          <Input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por nombre, marca o SKU…"
            aria-label="Buscar productos en el inventario"
            className="pl-10 pr-12"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm('')}
              aria-label="Limpiar la búsqueda"
              className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-silver-500 transition-colors hover:text-silver-100"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
        <p className="text-[12px] text-silver-700 sm:shrink-0" aria-live="polite">
          {list.length} {list.length === 1 ? 'producto' : 'productos'}
        </p>
      </div>

      {/* ---------------------------------------------------------- tabla */}
      {loading ? (
        <Loading label="Cargando inventario…" />
      ) : rows.length === 0 ? (
        <Empty
          title="Todavía no hay productos"
          hint="El inventario se llena solo: crea productos y aquí podrás controlar sus existencias."
          action={
            <Link to="/admin/productos" className="btn btn-sm btn-gold">
              Ir a productos
            </Link>
          }
        />
      ) : list.length === 0 ? (
        <Empty
          title="Sin resultados en este grupo"
          hint="Cambia de grupo o ajusta la búsqueda para ver otros productos."
          action={
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setGroup('todos')
                setTerm('')
              }}
            >
              Ver todos
            </button>
          }
        />
      ) : (
        <Panel className="overflow-hidden">
          <div
            className={`hidden gap-3 border-b border-hairline px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700 xl:grid ${COLS}`}
          >
            <span>Producto</span>
            <span>Categoría</span>
            <span>Publicación</span>
            <span>Stock</span>
            <span className="text-right">Tienda</span>
          </div>

          <ul className="divide-y divide-hairline">
            {list.map((p) => {
              const stock = p.stock ?? null
              const published = p.published !== false
              const state = saving[p.id]
              const g = groupOf(p)
              return (
                <li key={p.id} className={`grid gap-3 px-4 py-4 xl:items-center ${COLS}`}>
                  {/* producto */}
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-silver-100">{p.name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-silver-700">
                      {p.sku ? `SKU ${p.sku}` : p.brand || p.id}
                    </p>
                  </div>

                  {/* categoria */}
                  <div className="flex items-center justify-between gap-3 xl:block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700 xl:hidden">
                      Categoría
                    </span>
                    <span className="truncate text-[13px] text-silver-300">{categoryName(p.category)}</span>
                  </div>

                  {/* publicacion */}
                  <div className="flex items-center justify-between gap-3 xl:block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700 xl:hidden">
                      Publicación
                    </span>
                    <Pill tone={published ? 'green' : 'muted'}>{published ? 'Publicado' : 'Borrador'}</Pill>
                  </div>

                  {/* stock editable */}
                  <div className="flex items-center justify-between gap-3 xl:block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700 xl:hidden">
                      Stock
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Restar una unidad al stock de ${p.name}`}
                        disabled={stock === null || stock <= 0}
                        onClick={() => commit(p.id, Math.max(0, (stock ?? 0) - 1))}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-hairline text-silver-300 transition-colors hover:border-gold-500/40 hover:text-silver-100 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Minus size={15} aria-hidden />
                      </button>

                      <div className="w-[5rem] shrink-0">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={stock === null ? '' : String(stock)}
                          placeholder="—"
                          aria-label={`Unidades en stock de ${p.name}`}
                          className="text-center"
                          onChange={(e) => {
                            const raw = e.target.value.trim()
                            if (raw === '') return commit(p.id, null)
                            if (/^\d{1,5}$/.test(raw)) commit(p.id, Number(raw))
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        aria-label={`Sumar una unidad al stock de ${p.name}`}
                        onClick={() => commit(p.id, (stock ?? 0) + 1)}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-hairline text-silver-300 transition-colors hover:border-gold-500/40 hover:text-silver-100"
                      >
                        <Plus size={15} aria-hidden />
                      </button>

                      <span className="grid w-5 shrink-0 place-items-center" role="status">
                        {state === 'saving' && <Loader2 size={14} aria-hidden className="animate-spin text-gold-400" />}
                        {state === 'ok' && <Check size={14} aria-hidden className="text-emerald-300" />}
                        <span className="sr-only">
                          {state === 'saving'
                            ? `Guardando el stock de ${p.name}`
                            : state === 'ok'
                              ? `Stock de ${p.name} guardado`
                              : ''}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* enlace a la tienda */}
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/producto/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={
                        published
                          ? `Abrir ${p.name} en la tienda`
                          : 'Está en borrador: en la tienda todavía no aparece publicado.'
                      }
                      className={`btn btn-sm btn-ghost ${published ? '' : 'opacity-60'}`}
                    >
                      <ExternalLink size={14} aria-hidden />
                      Ver en la tienda
                    </a>
                  </div>

                  {/* avisos de la fila, a lo ancho */}
                  {(rowError[p.id] || g === 'sin') && (
                    <div className="xl:col-span-5">
                      {rowError[p.id] ? (
                        <ErrorNote>{rowError[p.id]}</ErrorNote>
                      ) : (
                        <p className="text-[12px] text-silver-700">
                          En 0 unidades: la tienda lo muestra agotado y no permite agregarlo al carrito.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
    </>
  )
}

/* ------------------------------------------------------------ tarjeta chip */

function GroupCard({
  label,
  count,
  tone,
  active,
  onClick,
}: {
  label: string
  count: number
  tone: string
  active: boolean
  onClick: () => void
}) {
  const accents: Record<string, string> = {
    gold: 'text-gold-300',
    red: 'text-red-300',
    orange: 'text-orange-300',
    muted: 'text-silver-300',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[44px] rounded-2xl border px-3.5 py-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 ${
        active ? 'border-gold-500/45 bg-gold-500/[0.10]' : 'border-hairline bg-graphite/70 hover:border-gold-500/25'
      }`}
    >
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700">{label}</span>
      <span className={`mt-1 block font-display text-xl font-extrabold ${accents[tone] ?? accents.muted}`}>{count}</span>
    </button>
  )
}
