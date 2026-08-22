import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { Category, Condition, Product } from '@/lib/types'
import { ErrorNote, Field, Input, Modal, Select, SubmitButton, Textarea, Toggle, inputClass } from './ui/kit'
import ImagePicker from './ImagePicker'

/**
 * Alta y edicion de un producto.
 *
 * La validacion que manda es la del servidor (server/routes/products.mjs): aqui
 * solo se comprueba lo minimo para dar respuesta inmediata, y cualquier error
 * que devuelva la API se muestra tal cual, sin reinterpretarlo.
 */

interface Props {
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

const CONDITIONS: { value: Condition; label: string }[] = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'seminuevo', label: 'Seminuevo' },
  { value: 'usado', label: 'Usado' },
]

const errMsg = (e: unknown) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Ocurrió un error inesperado.'

/** '' -> null. Devuelve `false` si el texto no es un entero valido de 0 en adelante. */
function toNumber(text: string): number | null | false {
  const t = text.trim()
  if (t === '') return null
  const n = Number(t.replace(/\./g, '').replace(/\s/g, ''))
  if (!Number.isFinite(n) || n < 0) return false
  return Math.round(n)
}

const numText = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

export default function ProductForm({ product, categories, onClose, onSaved }: Props) {
  const [name, setName] = useState(product?.name ?? '')
  const [brand, setBrand] = useState(product?.brand ?? '')
  const [category, setCategory] = useState(product?.category ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(numText(product?.price))
  const [oldPrice, setOldPrice] = useState(numText(product?.oldPrice))
  const [condition, setCondition] = useState<Condition>(product?.condition ?? 'nuevo')
  const [stock, setStock] = useState(numText(product?.stock))
  const [sku, setSku] = useState(product?.sku ?? '')
  const [color, setColor] = useState(product?.color ?? '')
  const [capacity, setCapacity] = useState(product?.capacity ?? '')
  const [images, setImages] = useState<string[]>(product?.images ?? [])
  const [features, setFeatures] = useState<string[]>(product?.features ?? [])
  const [confirm, setConfirm] = useState<string[]>(product?.confirm ?? [])
  const [featured, setFeatured] = useState(product?.featured ?? false)
  const [published, setPublished] = useState(product?.published !== false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    // Comprobacion rapida en cliente: solo para no hacer un viaje al servidor en balde.
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Escribe el nombre del producto.'
    if (!category) next.category = 'Elige una categoría.'

    const priceValue = toNumber(price)
    const oldPriceValue = toNumber(oldPrice)
    const stockValue = toNumber(stock)
    if (priceValue === false) next.price = 'Escribe un número de 0 en adelante, sin puntos ni símbolos.'
    if (oldPriceValue === false) next.oldPrice = 'Escribe un número de 0 en adelante, sin puntos ni símbolos.'
    if (stockValue === false) next.stock = 'Escribe un número entero de 0 en adelante.'

    setErrors(next)
    if (Object.keys(next).length > 0) return

    const body = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      description: description.trim(),
      price: priceValue === false ? null : priceValue,
      oldPrice: oldPriceValue === false ? null : oldPriceValue,
      condition,
      stock: stockValue === false ? null : stockValue,
      sku: sku.trim(),
      color: color.trim(),
      capacity: capacity.trim(),
      images,
      features,
      confirm,
      featured,
      published,
    }

    setSaving(true)
    try {
      if (product) await api.put<{ product: Product }>(`/products/${product.id}`, body)
      else await api.post<{ product: Product }>('/products', body)
      onSaved()
      onClose()
    } catch (err) {
      setServerError(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={product ? `Editar: ${product.name}` : 'Nuevo producto'} wide>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nombre" required error={errors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="iPhone 17 Pro Max"
                autoFocus
                maxLength={140}
              />
            </Field>
          </div>

          <Field label="Marca" hint="Apple, Samsung, Bose, Beats… Déjalo vacío si no aplica.">
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Apple" maxLength={60} />
          </Field>

          <Field label="Categoría" required error={errors.category}>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Elige una categoría…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.active === false ? ' (oculta en la tienda)' : ''}
                </option>
              ))}
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Descripción" hint="Solo lo que puedas sostener: nada de garantías ni cifras que no estén confirmadas.">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Qué es, en qué estado está y qué incluye la caja."
              />
            </Field>
          </div>

          <Field
            label="Precio (COP)"
            error={errors.price}
            hint="Déjalo vacío si todavía no publicas el precio: la tienda mostrará «Precio a consultar»."
          >
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="numeric"
              placeholder="A consultar"
            />
          </Field>

          <Field
            label="Precio anterior (COP)"
            error={errors.oldPrice}
            hint="Solo para mostrar un descuento real. Debe ser mayor que el precio actual."
          >
            <Input
              value={oldPrice}
              onChange={(e) => setOldPrice(e.target.value)}
              inputMode="numeric"
              placeholder="Sin descuento"
            />
          </Field>

          <Field label="Estado">
            <Select value={condition} onChange={(e) => setCondition(e.target.value as Condition)}>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Stock"
            error={errors.stock}
            hint="Déjalo vacío si no llevas control de existencias. Con 0 el producto aparece como agotado."
          >
            <Input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              inputMode="numeric"
              placeholder="Sin control"
            />
          </Field>

          <Field label="SKU" hint="Tu código interno. Opcional.">
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Sin definir" maxLength={60} />
          </Field>

          <Field label="Color" hint="El del empaque o el equipo. Opcional.">
            <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Sin definir" maxLength={60} />
          </Field>

          <Field label="Capacidad" hint="Solo si está confirmada: 256 GB, 1 TB… No la supongas.">
            <Input
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Sin definir"
              maxLength={60}
            />
          </Field>
        </div>

        <Block label="Imágenes">
          <ImagePicker value={images} onChange={setImages} />
        </Block>

        <EditableList
          label="Características"
          hint="Una por línea. Solo lo verificable en la foto, el empaque o el material oficial."
          placeholder="Sellado, con garantía de tienda…"
          items={features}
          onChange={setFeatures}
        />

        <EditableList
          label="Confirmamos por WhatsApp"
          hint="Lo que el cliente debe confirmar antes de comprar: disponibilidad, color, capacidad…"
          placeholder="Disponibilidad del color"
          items={confirm}
          onChange={setConfirm}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            checked={featured}
            onChange={setFeatured}
            label="Destacado"
            hint="Aparece en la sección de destacados de la portada."
          />
          <Toggle
            checked={published}
            onChange={setPublished}
            label="Publicado"
            hint={published ? 'Visible en la tienda.' : 'Borrador: nadie lo ve todavía.'}
          />
        </div>

        {serverError && <ErrorNote>{serverError}</ErrorNote>}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline pt-4">
          <button type="button" onClick={onClose} className="btn btn-sm btn-ghost" disabled={saving}>
            Cancelar
          </button>
          <SubmitButton type="submit" busy={saving}>
            {product ? 'Guardar cambios' : 'Crear producto'}
          </SubmitButton>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ piezas */

/** Como <Field> pero sin <label>: para grupos que contienen varios controles. */
function Block({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">{label}</span>
      {children}
      {hint && <p className="mt-1.5 text-[12px] text-silver-700">{hint}</p>}
    </div>
  )
}

function EditableList({
  label,
  hint,
  placeholder,
  items,
  onChange,
}: {
  label: string
  hint: string
  placeholder: string
  items: string[]
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const v = draft.trim()
    if (!v) return
    if (items.some((i) => i.toLowerCase() === v.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...items, v])
    setDraft('')
  }

  return (
    <Block label={label} hint={hint}>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter añade el elemento; nunca envía el formulario.
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          aria-label={`Añadir a ${label}`}
          maxLength={160}
          className={inputClass}
        />
        <button type="button" onClick={add} disabled={!draft.trim()} className="btn btn-sm btn-ghost shrink-0">
          <Plus size={15} aria-hidden />
          Añadir
        </button>
      </div>

      {items.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="flex items-center gap-1 rounded-full border border-hairline bg-white/[0.04] py-1 pl-3.5 pr-1 text-[12.5px] text-silver-300"
            >
              <span className="max-w-[16rem] truncate">{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                aria-label={`Quitar «${item}»`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-silver-500 transition-colors hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Block>
  )
}
