/**
 * Base de datos unica de ITOMSTORE (libSQL: SQLite compatible, con o sin red).
 * La tienda publica y el panel /admin leen y escriben AQUI: no hay datos duplicados.
 *
 * En local, sin variables de entorno, usa un archivo en disco (igual que antes).
 * En produccion (Vercel), TURSO_DATABASE_URL + TURSO_AUTH_TOKEN apuntan a una
 * base remota (Turso): el filesystem de las funciones serverless es efimero y
 * no compartido entre invocaciones, asi que un archivo local ahi perderia datos.
 */
import { createClient } from '@libsql/client'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REMOTE_URL = process.env.TURSO_DATABASE_URL
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

let url = REMOTE_URL
if (!url) {
  const DIR = path.join(ROOT, 'data')
  fs.mkdirSync(DIR, { recursive: true })
  url = `file:${path.join(DIR, 'itomstore.db')}`
}

const client = createClient(AUTH_TOKEN ? { url, authToken: AUTH_TOKEN } : { url })

/* ------------------------------------------------------------------ esquema */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'editor',
  active       INTEGER NOT NULL DEFAULT 1,
  must_change  INTEGER NOT NULL DEFAULT 0,
  last_login   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  short      TEXT NOT NULL DEFAULT '',
  blurb      TEXT NOT NULL DEFAULT '',
  image      TEXT,
  icon       TEXT NOT NULL DEFAULT 'smartphone',
  sort       INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  brand       TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL REFERENCES categories(id) ON UPDATE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  price       INTEGER,
  old_price   INTEGER,
  condition   TEXT NOT NULL DEFAULT 'nuevo',
  stock       INTEGER,
  sku         TEXT,
  color       TEXT,
  capacity    TEXT,
  images      TEXT NOT NULL DEFAULT '[]',
  features    TEXT NOT NULL DEFAULT '[]',
  confirm     TEXT NOT NULL DEFAULT '[]',
  featured    INTEGER NOT NULL DEFAULT 0,
  published   INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_pub ON products(published);

CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  whatsapp   TEXT NOT NULL,
  city       TEXT,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_wa ON customers(whatsapp);

CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pendiente',
  city        TEXT,
  total       INTEGER NOT NULL DEFAULT 0,
  has_pending INTEGER NOT NULL DEFAULT 0,
  channel     TEXT NOT NULL DEFAULT 'whatsapp',
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT,
  name       TEXT NOT NULL,
  qty        INTEGER NOT NULL DEFAULT 1,
  price      INTEGER
);

CREATE TABLE IF NOT EXISTS tradeins (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  whatsapp   TEXT NOT NULL,
  city       TEXT,
  device     TEXT NOT NULL,
  capacity   TEXT,
  condition  TEXT,
  photos     TEXT NOT NULL DEFAULT '[]',
  estimate   INTEGER,
  difference INTEGER,
  wants      TEXT,
  note       TEXT,
  status     TEXT NOT NULL DEFAULT 'nueva',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tradeins_status ON tradeins(status);

CREATE TABLE IF NOT EXISTS promotions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  subtitle   TEXT,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  discount   INTEGER,
  image      TEXT,
  starts_at  TEXT,
  ends_at    TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  user_name  TEXT,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`

/**
 * IMPORTANTE: client.execute() con un string de varias sentencias solo corre
 * la PRIMERA y descarta el resto en silencio (verificado). executeMultiple()
 * si las corre todas: es el metodo correcto para crear el esquema.
 */
await client.executeMultiple(SCHEMA)

// PRAGMA de journal solo tiene sentido en archivo local; en remoto se ignora
// si fallara, por eso va protegido y no bloquea el arranque.
try {
  await client.execute('PRAGMA foreign_keys = ON')
  if (!REMOTE_URL) await client.execute('PRAGMA journal_mode = WAL')
} catch {
  /* no critico */
}

/* --------------------------------------------------------------- adaptador */

/** lastInsertRowid llega como BigInt; el resto del codigo espera number. */
function normalizeRun(r) {
  return {
    changes: r.rowsAffected,
    lastInsertRowid: r.lastInsertRowid === undefined ? undefined : Number(r.lastInsertRowid),
  }
}

/**
 * Un valor suelto (ni array ni objeto) pasado como argumento nativo NO lanza
 * una excepcion de JavaScript: provoca un panic de Rust en el binding nativo
 * que TUMBA TODO EL PROCESO (verificado). Por eso cualquier valor asi se
 * envuelve en un array de un elemento antes de llegar a la capa nativa,
 * incondicionalmente, para que un descuido en una ruta jamas pueda derribar
 * el servidor entero.
 */
function normalizeArgs(params) {
  if (params === undefined) return []
  if (Array.isArray(params)) return params
  if (typeof params === 'object' && params !== null) return params
  return [params]
}

function makeRunner(exec) {
  return {
    /** Una fila o undefined. */
    async get(sql, params) {
      const r = await exec({ sql, args: normalizeArgs(params) })
      return r.rows[0]
    },
    /** Todas las filas. */
    async all(sql, params) {
      const r = await exec({ sql, args: normalizeArgs(params) })
      return r.rows
    },
    /** INSERT/UPDATE/DELETE: { changes, lastInsertRowid }. */
    async run(sql, params) {
      const r = await exec({ sql, args: normalizeArgs(params) })
      return normalizeRun(r)
    },
  }
}

/**
 * `db.get/all/run` para el uso normal (cada llamada es su propia operacion),
 * y `db.transaction(fn)` cuando varias escrituras deben ser atomicas y alguna
 * depende del resultado de la anterior (por ejemplo un pedido y sus lineas).
 *
 *   const row = await db.get('SELECT * FROM products WHERE id = ?', [id])
 *   await db.run('UPDATE products SET price = ? WHERE id = ?', [price, id])
 *
 *   await db.transaction(async (tx) => {
 *     const { lastInsertRowid } = await tx.run('INSERT INTO orders (...) VALUES (...)', [...])
 *     await tx.run('INSERT INTO order_items (order_id, ...) VALUES (?, ...)', [lastInsertRowid, ...])
 *   })
 */
export const db = {
  ...makeRunner((q) => client.execute(q)),
  async transaction(fn) {
    const tx = await client.transaction('write')
    try {
      const result = await fn(makeRunner((q) => tx.execute(q)))
      await tx.commit()
      return result
    } catch (err) {
      await tx.rollback().catch(() => {})
      throw err
    }
  },
}

/* ------------------------------------------------------------- utilidades */

export const json = (v, fallback = []) => {
  if (v === null || v === undefined) return fallback
  try {
    const parsed = typeof v === 'string' ? JSON.parse(v) : v
    return Array.isArray(parsed) || typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

export const bool = (v) => v === 1 || v === true || v === '1' || v === 'true'

export async function getSetting(key, fallback = null) {
  const row = await db.get('SELECT value FROM settings WHERE key = ?', [key])
  return row ? json(row.value, fallback) : fallback
}

export async function setSetting(key, value) {
  await db.run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, JSON.stringify(value)]
  )
}

/**
 * Registra la accion. Se espera que las rutas hagan `await logActivity(...)`
 * ANTES de responder: en un entorno serverless, una promesa sin esperar puede
 * quedar a medias si la funcion termina apenas se envia la respuesta.
 */
export async function logActivity(user, action, entity, entityId) {
  await db.run('INSERT INTO activity (user_id, user_name, action, entity, entity_id) VALUES (?, ?, ?, ?, ?)', [
    user?.id ?? null,
    user?.name ?? 'sistema',
    action,
    entity ?? null,
    entityId != null ? String(entityId) : null,
  ])
}

/** Codigo legible para pedidos y permutas: ITM-000123 */
export async function nextCode(prefix, table) {
  const row = await db.get(`SELECT COUNT(*) AS n FROM ${table}`)
  return `${prefix}-${String(row.n + 1).padStart(5, '0')}`
}
