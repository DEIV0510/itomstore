import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  History,
  Package,
  Repeat2,
  RefreshCw,
  ShoppingBag,
  Users2,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatCOP } from '@/lib/format'
import { Empty, ErrorNote, Loading, OkNote, PageHead, Panel, Pill, SubmitButton } from '../ui/kit'

/* =========================================================================
   Panel de resumen.

   Cada cifra de esta pagina sale de GET /api/stats, que solo hace COUNT y SUM
   contra la base. Aqui no se estima, no se proyecta y no se rellena nada: si
   una cifra es 0 se muestra 0, y si la serie de pedidos esta vacia se avisa en
   vez de dibujar una grafica de mentira.
   ========================================================================= */

interface DayPoint {
  day: string
  count: number
  total: number
}

interface Stats {
  products: { total: number; published: number; draft: number; featured: number; noPrice: number }
  stock: { tracked: number; low: number; out: number }
  orders: { total: number; byStatus: Record<string, number>; revenue: number; last30: number }
  tradeins: { total: number; byStatus: Record<string, number> }
  customers: { total: number }
  categories: { total: number; active: number }
  series: { orders: DayPoint[] }
}

interface ActivityRow {
  id: number
  userId: number | null
  userName: string | null
  action: string
  entity: string | null
  entityId: string | null
  createdAt: string
}

/* ------------------------------------------------------------- utilidades */

const num = (n: number) => n.toLocaleString('es-CO')

/**
 * SQLite guarda las fechas como "2026-08-21 14:03:00" en UTC. Sin la Z el
 * navegador las leeria como hora local y el "hace un momento" saldria mal.
 */
function toDate(value: string | null): Date | null {
  if (!value) return null
  const iso = /[TZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}Z`
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "hace 5 minutos" en español, sin librerias. */
function relativeTime(value: string | null): string {
  const d = toDate(value)
  if (!d) return 'sin fecha'
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 45) return 'hace un momento'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`

  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} ${days === 1 ? 'día' : 'días'}`

  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`

  const years = Math.floor(months / 12)
  return `hace ${years} ${years === 1 ? 'año' : 'años'}`
}

function fullDate(value: string | null): string {
  const d = toDate(value)
  return d ? d.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }) : 'sin fecha'
}

/** "2026-08-21" -> "21/8" (etiqueta corta del eje X). */
function dayShort(day: string): string {
  const d = toDate(`${day} 00:00:00`)
  return d ? d.toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric', timeZone: 'UTC' }) : day
}

/** "2026-08-21" -> "21 de agosto" (tooltip y resumen para lectores de pantalla). */
function dayLong(day: string): string {
  const d = toDate(`${day} 00:00:00`)
  return d ? d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : day
}

/** Ancho real del contenedor: asi el SVG se dibuja 1 unidad = 1 pixel y el texto no se deforma. */
function useMeasure<T extends HTMLElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}

/* ------------------------------------------------------------- indicadores */

function Kpi({
  label,
  value,
  hint,
  to,
  linkLabel,
  allowed,
  icon: Icon,
}: {
  label: string
  value: number
  hint: string
  to: string
  linkLabel: string
  allowed: boolean
  icon: LucideIcon
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-silver-700">{label}</span>
        <Icon size={16} aria-hidden strokeWidth={1.9} className="shrink-0 text-gold-500/70" />
      </span>
      <span className="mt-3 block font-display text-3xl font-extrabold tabular-nums tracking-tightest text-silver-100 sm:text-4xl">
        {num(value)}
      </span>
      <span className="mt-1 block text-[12px] leading-relaxed text-silver-500">{hint}</span>
      {allowed ? (
        <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-gold-400">
          {linkLabel}
          <ArrowRight size={13} aria-hidden />
        </span>
      ) : (
        <span className="mt-3 block text-[12px] text-silver-700">Tu rol no tiene acceso a esta sección.</span>
      )}
    </>
  )

  return (
    <Panel className="transition-colors duration-300 hover:border-gold-500/35">
      {allowed ? (
        <Link
          to={to}
          className="block rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 sm:p-5"
        >
          {body}
        </Link>
      ) : (
        <div className="p-4 sm:p-5">{body}</div>
      )}
    </Panel>
  )
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-hairline bg-ink/40 px-3 py-3">
      <p className="font-display text-xl font-extrabold tabular-nums tracking-tightest text-silver-100">{num(value)}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-silver-500">{label}</p>
    </div>
  )
}

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-[44px] items-center gap-1.5 text-[12.5px] font-semibold text-gold-400 transition-colors hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60"
    >
      {children}
      <ArrowRight size={13} aria-hidden />
    </Link>
  )
}

function PanelHead({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-[15px] font-extrabold tracking-tightest text-silver-100">
      <Icon size={16} aria-hidden strokeWidth={1.9} className="shrink-0 text-gold-500/70" />
      {title}
    </h2>
  )
}

/* ----------------------------------------------------------------- grafica */

/**
 * Barras de pedidos por dia. Solo se monta cuando hay al menos un pedido en la
 * ventana: el caso vacio lo resuelve el <Empty> de arriba.
 */
function OrdersChart({ series }: { series: DayPoint[] }) {
  const raw = useId()
  const gid = `dash-${raw.replace(/:/g, '')}`
  const titleId = `${gid}-title`
  const [ref, width] = useMeasure<HTMLDivElement>()

  const w = Math.max(260, Math.round(width))
  const h = w < 420 ? 168 : 208
  const padTop = 14
  const padBottom = 26
  const plotH = h - padTop - padBottom
  const baseY = padTop + plotH

  const n = series.length
  const gap = n > 1 ? Math.max(3, Math.min(10, Math.round(w / (n * 6)))) : 0
  const bw = (w - gap * (n - 1)) / n
  const max = series.reduce((m, d) => Math.max(m, d.count), 0)
  const totalCount = series.reduce((m, d) => m + d.count, 0)
  const every = Math.max(1, Math.ceil(n / (w < 420 ? 4 : 7)))
  const fontSize = w < 420 ? 9 : 11

  const peak = series.reduce((best, d) => (d.count > best.count ? d : best), series[0])
  const summary = `Pedidos por día entre el ${dayLong(series[0].day)} y el ${dayLong(
    series[n - 1].day
  )}: ${totalCount} ${totalCount === 1 ? 'pedido' : 'pedidos'} en total. El día más alto fue el ${dayLong(
    peak.day
  )} con ${peak.count} ${peak.count === 1 ? 'pedido' : 'pedidos'}.`

  return (
    <div>
      <div ref={ref} className="min-h-[168px] overflow-hidden">
        {width > 0 && (
          <svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            role="img"
            aria-labelledby={titleId}
            className="block max-w-full"
          >
            <title id={titleId}>Pedidos por día de los últimos {n} días</title>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F3E3B6" />
                <stop offset="55%" stopColor="#C9A227" />
                <stop offset="100%" stopColor="#7C6120" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {series.map((d, i) => {
              const x = i * (bw + gap)
              const bh = d.count > 0 ? Math.max(3, (d.count / max) * plotH) : 0
              const showLabel = (n - 1 - i) % every === 0
              const cx = Math.min(Math.max(x + bw / 2, fontSize * 1.4), w - fontSize * 1.4)
              return (
                <g key={d.day}>
                  {bh > 0 && (
                    <rect
                      x={x}
                      y={baseY - bh}
                      width={bw}
                      height={bh}
                      rx={Math.min(4, bw / 2)}
                      fill={`url(#${gid})`}
                    >
                      <title>{`${dayLong(d.day)}: ${d.count} ${d.count === 1 ? 'pedido' : 'pedidos'}`}</title>
                    </rect>
                  )}
                  {showLabel && (
                    <text x={cx} y={h - 8} textAnchor="middle" fontSize={fontSize} fill="#7E838D">
                      {dayShort(d.day)}
                    </text>
                  )}
                </g>
              )
            })}

            <line x1="0" y1={baseY + 0.5} x2={w} y2={baseY + 0.5} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          </svg>
        )}
      </div>
      <p className="sr-only">{summary}</p>
      <p className="mt-2 text-[12px] text-silver-500">
        {totalCount === 1 ? '1 pedido' : `${num(totalCount)} pedidos`} en la ventana · día más alto:{' '}
        {dayLong(peak.day)} con {peak.count === 1 ? '1 pedido' : `${num(peak.count)} pedidos`}.
      </p>
    </div>
  )
}

/* --------------------------------------------------------------- la pagina */

export default function Dashboard() {
  const { can } = useAuth()

  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const [s, a] = await Promise.allSettled([
        api.get<Stats>('/stats'),
        api.get<ActivityRow[]>('/stats/activity'),
      ])

      if (s.status === 'fulfilled') {
        setStats(s.value)
        setError(null)
      } else {
        setError(s.reason instanceof Error ? s.reason.message : 'No pudimos cargar las cifras del panel.')
      }

      if (a.status === 'fulfilled') {
        setActivity(Array.isArray(a.value) ? a.value : [])
        setActivityError(null)
      } else {
        setActivityError(a.reason instanceof Error ? a.reason.message : 'No pudimos cargar la actividad reciente.')
      }
    } finally {
      setBusy(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const today = new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })
  const series = stats?.series.orders ?? []
  const seriesTotal = series.reduce((n, d) => n + d.count, 0)
  const pendingTradeins = stats?.tradeins.byStatus.nueva ?? 0
  const pendingOrders = stats?.orders.byStatus.pendiente ?? 0

  return (
    <div>
      <PageHead
        title="Panel"
        subtitle={`Resumen de la tienda · ${today}`}
        actions={
          <SubmitButton type="button" busy={busy} onClick={() => void load()} className="btn btn-sm btn-ghost">
            {!busy && <RefreshCw size={15} aria-hidden />}
            Actualizar
          </SubmitButton>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {loading && !stats ? (
        <Loading label="Cargando las cifras…" />
      ) : !stats ? (
        <Empty
          title="Sin cifras que mostrar"
          hint="No pudimos leer los datos del panel. Vuelve a intentarlo."
          action={
            <SubmitButton type="button" busy={busy} onClick={() => void load()}>
              Reintentar
            </SubmitButton>
          }
        />
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {/* ------------------------------------------------ indicadores */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi
              label="Productos publicados"
              value={stats.products.published}
              hint={`${num(stats.products.total)} en el catálogo completo`}
              to="/admin/productos"
              linkLabel="Ver productos"
              allowed={can('products')}
              icon={Package}
            />
            <Kpi
              label="Pedidos"
              value={stats.orders.total}
              hint={`${num(stats.orders.last30)} en los últimos 30 días · ${num(pendingOrders)} pendientes`}
              to="/admin/pedidos"
              linkLabel="Ver pedidos"
              allowed={can('orders')}
              icon={ShoppingBag}
            />
            <Kpi
              label="Permutas"
              value={stats.tradeins.total}
              hint={`${num(pendingTradeins)} sin revisar`}
              to="/admin/permutas"
              linkLabel="Ver permutas"
              allowed={can('tradeins')}
              icon={Repeat2}
            />
            <Kpi
              label="Clientes"
              value={stats.customers.total}
              hint="Las fichas se crean solas con cada pedido o permuta"
              to="/admin/clientes"
              linkLabel="Ver clientes"
              allowed={can('customers')}
              icon={Users2}
            />
          </div>

          {/* ------------------------------------ inventario / por resolver */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="p-4 sm:p-5">
              <PanelHead title="Inventario" icon={Boxes} />
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                <Metric value={stats.stock.tracked} label="Con control de stock" />
                <Metric value={stats.stock.low} label="Poco stock (1 a 3)" />
                <Metric value={stats.stock.out} label="Agotados" />
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-silver-700">
                {stats.stock.tracked === 0
                  ? 'Ningún producto tiene existencias cargadas todavía: el stock queda “sin definir” hasta que lo escribas.'
                  : 'Los productos sin existencias cargadas no entran en estas cifras.'}
              </p>
              {can('products') && <SectionLink to="/admin/inventario">Abrir inventario</SectionLink>}
            </Panel>

            <Panel className="p-4 sm:p-5">
              <PanelHead title="Por resolver" icon={Package} />
              {stats.products.noPrice === 0 && stats.products.draft === 0 ? (
                <div className="mt-4">
                  <OkNote>Todo el catálogo está publicado y con precio. Nada pendiente por aquí.</OkNote>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                  <Metric value={stats.products.noPrice} label="Sin precio publicado" />
                  <Metric value={stats.products.draft} label="En borrador" />
                </div>
              )}
              <p className="mt-3 text-[12px] leading-relaxed text-silver-700">
                Un producto sin precio se muestra en la tienda como “Precio a consultar”. Un borrador no se ve.
              </p>
              {can('products') && <SectionLink to="/admin/productos">Abrir productos</SectionLink>}
            </Panel>
          </div>

          {/* ---------------------------------------- grafica e ingresos */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="p-4 sm:p-5 lg:col-span-2">
              <PanelHead title="Pedidos de los últimos 14 días" icon={ShoppingBag} />
              <div className="mt-4">
                {seriesTotal === 0 ? (
                  <Empty title="Todavía no hay suficientes datos para mostrar estadísticas." />
                ) : (
                  <OrdersChart series={series} />
                )}
              </div>
            </Panel>

            <Panel className="p-4 sm:p-5">
              <PanelHead title="Ingresos" icon={Wallet} />
              {stats.orders.revenue === 0 ? (
                <p className="mt-4 text-[14px] leading-relaxed text-silver-300">Sin pedidos entregados todavía.</p>
              ) : (
                <p className="mt-4 font-display text-2xl font-extrabold tabular-nums tracking-tightest text-gold-metal sm:text-3xl">
                  {formatCOP(stats.orders.revenue)}
                </p>
              )}
              <p className="mt-2 text-[12px] leading-relaxed text-silver-700">
                Solo cuenta los pedidos marcados como <strong className="font-semibold">entregados</strong>. Los
                pendientes, confirmados o enviados no suman.
              </p>
              {can('orders') && <SectionLink to="/admin/pedidos">Ver pedidos</SectionLink>}
            </Panel>
          </div>

          {/* --------------------------------------------------- actividad */}
          <Panel className="p-4 sm:p-5">
            <PanelHead title="Actividad reciente" icon={History} />

            {activityError && (
              <div className="mt-4">
                <ErrorNote>{activityError}</ErrorNote>
              </div>
            )}

            {activity.length === 0 ? (
              <div className="mt-4">
                <Empty
                  title="Sin movimientos registrados"
                  hint="Cada cambio que hagas en el panel y cada pedido que entre desde la tienda quedará anotado aquí."
                />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-hairline">
                {activity.map((row) => (
                  <li key={row.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <p className="min-w-0 text-[13px] leading-relaxed text-silver-300">
                      <span className="font-semibold text-silver-100">{row.userName ?? 'Sistema'}</span> {row.action}
                      {row.entityId && <span className="text-silver-700"> · {row.entityId}</span>}
                    </p>
                    <span className="flex shrink-0 items-center gap-2">
                      {row.entity && <Pill>{row.entity}</Pill>}
                      <time
                        dateTime={toDate(row.createdAt)?.toISOString()}
                        title={fullDate(row.createdAt)}
                        className="text-[12px] text-silver-700"
                      >
                        {relativeTime(row.createdAt)}
                      </time>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}
