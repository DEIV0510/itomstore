import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { MessageCircle, Search, X } from 'lucide-react'
import { ApiError, api } from '@/lib/api'
import { formatCOP } from '@/lib/format'
import { getSettings } from '@/lib/settings'
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
   Permutas: el cliente entrega su equipo usado como parte de pago.

   REGLA DE HONESTIDAD: no existe tabla de precios de usados. Ni el valor del
   equipo ni la diferencia a pagar se calculan ni se sugieren aqui: los escribe
   una persona despues de mirar el equipo.
   ========================================================================= */

/** Estados EXACTOS que acepta el servidor (server/routes/tradeins.mjs). */
const STATUSES = [
  { value: 'nueva', label: 'Nueva', tone: 'gold' },
  { value: 'revision', label: 'En revisión', tone: 'blue' },
  { value: 'cotizada', label: 'Cotizada', tone: 'violet' },
  { value: 'aceptada', label: 'Aceptada', tone: 'green' },
  { value: 'rechazada', label: 'Rechazada', tone: 'red' },
  { value: 'finalizada', label: 'Finalizada', tone: 'muted' },
] as const

type TradeStatus = (typeof STATUSES)[number]['value']

const statusInfo = (value: string): { label: string; tone: string } =>
  STATUSES.find((s) => s.value === value) ?? { label: value, tone: 'muted' }

/** Tal cual lo devuelve GET /api/tradeins. */
interface TradeIn {
  id: number
  code: string
  name: string
  whatsapp: string
  city: string | null
  device: string
  capacity: string | null
  condition: string | null
  photos: string[]
  estimate: number | null
  difference: number | null
  wants: string | null
  note: string | null
  status: TradeStatus
  createdAt: string
  updatedAt: string
}

const dateTimeFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** SQLite guarda 'YYYY-MM-DD HH:MM:SS' en UTC: hay que marcarlo antes de parsear. */
function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}Z` : value
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d)
}

const moneyLabel = (value: number | null): string => (value === null ? 'Sin definir' : formatCOP(value))

const numberField = (value: number | null): string => (value === null ? '' : String(value))

const waNumber = (whatsapp: string): string => whatsapp.replace(/\D+/g, '')

/** El servidor guarda las fotos como JSON; si el dato viniera roto, lista vacía. */
const photosOf = (t: TradeIn): string[] => (Array.isArray(t.photos) ? t.photos : [])

/** Mensaje ya redactado con los datos GUARDADOS de la solicitud. */
function waMessage(t: TradeIn): string {
  const brand = getSettings().brand.name
  const lines = [
    `Hola ${t.name}, te escribimos de ${brand} por tu solicitud de permuta ${t.code}.`,
    `Equipo que nos ofreces: ${t.device}${t.capacity ? ` (${t.capacity})` : ''}.`,
  ]
  if (t.estimate !== null) lines.push(`Valor que reconocemos por tu equipo: ${formatCOP(t.estimate)}.`)
  if (t.difference !== null) lines.push(`Diferencia a pagar: ${formatCOP(t.difference)}.`)
  return lines.join('\n')
}

const waHref = (t: TradeIn): string => `https://wa.me/${waNumber(t.whatsapp)}?text=${encodeURIComponent(waMessage(t))}`

interface FormState {
  estimate: string
  difference: string
  note: string
  status: TradeStatus
}

export default function TradeIns() {
  const [q, setQ] = useState('')
  const dq = useDebounced(q, 300)
  const [status, setStatus] = useState<TradeStatus | ''>('')

  /** `all` = mismo termino de busqueda SIN filtro de estado: de ahi salen los conteos. */
  const [all, setAll] = useState<TradeIn[]>([])
  const [rows, setRows] = useState<TradeIn[]>([])
  const [first, setFirst] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState<TradeIn | null>(null)
  const [form, setForm] = useState<FormState>({ estimate: '', difference: '', note: '', status: 'nueva' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  /** Token para que una respuesta lenta no pise a la consulta mas reciente. */
  const reqRef = useRef(0)

  const load = useCallback(async () => {
    const token = ++reqRef.current
    setBusy(true)
    try {
      const qs = dq ? `?q=${encodeURIComponent(dq)}` : ''
      const base = await api.get<{ tradeins: TradeIn[] }>(`/tradeins${qs}`)
      if (token !== reqRef.current) return
      const every = base.tradeins ?? []
      setAll(every)

      if (status) {
        const filtered = await api.get<{ tradeins: TradeIn[] }>(
          `/tradeins${qs}${qs ? '&' : '?'}status=${encodeURIComponent(status)}`
        )
        if (token !== reqRef.current) return
        setRows(filtered.tradeins ?? [])
      } else {
        setRows(every)
      }
      setError(null)
    } catch (e) {
      if (token !== reqRef.current) return
      setError(e instanceof ApiError ? e.message : 'No pudimos cargar las solicitudes de permuta.')
    } finally {
      if (token === reqRef.current) {
        setBusy(false)
        setFirst(false)
      }
    }
  }, [dq, status])

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of all) map[t.status] = (map[t.status] ?? 0) + 1
    return map
  }, [all])

  function openDetail(t: TradeIn) {
    setOpen(t)
    setForm({
      estimate: numberField(t.estimate),
      difference: numberField(t.difference),
      note: t.note ?? '',
      status: t.status,
    })
    setSaved(false)
    setSaveError(null)
  }

  const dirty =
    open !== null &&
    (form.status !== open.status ||
      form.note !== (open.note ?? '') ||
      form.estimate !== numberField(open.estimate) ||
      form.difference !== numberField(open.difference))

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!open) return
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const { tradein } = await api.patch<{ tradein: TradeIn }>(`/tradeins/${open.id}`, {
        estimate: form.estimate.trim() === '' ? null : Number(form.estimate),
        difference: form.difference.trim() === '' ? null : Number(form.difference),
        note: form.note,
        status: form.status,
      })
      setOpen(tradein)
      setForm({
        estimate: numberField(tradein.estimate),
        difference: numberField(tradein.difference),
        note: tradein.note ?? '',
        status: tradein.status,
      })
      setAll((list) => list.map((t) => (t.id === tradein.id ? tradein : t)))
      setRows((list) =>
        status && tradein.status !== status
          ? list.filter((t) => t.id !== tradein.id)
          : list.map((t) => (t.id === tradein.id ? tradein : t))
      )
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'No pudimos guardar la solicitud.')
    } finally {
      setSaving(false)
    }
  }

  const filtering = Boolean(dq || status)

  return (
    <div>
      <PageHead
        title="Permutas"
        subtitle="Solicitudes de clientes que quieren entregar su equipo como parte de pago. Aquí las revisas, les pones valor y les respondes."
      />

      {/* buscador */}
      <div className="mb-4">
        <label className="relative block">
          <span className="sr-only">Buscar permutas por código, cliente, WhatsApp o equipo</span>
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-700"
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código, cliente, WhatsApp o equipo…"
            className="pl-10"
          />
        </label>
      </div>

      {/* chips de estado: scroll dentro de su contenedor, nunca en la pagina */}
      <div className="-mx-1 mb-5 overflow-x-auto px-1 pb-1">
        <div className="flex w-max gap-2">
          <button
            type="button"
            onClick={() => setStatus('')}
            aria-pressed={status === ''}
            className={`min-h-[44px] whitespace-nowrap rounded-xl border px-3.5 text-[12px] font-semibold transition-colors ${
              status === ''
                ? 'border-gold-500/40 bg-gold-500/[0.12] text-gold-300'
                : 'border-hairline bg-ink/40 text-silver-500 hover:border-gold-500/25'
            }`}
          >
            Todas <span className="tabular-nums text-silver-700">({all.length})</span>
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatus(s.value)}
              aria-pressed={status === s.value}
              className={`min-h-[44px] whitespace-nowrap rounded-xl border px-3.5 text-[12px] font-semibold transition-colors ${
                status === s.value
                  ? 'border-gold-500/40 bg-gold-500/[0.12] text-gold-300'
                  : 'border-hairline bg-ink/40 text-silver-500 hover:border-gold-500/25'
              }`}
            >
              {s.label} <span className="tabular-nums text-silver-700">({counts[s.value] ?? 0})</span>
            </button>
          ))}
        </div>
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
        <Loading label="Cargando solicitudes…" />
      ) : rows.length === 0 && !error ? (
        filtering ? (
          <Empty
            title="Ninguna solicitud coincide con el filtro"
            hint={
              status
                ? `No hay permutas en estado «${statusInfo(status).label}»${dq ? ` para «${dq}»` : ''}.`
                : `No encontramos permutas para «${dq}».`
            }
            action={
              <button
                type="button"
                className="btn btn-sm btn-light"
                onClick={() => {
                  setQ('')
                  setStatus('')
                }}
              >
                <X size={15} aria-hidden />
                Quitar filtros
              </button>
            }
          />
        ) : (
          <Empty
            title="Todavía no hay solicitudes de permuta."
            hint="Aparecerán solas cuando alguien envíe el formulario de permutas desde la tienda."
          />
        )
      ) : (
        <Panel className={busy ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {/* escritorio: tabla dentro de su propio contenedor con scroll */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-hairline text-[11px] uppercase tracking-[0.12em] text-silver-700">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Código
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Equipo
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Capacidad
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Estado del equipo
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Valor estimado
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Solicitud
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const st = statusInfo(t.status)
                  return (
                    <tr key={t.id} className="border-b border-hairline/70 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openDetail(t)}
                          aria-haspopup="dialog"
                          className="min-h-[44px] text-left font-semibold text-silver-100 transition-colors hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60"
                        >
                          {t.code}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block text-silver-100">{t.name}</span>
                        <a
                          href={`https://wa.me/${waNumber(t.whatsapp)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-emerald-300 transition-colors hover:text-emerald-200"
                        >
                          <MessageCircle size={13} aria-hidden />
                          {t.whatsapp}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-silver-300">{t.device}</td>
                      <td className="px-4 py-3 text-silver-500">{t.capacity ?? 'Sin definir'}</td>
                      <td className="px-4 py-3 text-silver-500">{t.condition ?? 'Sin definir'}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-silver-100">
                        {t.estimate === null ? <span className="text-silver-700">Sin definir</span> : formatCOP(t.estimate)}
                      </td>
                      <td className="px-4 py-3">
                        <Pill tone={st.tone}>{st.label}</Pill>
                        <span className="mt-1 block text-[12px] text-silver-700">{formatDateTime(t.createdAt)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* movil y tablet: tarjetas apiladas */}
          <ul className="divide-y divide-hairline lg:hidden">
            {rows.map((t) => {
              const st = statusInfo(t.status)
              return (
                <li key={t.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => openDetail(t)}
                      aria-haspopup="dialog"
                      className="min-w-0 flex-1 py-1 text-left"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-[15px] font-extrabold text-silver-100">{t.code}</span>
                        <Pill tone={st.tone}>{st.label}</Pill>
                      </span>
                      <span className="mt-1 block truncate text-[13px] text-silver-300">{t.device}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-silver-700">
                        {t.name} · {formatDateTime(t.createdAt)}
                      </span>
                    </button>
                    <a
                      href={`https://wa.me/${waNumber(t.whatsapp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Escribir a ${t.name} por WhatsApp`}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                    >
                      <MessageCircle size={17} aria-hidden />
                    </a>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-xl border border-hairline bg-ink/40 px-2 py-2 text-center">
                      <dt className="uppercase tracking-[0.1em] text-silver-700">Capacidad</dt>
                      <dd className="mt-0.5 break-words text-silver-100">{t.capacity ?? 'Sin definir'}</dd>
                    </div>
                    <div className="rounded-xl border border-hairline bg-ink/40 px-2 py-2 text-center">
                      <dt className="uppercase tracking-[0.1em] text-silver-700">Estado</dt>
                      <dd className="mt-0.5 break-words text-silver-100">{t.condition ?? 'Sin definir'}</dd>
                    </div>
                    <div className="rounded-xl border border-hairline bg-ink/40 px-2 py-2 text-center">
                      <dt className="uppercase tracking-[0.1em] text-silver-700">Estimado</dt>
                      <dd className="mt-0.5 break-words tabular-nums text-silver-100">{moneyLabel(t.estimate)}</dd>
                    </div>
                  </dl>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? `Permuta ${open.code}` : 'Permuta'}
        wide
      >
        {open && (
          <div className="space-y-6">
            {/* datos que envió el cliente */}
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={statusInfo(open.status).tone}>{statusInfo(open.status).label}</Pill>
              <span className="text-[12px] text-silver-700">
                Recibida el {formatDateTime(open.createdAt)} · Última actualización {formatDateTime(open.updatedAt)}
              </span>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['Cliente', open.name],
                  ['Ciudad', open.city ?? 'Sin definir'],
                  ['Equipo que entrega', open.device],
                  ['Capacidad', open.capacity ?? 'Sin definir'],
                  ['Estado del equipo', open.condition ?? 'Sin definir'],
                  ['Qué busca a cambio', open.wants ?? 'Sin definir'],
                  ['Valor estimado', moneyLabel(open.estimate)],
                  ['Diferencia a pagar', moneyLabel(open.difference)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-hairline bg-ink/40 px-3.5 py-3">
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-silver-700">{label}</dt>
                  <dd className="mt-1 break-words text-[13px] text-silver-100">{value}</dd>
                </div>
              ))}
            </dl>

            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-silver-700">WhatsApp del cliente</p>
              <a
                href={`https://wa.me/${waNumber(open.whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] text-emerald-300 transition-colors hover:text-emerald-200"
              >
                <MessageCircle size={16} aria-hidden />
                {open.whatsapp}
              </a>
            </div>

            {/* fotos que adjuntó el cliente */}
            {photosOf(open).length > 0 && (
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-silver-700">
                  Fotos del equipo ({photosOf(open).length})
                </p>
                <ul className="flex flex-wrap gap-3">
                  {photosOf(open).map((src, i) => (
                    <li key={`${src}-${i}`}>
                      <a
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir la foto ${i + 1} del ${open.device} en tamaño completo`}
                        className="block overflow-hidden rounded-xl border border-hairline transition-colors hover:border-gold-500/40"
                      >
                        <img
                          src={src}
                          alt={`Foto ${i + 1} del ${open.device} que envió ${open.name}`}
                          loading="lazy"
                          className="h-28 w-28 object-cover"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* trabajo de la tienda sobre la solicitud */}
            <form onSubmit={onSave} className="space-y-4 border-t border-hairline pt-5">
              <h3 className="font-display text-[15px] font-extrabold text-silver-100">Trabajar la solicitud</h3>
              <p className="text-[12px] leading-relaxed text-silver-500">
                No hay tabla de precios de usados: aquí no se calcula ni se sugiere ninguna cifra.{' '}
                <strong className="text-silver-300">El valor lo defines tú según el estado real del equipo.</strong>
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor estimado (COP)" hint="Lo que reconoces por el equipo usado. Vacío = sin definir.">
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    value={form.estimate}
                    onChange={(e) => setForm((f) => ({ ...f, estimate: e.target.value }))}
                    placeholder="Sin definir"
                  />
                </Field>
                <Field label="Diferencia a pagar (COP)" hint="Lo que el cliente completa en efectivo. Vacío = sin definir.">
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    value={form.difference}
                    onChange={(e) => setForm((f) => ({ ...f, difference: e.target.value }))}
                    placeholder="Sin definir"
                  />
                </Field>
              </div>

              <Field
                label="Observaciones"
                hint="Aquí llega el comentario que escribió el cliente. Si lo cambias se reemplaza, así que copia antes lo que quieras conservar. Máximo 500 caracteres."
              >
                <Textarea
                  rows={4}
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  maxLength={500}
                  placeholder="Sin observaciones"
                />
              </Field>

              <Field label="Estado de la solicitud">
                <Select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TradeStatus }))}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>

              {saveError && <ErrorNote>{saveError}</ErrorNote>}
              {saved && <OkNote>Solicitud actualizada.</OkNote>}

              <SubmitButton type="submit" busy={saving} disabled={!dirty}>
                {dirty ? 'Guardar cambios' : 'Sin cambios por guardar'}
              </SubmitButton>
            </form>

            {/* respuesta al cliente */}
            <div className="space-y-2 border-t border-hairline pt-5">
              <a
                href={waHref(open)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-wa sheen w-full justify-center"
              >
                <MessageCircle size={18} aria-hidden />
                Responder por WhatsApp
              </a>
              <p className="text-[12px] leading-relaxed text-silver-700">
                {dirty
                  ? 'Guarda primero los cambios: el mensaje se arma con los valores que ya están guardados.'
                  : 'El mensaje se abre redactado con el código de la solicitud, el equipo y las cifras que ya guardaste.'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
