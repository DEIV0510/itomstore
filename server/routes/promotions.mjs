import { Router } from 'express'
import { db, logActivity } from '../db.mjs'
import { requireRole } from '../auth.mjs'

const r = Router()

/**
 * Estado calculado en SQL (nunca en JavaScript): datetime('now') es UTC y las
 * fechas se guardan en ISO con Z, asi que la comparacion es la misma en
 * cualquier zona horaria. Una promocion caducada deja de mostrarse sola.
 */
const STATE = `
  CASE
    WHEN active = 0                                                        THEN 'inactiva'
    WHEN ends_at   IS NOT NULL AND datetime(ends_at)   <  datetime('now')  THEN 'finalizada'
    WHEN starts_at IS NOT NULL AND datetime(starts_at) >  datetime('now')  THEN 'programada'
    ELSE 'vigente'
  END AS state`

// una sola definicion de la regla: la tienda pide state = 'vigente'
const BASE = `SELECT * FROM (SELECT *, ${STATE} FROM promotions)`
const ORDER = `ORDER BY COALESCE(datetime(starts_at), datetime(created_at)) DESC, id DESC`

/** Fila de SQLite -> objeto que entiende el frontend. `state` solo para el panel. */
export function toPromotion(row, withState = false) {
  const promo = {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    productId: row.product_id,
    discount: row.discount,
    image: row.image,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
  if (withState) promo.state = row.state
  return promo
}

const selectOne = (id) => db.prepare(`${BASE} WHERE id = ?`).get(id)

/** El id es INTEGER: si llega cualquier otra cosa, no existe. */
const asId = (v) => {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** '' / null -> null. Cualquier fecha valida se normaliza a ISO UTC. */
function parseDate(v, label) {
  if (v === '' || v === null || v === undefined) return { value: null }
  if (typeof v !== 'string') return { error: `La fecha de ${label} no es válida.` }
  const d = new Date(v.trim())
  if (Number.isNaN(d.getTime())) {
    return { error: `La fecha de ${label} no es válida. Usa el formato ISO, por ejemplo 2026-09-01T08:00.` }
  }
  return { value: d.toISOString() }
}

/** null o entero 1..90. */
function parseDiscount(v) {
  if (v === '' || v === null || v === undefined) return { value: null }
  const n = Number(v)
  if (!Number.isFinite(n)) return { error: 'El descuento debe ser un número entre 1 y 90, o déjalo vacío.' }
  const rounded = Math.round(n)
  if (rounded < 1 || rounded > 90) {
    return { error: 'El descuento debe estar entre 1 y 90 por ciento, o déjalo vacío.' }
  }
  return { value: rounded }
}

/** El producto asociado es opcional, pero si viene tiene que existir. */
function parseProductId(v) {
  const id = String(v ?? '').trim()
  if (!id) return { value: null }
  if (!db.prepare('SELECT 1 FROM products WHERE id = ?').get(id)) {
    return { error: 'El producto que quieres asociar a la promoción no existe.' }
  }
  return { value: id }
}

/** Valida y normaliza lo que llega del formulario del panel. */
function parseBody(body) {
  const title = String(body?.title ?? '').trim()
  if (!title) return { error: 'El título de la promoción es obligatorio.' }

  const product = parseProductId(body?.productId)
  if (product.error) return { error: product.error }

  const discount = parseDiscount(body?.discount)
  if (discount.error) return { error: discount.error }

  const starts = parseDate(body?.startsAt, 'inicio')
  if (starts.error) return { error: starts.error }

  const ends = parseDate(body?.endsAt, 'fin')
  if (ends.error) return { error: ends.error }

  if (starts.value && ends.value && new Date(ends.value) <= new Date(starts.value)) {
    return { error: 'La fecha de fin debe ser posterior a la de inicio.' }
  }

  return {
    data: {
      title,
      subtitle: String(body?.subtitle ?? '').trim() || null,
      product_id: product.value,
      discount: discount.value,
      image: String(body?.image ?? '').trim() || null,
      starts_at: starts.value,
      ends_at: ends.value,
      active: body?.active === false ? 0 : 1,
    },
  }
}

/* ------------------------------------------------------------------ lectura */

/**
 * GET /api/promotions
 * Sin sesion devuelve SOLO las vigentes: activas, ya empezadas y sin caducar.
 * Con ?all=1 y sesion valida devuelve todas y añade el estado, para el panel.
 */
r.get('/', (req, res) => {
  const wantAll = req.query.all === '1' && !!req.user
  const rows = wantAll
    ? db.prepare(`${BASE} ${ORDER}`).all()
    : db.prepare(`${BASE} WHERE state = 'vigente' ${ORDER}`).all()
  res.json({ promotions: rows.map((row) => toPromotion(row, wantAll)) })
})

r.get('/:id', (req, res) => {
  const id = asId(req.params.id)
  const row = id === null ? null : selectOne(id)
  if (!row) return res.status(404).json({ error: 'Promoción no encontrada' })
  // el visitante solo puede ver una promocion que este corriendo ahora mismo
  if (!req.user && row.state !== 'vigente') return res.status(404).json({ error: 'Promoción no encontrada' })
  res.json({ promotion: toPromotion(row, !!req.user) })
})

/* ---------------------------------------------------------------- escritura */

r.post('/', requireRole('promotions'), (req, res) => {
  const { data, error } = parseBody(req.body)
  if (error) return res.status(400).json({ error })

  const info = db
    .prepare(
      `INSERT INTO promotions (title, subtitle, product_id, discount, image, starts_at, ends_at, active)
       VALUES (@title, @subtitle, @product_id, @discount, @image, @starts_at, @ends_at, @active)`
    )
    .run(data)

  const id = Number(info.lastInsertRowid)
  logActivity(req.user, 'creó la promoción', 'promoción', id)
  res.status(201).json({ promotion: toPromotion(selectOne(id), true) })
})

r.put('/:id', requireRole('promotions'), (req, res) => {
  const id = asId(req.params.id)
  const current = id === null ? null : db.prepare('SELECT * FROM promotions WHERE id = ?').get(id)
  if (!current) return res.status(404).json({ error: 'Promoción no encontrada' })

  const { data, error } = parseBody(req.body)
  if (error) return res.status(400).json({ error })

  db.prepare(
    `UPDATE promotions SET
      title = @title, subtitle = @subtitle, product_id = @product_id, discount = @discount,
      image = @image, starts_at = @starts_at, ends_at = @ends_at, active = @active,
      updated_at = datetime('now')
     WHERE id = @id`
  ).run({ ...data, id: current.id })

  logActivity(req.user, 'editó la promoción', 'promoción', current.id)
  res.json({ promotion: toPromotion(selectOne(current.id), true) })
})

/** Cambios rapidos desde la tabla: encender/apagar, descuento y fechas. */
r.patch('/:id', requireRole('promotions'), (req, res) => {
  const id = asId(req.params.id)
  const current = id === null ? null : db.prepare('SELECT * FROM promotions WHERE id = ?').get(id)
  if (!current) return res.status(404).json({ error: 'Promoción no encontrada' })

  const body = req.body ?? {}
  const sets = []
  const params = { id: current.id }

  if ('active' in body) {
    sets.push('active = @active')
    params.active = body.active ? 1 : 0
  }
  if ('discount' in body) {
    const discount = parseDiscount(body.discount)
    if (discount.error) return res.status(400).json({ error: discount.error })
    sets.push('discount = @discount')
    params.discount = discount.value
  }
  if ('startsAt' in body) {
    const starts = parseDate(body.startsAt, 'inicio')
    if (starts.error) return res.status(400).json({ error: starts.error })
    sets.push('starts_at = @starts_at')
    params.starts_at = starts.value
  }
  if ('endsAt' in body) {
    const ends = parseDate(body.endsAt, 'fin')
    if (ends.error) return res.status(400).json({ error: ends.error })
    sets.push('ends_at = @ends_at')
    params.ends_at = ends.value
  }
  if (!sets.length) return res.status(400).json({ error: 'No hay nada que actualizar.' })

  // se valida el resultado final, no solo lo que llego en este PATCH
  const startsAt = 'starts_at' in params ? params.starts_at : current.starts_at
  const endsAt = 'ends_at' in params ? params.ends_at : current.ends_at
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la de inicio.' })
  }

  db.prepare(`UPDATE promotions SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params)
  logActivity(req.user, 'actualizó la promoción', 'promoción', current.id)
  res.json({ promotion: toPromotion(selectOne(current.id), true) })
})

r.delete('/:id', requireRole('promotions'), (req, res) => {
  const id = asId(req.params.id)
  const row = id === null ? null : db.prepare('SELECT * FROM promotions WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Promoción no encontrada' })

  db.prepare('DELETE FROM promotions WHERE id = ?').run(row.id)
  logActivity(req.user, 'eliminó la promoción', 'promoción', row.id)
  res.json({ ok: true })
})

export default r
