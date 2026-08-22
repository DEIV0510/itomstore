import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Search, Trash2, X } from 'lucide-react'
import { ApiError, api } from '@/lib/api'
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
  SubmitButton,
  Textarea,
  useConfirm,
  useDebounced,
} from '@/admin/ui/kit'

/* =========================================================================
   Clientes.

   No se dan de alta a mano: la ficha aparece sola cuando alguien hace un
   pedido o pide una permuta. Aqui solo se consultan, se corrigen y se borran.
   Nada de segmentaciones ni etiquetas inventadas: solo lo que hay en la base.
   ========================================================================= */

/** Tal cual lo devuelve GET /api/customers (ver server/routes/customers.mjs). */
interface Customer {
  id: number
  name: string
  whatsapp: string
  city: string | null
  note: string | null
  /** pedidos del cliente */
  orders: number
  /** suma de los pedidos ENTREGADOS, lo calcula la base */
  totalSpent: number
  lastOrder: string | null
  createdAt: string
}

/** Subconjunto del pedido que necesita la ficha (GET /api/customers/:id). */
interface CustomerOrder {
  id: number
  code: string
  status: string
  total: number
  hasPending: boolean
  itemCount: number
  unitCount: number
  createdAt: string
}

interface Detail {
  customer: Customer
  orders: CustomerOrder[]
}

/** Espejo de ORDER_STATUSES del servidor, solo para pintar la etiqueta. */
const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  pendiente: { label: 'Pendiente', tone: 'orange' },
  confirmado: { label: 'Confirmado', tone: 'blue' },
  preparacion: { label: 'En preparación', tone: 'violet' },
  enviado: { label: 'Enviado', tone: 'gold' },
  entregado: { label: 'Entregado', tone: 'green' },
  cancelado: { label: 'Cancelado', tone: 'red' },
}

const dateFmt = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** SQLite guarda 'YYYY-MM-DD HH:MM:SS' en UTC: hay que marcarlo antes de parsear. */
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}Z` : value
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDate(value: string | null | undefined): string {
  const d = parseDate(value)
  return d ? dateFmt.format(d) : '—'
}

function formatDateTime(value: string | null | undefined): string {
  const d = parseDate(value)
  return d ? dateTimeFmt.format(d) : '—'
}

/** Si nunca ha comprado no se escribe "$0": no hay venta que mostrar. */
const spentLabel = (value: number): string => (value > 0 ? formatCOP(value) : '—')

const waHref = (whatsapp: string): string => `https://wa.me/${whatsapp.replace(/\D+/g, '')}`

export default function Customers() {
  const [q, setQ] = useState('')
  const dq = useDebounced(q, 300)

  const [list, setList] = useState<Customer[]>([])
  const [first, setFirst] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [openId, setOpenId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', city: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState(false)
  const remove = useConfirm()

  /** Token para que una respuesta lenta no pise a la busqueda mas reciente. */
  const reqRef = useRef(0)

  const load = useCallback(async () => {
    const token = ++reqRef.current
    setBusy(true)
    try {
      const path = dq ? `/customers?q=${encodeURIComponent(dq)}` : '/customers'
      const data = await api.get<{ customers: Customer[] }>(path)
      if (token !== reqRef.current) return
      setList(data.customers ?? [])
      setError(null)
    } catch (e) {
      if (token !== reqRef.current) return
      setError(e instanceof ApiError ? e.message : 'No pudimos cargar los clientes.')
    } finally {
      if (token === reqRef.current) {
        setBusy(false)
        setFirst(false)
      }
    }
  }, [dq])

  useEffect(() => {
    void load()
  }, [load])

  /* Ficha completa: se pide al abrir, para no traer todos los pedidos en la lista. */
  useEffect(() => {
    if (openId === null) return
    let alive = true
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    setSaved(false)
    setSaveError(null)

    api
      .get<Detail>(`/customers/${openId}`)
      .then((d) => {
        if (!alive) return
        setDetail(d)
        setForm({ name: d.customer.name, city: d.customer.city ?? '', note: d.customer.note ?? '' })
      })
      .catch((e) => {
        if (alive) setDetailError(e instanceof ApiError ? e.message : 'No pudimos cargar la ficha del cliente.')
      })
      .finally(() => {
        if (alive) setDetailLoading(false)
      })

    return () => {
      alive = false
    }
  }, [openId])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!detail) return
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const { customer } = await api.put<{ customer: Customer }>(`/customers/${detail.customer.id}`, {
        name: form.name,
        city: form.city,
        note: form.note,
      })
      setDetail({ customer, orders: detail.orders })
      setList((rows) => rows.map((r) => (r.id === customer.id ? customer : r)))
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'No pudimos guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: number) {
    if (!remove.ask(`customer-${id}`)) return
    setDeleting(true)
    setSaveError(null)
    try {
      await api.del(`/customers/${id}`)
      setList((rows) => rows.filter((r) => r.id !== id))
      setOpenId(null)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'No pudimos eliminar el cliente.')
    } finally {
      setDeleting(false)
    }
  }

  const armed = detail ? remove.armed === `customer-${detail.customer.id}` : false

  return (
    <div>
      <PageHead
        title="Clientes"
        subtitle="Las fichas se crean solas con cada pedido o solicitud de permuta. El total comprado suma únicamente los pedidos entregados."
      />

      {/* buscador */}
      <div className="mb-5">
        <label className="relative block">
          <span className="sr-only">Buscar clientes por nombre, WhatsApp o ciudad</span>
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-700"
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, WhatsApp o ciudad…"
            className="pl-10"
          />
        </label>
        {!first && !error && (
          <p className="mt-2 text-[12px] text-silver-700" aria-live="polite">
            {busy ? 'Buscando…' : `${list.length} ${list.length === 1 ? 'cliente' : 'clientes'}`}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-5 space-y-3">
          <ErrorNote>{error}</ErrorNote>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      )}

      {first && busy ? (
        <Loading label="Cargando clientes…" />
      ) : list.length === 0 && !error ? (
        dq ? (
          <Empty
            title="Ningún cliente coincide con la búsqueda"
            hint={`No encontramos clientes para «${dq}». Prueba con otro nombre, otro número o revisa la lista completa.`}
            action={
              <button type="button" className="btn btn-sm btn-light" onClick={() => setQ('')}>
                <X size={15} aria-hidden />
                Limpiar búsqueda
              </button>
            }
          />
        ) : (
          <Empty
            title="Todavía no hay clientes registrados."
            hint="Se crean solos cuando alguien hace un pedido o solicita una permuta desde la tienda."
          />
        )
      ) : (
        <Panel className={busy ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {/* escritorio: tabla dentro de su propio contenedor con scroll */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-hairline text-[11px] uppercase tracking-[0.12em] text-silver-700">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    WhatsApp
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Ciudad
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Pedidos
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Total comprado
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Última compra
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b border-hairline/70 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setOpenId(c.id)}
                        aria-haspopup="dialog"
                        className="min-h-[44px] text-left font-semibold text-silver-100 transition-colors hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60"
                      >
                        {c.name}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={waHref(c.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-1.5 text-emerald-300 transition-colors hover:text-emerald-200"
                      >
                        <MessageCircle size={14} aria-hidden />
                        {c.whatsapp}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-silver-500">{c.city ?? 'Sin definir'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-silver-300">{c.orders}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-silver-100">
                      {spentLabel(c.totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-silver-500">{formatDate(c.lastOrder)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* movil: tarjetas apiladas */}
          <ul className="divide-y divide-hairline md:hidden">
            {list.map((c) => (
              <li key={c.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(c.id)}
                    aria-haspopup="dialog"
                    className="min-w-0 flex-1 py-1 text-left"
                  >
                    <span className="block truncate font-display text-[15px] font-extrabold text-silver-100">
                      {c.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-silver-500">
                      {c.city ?? 'Ciudad sin definir'}
                    </span>
                  </button>
                  <a
                    href={waHref(c.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Escribir a ${c.name} por WhatsApp`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                  >
                    <MessageCircle size={17} aria-hidden />
                  </a>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-xl border border-hairline bg-ink/40 px-2 py-2 text-center">
                    <dt className="uppercase tracking-[0.1em] text-silver-700">Pedidos</dt>
                    <dd className="mt-0.5 tabular-nums text-silver-100">{c.orders}</dd>
                  </div>
                  <div className="rounded-xl border border-hairline bg-ink/40 px-2 py-2 text-center">
                    <dt className="uppercase tracking-[0.1em] text-silver-700">Comprado</dt>
                    <dd className="mt-0.5 break-words tabular-nums text-silver-100">{spentLabel(c.totalSpent)}</dd>
                  </div>
                  <div className="rounded-xl border border-hairline bg-ink/40 px-2 py-2 text-center">
                    <dt className="uppercase tracking-[0.1em] text-silver-700">Última</dt>
                    <dd className="mt-0.5 break-words text-silver-100">{formatDate(c.lastOrder)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Modal
        open={openId !== null}
        onClose={() => setOpenId(null)}
        title={detail ? detail.customer.name : 'Ficha del cliente'}
        wide
      >
        {detailLoading && <Loading label="Cargando la ficha…" />}
        {detailError && <ErrorNote>{detailError}</ErrorNote>}

        {detail && (
          <div className="space-y-6">
            {/* resumen real, sin etiquetas inventadas */}
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-hairline bg-ink/40 px-3 py-3">
                <dt className="text-[11px] uppercase tracking-[0.1em] text-silver-700">Pedidos</dt>
                <dd className="mt-1 tabular-nums text-[15px] font-semibold text-silver-100">
                  {detail.customer.orders}
                </dd>
              </div>
              <div className="rounded-xl border border-hairline bg-ink/40 px-3 py-3">
                <dt className="text-[11px] uppercase tracking-[0.1em] text-silver-700">Total comprado</dt>
                <dd className="mt-1 break-words tabular-nums text-[15px] font-semibold text-silver-100">
                  {spentLabel(detail.customer.totalSpent)}
                </dd>
              </div>
              <div className="rounded-xl border border-hairline bg-ink/40 px-3 py-3">
                <dt className="text-[11px] uppercase tracking-[0.1em] text-silver-700">Última compra</dt>
                <dd className="mt-1 text-[13px] text-silver-100">{formatDate(detail.customer.lastOrder)}</dd>
              </div>
              <div className="rounded-xl border border-hairline bg-ink/40 px-3 py-3">
                <dt className="text-[11px] uppercase tracking-[0.1em] text-silver-700">En la base desde</dt>
                <dd className="mt-1 text-[13px] text-silver-100">{formatDate(detail.customer.createdAt)}</dd>
              </div>
            </dl>

            <a
              href={waHref(detail.customer.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-wa w-full sm:w-auto"
            >
              <MessageCircle size={16} aria-hidden />
              Escribir al {detail.customer.whatsapp}
            </a>

            {/* correccion de datos */}
            <form onSubmit={onSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre" required>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    maxLength={80}
                    required
                  />
                </Field>
                <Field label="Ciudad" hint="Déjala vacía si el cliente no la ha dicho.">
                  <Input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    maxLength={60}
                    placeholder="Sin definir"
                  />
                </Field>
              </div>
              <Field label="Nota interna" hint="Solo la ve el panel. Máximo 500 caracteres.">
                <Textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  maxLength={500}
                  placeholder="Sin nota"
                />
              </Field>
              <p className="text-[12px] text-silver-700">
                El WhatsApp <strong className="text-silver-500">{detail.customer.whatsapp}</strong> identifica al
                cliente y no se cambia desde aquí.
              </p>

              {saveError && <ErrorNote>{saveError}</ErrorNote>}
              {saved && <OkNote>Cliente actualizado.</OkNote>}

              <div className="flex flex-wrap items-center gap-2">
                <SubmitButton type="submit" busy={saving}>
                  Guardar cambios
                </SubmitButton>
                <button
                  type="button"
                  className={`btn btn-sm ${armed ? 'btn-light' : 'btn-ghost'}`}
                  onClick={() => void onDelete(detail.customer.id)}
                  disabled={deleting}
                >
                  <Trash2 size={15} aria-hidden />
                  {armed ? 'Pulsa otra vez para eliminar' : 'Eliminar cliente'}
                </button>
              </div>
              {armed && (
                <p className="text-[12px] text-silver-500">
                  Se borra la ficha del cliente. Sus pedidos se conservan y quedan sin cliente asociado.
                </p>
              )}
            </form>

            {/* pedidos del cliente */}
            <div>
              <h3 className="mb-3 font-display text-[15px] font-extrabold text-silver-100">
                Pedidos ({detail.orders.length})
              </h3>
              {detail.orders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-hairline px-4 py-6 text-center text-[13px] text-silver-500">
                  Este cliente aún no tiene pedidos. Puede haber llegado por una solicitud de permuta.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detail.orders.map((o) => {
                    const st = ORDER_STATUS[o.status] ?? { label: o.status, tone: 'muted' }
                    return (
                      <li key={o.id}>
                        <Link
                          to={`/admin/pedidos?q=${encodeURIComponent(o.code)}`}
                          onClick={() => setOpenId(null)}
                          className="flex flex-col gap-2 rounded-xl border border-hairline bg-ink/40 px-3.5 py-3 transition-colors hover:border-gold-500/30 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="min-w-0">
                            <span className="block font-semibold text-silver-100">{o.code}</span>
                            <span className="mt-0.5 block text-[12px] text-silver-700">
                              {formatDateTime(o.createdAt)} · {o.unitCount}{' '}
                              {o.unitCount === 1 ? 'unidad' : 'unidades'}
                            </span>
                          </span>
                          <span className="flex flex-wrap items-center gap-2">
                            <Pill tone={st.tone}>{st.label}</Pill>
                            <span className="tabular-nums text-[13px] font-semibold text-silver-100">
                              {o.total > 0 ? formatCOP(o.total) : o.hasPending ? 'A consultar' : '—'}
                            </span>
                            {o.hasPending && <Pill tone="gold">Con ítems por cotizar</Pill>}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
