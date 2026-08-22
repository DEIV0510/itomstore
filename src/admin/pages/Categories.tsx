import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import Img from '@/components/ui/Img'
import ImagePicker from '@/admin/ImagePicker'
import { CATEGORY_ICON } from '@/data/categoryIcons'
import { ApiError, api } from '@/lib/api'
import { useShop } from '@/lib/shop'
import type { Category } from '@/lib/types'
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
  Textarea,
  Toggle,
  useConfirm,
} from '../ui/kit'

/* =========================================================================
   Categorias del catalogo.
   Todo sale de /api/categories: nombre, foto, orden y cuantos productos
   cuelgan de cada una. Aqui no hay ni un dato de ejemplo.
   ========================================================================= */

/** Lo que devuelve la API para el panel: la categoria + sus dos conteos reales. */
type Row = Category & { productCount: number; productTotal: number }

type IconKey = Category['icon']

/** Los 8 iconos que acepta el servidor (server/routes/categories.mjs). */
const ICON_OPTIONS: { value: IconKey; label: string }[] = [
  { value: 'smartphone', label: 'Celular' },
  { value: 'laptop', label: 'Portátil' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'watch', label: 'Reloj' },
  { value: 'headphones', label: 'Audífonos' },
  { value: 'speaker', label: 'Parlante' },
  { value: 'cable', label: 'Cable / accesorio' },
  { value: 'android', label: 'Android' },
]

interface FormState {
  name: string
  short: string
  blurb: string
  icon: IconKey
  image: string | null
  active: boolean
}

const BLANK: FormState = { name: '', short: '', blurb: '', icon: 'smartphone', image: null, active: true }

const errorText = (e: unknown) =>
  e instanceof ApiError || e instanceof Error ? e.message : 'No pudimos completar la operación. Inténtalo de nuevo.'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export default function Categories() {
  const { refresh } = useShop()

  const [rows, setRows] = useState<Row[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [form, setForm] = useState<FormState>(BLANK)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const confirm = useConfirm()

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { categories } = await api.get<{ categories: Row[] }>('/categories?all=1')
      setRows(categories ?? [])
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

  /* ------------------------------------------------------------- acciones */

  /** Sube o baja una categoria: se pinta al momento y se revierte si falla. */
  async function move(index: number, dir: -1 | 1) {
    if (!rows || busy) return
    const target = index + dir
    if (target < 0 || target >= rows.length) return

    const previous = rows
    const next = rows.slice()
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)

    setRows(next)
    setError(null)
    setBusy('reorder')
    try {
      const { categories } = await api.post<{ categories: Row[] }>('/categories/reorder', {
        ids: next.map((c) => c.id),
      })
      setRows(categories ?? next)
      await refresh()
    } catch (e) {
      setRows(previous)
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  /** Encender / apagar la categoria en la tienda. */
  async function setActive(row: Row, value: boolean) {
    if (busy) return
    const previous = rows
    setRows((list) => list?.map((c) => (c.id === row.id ? { ...c, active: value } : c)) ?? list)
    setError(null)
    setBusy(row.id)
    try {
      const { category } = await api.patch<{ category: Row }>(`/categories/${encodeURIComponent(row.id)}`, {
        active: value,
      })
      setRows((list) => list?.map((c) => (c.id === category.id ? category : c)) ?? list)
      await refresh()
    } catch (e) {
      setRows(previous)
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  /** Dos pasos: el primer clic arma, el segundo elimina. */
  function askDelete(row: Row) {
    setError(null)
    if (!confirm.ask(row.id)) return
    void remove(row)
  }

  async function remove(row: Row) {
    setBusy(row.id)
    try {
      await api.del(`/categories/${encodeURIComponent(row.id)}`)
      setRows((list) => list?.filter((c) => c.id !== row.id) ?? list)
      await refresh()
    } catch (e) {
      // un 409 aqui no es un fallo tecnico: es "tiene productos, muevelos primero"
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

  function openEdit(row: Row) {
    setEditing(row)
    setForm({
      name: row.name,
      short: row.short ?? '',
      blurb: row.blurb ?? '',
      icon: row.icon,
      image: row.image,
      active: row.active !== false,
    })
    setFormError(null)
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    const name = form.name.trim()
    if (!name) {
      setFormError('El nombre de la categoría es obligatorio.')
      return
    }

    // `short` es la etiqueta que usan el menú y los filtros de la tienda:
    // si el formulario la deja vacía se cae al nombre, nunca a cadena vacía.
    const body = {
      name,
      short: form.short.trim() || name,
      blurb: form.blurb.trim(),
      icon: form.icon,
      image: form.image,
      active: form.active,
    }

    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        const { category } = await api.put<{ category: Row }>(
          `/categories/${encodeURIComponent(editing.id)}`,
          body
        )
        setRows((list) => list?.map((c) => (c.id === category.id ? category : c)) ?? list)
      } else {
        await api.post<{ category: Row }>('/categories', body)
        await load(true)
      }
      await refresh()
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
      Nueva categoría
    </button>
  )

  return (
    <>
      <PageHead
        title="Categorías"
        subtitle="Ordena, activa o esconde las secciones del catálogo. Los cambios se ven en la tienda al instante."
        actions={newButton}
      />

      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {loading ? (
        <Loading label="Cargando categorías…" />
      ) : loadError ? (
        <div className="space-y-3">
          <ErrorNote>{loadError}</ErrorNote>
          <button type="button" onClick={() => void load()} className="btn btn-sm btn-ghost">
            Reintentar
          </button>
        </div>
      ) : !rows || rows.length === 0 ? (
        <Empty
          title="Todavía no hay categorías"
          hint="Crea la primera para empezar a organizar el catálogo de ITOMSTORE."
          action={newButton}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((c, i) => {
            const Icon = CATEGORY_ICON[c.icon] ?? CATEGORY_ICON.smartphone
            const drafts = Math.max(0, (c.productTotal ?? 0) - (c.productCount ?? 0))
            const armed = confirm.armed === c.id
            const rowBusy = busy === c.id || busy === 'reorder'

            return (
              <li key={c.id}>
                <Panel className="p-3 sm:p-4">
                  <div className="flex gap-3">
                    <Img
                      name={c.image}
                      alt=""
                      sizes="56px"
                      className="h-14 w-14 shrink-0 rounded-xl border border-hairline bg-ink"
                      fallback={
                        <span className="grid h-full w-full place-items-center text-silver-700">
                          <Icon size={20} aria-hidden strokeWidth={1.8} />
                        </span>
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-display text-[15px] font-extrabold tracking-tightest text-silver-100">
                            {c.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11.5px] tracking-wide text-silver-700">{c.id}</p>
                        </div>

                        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => void move(i, -1)}
                            disabled={i === 0 || !!busy}
                            aria-label={`Subir ${c.name}`}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-hairline text-silver-400 transition-colors hover:border-gold-500/40 hover:text-silver-100 disabled:pointer-events-none disabled:opacity-35"
                          >
                            <ArrowUp size={15} aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => void move(i, 1)}
                            disabled={i === rows.length - 1 || !!busy}
                            aria-label={`Bajar ${c.name}`}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-hairline text-silver-400 transition-colors hover:border-gold-500/40 hover:text-silver-100 disabled:pointer-events-none disabled:opacity-35"
                          >
                            <ArrowDown size={15} aria-hidden />
                          </button>
                        </div>
                      </div>

                      {c.blurb ? (
                        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-silver-500">{c.blurb}</p>
                      ) : (
                        <p className="mt-1.5 text-[12.5px] text-silver-700">Sin descripción corta.</p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Pill tone={c.productCount > 0 ? 'gold' : 'muted'}>
                          {plural(c.productCount ?? 0, 'producto', 'productos')}
                        </Pill>
                        {drafts > 0 && <Pill tone="muted">{plural(drafts, 'borrador', 'borradores')}</Pill>}
                        {c.active === false && <Pill tone="orange">Oculta</Pill>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <Toggle
                      checked={c.active !== false}
                      onChange={(v) => void setActive(c, v)}
                      label="Visible en la tienda"
                      hint={c.active === false ? 'Ahora mismo no aparece en el catálogo.' : undefined}
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        disabled={rowBusy}
                        className="btn btn-sm btn-ghost flex-1 sm:flex-none"
                      >
                        <Pencil size={14} aria-hidden />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => askDelete(c)}
                        disabled={rowBusy}
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
                  </div>

                  {armed && (
                    <p className="mt-2 text-[12px] text-orange-300">
                      Pulsa «Confirmar» para eliminar «{c.name}». La acción no se puede deshacer.
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
        title={editing ? `Editar ${editing.name}` : 'Nueva categoría'}
      >
        <form onSubmit={save} className="space-y-4" noValidate>
          {formError && <ErrorNote>{formError}</ErrorNote>}

          <Field label="Nombre" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="iPhone"
              autoFocus
              maxLength={60}
            />
          </Field>

          <Field label="Nombre corto" hint="Etiqueta breve para el menú y los filtros. Si la dejas vacía usamos el nombre.">
            <Input
              value={form.short}
              onChange={(e) => setForm((f) => ({ ...f, short: e.target.value }))}
              placeholder="iPhone"
              maxLength={30}
            />
          </Field>

          <Field label="Descripción corta" hint="Una línea que acompaña a la categoría en la tienda.">
            <Textarea
              rows={2}
              value={form.blurb}
              onChange={(e) => setForm((f) => ({ ...f, blurb: e.target.value }))}
              placeholder="Equipos sellados y usados."
              maxLength={160}
            />
          </Field>

          <Field label="Icono" hint="Se usa cuando la categoría no tiene foto.">
            <Select
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value as IconKey }))}
            >
              {ICON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          {/* el selector de fotos trae sus propios botones: no puede ir dentro de un <label> */}
          <div role="group" aria-label="Imagen de la categoría">
            <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
              Imagen
            </span>
            <ImagePicker
              max={1}
              value={form.image ? [form.image] : []}
              onChange={(v) => setForm((f) => ({ ...f, image: v[0] ?? null }))}
            />
            <span className="mt-1.5 block text-[12px] text-silver-700">
              Opcional. Sin foto, la tienda muestra el icono.
            </span>
          </div>

          <Toggle
            checked={form.active}
            onChange={(v) => setForm((f) => ({ ...f, active: v }))}
            label="Visible en la tienda"
            hint="Apagada, la categoría y su página dejan de mostrarse."
          />

          {editing && (
            <p className="text-[12px] leading-relaxed text-silver-700">
              Identificador: <span className="tracking-wide text-silver-500">{editing.id}</span>. No se puede cambiar
              porque los productos apuntan a él.
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="btn btn-sm btn-ghost"
            >
              Cancelar
            </button>
            <SubmitButton type="submit" busy={saving}>
              {editing ? 'Guardar cambios' : 'Crear categoría'}
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  )
}
