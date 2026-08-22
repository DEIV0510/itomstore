/**
 * Clientes.
 *
 * No hay alta manual: la ficha aparece sola cuando alguien hace un pedido o
 * pide una permuta. Aqui solo se consultan, se corrigen los datos y se borran.
 *
 * Son datos personales: TODA ruta de este archivo exige sesion con permiso
 * 'customers'. La tienda publica no lee nada de aqui.
 */
import { Router } from 'express'
import { db, logActivity } from '../db.mjs'
import { requireRole } from '../auth.mjs'
import { toOrder } from './orders.mjs'

const r = Router()

/* ------------------------------------------------------------------ shapes */

/** Fila de SQLite -> objeto que entiende el frontend. */
export function toCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    whatsapp: row.whatsapp,
    city: row.city,
    note: row.note,
    // resumen calculado en SQL (ver SELECT_CUSTOMER)
    orders: row.order_count ?? 0,
    totalSpent: row.total_spent ?? 0,
    lastOrder: row.last_order ?? null,
    createdAt: row.created_at,
  }
}

/* --------------------------------------------------------------- utilidades */

/**
 * El resumen lo hace la base, no JavaScript:
 *   order_count -> pedidos del cliente
 *   total_spent -> suma de los pedidos ENTREGADOS (lo demas aun no es venta)
 *   last_order  -> fecha del ultimo pedido
 */
const SELECT_CUSTOMER = `
  SELECT c.*,
         (SELECT COUNT(*)                  FROM orders o WHERE o.customer_id = c.id) AS order_count,
         (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.customer_id = c.id
                                             AND o.status = 'entregado')             AS total_spent,
         (SELECT MAX(o.created_at)         FROM orders o WHERE o.customer_id = c.id) AS last_order
  FROM customers c`

const text = (v, max) => {
  const s = String(v ?? '').trim().slice(0, max)
  return s || null
}

/** Termino para LIKE sin que % o _ escritos por el usuario actuen como comodines. */
const like = (v) => {
  const term = String(v ?? '').trim()
  return term ? `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null
}

const parseId = (v) => {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

/** El whatsapp es la identidad del cliente (indice unico): desde aqui no se cambia. */
function parseBody(body) {
  const name = String(body?.name ?? '').trim()
  if (!name) return { error: 'El nombre del cliente es obligatorio.' }
  if (name.length > 80) return { error: 'El nombre no puede superar los 80 caracteres.' }

  return {
    data: {
      name,
      city: text(body?.city, 60),
      note: text(body?.note, 500),
    },
  }
}

/* ----------------------------------------------------------------- lectura */

/** GET /api/customers?q=  -> lista con pedidos, gastado y ultima compra. */
r.get('/', requireRole('customers'), (req, res) => {
  const q = like(req.query.q)

  const stmt = db.prepare(
    `${SELECT_CUSTOMER}
     ${q ? `WHERE (c.name LIKE @q ESCAPE '\\' OR c.whatsapp LIKE @q ESCAPE '\\' OR c.city LIKE @q ESCAPE '\\')` : ''}
     ORDER BY last_order DESC, c.id DESC`
  )
  const rows = q ? stmt.all({ q }) : stmt.all()

  res.json({ customers: rows.map(toCustomer) })
})

/** GET /api/customers/:id -> ficha del cliente con todos sus pedidos. */
r.get('/:id', requireRole('customers'), (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'El identificador del cliente no es válido.' })

  const row = db.prepare(`${SELECT_CUSTOMER} WHERE c.id = ?`).get(id)
  if (!row) return res.status(404).json({ error: 'Cliente no encontrado' })

  const orderRows = db
    .prepare(
      `SELECT o.*,
              c.name     AS customer_name,
              c.whatsapp AS customer_whatsapp,
              c.city     AS customer_city,
              (SELECT COUNT(*)                FROM order_items i WHERE i.order_id = o.id) AS item_count,
              (SELECT COALESCE(SUM(i.qty), 0) FROM order_items i WHERE i.order_id = o.id) AS unit_count
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC, o.id DESC`
    )
    .all(id)

  const itemsOf = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id')

  res.json({
    customer: toCustomer(row),
    orders: orderRows.map((o) => toOrder(o, itemsOf.all(o.id))),
  })
})

/* --------------------------------------------------------------- escritura */

/** PUT /api/customers/:id -> corregir nombre, ciudad y nota. */
r.put('/:id', requireRole('customers'), (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'El identificador del cliente no es válido.' })

  const current = db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
  if (!current) return res.status(404).json({ error: 'Cliente no encontrado' })

  const { data, error } = parseBody(req.body)
  if (error) return res.status(400).json({ error })

  db.prepare('UPDATE customers SET name = @name, city = @city, note = @note WHERE id = @id').run({ ...data, id })

  logActivity(req.user, 'editó el cliente', 'cliente', id)
  res.json({ customer: toCustomer(db.prepare(`${SELECT_CUSTOMER} WHERE c.id = ?`).get(id)) })
})

/** DELETE /api/customers/:id -> los pedidos se conservan y quedan sin cliente. */
r.delete('/:id', requireRole('customers'), (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'El identificador del cliente no es válido.' })

  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Cliente no encontrado' })

  db.prepare('DELETE FROM customers WHERE id = ?').run(id)
  logActivity(req.user, `eliminó el cliente ${row.name}`, 'cliente', id)
  res.json({ ok: true })
})

export default r
