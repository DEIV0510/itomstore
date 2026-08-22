/**
 * Base de datos unica de ITOMSTORE (SQLite).
 * La tienda publica y el panel /admin leen y escriben AQUI: no hay datos duplicados.
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(ROOT, 'data')
fs.mkdirSync(DIR, { recursive: true })

export const db = new Database(path.join(DIR, 'itomstore.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

/* ------------------------------------------------------------------ esquema */

db.exec(`
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
`)

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

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? json(row.value, fallback) : fallback
}

export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(key, JSON.stringify(value))
}

export function logActivity(user, action, entity, entityId) {
  db.prepare(
    'INSERT INTO activity (user_id, user_name, action, entity, entity_id) VALUES (?, ?, ?, ?, ?)'
  ).run(user?.id ?? null, user?.name ?? 'sistema', action, entity ?? null, entityId != null ? String(entityId) : null)
}

/** Codigo legible para pedidos y permutas: ITM-000123 */
export function nextCode(prefix, table) {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()
  return `${prefix}-${String(row.n + 1).padStart(5, '0')}`
}
