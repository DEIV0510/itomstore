import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, ExternalLink, EyeOff, ImageOff, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { img } from '@/lib/images'
import { useShop } from '@/lib/shop'
import type { Category, Product } from '@/lib/types'
import {
  Empty,
  ErrorNote,
  Input,
  Loading,
  PageHead,
  Panel,
  Pill,
  Select,
  Toggle,
  inputClass,
  useConfirm,
  useDebounced,
} from '../ui/kit'
import ProductForm from '../ProductForm'

/**
 * Catalogo del panel: la pantalla mas usada.
 *
 * Todo sale de /api/products?all=1 (incluye borradores). Los cambios rapidos de
 * la fila usan PATCH y, si el servidor los rechaza, la celda vuelve al valor
 * anterior y se enseña el mensaje real del error.
 */

type Status = 'todos' | 'publicados' | 'borradores'

const errMsg = (e: unknown) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Ocurrió un error inesperado.'

/** Busqueda sin tildes ni mayusculas. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/** Ruta de la miniatura: las claves con '/' son subidas; el resto van al manifiesto. */
function thumbSrc(key: string | undefined): string | null {
  if (!key) return null
  if (key.includes('/')) return `/img/${key}`
  return img(key)?.src ?? null
}

const iconBtn =
  'inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-hairline px-2.5 ' +
  'text-silver-500 transition-colors duration-200 hover:border-gold-500/40 hover:text-silver-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 ' +
  'disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-hairline disabled:hover:text-silver-500'

export default function Products() {
  const { refresh, categories: shopCategories } = useShop()

  const [items, setItems] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)

  const [query, setQuery] = useState('')
  const q = useDebounced(query, 250)
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState<Status>('todos')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const confirm = useConfirm()

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api.get<{ products: Product[] }>('/products?all=1'),
        api.get<{ categories: Category[] }>('/categories?all=1'),
      ])
      setItems(p.products ?? [])
      setCats(c.categories ?? [])
      setError(null)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const categories = cats.length > 0 ? cats : shopCategories
  const catName = useCallback(
    (id: string) => categories.find((c) => c.id === id)?.name ?? id,
    [categories]
  )

  const published = items.filter((p) => p.published !== false).length
  const drafts = items.length - published

  const filtered = useMemo(() => {
    const needle = norm(q.trim())
    return items.filter((p) => {
      if (cat && p.category !== cat) return false
      if (status === 'publicados' && p.published === false) return false
      if (status === 'borradores' && p.published !== false) return false
      if (!needle) return true
      return norm([p.name, p.brand, p.sku ?? '', p.id].join(' ')).includes(needle)
    })
  }, [items, q, cat, status])

  const filtering = Boolean(q.trim()) || Boolean(cat) || status !== 'todos'

  /** PATCH de un campo suelto. Lanza el error para que la celda revierta. */
  const patchRow = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setBusyId(id)
      setRowError(null)
      try {
        const { product } = await api.patch<{ product: Product }>(`/products/${id}`, body)
        setItems((list) => list.map((p) => (p.id === id ? product : p)))
        void refresh()
      } catch (e) {
        setRowError({ id, message: errMsg(e) })
        throw e
      } finally {
        setBusyId(null)
      }
    },
    [refresh]
  )

  async function duplicate(p: Product) {
    setBusyId(p.id)
    setRowError(null)
    try {
      await api.post(`/products/${p.id}/duplicate`)
      await load()
      void refresh()
    } catch (e) {
      setRowError({ id: p.id, message: errMsg(e) })
    } finally {
      setBusyId(null)
    }
  }

  async function remove(p: Product) {
    setBusyId(p.id)
    setRowError(null)
    try {
      await api.del(`/products/${p.id}`)
      await load()
      void refresh()
    } catch (e) {
      setRowError({ id: p.id, message: errMsg(e) })
    } finally {
      setBusyId(null)
    }
  }

  function askRemove(p: Product) {
    if (!confirm.ask(p.id)) return
    void remove(p)
  }

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setFormOpen(true)
  }

  async function onSaved() {
    await load()
    void refresh()
  }

  const newButton = (
    <button type="button" onClick={openNew} className="btn btn-sm btn-gold">
      <Plus size={15} aria-hidden />
      Nuevo producto
    </button>
  )

  return (
    <>
      <PageHead
        title="Productos"
        subtitle={
          loading
            ? 'Cargando el catálogo…'
            : `${items.length} ${items.length === 1 ? 'producto' : 'productos'} · ${published} ${
                published === 1 ? 'publicado' : 'publicados'
              } · ${drafts} ${drafts === 1 ? 'borrador' : 'borradores'}`
        }
        actions={newButton}
      />

      {/* ------------------------------------------------------- filtros */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            size={15}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-silver-700"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, marca o SKU"
            aria-label="Buscar productos"
            className="pl-9"
          />
        </div>

        <Select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Filtrar por categoría"
          className="sm:w-52"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          aria-label="Filtrar por estado de publicación"
          className="sm:w-44"
        >
          <option value="todos">Todos</option>
          <option value="publicados">Publicados</option>
          <option value="borradores">Borradores</option>
        </Select>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {loading ? (
        <Loading label="Cargando los productos…" />
      ) : items.length === 0 ? (
        <Empty
          title="Todavía no hay productos"
          hint="Crea el primero: nombre, categoría y, si ya lo tienes, el precio. Puedes dejarlo como borrador hasta que esté listo."
          action={newButton}
        />
      ) : filtered.length === 0 ? (
        <Empty
          title="Ningún producto coincide"
          hint="Prueba con otro texto o quita los filtros para ver el catálogo completo."
          action={
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setQuery('')
                setCat('')
                setStatus('todos')
              }}
            >
              Quitar los filtros
            </button>
          }
        />
      ) : (
        <>
          {filtering && (
            <p className="mb-3 text-[12px] text-silver-700">
              Mostrando {filtered.length} de {items.length}.
            </p>
          )}

          <Panel className="overflow-hidden">
            {/* ------------------------------------- escritorio: tabla */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-hairline text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700">
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Foto
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Producto
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Categoría
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Precio (COP)
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Stock
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Estado
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <Fragment key={p.id}>
                      <tr className="border-b border-hairline align-top">
                        <td className="px-4 py-3">
                          <Thumb product={p} />
                        </td>

                        <td className="px-4 py-3">
                          <p className="max-w-[22rem] truncate text-[13.5px] font-medium text-silver-100" title={p.name}>
                            {p.name}
                          </p>
                          <p className="mt-0.5 text-[12px] text-silver-700">
                            {p.brand || 'Sin marca'}
                            {p.sku ? ` · ${p.sku}` : ''}
                          </p>
                          {busyId === p.id && <SavingNote />}
                        </td>

                        <td className="px-4 py-3 text-[13px] text-silver-300">{catName(p.category)}</td>

                        <td className="px-4 py-3">
                          <NumberCell
                            value={p.price}
                            label={`Precio de ${p.name} en pesos`}
                            placeholder="A consultar"
                            width="w-36"
                            onCommit={(v) => patchRow(p.id, { price: v })}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <NumberCell
                            value={p.stock}
                            label={`Stock de ${p.name}`}
                            placeholder="Sin control"
                            width="w-32"
                            onCommit={(v) => patchRow(p.id, { stock: v })}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            <MiniSwitch
                              checked={p.published !== false}
                              label="Publicado"
                              onChange={(v) => void patchRow(p.id, { published: v }).catch(() => {})}
                            />
                            <MiniSwitch
                              checked={p.featured}
                              label="Destacado"
                              onChange={(v) => void patchRow(p.id, { featured: v }).catch(() => {})}
                            />
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <RowActions
                            product={p}
                            busy={busyId === p.id}
                            armed={confirm.armed === p.id}
                            onEdit={() => openEdit(p)}
                            onDuplicate={() => void duplicate(p)}
                            onRemove={() => askRemove(p)}
                          />
                        </td>
                      </tr>

                      {rowError?.id === p.id && (
                        <tr className="border-b border-hairline">
                          <td colSpan={7} className="px-4 pb-4">
                            <ErrorNote>{rowError.message}</ErrorNote>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ---------------------------------------- móvil: tarjetas */}
            <ul className="divide-y divide-hairline lg:hidden">
              {filtered.map((p) => (
                <li key={p.id} className="p-4">
                  <div className="flex gap-3">
                    <Thumb product={p} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-silver-100" title={p.name}>
                        {p.name}
                      </p>
                      <p className="mt-0.5 text-[12px] text-silver-700">
                        {p.brand || 'Sin marca'} · {catName(p.category)}
                      </p>
                      <div className="mt-2">
                        <StatePills product={p} />
                      </div>
                      {busyId === p.id && <SavingNote />}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700">
                        Precio (COP)
                      </span>
                      <NumberCell
                        value={p.price}
                        label={`Precio de ${p.name} en pesos`}
                        placeholder="A consultar"
                        width="w-full"
                        onCommit={(v) => patchRow(p.id, { price: v })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-700">
                        Stock
                      </span>
                      <NumberCell
                        value={p.stock}
                        label={`Stock de ${p.name}`}
                        placeholder="Sin control"
                        width="w-full"
                        onCommit={(v) => patchRow(p.id, { stock: v })}
                      />
                    </label>
                  </div>

                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    <Toggle
                      checked={p.published !== false}
                      onChange={(v) => void patchRow(p.id, { published: v }).catch(() => {})}
                      label="Publicado"
                    />
                    <Toggle
                      checked={p.featured}
                      onChange={(v) => void patchRow(p.id, { featured: v }).catch(() => {})}
                      label="Destacado"
                    />
                  </div>

                  <div className="mt-3">
                    <RowActions
                      product={p}
                      busy={busyId === p.id}
                      armed={confirm.armed === p.id}
                      onEdit={() => openEdit(p)}
                      onDuplicate={() => void duplicate(p)}
                      onRemove={() => askRemove(p)}
                    />
                  </div>

                  {rowError?.id === p.id && (
                    <div className="mt-3">
                      <ErrorNote>{rowError.message}</ErrorNote>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}

      {formOpen && (
        <ProductForm
          key={editing?.id ?? 'nuevo'}
          product={editing}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={() => void onSaved()}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ piezas */

function Thumb({ product }: { product: Product }) {
  const src = thumbSrc(product.images?.[0])
  return (
    <span className="block h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-hairline bg-ink/60">
      {src ? (
        <img
          src={src}
          alt=""
          aria-hidden
          width={44}
          height={56}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-silver-700" title="Sin foto">
          <ImageOff size={14} aria-hidden />
        </span>
      )}
    </span>
  )
}

function StatePills({ product }: { product: Product }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {product.published === false ? <Pill tone="orange">Borrador</Pill> : <Pill tone="green">Publicado</Pill>}
      {product.featured && <Pill tone="gold">Destacado</Pill>}
      {product.stock === 0 && <Pill tone="red">Agotado</Pill>}
    </span>
  )
}

/** Interruptor compacto para las filas de la tabla: mismo gesto, un tercio de alto. */
function MiniSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`inline-flex min-h-[32px] items-center gap-2 rounded-lg border px-2 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200 ${
        checked
          ? 'border-gold-500/40 bg-gold-500/[0.12] text-gold-300'
          : 'border-hairline bg-white/[0.03] text-silver-700 hover:text-silver-500'
      }`}
    >
      <span
        aria-hidden
        className={`relative h-3.5 w-7 shrink-0 rounded-full transition-colors duration-300 ${
          checked ? 'bg-gold-500' : 'bg-white/[0.15]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-ink transition-all duration-300 ${
            checked ? 'left-[1.1rem]' : 'left-0.5'
          }`}
        />
      </span>
      {label}
    </button>
  )
}

function SavingNote() {
  return (
    <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gold-300" role="status">
      <Loader2 size={12} aria-hidden className="animate-spin" />
      Guardando…
    </span>
  )
}

/**
 * Celda numerica con guardado al salir del campo o con Enter.
 * Vacio = null (precio a consultar / sin control de stock).
 */
function NumberCell({
  value,
  label,
  placeholder,
  width = 'w-32',
  onCommit,
}: {
  value: number | null | undefined
  label: string
  placeholder: string
  width?: string
  onCommit: (v: number | null) => Promise<void>
}) {
  const original = value === null || value === undefined ? '' : String(value)
  const [text, setText] = useState(original)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    setText(original)
    setInvalid(false)
  }, [original])

  async function commit() {
    const t = text.trim()
    if (t === original) {
      setInvalid(false)
      return
    }
    if (t === '') {
      setInvalid(false)
      try {
        await onCommit(null)
      } catch {
        setText(original)
      }
      return
    }
    const n = Number(t.replace(/\./g, '').replace(/\s/g, ''))
    if (!Number.isFinite(n) || n < 0) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    try {
      await onCommit(Math.round(n))
    } catch {
      setText(original)
    }
  }

  return (
    <span className="block">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            setText(original)
            setInvalid(false)
          }
        }}
        inputMode="numeric"
        aria-label={label}
        aria-invalid={invalid || undefined}
        placeholder={placeholder}
        className={`${inputClass} ${width} ${invalid ? 'border-red-400/60' : ''}`}
      />
      {invalid && <span className="mt-1 block text-[11px] text-red-300">Escribe un número de 0 en adelante.</span>}
    </span>
  )
}

function RowActions({
  product,
  busy,
  armed,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  product: Product
  busy: boolean
  armed: boolean
  onEdit: () => void
  onDuplicate: () => void
  onRemove: () => void
}) {
  const isDraft = product.published === false
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={onEdit} aria-label={`Editar ${product.name}`} title="Editar" className={iconBtn}>
        <Pencil size={15} aria-hidden />
      </button>

      <button
        type="button"
        onClick={onDuplicate}
        disabled={busy}
        aria-label={`Duplicar ${product.name}`}
        title="Duplicar (se crea como borrador)"
        className={iconBtn}
      >
        <Copy size={15} aria-hidden />
      </button>

      {isDraft ? (
        <button
          type="button"
          disabled
          aria-label={`${product.name} es un borrador: todavía no está en la tienda`}
          title="Es un borrador: publícalo para poder verlo en la tienda"
          className={iconBtn}
        >
          <EyeOff size={15} aria-hidden />
        </button>
      ) : (
        <Link
          to={`/producto/${product.id}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ver ${product.name} en la tienda (abre en otra pestaña)`}
          title="Ver en la tienda"
          className={iconBtn}
        >
          <ExternalLink size={15} aria-hidden />
        </Link>
      )}

      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        aria-label={armed ? `Confirmar que quieres eliminar ${product.name}` : `Eliminar ${product.name}`}
        title={armed ? 'Pulsa otra vez para eliminarlo' : 'Eliminar'}
        className={
          armed
            ? 'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-red-400/60 bg-red-400/10 px-3 text-red-200 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60'
            : `${iconBtn} hover:border-red-400/50 hover:text-red-300`
        }
      >
        <Trash2 size={15} aria-hidden />
        {armed && <span className="text-[11.5px] font-semibold">Confirmar</span>}
      </button>
    </div>
  )
}
