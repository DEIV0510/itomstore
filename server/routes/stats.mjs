/**
 * Cifras del panel.
 *
 * REGLA DE LA CASA: aqui NO se estima ni se inventa nada. Todo sale de un
 * COUNT/SUM contra la base de datos. Si una tabla esta vacia el resultado son
 * ceros y arrays vacios, y la interfaz muestra su propio aviso de "todavia no
 * hay suficientes datos". Nunca datos de ejemplo ni tendencias simuladas.
 */
import { Router } from 'express'
import { db } from '../db.mjs'
import { requireAuth } from '../auth.mjs'

const r = Router()

/** Fila de activity -> objeto que entiende el frontend. */
export function toActivity(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    createdAt: row.created_at,
  }
}

/** SUM() sobre una tabla vacia devuelve NULL: aqui siempre sale un numero. */
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

/** { pendiente: 3, entregado: 1 } a partir de un GROUP BY real. */
function byStatus(table) {
  // las claves salen de lo que hay en la base, no de una lista inventada
  const rows = db.prepare(`SELECT status, COUNT(*) AS n FROM ${table} GROUP BY status ORDER BY status`).all()
  const out = {}
  for (const row of rows) out[row.status] = n(row.n)
  return out
}

/** Las ultimas `count` fechas en formato YYYY-MM-DD, en UTC igual que date('now') de SQLite. */
function lastDays(count) {
  const today = new Date()
  const days = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i))
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

/**
 * Pedidos por dia de los ultimos 14 dias.
 * Si no hubo NINGUN pedido en la ventana devuelve [] (la interfaz avisa que no
 * hay datos). Si hubo alguno se rellenan los dias sin pedidos con 0: ese cero
 * es un dato real contado, no un relleno inventado.
 */
function ordersSeries(days = 14) {
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m-%d', created_at) AS day,
              COUNT(*)                         AS count,
              COALESCE(SUM(total), 0)          AS total
         FROM orders
        WHERE date(created_at) >= date('now', ?)
        GROUP BY day
        ORDER BY day`
    )
    .all(`-${days - 1} days`)

  if (!rows.length) return []

  const found = new Map(rows.map((row) => [row.day, row]))
  return lastDays(days).map((day) => ({
    day,
    count: n(found.get(day)?.count),
    total: n(found.get(day)?.total),
  }))
}

/* ------------------------------------------------------------------ lectura */

/** GET /api/stats — resumen completo del panel. Solo con sesion iniciada. */
r.get('/', requireAuth, (_req, res) => {
  // productos: noPrice cuenta todo el catalogo; el aviso de /alerts solo mira lo publicado
  const products = db
    .prepare(
      `SELECT COUNT(*)                                                  AS total,
              COALESCE(SUM(CASE WHEN published = 1 THEN 1 ELSE 0 END), 0) AS published,
              COALESCE(SUM(CASE WHEN published = 0 THEN 1 ELSE 0 END), 0) AS draft,
              COALESCE(SUM(CASE WHEN featured  = 1 THEN 1 ELSE 0 END), 0) AS featured,
              COALESCE(SUM(CASE WHEN price IS NULL THEN 1 ELSE 0 END), 0) AS no_price
         FROM products`
    )
    .get()

  // stock NULL = producto sin control de stock, por eso no entra en tracked
  const stock = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN stock IS NOT NULL THEN 1 ELSE 0 END), 0)          AS tracked,
              COALESCE(SUM(CASE WHEN stock BETWEEN 1 AND 3 THEN 1 ELSE 0 END), 0)      AS low,
              COALESCE(SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END), 0)                  AS out
         FROM products`
    )
    .get()

  // revenue = solo pedidos entregados; un pedido pendiente todavia no es plata
  const orders = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN status = 'entregado' THEN total ELSE 0 END), 0) AS revenue,
              COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END), 0) AS last30
         FROM orders`
    )
    .get()

  const tradeins = db.prepare('SELECT COUNT(*) AS total FROM tradeins').get()
  const customers = db.prepare('SELECT COUNT(*) AS total FROM customers').get()
  const categories = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END), 0) AS active
         FROM categories`
    )
    .get()

  res.json({
    products: {
      total: n(products.total),
      published: n(products.published),
      draft: n(products.draft),
      featured: n(products.featured),
      noPrice: n(products.no_price),
    },
    stock: {
      tracked: n(stock.tracked),
      low: n(stock.low),
      out: n(stock.out),
    },
    orders: {
      total: n(orders.total),
      byStatus: byStatus('orders'),
      revenue: n(orders.revenue),
      last30: n(orders.last30),
    },
    tradeins: {
      total: n(tradeins.total),
      byStatus: byStatus('tradeins'),
    },
    customers: { total: n(customers.total) },
    categories: { total: n(categories.total), active: n(categories.active) },
    series: { orders: ordersSeries(14) },
  })
})

/** GET /api/stats/activity — ultimos 30 movimientos, el mas reciente primero. */
r.get('/activity', requireAuth, (_req, res) => {
  const rows = db.prepare('SELECT * FROM activity ORDER BY id DESC LIMIT 30').all()
  res.json(rows.map(toActivity))
})

/* ------------------------------------------------------------------- avisos */

/** "1 pedido pendiente" / "3 pedidos pendientes" */
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`

const count = (sql) => n(db.prepare(sql).get()?.n)

/**
 * GET /api/stats/alerts — avisos del panel, todos calculados con consultas
 * reales. Los que dan 0 no se devuelven: no se avisa de lo que no existe.
 */
r.get('/alerts', requireAuth, (_req, res) => {
  const pending = count("SELECT COUNT(*) AS n FROM orders WHERE status = 'pendiente'")
  const newTradeins = count("SELECT COUNT(*) AS n FROM tradeins WHERE status = 'nueva'")
  const outOfStock = count('SELECT COUNT(*) AS n FROM products WHERE published = 1 AND stock = 0')
  const lowStock = count('SELECT COUNT(*) AS n FROM products WHERE published = 1 AND stock BETWEEN 1 AND 3')
  const noPrice = count('SELECT COUNT(*) AS n FROM products WHERE published = 1 AND price IS NULL')

  const alerts = [
    {
      type: 'pedidos-pendientes',
      level: 'info',
      text: plural(pending, 'pedido pendiente', 'pedidos pendientes'),
      href: '/admin/pedidos',
      count: pending,
    },
    {
      type: 'permutas-nuevas',
      level: 'info',
      text: plural(newTradeins, 'permuta nueva sin revisar', 'permutas nuevas sin revisar'),
      href: '/admin/permutas',
      count: newTradeins,
    },
    {
      type: 'sin-stock',
      level: 'danger',
      text: plural(outOfStock, 'producto publicado sin stock', 'productos publicados sin stock'),
      href: '/admin/inventario',
      count: outOfStock,
    },
    {
      type: 'stock-bajo',
      level: 'warn',
      text: plural(lowStock, 'producto publicado con poco stock', 'productos publicados con poco stock'),
      href: '/admin/inventario',
      count: lowStock,
    },
    {
      type: 'sin-precio',
      level: 'warn',
      text: plural(noPrice, 'producto publicado sin precio', 'productos publicados sin precio'),
      href: '/admin/productos',
      count: noPrice,
    },
  ]

  res.json(alerts.filter((a) => a.count > 0))
})

export default r
