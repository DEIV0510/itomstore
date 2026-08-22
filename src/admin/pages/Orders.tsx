import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { MessageCircle, RefreshCw, Search, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useShop } from '@/lib/shop'
import { formatCOP } from '@/lib/format'
import {
  Empty,
  ErrorNote,
  Field,
  Input,
  Loading,
  Modal,
  OkNote,
  PageHead,
  Panel,
  Pill,
  Select,
  SubmitButton,
  Textarea,
  useDebounced,
} from '@/admin/ui/kit'

/* =========================================================================
   Pedidos. Los crea la tienda cuando el cliente cierra el carrito por
   WhatsApp; aqui se consultan y se les cambia el estado.

   Los valores de estado que acepta la API son EXACTAMENTE los de ORDER_STATUSES
   (server/routes/orders.mjs). Aqui se muestran con etiqueta bonita, pero lo que
   viaja al servidor es el valor crudo.
   ========================================================================= */

type OrderStatus = 'pendiente' | 'confirmado' | 'preparacion' | 'enviado' | 'entregado' | 'cancelado'

interface OrderCustomer {
  id: number
  name: string
  whatsapp: string | null
  city: string | null
}

interface OrderItem {
  id: number
  productId: string | null
  name: string
  qty: number
  /** null = producto sin precio publicado: se cotiza por WhatsApp */
  price: number | null
  subtotal: number | null
}

interface Order {
  id: number
  code: string
  customerId: number | null
  customer: OrderCustomer | null
  status: OrderStatus
  city: string | null
  total: number
  /** true = algun renglon va sin precio, asi que el total todavia no es el definitivo */
  hasPending: boolean
  channel: string | null
  note: string | null
  itemCount: number
  unitCount: number
  items?: OrderItem[]
  createdAt: string
  updatedAt: string
}

const STATUSES: { value: OrderStatus; label: string; tone: string }[] = [
  { value: 'pendiente', label: 'Pendiente', tone: 'orange' },
  { value: 'confirmado', label: 'Confirmado', tone: 'gold' },
  { value: 'preparacion', label: 'En preparación', tone: 'violet' },
  { value: 'enviado', label: 'Enviado', tone: 'blue' },
  { value: 'entregado', label: 'Entregado', tone: 'green' },
  { value: 'cancelado', label: 'Cancelado', tone: 'red' },
]

const statusMeta = (value: string) =>
  STATUSES.find((s) => s.value === value) ?? { value: value as OrderStatus, label: value, tone: 'muted' }

/** 7 columnas alineadas: cabecera y filas comparten esta plantilla. */
const COLS = 'xl:grid-cols-[7rem_minmax(0,1fr)_8rem_6rem_9rem_9.5rem_7rem]'

/* ------------------------------------------------------------------ fechas */

/** SQLite guarda 'YYYY-MM-DD HH:MM:SS' en UTC: hay que decirselo a Date. */
function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const raw = value.includes('T') || value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function dateShort(value?: string | null): string {
  const d = parseDate(value)
  return d ? d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' }) : 'Sin fecha'
}

function dateLong(value?: string | null): string {
  const d = parseDate(value)
  return d
    ? d.toLocaleString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Sin fecha'
}

/* --------------------------------------------------------------- whatsapp */

function phonePretty(raw: string): string {
  const d = raw.replace(/[^0-9]/g, '')
  if (d.length === 12 && d.startsWith('57')) return `+57 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`
  return `+${d}`
}

const waLink = (raw: string, message: string) =>
  `https://wa.me/${raw.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`

/* ------------------------------------------------------------------ celdas */

/** En móvil cada dato se lee como «etiqueta: valor»; desde xl es una columna. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 xl:block">
      <span className="shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700 xl:hidden">
        {label}
      </span>
      <span className="block min-w-0 text-right text-[13px] text-silver-300 xl:text-left">{children}</span>
    </div>
  )
}

/* =========================================================================
   Pagina
   ========================================================================= */

export default function Orders() {
  const { settings, refresh } = useShop()

  const [term, setTerm] = useState('')
  const q = useDebounced(term.trim(), 300)
  const [status, setStatus] = useState<'' | OrderStatus>('')
  const [tick, setTick] = useState(0)

  /** `all` trae todos los estados (con la búsqueda aplicada): de ahí salen los conteos. */
  const [all, setAll] = useState<Order[]>([])
  /** `scoped` solo existe cuando hay filtro de estado; lo resuelve la API con ?status=. */
  const [scoped, setScoped] = useState<Order[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)

    const search = q ? `?q=${encodeURIComponent(q)}` : ''
    const base = api.get<{ orders: Order[] }>(`/orders${search}`)
    const filtered: Promise<{ orders: Order[] } | null> = status
      ? api.get<{ orders: Order[] }>(`/orders?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
      : Promise.resolve(null)

    Promise.all([base, filtered])
      .then(([a, b]) => {
        if (!alive) return
        setAll(a.orders ?? [])
        setScoped(b ? b.orders ?? [] : null)
        setError(null)
      })
      .catch((e) => {
        if (!alive) return
        setError(e instanceof ApiError ? e.message : 'No pudimos cargar los pedidos.')
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
        setLoaded(true)
      })

    return () => {
      alive = false
    }
  }, [q, status, tick])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const o of all) map[o.status] = (map[o.status] ?? 0) + 1
    return map
  }, [all])

  const list = status ? scoped ?? [] : all
  const hasFilters = Boolean(q || status)

  /* ------------------------------------------------------------- detalle */

  const [openId, setOpenId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Order | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busyField, setBusyField] = useState<'status' | 'note' | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  useEffect(() => {
    if (openId === null) return
    let alive = true
    setDetailLoading(true)
    setDetail(null)
    setDetailError(null)
    setSaveError(null)
    setSavedMsg(null)

    api
      .get<{ order: Order }>(`/orders/${openId}`)
      .then((r) => {
        if (!alive) return
        setDetail(r.order)
        setNote(r.order.note ?? '')
      })
      .catch((e) => {
        if (!alive) return
        setDetailError(e instanceof ApiError ? e.message : 'No pudimos abrir el pedido.')
      })
      .finally(() => {
        if (alive) setDetailLoading(false)
      })

    return () => {
      alive = false
    }
  }, [openId])

  const save = useCallback(
    async (body: { status?: OrderStatus; note?: string }, field: 'status' | 'note') => {
      if (openId === null) return
      setBusyField(field)
      setSaveError(null)
      setSavedMsg(null)
      try {
        const { order } = await api.patch<{ order: Order }>(`/orders/${openId}`, body)
        setDetail(order)
        setNote(order.note ?? '')
        setSavedMsg(field === 'status' ? 'Estado actualizado.' : 'Nota guardada.')
        setTick((t) => t + 1)
        // confirmar un pedido descuenta stock: la tienda pública tiene que enterarse
        await refresh()
      } catch (e) {
        setSaveError(e instanceof ApiError ? e.message : 'No pudimos guardar el cambio.')
      } finally {
        setBusyField(null)
      }
    },
    [openId, refresh]
  )

  const closeDetail = () => {
    setOpenId(null)
    setDetail(null)
    setDetailError(null)
  }

  /* -------------------------------------------------------------- render */

  return (
    <>
      <PageHead
        title="Pedidos"
        subtitle="Cada pedido nace en la tienda cuando el cliente cierra su carrito por WhatsApp. Aquí lo confirmas y lo sigues hasta la entrega."
        actions={
          <button type="button" onClick={() => setTick((t) => t + 1)} className="btn btn-sm btn-ghost">
            <RefreshCw size={15} aria-hidden />
            Actualizar
          </button>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {/* ---------------------------------------------------- buscador */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
            placeholder="Buscar por código, nombre o WhatsApp…"
            aria-label="Buscar pedidos"
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
          {loading && loaded ? 'Actualizando…' : `${list.length} ${list.length === 1 ? 'pedido' : 'pedidos'}`}
        </p>
      </div>

      {/* ------------------------------------------------ chips de estado */}
      <div className="mb-5 -mx-1 flex flex-wrap gap-2 px-1">
        <StatusChip label="Todos" count={all.length} active={status === ''} onClick={() => setStatus('')} />
        {STATUSES.map((s) => (
          <StatusChip
            key={s.value}
            label={s.label}
            count={counts[s.value] ?? 0}
            active={status === s.value}
            onClick={() => setStatus(s.value)}
          />
        ))}
      </div>

      {/* ------------------------------------------------------- listado */}
      {loading && !loaded ? (
        <Loading label="Cargando pedidos…" />
      ) : list.length === 0 ? (
        hasFilters ? (
          <Empty
            title="Ningún pedido coincide"
            hint="Prueba con otro texto o quita el filtro de estado."
            action={
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setTerm('')
                  setStatus('')
                }}
              >
                Quitar filtros
              </button>
            }
          />
        ) : (
          <Empty
            title="Todavía no hay pedidos"
            hint="Aparecerán aquí cuando un cliente finalice su compra por WhatsApp desde la tienda."
          />
        )
      ) : (
        <Panel className="overflow-hidden">
          <div
            className={`hidden gap-3 border-b border-hairline px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700 xl:grid ${COLS}`}
          >
            <span>Código</span>
            <span>Cliente</span>
            <span>Ciudad</span>
            <span>Artículos</span>
            <span>Total</span>
            <span>Estado</span>
            <span>Fecha</span>
          </div>

          <ul className="divide-y divide-hairline" aria-busy={loading}>
            {list.map((o) => {
              const meta = statusMeta(o.status)
              const city = o.customer?.city ?? o.city
              return (
                <li key={o.id} className="group relative">
                  {/* la fila entera abre el detalle; va detrás del contenido */}
                  <button
                    type="button"
                    onClick={() => setOpenId(o.id)}
                    aria-label={`Ver el detalle del pedido ${o.code}`}
                    className="absolute inset-0 z-0 h-full w-full border border-transparent transition-colors duration-200 hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400/60"
                  />
                  <div
                    className={`pointer-events-none relative z-10 grid gap-2.5 px-4 py-4 xl:items-center xl:gap-3 ${COLS}`}
                  >
                    <div className="flex items-center justify-between gap-3 xl:block">
                      <span className="font-display text-[13px] font-extrabold tracking-tight text-silver-100">
                        {o.code}
                      </span>
                      <span className="xl:hidden">
                        <Pill tone={meta.tone}>{meta.label}</Pill>
                      </span>
                    </div>

                    <Cell label="Cliente">
                      <span className="block truncate text-silver-100">
                        {o.customer?.name ?? 'Sin datos de contacto'}
                      </span>
                      {o.customer?.whatsapp ? (
                        <a
                          href={waLink(
                            o.customer.whatsapp,
                            `Hola ${o.customer.name}, te escribimos de ${settings.brand.name} por tu pedido ${o.code}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pointer-events-auto relative mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-emerald-300 underline-offset-2 hover:underline"
                        >
                          <MessageCircle size={13} aria-hidden />
                          {phonePretty(o.customer.whatsapp)}
                        </a>
                      ) : (
                        <span className="mt-0.5 block text-[12px] text-silver-700">WhatsApp sin registrar</span>
                      )}
                    </Cell>

                    <Cell label="Ciudad">
                      <span className="block truncate">{city || 'Sin definir'}</span>
                    </Cell>

                    <Cell label="Artículos">
                      <span title={`${o.itemCount} ${o.itemCount === 1 ? 'producto' : 'productos'} en el pedido`}>
                        {o.unitCount} uds.
                      </span>
                    </Cell>

                    <Cell label="Total">
                      {o.hasPending ? (
                        <span className="text-gold-300">A cotizar</span>
                      ) : (
                        <span className="font-display font-extrabold text-silver-100">{formatCOP(o.total)}</span>
                      )}
                    </Cell>

                    <div className="hidden xl:block">
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </div>

                    <Cell label="Fecha">
                      <span className="text-silver-500">{dateShort(o.createdAt)}</span>
                    </Cell>
                  </div>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      {/* -------------------------------------------------------- detalle */}
      <Modal
        open={openId !== null}
        onClose={closeDetail}
        wide
        title={detail ? `Pedido ${detail.code}` : 'Pedido'}
      >
        {detailLoading ? (
          <Loading label="Abriendo el pedido…" />
        ) : detailError ? (
          <ErrorNote>{detailError}</ErrorNote>
        ) : detail ? (
          <div className="space-y-5">
            {/* cabecera */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Pill tone={statusMeta(detail.status).tone}>{statusMeta(detail.status).label}</Pill>
              {detail.channel && <Pill>{detail.channel}</Pill>}
              <span className="text-[12px] text-silver-500">Creado el {dateLong(detail.createdAt)}</span>
            </div>

            {/* cliente */}
            <section className="rounded-xl border border-hairline bg-ink/40 p-4">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700">Cliente</h3>
              {detail.customer ? (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-silver-100">{detail.customer.name}</p>
                    <p className="mt-0.5 text-[12px] text-silver-500">
                      {detail.customer.city || detail.city || 'Ciudad sin definir'}
                    </p>
                    {detail.customer.whatsapp && (
                      <p className="mt-0.5 text-[12px] text-silver-500">{phonePretty(detail.customer.whatsapp)}</p>
                    )}
                  </div>
                  {detail.customer.whatsapp ? (
                    <a
                      href={waLink(
                        detail.customer.whatsapp,
                        `Hola ${detail.customer.name}, te escribimos de ${settings.brand.name} por tu pedido ${detail.code}.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-wa shrink-0"
                    >
                      <MessageCircle size={15} aria-hidden />
                      Escribir por WhatsApp
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-[13px] text-silver-500">
                  Este pedido llegó sin número de WhatsApp, así que no hay ficha de cliente asociada.
                </p>
              )}
            </section>

            {/* articulos */}
            <section>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700">
                Artículos ({detail.itemCount})
              </h3>
              <div className="overflow-x-auto rounded-xl border border-hairline">
                <table className="w-full min-w-[26rem] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-hairline text-[10px] uppercase tracking-[0.14em] text-silver-700">
                      <th scope="col" className="px-3 py-2.5 font-semibold">
                        Producto
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-center font-semibold">
                        Cant.
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                        Unitario
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {(detail.items ?? []).map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-3 text-silver-100">{it.name}</td>
                        <td className="px-3 py-3 text-center text-silver-300">{it.qty}</td>
                        <td className="px-3 py-3 text-right text-silver-300">
                          {it.price === null ? <span className="text-gold-300">A cotizar</span> : formatCOP(it.price)}
                        </td>
                        <td className="px-3 py-3 text-right text-silver-100">
                          {it.subtotal === null ? (
                            <span className="text-gold-300">A cotizar</span>
                          ) : (
                            formatCOP(it.subtotal)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-hairline bg-ink/40 px-4 py-3">
                <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-silver-700">Total</span>
                <span className="font-display text-lg font-extrabold text-silver-100">
                  {detail.hasPending ? <span className="text-gold-300">A cotizar</span> : formatCOP(detail.total)}
                </span>
              </div>
              {detail.hasPending && (
                <p className="mt-2 text-[12px] text-silver-700">
                  Hay artículos sin precio publicado. Lo que ya tiene precio suma {formatCOP(detail.total)}; el resto se
                  cierra por WhatsApp.
                </p>
              )}
            </section>

            {saveError && <ErrorNote>{saveError}</ErrorNote>}
            {savedMsg && !saveError && <OkNote>{savedMsg}</OkNote>}

            {/* estado */}
            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <Field label="Estado del pedido">
                  <Select
                    value={detail.status}
                    disabled={busyField !== null}
                    onChange={(e) => void save({ status: e.target.value as OrderStatus }, 'status')}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <p className="mt-2 text-[12px] text-silver-700">
                  Al pasar el pedido a «Confirmado» se descuenta el stock de los productos que lo lleven cargado.
                </p>
                {busyField === 'status' && <p className="mt-1.5 text-[12px] text-gold-300">Guardando el estado…</p>}
              </div>

              <div>
                <Field label="Nota interna" hint="Solo la ve el equipo. No se muestra en la tienda.">
                  <Textarea
                    rows={4}
                    value={note}
                    maxLength={500}
                    disabled={busyField !== null}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Acuerdos, dirección de entrega, forma de pago…"
                  />
                </Field>
                <div className="mt-3 flex items-center gap-3">
                  <SubmitButton
                    type="button"
                    busy={busyField === 'note'}
                    disabled={busyField !== null || note === (detail.note ?? '')}
                    onClick={() => void save({ note }, 'note')}
                  >
                    Guardar nota
                  </SubmitButton>
                  <span className="text-[12px] text-silver-700">{note.length}/500</span>
                </div>
              </div>
            </section>

            <p className="text-[12px] text-silver-700">Última actualización: {dateLong(detail.updatedAt)}</p>
          </div>
        ) : null}
      </Modal>
    </>
  )
}

/* ------------------------------------------------------------------- chips */

function StatusChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 ${
        active
          ? 'border-gold-500/45 bg-gold-500/[0.12] text-gold-200'
          : 'border-hairline text-silver-500 hover:border-gold-500/30 hover:text-silver-100'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
          active ? 'bg-gold-500/20 text-gold-200' : 'bg-white/[0.06] text-silver-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}
