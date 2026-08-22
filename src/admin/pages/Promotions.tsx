import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarClock, Pencil, Percent, Plus, Trash2 } from 'lucide-react'
import Img from '@/components/ui/Img'
import ImagePicker from '@/admin/ImagePicker'
import { ApiError, api } from '@/lib/api'
import { useShop } from '@/lib/shop'
import {
  Empty,
  ErrorNote,
  Field,
  Input,
  Loading,
  Modal,
  PageHead,
  Panel,
  Pill,
  Select,
  SubmitButton,
  Toggle,
  useConfirm,
} from '../ui/kit'

/* =========================================================================
   Promociones.
   El estado NO se calcula aqui: lo manda el servidor ya resuelto en `state`
   (server/routes/promotions.mjs), asi una promocion caducada deja de
   mostrarse sola en la tienda sin que nadie la apague a mano.
   ========================================================================= */

type PromoState = 'programada' | 'vigente' | 'finalizada' | 'inactiva'

interface Promotion {
  id: number
  title: string
  subtitle: string | null
  productId: string | null
  discount: number | null
  image: string | null
  /** ISO UTC o null */
  startsAt: string | null
  endsAt: string | null
  active: boolean
  state: PromoState
}

const STATE_LABEL: Record<string, string> = {
  vigente: 'Vigente',
  programada: 'Programada',
  finalizada: 'Finalizada',
  inactiva: 'Inactiva',
}

const STATE_TONE: Record<string, string> = {
  vigente: 'green',
  programada: 'blue',
  finalizada: 'muted',
  inactiva: 'orange',
}

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** ISO -> texto legible en es-CO. */
function humanDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : dateFmt.format(d)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO UTC -> valor de <input type="datetime-local"> ('YYYY-MM-DDTHH:mm' en hora local). */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Valor de <input type="datetime-local"> -> ISO UTC. Vacio = null; invalido = undefined. */
function localInputToIso(value: string): string | null | undefined {
  const v = value.trim()
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

const errorText = (e: unknown) =>
  e instanceof ApiError || e instanceof Error ? e.message : 'No pudimos completar la operación. Inténtalo de nuevo.'

interface FormState {
  title: string
  subtitle: string
  productId: string
  discount: string
  image: string | null
  startsAt: string
  endsAt: string
  active: boolean
}

const BLANK: FormState = {
  title: '',
  subtitle: '',
  productId: '',
  discount: '',
  image: null,
  startsAt: '',
  endsAt: '',
  active: true,
}

export default function Promotions() {
  const { products, getProduct } = useShop()

  const [rows, setRows] = useState<Promotion[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<number | null>(null)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form, setForm] = useState<FormState>(BLANK)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const confirm = useConfirm()

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { promotions } = await api.get<{ promotions: Promotion[] }>('/promotions?all=1')
      setRows(promotions ?? [])
      setLoadError(null)
    } catch (e) {
      setLoadError(errorText(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** Productos publicados, en orden alfabético, para el selector. */
  const options = useMemo(
    () =>
      products
        .map((p) => ({
          id: p.id,
          label: [p.name, p.color, p.capacity].filter(Boolean).join(' · '),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    [products]
  )

  /** Nombre real del producto asociado; si no está publicado lo decimos, no lo inventamos. */
  function productLabel(id: string | null): string {
    if (!id) return 'Sin producto asociado'
    const p = getProduct(id)
    if (!p) return `Producto “${id}” (no está publicado)`
    return [p.name, p.color].filter(Boolean).join(' · ')
  }

  /* ------------------------------------------------------------- acciones */

  function askDelete(row: Promotion) {
    setError(null)
    if (!confirm.ask(String(row.id))) return
    void remove(row)
  }

  async function remove(row: Promotion) {
    setBusy(row.id)
    try {
      await api.del(`/promotions/${row.id}`)
      setRows((list) => list?.filter((p) => p.id !== row.id) ?? list)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  /* ----------------------------------------------------------- formulario */

  function openNew() {
    setEditing(null)
    setForm(BLANK)
    setFormError(null)
    setOpen(true)
  }

  function openEdit(row: Promotion) {
    setEditing(row)
    setForm({
      title: row.title,
      subtitle: row.subtitle ?? '',
      productId: row.productId ?? '',
      discount: row.discount === null ? '' : String(row.discount),
      image: row.image,
      startsAt: isoToLocalInput(row.startsAt),
      endsAt: isoToLocalInput(row.endsAt),
      active: row.active,
    })
    setFormError(null)
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const title = form.title.trim()
    if (!title) {
      setFormError('El título de la promoción es obligatorio.')
      return
    }

    const startsAt = localInputToIso(form.startsAt)
    if (startsAt === undefined) {
      setFormError('La fecha de inicio no es válida.')
      return
    }
    const endsAt = localInputToIso(form.endsAt)
    if (endsAt === undefined) {
      setFormError('La fecha de fin no es válida.')
      return
    }

    const body = {
      title,
      subtitle: form.subtitle.trim() || null,
      productId: form.productId.trim() || null,
      discount: form.discount.trim() === '' ? null : Number(form.discount),
      image: form.image ?? null,
      startsAt,
      endsAt,
      active: form.active,
    }

    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        const { promotion } = await api.put<{ promotion: Promotion }>(`/promotions/${editing.id}`, body)
        setRows((list) => list?.map((p) => (p.id === promotion.id ? promotion : p)) ?? list)
      } else {
        await api.post<{ promotion: Promotion }>('/promotions', body)
        // el orden lo decide el servidor: recargamos para no adivinarlo
        await load(true)
      }
      setOpen(false)
      setEditing(null)
    } catch (err) {
      setFormError(errorText(err))
    } finally {
      setSaving(false)
    }
  }

  /* --------------------------------------------------------------- render */

  const newButton = (
    <button type="button" onClick={openNew} className="btn btn-sm btn-gold">
      <Plus size={15} aria-hidden />
      Nueva promoción
    </button>
  )

  return (
    <>
      <PageHead
        title="Promociones"
        subtitle="Campañas con fecha de inicio y de fin. La tienda solo muestra las vigentes."
        actions={newButton}
      />

      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {loading ? (
        <Loading label="Cargando promociones…" />
      ) : loadError ? (
        <div className="space-y-3">
          <ErrorNote>{loadError}</ErrorNote>
          <button type="button" onClick={() => void load()} className="btn btn-sm btn-ghost">
            Reintentar
          </button>
        </div>
      ) : !rows || rows.length === 0 ? (
        <Empty
          title="Todavía no hay promociones"
          hint="Crea una campaña con su fecha de inicio y de fin: la tienda la enciende y la apaga sola."
          action={newButton}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const armed = confirm.armed === String(p.id)
            const from = humanDate(p.startsAt)
            const to = humanDate(p.endsAt)

            return (
              <li key={p.id}>
                <Panel className="p-3 sm:p-4">
                  <div className="flex gap-3">
                    <Img
                      name={p.image}
                      alt=""
                      sizes="56px"
                      className="h-14 w-14 shrink-0 rounded-xl border border-hairline bg-ink"
                      fallback={
                        <span className="grid h-full w-full place-items-center text-silver-700">
                          <Percent size={20} aria-hidden strokeWidth={1.8} />
                        </span>
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 flex-1 truncate font-display text-[15px] font-extrabold tracking-tightest text-silver-100">
                          {p.title}
                        </p>
                        <Pill tone={STATE_TONE[p.state]}>{STATE_LABEL[p.state] ?? p.state}</Pill>
                      </div>

                      {p.subtitle ? (
                        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-silver-500">{p.subtitle}</p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {p.discount === null ? (
                          <Pill tone="muted">Sin descuento definido</Pill>
                        ) : (
                          <Pill tone="gold">{p.discount} % de descuento</Pill>
                        )}
                        <Pill tone="muted">{productLabel(p.productId)}</Pill>
                      </div>

                      <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-silver-500">
                        <CalendarClock size={14} aria-hidden className="mt-0.5 shrink-0 text-silver-700" />
                        <span>
                          {from || to ? (
                            <>
                              {from ? <>Desde el {from}</> : <>Sin fecha de inicio</>}
                              {' · '}
                              {to ? <>hasta el {to}</> : <>sin fecha de fin</>}
                            </>
                          ) : (
                            'Sin fechas: se muestra mientras esté activa.'
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      disabled={busy === p.id}
                      className="btn btn-sm btn-ghost flex-1 sm:flex-none"
                    >
                      <Pencil size={14} aria-hidden />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => askDelete(p)}
                      disabled={busy === p.id}
                      className={`btn btn-sm flex-1 sm:flex-none ${
                        armed
                          ? 'border border-red-400/50 bg-red-400/[0.16] text-red-100'
                          : 'border border-hairline bg-white/[0.03] text-silver-400 hover:border-red-400/40 hover:text-red-300'
                      }`}
                    >
                      <Trash2 size={14} aria-hidden />
                      {armed ? 'Confirmar' : 'Eliminar'}
                    </button>
                  </div>

                  {armed && (
                    <p className="mt-2 text-[12px] text-orange-300">
                      Pulsa «Confirmar» para eliminar «{p.title}». La acción no se puede deshacer.
                    </p>
                  )}
                </Panel>
              </li>
            )
          })}
        </ul>
      )}

      {/* ------------------------------------------------------------ modal */}
      <Modal
        open={open}
        onClose={() => {
          if (!saving) setOpen(false)
        }}
        title={editing ? `Editar ${editing.title}` : 'Nueva promoción'}
      >
        <form onSubmit={save} className="space-y-4" noValidate>
          {formError && <ErrorNote>{formError}</ErrorNote>}

          <Field label="Título" required>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Semana Apple"
              autoFocus
              maxLength={80}
            />
          </Field>

          <Field label="Subtítulo" hint="Opcional. Una línea de apoyo bajo el título.">
            <Input
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              placeholder="Solo por esta semana en Barranquilla"
              maxLength={120}
            />
          </Field>

          <Field
            label="Producto asociado"
            hint={
              products.length
                ? 'Opcional. Si eliges uno, la promoción enlaza a su ficha.'
                : 'Todavía no hay productos publicados para asociar.'
            }
          >
            <Select
              value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
            >
              <option value="">Sin producto asociado</option>
              {editing?.productId && !options.some((o) => o.id === editing.productId) && (
                <option value={editing.productId}>{editing.productId} (no está publicado)</option>
              )}
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Descuento" hint="Entre 1 y 90 %. Déjalo vacío si la promoción no lleva porcentaje.">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={90}
              step={1}
              value={form.discount}
              onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
              placeholder="Sin definir"
            />
          </Field>

          {/* el selector de fotos trae sus propios botones: no puede ir dentro de un <label> */}
          <div role="group" aria-label="Imagen de la promoción">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
              Imagen
            </span>
            <ImagePicker
              max={1}
              value={form.image ? [form.image] : []}
              onChange={(v) => setForm((f) => ({ ...f, image: v[0] ?? null }))}
            />
            <span className="mt-1.5 block text-[12px] text-silver-700">
              Opcional. Sin foto, la promoción se muestra con su icono.
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha de inicio">
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
            </Field>
            <Field label="Fecha de fin">
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
              />
            </Field>
          </div>

          <p className="text-[12px] leading-relaxed text-silver-700">
            Si dejas las fechas vacías, la promoción se muestra mientras esté activa. Al pasar la fecha de fin deja de
            mostrarse sola.
          </p>

          <Toggle
            checked={form.active}
            onChange={(v) => setForm((f) => ({ ...f, active: v }))}
            label="Promoción activa"
            hint="Apagada, no se muestra en la tienda aunque esté dentro de fechas."
          />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} disabled={saving} className="btn btn-sm btn-ghost">
              Cancelar
            </button>
            <SubmitButton type="submit" busy={saving}>
              {editing ? 'Guardar cambios' : 'Crear promoción'}
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  )
}
