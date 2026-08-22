import { Router } from 'express'
import { db, json, logActivity } from '../db.mjs'
import { requireRole } from '../auth.mjs'

const r = Router()

/** Fila de SQLite -> objeto que entiende el frontend (mismo shape que antes). */
export function toProduct(row) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    description: row.description,
    price: row.price,
    oldPrice: row.old_price,
    condition: row.condition,
    stock: row.stock,
    sku: row.sku,
    color: row.color,
    capacity: row.capacity,
    images: json(row.images),
    features: json(row.features),
    confirm: json(row.confirm),
    featured: row.featured === 1,
    published: row.published === 1,
    // agotado solo si el stock esta cargado y es 0; null = sin control de stock
    available: row.published === 1 && (row.stock === null || row.stock > 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'), '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)

function uniqueId(base, ignore = null) {
  let id = base || 'producto'
  let n = 2
  const exists = db.prepare('SELECT 1 FROM products WHERE id = ? AND id != ?')
  while (exists.get(id, ignore ?? '')) id = `${base}-${n++}`
  return id
}

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}
const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : [])

/** Valida y normaliza lo que llega del formulario del panel. */
function parseBody(body) {
  const name = String(body?.name ?? '').trim()
  if (!name) return { error: 'El nombre del producto es obligatorio.' }

  const category = String(body?.category ?? '').trim()
  if (!db.prepare('SELECT 1 FROM categories WHERE id = ?').get(category)) {
    return { error: 'La categoría seleccionada no existe.' }
  }

  const price = num(body?.price)
  const oldPrice = num(body?.oldPrice)
  if (price !== null && price < 0) return { error: 'El precio no puede ser negativo.' }
  if (oldPrice !== null && price !== null && oldPrice <= price) {
    return { error: 'El precio anterior debe ser mayor que el precio actual.' }
  }

  const condition = ['nuevo', 'seminuevo', 'usado'].includes(body?.condition) ? body.condition : 'nuevo'
  const stock = num(body?.stock)

  return {
    data: {
      name,
      brand: String(body?.brand ?? '').trim(),
      category,
      description: String(body?.description ?? '').trim(),
      price,
      old_price: oldPrice,
      condition,
      stock: stock !== null && stock < 0 ? 0 : stock,
      sku: String(body?.sku ?? '').trim() || null,
      color: String(body?.color ?? '').trim() || null,
      capacity: String(body?.capacity ?? '').trim() || null,
      images: JSON.stringify(arr(body?.images)),
      features: JSON.stringify(arr(body?.features)),
      confirm: JSON.stringify(arr(body?.confirm)),
      featured: body?.featured ? 1 : 0,
      published: body?.published === false ? 0 : 1,
    },
  }
}

/* ------------------------------------------------------------------ lectura */

/**
 * GET /api/products
 * Sin sesion devuelve SOLO lo publicado (la tienda nunca ve borradores).
 * Con ?all=1 y sesion valida devuelve todo, para el panel.
 */
r.get('/', (req, res) => {
  const wantAll = req.query.all === '1' && !!req.user
  const rows = wantAll
    ? db.prepare('SELECT * FROM products ORDER BY sort, name').all()
    : db.prepare('SELECT * FROM products WHERE published = 1 ORDER BY sort, name').all()
  res.json({ products: rows.map(toProduct) })
})

r.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Producto no encontrado' })
  if (row.published !== 1 && !req.user) return res.status(404).json({ error: 'Producto no encontrado' })
  res.json({ product: toProduct(row) })
})

/* ---------------------------------------------------------------- escritura */

r.post('/', requireRole('products'), (req, res) => {
  const { data, error } = parseBody(req.body)
  if (error) return res.status(400).json({ error })

  const id = uniqueId(String(req.body?.id ?? '').trim() || slugify(data.name))
  const sort = (db.prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM products').get().m ?? 0) + 1

  db.prepare(
    `INSERT INTO products
      (id, name, brand, category, description, price, old_price, condition, stock, sku,
       color, capacity, images, features, confirm, featured, published, sort)
     VALUES
      (@id, @name, @brand, @category, @description, @price, @old_price, @condition, @stock, @sku,
       @color, @capacity, @images, @features, @confirm, @featured, @published, @sort)`
  ).run({ ...data, id, sort })

  logActivity(req.user, 'creó el producto', 'producto', id)
  res.status(201).json({ product: toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) })
})

r.put('/:id', requireRole('products'), (req, res) => {
  const current = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Producto no encontrado' })

  const { data, error } = parseBody(req.body)
  if (error) return res.status(400).json({ error })

  db.prepare(
    `UPDATE products SET
      name = @name, brand = @brand, category = @category, description = @description,
      price = @price, old_price = @old_price, condition = @condition, stock = @stock, sku = @sku,
      color = @color, capacity = @capacity, images = @images, features = @features,
      confirm = @confirm, featured = @featured, published = @published,
      updated_at = datetime('now')
     WHERE id = @id`
  ).run({ ...data, id: current.id })

  logActivity(req.user, 'editó el producto', 'producto', current.id)
  res.json({ product: toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(current.id)) })
})

/** Cambios rapidos desde la tabla: precio, stock, publicado, destacado. */
r.patch('/:id', requireRole('products'), (req, res) => {
  const current = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Producto no encontrado' })

  const sets = []
  const params = { id: current.id }
  const allow = { price: num, oldPrice: num, stock: num, featured: (v) => (v ? 1 : 0), published: (v) => (v ? 1 : 0) }
  const column = { price: 'price', oldPrice: 'old_price', stock: 'stock', featured: 'featured', published: 'published' }

  for (const [key, cast] of Object.entries(allow)) {
    if (key in (req.body ?? {})) {
      sets.push(`${column[key]} = @${key}`)
      params[key] = cast(req.body[key])
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'No hay nada que actualizar.' })

  db.prepare(`UPDATE products SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params)
  logActivity(req.user, 'actualizó el producto', 'producto', current.id)
  res.json({ product: toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(current.id)) })
})

r.post('/:id/duplicate', requireRole('products'), (req, res) => {
  const src = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!src) return res.status(404).json({ error: 'Producto no encontrado' })

  const id = uniqueId(`${src.id}-copia`)
  const sort = (db.prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM products').get().m ?? 0) + 1
  db.prepare(
    `INSERT INTO products
      (id, name, brand, category, description, price, old_price, condition, stock, sku,
       color, capacity, images, features, confirm, featured, published, sort)
     SELECT ?, name || ' (copia)', brand, category, description, price, old_price, condition, stock, sku,
       color, capacity, images, features, confirm, 0, 0, ?
     FROM products WHERE id = ?`
  ).run(id, sort, src.id)

  logActivity(req.user, 'duplicó el producto', 'producto', id)
  res.status(201).json({ product: toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id)) })
})

r.delete('/:id', requireRole('products'), (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Producto no encontrado' })
  db.prepare('DELETE FROM products WHERE id = ?').run(row.id)
  logActivity(req.user, 'eliminó el producto', 'producto', row.id)
  res.json({ ok: true })
})

export default r
