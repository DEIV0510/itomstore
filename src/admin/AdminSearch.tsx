import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Boxes, Package, Repeat2, Search, ShoppingBag, Users2, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useShop } from '@/lib/shop'
import { norm } from '@/lib/filters'
import { priceLabel } from '@/lib/format'
import { useEscape } from '@/hooks/useEscape'
import { useLockScroll } from '@/hooks/useLockScroll'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { Empty, ErrorNote, Loading, useDebounced } from './ui/kit'

/* =========================================================================
   Buscador global del panel.

   Mira a la vez en el catalogo (ya cargado en memoria) y en tres tablas de la
   API. Cada consulta lleva un numero de turno: si el usuario sigue escribiendo,
   la respuesta vieja se descarta y nunca pisa a la nueva. Si un area falla, las
   demas siguen funcionando y el fallo se cuenta con el mensaje real del
   servidor: nada se pierde en silencio.
   ========================================================================= */

const MIN_CHARS = 2
const PER_GROUP = 5

type GroupKey = 'productos' | 'pedidos' | 'clientes' | 'permutas'
type RemoteKey = Exclude<GroupKey, 'productos'>

interface GroupMeta {
  label: string
  icon: LucideIcon
  /** area de permisos que valida el servidor (ver useAuth().can) */
  area: string
  path: string
}

const GROUPS: Record<GroupKey, GroupMeta> = {
  productos: { label: 'Productos', icon: Package, area: 'products', path: '/admin/productos' },
  pedidos: { label: 'Pedidos', icon: ShoppingBag, area: 'orders', path: '/admin/pedidos' },
  clientes: { label: 'Clientes', icon: Users2, area: 'customers', path: '/admin/clientes' },
  permutas: { label: 'Permutas', icon: Repeat2, area: 'tradeins', path: '/admin/permutas' },
}

const ORDER_STATUS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  preparacion: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const TRADEIN_STATUS: Record<string, string> = {
  nueva: 'Nueva',
  revision: 'En revisión',
  cotizada: 'Cotizada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  finalizada: 'Finalizada',
}

/* --------------------------------------------------- respuestas de la API */

interface OrderRow {
  id: number
  code: string
  status: string
  customer: { id: number; name: string; whatsapp: string | null; city: string | null } | null
  itemCount: number
}

interface CustomerRow {
  id: number
  name: string
  whatsapp: string
  city: string | null
  orders: number
}

interface TradeinRow {
  id: number
  code: string
  name: string
  device: string
  status: string
}

/** Estado inicial de la capa: atajos a las secciones que el usuario puede abrir. */
const SECTIONS: { label: string; to: string; icon: LucideIcon; area: string }[] = [
  { label: 'Productos', to: '/admin/productos', icon: Package, area: 'products' },
  { label: 'Inventario', to: '/admin/inventario', icon: Boxes, area: 'products' },
  { label: 'Pedidos', to: '/admin/pedidos', icon: ShoppingBag, area: 'orders' },
  { label: 'Permutas', to: '/admin/permutas', icon: Repeat2, area: 'tradeins' },
  { label: 'Clientes', to: '/admin/clientes', icon: Users2, area: 'customers' },
]

/** Un resultado ya listo para pintar. */
interface Hit {
  id: string
  title: string
  detail: string
  to: string
}

type Remote = Record<RemoteKey, Hit[]>

const NO_RESULTS: Remote = { pedidos: [], clientes: [], permutas: [] }

/**
 * Cada resultado lleva a la seccion donde vive ese registro. No se anade ?q=
 * porque las secciones todavia no leen el termino de la URL: un parametro que
 * nadie aplica haria creer que la lista llega filtrada.
 */
const to = (key: GroupKey) => GROUPS[key].path

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export default function AdminSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { can } = useAuth()
  const { products } = useShop()

  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<Remote>(NO_RESULTS)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  /** turno de consulta: solo la respuesta del ultimo turno se pinta */
  const turn = useRef(0)

  const debounced = useDebounced(query, 250)
  /** Lo escrito manda sobre el retardo: al borrar el campo los resultados se van al instante. */
  const typed = query.trim()
  const term = typed.length < MIN_CHARS ? '' : debounced.trim()

  const canProducts = can(GROUPS.productos.area)
  const canOrders = can(GROUPS.pedidos.area)
  const canCustomers = can(GROUPS.clientes.area)
  const canTradeins = can(GROUPS.permutas.area)

  useLockScroll(open)
  useEscape(open, onClose)
  useFocusTrap(open, panelRef)

  /* el foco entra en el campo en cuanto se abre la capa */
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  /* al cerrar se limpia todo y se invalida cualquier consulta en vuelo */
  useEffect(() => {
    if (open) return
    turn.current += 1
    setQuery('')
    setRemote(NO_RESULTS)
    setFailed(null)
    setBusy(false)
  }, [open])

  /* ------------------------------------------------ catalogo (en memoria) */

  const productHits = useMemo<Hit[]>(() => {
    if (!canProducts || term.length < MIN_CHARS) return []
    const needle = norm(term)
    const hits: Hit[] = []
    for (const p of products) {
      const match =
        norm(p.name).includes(needle) ||
        norm(p.brand).includes(needle) ||
        (p.sku ? norm(p.sku).includes(needle) : false)
      if (!match) continue
      hits.push({
        id: p.id,
        title: p.name,
        detail: `${p.brand} · ${priceLabel(p.price)}`,
        to: to('productos'),
      })
      if (hits.length === PER_GROUP) break
    }
    return hits
  }, [products, term, canProducts])

  /* ---------------------------------------------------- pedidos / clientes
     / permutas: tres consultas en paralelo, tolerantes a fallos */

  useEffect(() => {
    if (!open) return

    if (term.length < MIN_CHARS) {
      turn.current += 1
      setRemote(NO_RESULTS)
      setFailed(null)
      setBusy(false)
      return
    }

    const q = `?q=${encodeURIComponent(term)}`
    const jobs: { key: RemoteKey; label: string; run: Promise<Hit[]> }[] = []

    if (canOrders) {
      jobs.push({
        key: 'pedidos',
        label: GROUPS.pedidos.label,
        run: api.get<{ orders: OrderRow[] }>(`/orders${q}`).then((r) =>
          (r.orders ?? []).slice(0, PER_GROUP).map((o) => ({
            id: String(o.id),
            title: o.code,
            detail: `${o.customer?.name ?? 'Sin cliente registrado'} · ${ORDER_STATUS[o.status] ?? o.status} · ${plural(
              o.itemCount ?? 0,
              'producto',
              'productos'
            )}`,
            to: to('pedidos'),
          }))
        ),
      })
    }

    if (canCustomers) {
      jobs.push({
        key: 'clientes',
        label: GROUPS.clientes.label,
        run: api.get<{ customers: CustomerRow[] }>(`/customers${q}`).then((r) =>
          (r.customers ?? []).slice(0, PER_GROUP).map((c) => ({
            id: String(c.id),
            title: c.name,
            detail: `${c.whatsapp}${c.city ? ` · ${c.city}` : ''} · ${plural(c.orders ?? 0, 'pedido', 'pedidos')}`,
            to: to('clientes'),
          }))
        ),
      })
    }

    if (canTradeins) {
      jobs.push({
        key: 'permutas',
        label: GROUPS.permutas.label,
        run: api.get<{ tradeins: TradeinRow[] }>(`/tradeins${q}`).then((r) =>
          (r.tradeins ?? []).slice(0, PER_GROUP).map((t) => ({
            id: String(t.id),
            title: `${t.code} · ${t.device}`,
            detail: `${t.name} · ${TRADEIN_STATUS[t.status] ?? t.status}`,
            to: to('permutas'),
          }))
        ),
      })
    }

    if (!jobs.length) {
      setRemote(NO_RESULTS)
      setFailed(null)
      setBusy(false)
      return
    }

    const mine = ++turn.current
    setBusy(true)

    void Promise.allSettled(jobs.map((j) => j.run)).then((results) => {
      if (mine !== turn.current) return // llego tarde: manda una busqueda mas nueva

      const next: Remote = { ...NO_RESULTS }
      const errors: string[] = []

      results.forEach((res, i) => {
        const job = jobs[i]
        if (res.status === 'fulfilled') next[job.key] = res.value
        else {
          const reason = res.reason
          errors.push(`${job.label}: ${reason instanceof Error ? reason.message : 'no se pudo consultar.'}`)
        }
      })

      setRemote(next)
      setFailed(errors.length ? errors.join(' · ') : null)
      setBusy(false)
    })
  }, [open, term, canOrders, canCustomers, canTradeins])

  /* --------------------------------------------------------------- pintado */

  const groups = useMemo(() => {
    const all: { key: GroupKey; hits: Hit[] }[] = [
      { key: 'productos', hits: productHits },
      { key: 'pedidos', hits: remote.pedidos },
      { key: 'clientes', hits: remote.clientes },
      { key: 'permutas', hits: remote.permutas },
    ]
    return all.filter((g) => can(GROUPS[g.key].area) && g.hits.length > 0)
  }, [productHits, remote, can])

  const total = groups.reduce((n, g) => n + g.hits.length, 0)
  const first = groups[0]?.hits[0]

  const suggestions = SECTIONS.filter((s) => can(s.area))

  function go(path: string) {
    navigate(path)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-ink/85 p-4 backdrop-blur-sm sm:p-6">
      <button type="button" tabIndex={-1} aria-hidden className="fixed inset-0 cursor-default" onClick={onClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Buscar en el panel"
        className="relative mx-auto w-full max-w-2xl rounded-2xl border border-hairline bg-carbon shadow-lift sm:mt-[6vh]"
      >
        {/* ----------------------------------------------------- campo */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (first) go(first.to)
          }}
          className="flex items-center gap-3 border-b border-hairline px-4 py-3"
        >
          <Search size={20} aria-hidden className="shrink-0 text-gold-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar en el panel"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="Busca productos, pedidos, clientes o permutas…"
            className="min-h-[44px] w-full min-w-0 bg-transparent text-[16px] text-silver-100 placeholder:text-silver-700 focus-visible:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              aria-label="Borrar lo escrito"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-silver-500 transition-colors hover:text-silver-100"
            >
              <X size={15} aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar el buscador"
            className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-silver-700 transition-colors hover:border-gold-500/40 hover:text-silver-300 sm:flex"
          >
            Esc
          </button>
        </form>

        {/* -------------------------------------------------- resultados */}
        <div className="max-h-[65vh] overflow-y-auto px-3 py-3">
          <p role="status" aria-live="polite" className="sr-only">
            {term.length < MIN_CHARS
              ? 'Escribe al menos dos letras para buscar.'
              : busy
                ? 'Buscando…'
                : `${plural(total, 'resultado', 'resultados')} para ${term}.`}
          </p>

          {failed && (
            <div className="mb-3">
              <ErrorNote>{failed}</ErrorNote>
            </div>
          )}

          {term.length < MIN_CHARS ? (
            <div className="px-1 pb-1">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-silver-700">
                Ir a una sección
              </p>
              <ul className="space-y-0.5">
                {suggestions.map((s) => (
                  <li key={s.to}>
                    <button
                      type="button"
                      onClick={() => go(s.to)}
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-[13.5px] font-medium text-silver-300 transition-colors duration-200 hover:bg-white/[0.05] hover:text-silver-100"
                    >
                      <s.icon size={16} aria-hidden strokeWidth={1.9} className="shrink-0 text-silver-700" />
                      <span className="min-w-0 flex-1 truncate">{s.label}</span>
                      <ArrowRight size={14} aria-hidden className="shrink-0 text-silver-700" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 px-2 text-[12px] leading-relaxed text-silver-700">
                O escribe el nombre de un producto, el código de un pedido o permuta, o el nombre o WhatsApp de un
                cliente.
              </p>
            </div>
          ) : busy && total === 0 ? (
            <Loading label="Buscando…" />
          ) : total === 0 ? (
            <Empty
              title="Sin resultados"
              hint={`Nada coincide con “${term}”. Prueba con el código completo del pedido, el nombre del cliente o el nombre del producto.`}
            />
          ) : (
            <div className="space-y-4">
              {groups.map((g) => {
                const meta = GROUPS[g.key]
                return (
                  <section key={g.key} aria-label={meta.label}>
                    <p className="mb-1.5 flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-silver-700">
                      <meta.icon size={13} aria-hidden strokeWidth={2} />
                      {meta.label}
                      <span className="text-gold-500">{g.hits.length}</span>
                    </p>
                    <ul className="space-y-0.5">
                      {g.hits.map((hit) => (
                        <li key={`${g.key}-${hit.id}`}>
                          <button
                            type="button"
                            onClick={() => go(hit.to)}
                            className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-200 hover:bg-white/[0.05]"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-medium text-silver-100">
                                {hit.title}
                              </span>
                              <span className="mt-0.5 block truncate text-[12px] text-silver-500">{hit.detail}</span>
                            </span>
                            <ArrowRight size={14} aria-hidden className="shrink-0 text-silver-700" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
              <p className="px-3 pb-1 text-[11px] text-silver-700">
                Se muestran máximo {PER_GROUP} resultados por sección. Abre la sección para verlos todos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
