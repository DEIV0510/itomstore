/**
 * Pedidos.
 *
 * Un pedido nace en la tienda: el cliente arma el carrito y lo finaliza por WhatsApp.
 * Esa unica ruta (POST /) es publica; todo lo demas exige sesion con permiso 'orders'.
 *
 * Regla de oro: el precio NUNCA llega del cliente. Se lee del producto en la base y
 * se congela en order_items, para que el pedido no cambie si luego cambia el catalogo.
 */
import { Router } from 'express'
import { db, logActivity, nextCode } from '../db.mjs'
import { requireRole } from '../auth.mjs'

const r = Router()

/** Lista blanca de estados. Cualquier otro valor se rechaza con 400. */
export const ORDER_STATUSES = ['pendiente', 'confirmado', 'preparacion', 'enviado', 'entregado', 'cancelado']

const MAX_ITEMS = 50
const MAX_QTY = 99
const NAME_FALLBACK = 'Cliente por WhatsApp'

/* ------------------------------------------------------------------ shapes */

export function toOrderItem(row) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    qty: row.qty,
    price: row.price,
    // sin precio = producto por cotizar
    subtotal: row.price === null ? null : row.price * row.qty,
  }
}

/** Fila de SQLite -> objeto que entiende el frontend. */
export function toOrder(row, items = null) {
  return {
    id: row.id,
    code: row.code,
    customerId: row.customer_id,
    customer: row.customer_name
      ? {
          id: row.customer_id,
          name: row.customer_name,
          whatsapp: row.customer_whatsapp,
          city: row.customer_city,
        }
      : null,
    status: row.status,
    city: row.city,
    total: row.total,
    hasPending: row.has_pending === 1,
    channel: row.channel,
    note: row.note,
    itemCount: row.item_count ?? (items ? items.length : 0),
    unitCount: row.unit_count ?? (items ? items.reduce((n, i) => n + i.qty, 0) : 0),
    items: items ? items.map(toOrderItem) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/* --------------------------------------------------------------- utilidades */

const SELECT_ORDER = `
  SELECT o.*,
         c.name     AS customer_name,
         c.whatsapp AS customer_whatsapp,
         c.city     AS customer_city,
         (SELECT COUNT(*)                FROM order_items i WHERE i.order_id = o.id) AS item_count,
         (SELECT COALESCE(SUM(i.qty), 0) FROM order_items i WHERE i.order_id = o.id) AS unit_count
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id`

const text = (v, max) => {
  const s = String(v ?? '').trim().slice(0, max)
  return s || null
}

/**
 * Normaliza el WhatsApp a solo digitos: el indice unico de customers compara texto
 * exacto, asi que "+57 310 549 0250" y "3105490250" deben terminar iguales o el
 * mismo cliente quedaria duplicado. Un celular colombiano (10 digitos que empiezan
 * por 3) se guarda con el indicativo 57, el mismo formato de los enlaces wa.me.
 */
const phone = (v) => {
  const digits = String(v ?? '').replace(/[^0-9]/g, '')
  if (digits.length < 7 || digits.length > 15) return null
  return digits.length === 10 && digits.startsWith('3') ? `57${digits}` : digits
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

const parseQty = (v) => {
  if (v === undefined || v === null || v === '') return 1
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.min(MAX_QTY, Math.max(1, Math.round(n)))
}

/** nextCode() cuenta filas: si se borro un pedido el codigo podria repetirse. */
async function uniqueCode() {
  let code = await nextCode('ITM', 'orders')
  let n = (await db.get('SELECT COUNT(*) AS n FROM orders')).n + 1
  while (await db.get('SELECT 1 FROM orders WHERE code = ?', [code])) code = `ITM-${String(++n).padStart(5, '0')}`
  return code
}

async function findOrder(id) {
  const row = await db.get(`${SELECT_ORDER} WHERE o.id = ?`, [id])
  if (!row) return null
  const items = await db.all('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', [id])
  return toOrder(row, items)
}

/**
 * Valida y normaliza el pedido que manda la tienda.
 * Devuelve los items ya resueltos contra la base (nombre y precio reales).
 */
async function parseBody(body) {
  const rawItems = body?.items
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: 'El pedido no tiene productos. Agrega al menos uno al carrito.' }
  }
  if (rawItems.length > MAX_ITEMS) {
    return { error: `Un pedido admite hasta ${MAX_ITEMS} productos distintos. Escríbenos por WhatsApp para pedidos grandes.` }
  }

  const rawWhatsapp = String(body?.whatsapp ?? '').trim()
  const whatsapp = phone(rawWhatsapp)
  if (rawWhatsapp && !whatsapp) {
    return { error: 'El número de WhatsApp no parece válido. Escríbelo con indicativo y sin espacios.' }
  }

  // el precio y el nombre salen de la base, nunca del cliente
  const byId = new Map()
  const items = []

  for (const raw of rawItems) {
    const productId = String(raw?.productId ?? '').trim()
    if (!productId) continue

    const qty = parseQty(raw?.qty)
    if (qty === null) return { error: `La cantidad del producto "${productId}" no es válida.` }

    const product = await db.get('SELECT id, name, price FROM products WHERE id = ? AND published = 1', [productId])
    if (!product) continue // producto retirado o sin publicar: se ignora ese renglon

    const seen = byId.get(product.id)
    if (seen) {
      seen.qty = Math.min(MAX_QTY, seen.qty + qty) // el mismo producto repetido se suma
      continue
    }
    const item = { product_id: product.id, name: product.name, qty, price: product.price }
    byId.set(product.id, item)
    items.push(item)
  }

  if (!items.length) {
    return { error: 'Ninguno de los productos del pedido está disponible. Actualiza el carrito e inténtalo de nuevo.' }
  }

  return {
    data: {
      name: text(body?.name, 80),
      whatsapp,
      city: text(body?.city, 60),
      note: text(body?.note, 500),
      items,
      total: items.reduce((sum, i) => (i.price === null ? sum : sum + i.price * i.qty), 0),
      has_pending: items.some((i) => i.price === null) ? 1 : 0,
    },
  }
}

/** Todo el pedido entra de una vez: cliente, cabecera e items. */
async function createOrder(data) {
  return db.transaction(async (tx) => {
    let customerId = null

    if (data.whatsapp) {
      // un cliente ya existente NO se pisa con lo que llegue de la tienda: el nombre solo
      // se rellena si seguia sin nombre real y la ciudad solo si no habia ninguna guardada
      await tx.run(
        `INSERT INTO customers (name, whatsapp, city)
         VALUES (COALESCE(@name, @fallback), @whatsapp, @city)
         ON CONFLICT(whatsapp) DO UPDATE SET
           name = CASE WHEN customers.name = @fallback THEN COALESCE(@name, customers.name) ELSE customers.name END,
           city = COALESCE(customers.city, @city)`,
        { name: data.name, fallback: NAME_FALLBACK, whatsapp: data.whatsapp, city: data.city }
      )
      customerId = (await tx.get('SELECT id FROM customers WHERE whatsapp = ?', [data.whatsapp])).id
    }

    const { lastInsertRowid } = await tx.run(
      `INSERT INTO orders (code, customer_id, status, city, total, has_pending, note)
       VALUES (@code, @customer_id, 'pendiente', @city, @total, @has_pending, @note)`,
      {
        code: await uniqueCode(),
        customer_id: customerId,
        city: data.city,
        total: data.total,
        has_pending: data.has_pending,
        note: data.note,
      }
    )

    const orderId = lastInsertRowid
    for (const it of data.items) {
      await tx.run('INSERT INTO order_items (order_id, product_id, name, qty, price) VALUES (?, ?, ?, ?, ?)', [
        orderId,
        it.product_id,
        it.name,
        it.qty,
        it.price,
      ])
    }

    return orderId
  })
}

/* ---------------------------------------------------------------- creacion */

/**
 * POST /api/orders  (PUBLICA)
 * La tienda registra aqui el carrito que el cliente acaba de enviar por WhatsApp.
 * No se toca el stock: el pedido todavia esta por confirmar.
 */
r.post('/', async (req, res) => {
  const { data, error } = await parseBody(req.body)
  if (error) return res.status(400).json({ error })

  const id = await createOrder(data)
  await logActivity(req.user, 'registró un pedido nuevo desde la tienda', 'pedido', id)
  res.status(201).json({ order: await findOrder(id) })
})

/* ----------------------------------------------------------------- lectura */

/** GET /api/orders?status=&q=  -> lista para el panel (nunca publica). */
r.get('/', requireRole('orders'), async (req, res) => {
  const where = []
  const params = {}

  if (req.query.status) {
    const status = String(req.query.status).trim().toLowerCase()
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `El estado "${status}" no existe. Estados válidos: ${ORDER_STATUSES.join(', ')}.` })
    }
    where.push('o.status = @status')
    params.status = status
  }

  const q = like(req.query.q)
  if (q) {
    where.push(`(o.code LIKE @q ESCAPE '\\' OR c.name LIKE @q ESCAPE '\\' OR c.whatsapp LIKE @q ESCAPE '\\')`)
    params.q = q
  }

  const query = `${SELECT_ORDER}
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY o.created_at DESC, o.id DESC`
  const rows = where.length ? await db.all(query, params) : await db.all(query)

  res.json({ orders: rows.map((row) => toOrder(row)) })
})

/** GET /api/orders/:id -> pedido con todos sus items. */
r.get('/:id', requireRole('orders'), async (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'El identificador del pedido no es válido.' })

  const order = await findOrder(id)
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' })
  res.json({ order })
})

/* --------------------------------------------------------------- escritura */

/** Marca dejada en el historial para no descontar el stock dos veces. */
const STOCK_MARK = 'descontó el stock del pedido'

const alreadyDiscounted = async (id) =>
  !!(await db.get(`SELECT 1 FROM activity WHERE entity = 'pedido' AND entity_id = ? AND action = ?`, [String(id), STOCK_MARK]))

/**
 * PATCH /api/orders/:id  -> cambia el estado y/o la nota.
 * Al pasar a 'confirmado' descuenta el stock de los productos que lo tengan
 * cargado (nunca por debajo de 0) y solo la primera vez.
 */
r.patch('/:id', requireRole('orders'), async (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'El identificador del pedido no es válido.' })

  const current = await db.get('SELECT * FROM orders WHERE id = ?', [id])
  if (!current) return res.status(404).json({ error: 'Pedido no encontrado' })

  const body = req.body ?? {}
  const hasStatus = 'status' in body
  const hasNote = 'note' in body
  if (!hasStatus && !hasNote) return res.status(400).json({ error: 'No hay nada que actualizar.' })

  let status = current.status
  if (hasStatus) {
    status = String(body.status ?? '').trim().toLowerCase()
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `El estado "${String(body.status ?? '').trim()}" no existe. Estados válidos: ${ORDER_STATUSES.join(', ')}.`,
      })
    }
  }
  const note = hasNote ? text(body.note, 500) : current.note

  const discount = status === 'confirmado' && current.status !== 'confirmado' && !(await alreadyDiscounted(id))

  const touched = await db.transaction(async (tx) => {
    await tx.run(`UPDATE orders SET status = @status, note = @note, updated_at = datetime('now') WHERE id = @id`, {
      status,
      note,
      id,
    })

    if (!discount) return 0
    const items = await tx.all('SELECT product_id, qty FROM order_items WHERE order_id = ? AND product_id IS NOT NULL', [id])
    let touched = 0
    for (const it of items) {
      const { changes } = await tx.run(
        `UPDATE products SET stock = MAX(0, stock - ?), updated_at = datetime('now')
         WHERE id = ? AND stock IS NOT NULL`,
        [it.qty, it.product_id]
      )
      touched += changes
    }
    return touched
  })

  if (hasStatus && status !== current.status) await logActivity(req.user, `cambió el pedido a ${status}`, 'pedido', id)
  else await logActivity(req.user, 'actualizó el pedido', 'pedido', id)
  // se registra solo si de verdad bajo stock: si ningun producto lo tenia cargado,
  // el descuento podra hacerse mas adelante
  if (touched > 0) await logActivity(req.user, STOCK_MARK, 'pedido', id)

  res.json({ order: await findOrder(id) })
})

r.delete('/:id', requireRole('orders'), async (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) return res.status(400).json({ error: 'El identificador del pedido no es válido.' })

  const row = await db.get('SELECT * FROM orders WHERE id = ?', [id])
  if (!row) return res.status(404).json({ error: 'Pedido no encontrado' })

  await db.run('DELETE FROM orders WHERE id = ?', [id]) // order_items cae por ON DELETE CASCADE
  await logActivity(req.user, `eliminó el pedido ${row.code}`, 'pedido', id)
  res.json({ ok: true })
})

export default r
