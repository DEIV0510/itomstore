import { Router } from 'express'
import { db, logActivity } from '../db.mjs'
import { requireRole } from '../auth.mjs'

const r = Router()

/** Iconos que el frontend sabe dibujar. Cualquier otro valor se rechaza. */
const ICONS = ['smartphone', 'laptop', 'tablet', 'watch', 'headphones', 'speaker', 'cable', 'android']

/** Fila de SQLite -> objeto que entiende el frontend. */
export function toCategory(row) {
  return {
    id: row.id,
    name: row.name,
    short: row.short,
    blurb: row.blurb,
    image: row.image,
    icon: row.icon,
    sort: row.sort,
    active: row.active === 1,
    // cuantos productos publicados cuelgan de la categoria (lo que ve la tienda)
    productCount: row.product_count ?? 0,
    // incluidos los borradores: es lo que bloquea el borrado
    productTotal: row.product_total ?? 0,
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
  const root = base || 'categoria'
  let id = root
  let n = 2
  const exists = db.prepare('SELECT 1 FROM categories WHERE id = ? AND id != ?')
  while (exists.get(id, ignore ?? '')) id = `${root}-${n++}`
  return id
}

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}

/** Las dos cuentas de productos viajan con cada fila para no hacer N+1 consultas. */
const COUNTS = `
  (SELECT COUNT(*) FROM products p WHERE p.category = c.id AND p.published = 1) AS product_count,
  (SELECT COUNT(*) FROM products p WHERE p.category = c.id)                     AS product_total`

const selectOne = (id) =>
  db.prepare(`SELECT c.*, ${COUNTS} FROM categories c WHERE c.id = ?`).get(id)

/** Valida y normaliza lo que llega del formulario del panel. */
function parseBody(body) {
  const name = String(body?.name ?? '').trim()
  if (!name) return { error: 'El nombre de la categoría es obligatorio.' }

  const icon = String(body?.icon ?? 'smartphone').trim()
  if (!ICONS.includes(icon)) {
    return { error: `El icono "${icon}" no existe. Elige uno de: ${ICONS.join(', ')}.` }
  }

  return {
    data: {
      name,
      short: String(body?.short ?? '').trim(),
      blurb: String(body?.blurb ?? '').trim(),
      image: String(body?.image ?? '').trim() || null,
      icon,
      active: body?.active === false ? 0 : 1,
    },
  }
}

/* ------------------------------------------------------------------ lectura */

/**
 * GET /api/categories
 * Sin sesion devuelve SOLO las activas (la tienda nunca ve las apagadas).
 * Con ?all=1 y sesion valida devuelve todas, para el panel.
 */
r.get('/', (req, res) => {
  const wantAll = req.query.all === '1' && !!req.user
  const rows = wantAll
    ? db.prepare(`SELECT c.*, ${COUNTS} FROM categories c ORDER BY c.sort, c.name`).all()
    : db.prepare(`SELECT c.*, ${COUNTS} FROM categories c WHERE c.active = 1 ORDER BY c.sort, c.name`).all()
  res.json({ categories: rows.map(toCategory) })
})

r.get('/:id', (req, res) => {
  const row = selectOne(req.params.id)
  if (!row) return res.status(404).json({ error: 'Categoría no encontrada' })
  if (row.active !== 1 && !req.user) return res.status(404).json({ error: 'Categoría no encontrada' })
  res.json({ category: toCategory(row) })
})

/* ---------------------------------------------------------------- escritura */

r.post('/', requireRole('categories'), (req, res) => {
  const { data, error } = parseBody(req.body)
  if (error) return res.status(400).json({ error })

  // si el panel manda un id lo respetamos (saneado); si no, sale del nombre
  const asked = slugify(String(req.body?.id ?? '').trim())
  if (asked && db.prepare('SELECT 1 FROM categories WHERE id = ?').get(asked)) {
    return res.status(409).json({ error: `Ya existe una categoría con el identificador "${asked}". Elige otro.` })
  }
  const base = asked || slugify(data.name)
  if (!base) {
    return res.status(400).json({ error: 'El nombre debe tener alguna letra o número para generar el identificador.' })
  }

  const id = asked || uniqueId(base)
  const sort = (db.prepare('SELECT COALESCE(MAX(sort), 0) AS m FROM categories').get().m ?? 0) + 1

  db.prepare(
    `INSERT INTO categories (id, name, short, blurb, image, icon, sort, active)
     VALUES (@id, @name, @short, @blurb, @image, @icon, @sort, @active)`
  ).run({ ...data, id, sort })

  logActivity(req.user, 'creó la categoría', 'categoría', id)
  res.status(201).json({ category: toCategory(selectOne(id)) })
})

r.put('/:id', requireRole('categories'), (req, res) => {
  const current = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Categoría no encontrada' })

  const { data, error } = parseBody(req.body)
  if (error) return res.status(400).json({ error })

  // el id no se toca: es la clave con la que los productos apuntan aqui
  db.prepare(
    `UPDATE categories SET
      name = @name, short = @short, blurb = @blurb, image = @image, icon = @icon,
      active = @active, updated_at = datetime('now')
     WHERE id = @id`
  ).run({ ...data, id: current.id })

  logActivity(req.user, 'editó la categoría', 'categoría', current.id)
  res.json({ category: toCategory(selectOne(current.id)) })
})

/** Cambios rapidos desde la tabla: activar/apagar y mover de posicion. */
r.patch('/:id', requireRole('categories'), (req, res) => {
  const current = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Categoría no encontrada' })

  const body = req.body ?? {}
  const sets = []
  const params = { id: current.id }

  if ('active' in body) {
    sets.push('active = @active')
    params.active = body.active ? 1 : 0
  }
  if ('sort' in body) {
    const sort = num(body.sort)
    if (sort === null || sort < 0) return res.status(400).json({ error: 'El orden debe ser un número mayor o igual a 0.' })
    sets.push('sort = @sort')
    params.sort = sort
  }
  if (!sets.length) return res.status(400).json({ error: 'No hay nada que actualizar.' })

  db.prepare(`UPDATE categories SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params)
  logActivity(req.user, 'actualizó la categoría', 'categoría', current.id)
  res.json({ category: toCategory(selectOne(current.id)) })
})

/** Arrastrar y soltar en el panel: { ids: [...] } reescribe el campo sort. */
r.post('/reorder', requireRole('categories'), (req, res) => {
  const ids = req.body?.ids
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: 'Envía la lista de categorías en el orden que quieres.' })
  }

  const clean = ids.map((v) => (typeof v === 'string' ? v.trim() : ''))
  if (clean.some((id) => !id)) {
    return res.status(400).json({ error: 'La lista tiene identificadores vacíos.' })
  }
  if (new Set(clean).size !== clean.length) {
    return res.status(400).json({ error: 'La lista tiene categorías repetidas.' })
  }

  const exists = db.prepare('SELECT 1 FROM categories WHERE id = ?')
  const missing = clean.filter((id) => !exists.get(id))
  if (missing.length) {
    return res.status(400).json({ error: `Estas categorías ya no existen: ${missing.join(', ')}. Recarga la página.` })
  }

  const update = db.prepare("UPDATE categories SET sort = ?, updated_at = datetime('now') WHERE id = ?")
  db.transaction((list) => {
    list.forEach((id, i) => update.run(i + 1, id))
  })(clean)

  logActivity(req.user, 'reordenó las categorías', 'categoría', null)
  const rows = db.prepare(`SELECT c.*, ${COUNTS} FROM categories c ORDER BY c.sort, c.name`).all()
  res.json({ categories: rows.map(toCategory) })
})

r.delete('/:id', requireRole('categories'), (req, res) => {
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Categoría no encontrada' })

  // cuenta TODOS los productos, tambien los borradores: siguen apuntando aqui
  const n = db.prepare('SELECT COUNT(*) AS n FROM products WHERE category = ?').get(row.id).n
  if (n > 0) {
    const cuantos = n === 1 ? '1 producto' : `${n} productos`
    return res.status(409).json({
      error: `No puedes eliminar una categoría que tiene ${cuantos}. Muévelos primero.`,
    })
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(row.id)
  logActivity(req.user, 'eliminó la categoría', 'categoría', row.id)
  res.json({ ok: true })
})

export default r
