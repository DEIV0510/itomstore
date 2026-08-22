/**
 * Permutas: el cliente ofrece su equipo usado como parte de pago.
 *
 * El formulario de la tienda es PUBLICO (POST /), asi que aqui no se confia en
 * nada de lo que llega: el visitante describe su equipo y ya. El valor del
 * usado (estimate) y la diferencia a pagar los escribe SIEMPRE una persona
 * desde el panel; no hay tabla de precios de usados y no se inventa ninguna
 * cifra automatica.
 */
import { Router } from 'express'
import { db, json, logActivity, nextCode } from '../db.mjs'
import { requireRole } from '../auth.mjs'

const r = Router()

/** Estados reales del proceso. Cualquier otro valor se rechaza. */
const STATUSES = ['nueva', 'revision', 'cotizada', 'aceptada', 'rechazada', 'finalizada']

/** Fila de SQLite -> objeto que entiende el frontend. */
export function toTradein(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    whatsapp: row.whatsapp,
    city: row.city,
    device: row.device,
    capacity: row.capacity,
    condition: row.condition,
    photos: json(row.photos),
    estimate: row.estimate,
    difference: row.difference,
    wants: row.wants,
    note: row.note,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Lo que ve un visitante anonimo despues de enviar su solicitud: nada mas. */
const toPublicTradein = (row) => ({ code: row.code, status: row.status })

const text = (v) => String(v ?? '').trim()

/** Solo digitos: el cliente escribe "+57 300 123 4567" y aqui queda 573001234567. */
const digits = (v) => text(v).replace(/\D+/g, '')

/** Entero >= 0 o null. Devuelve undefined si el valor no sirve, para poder avisar. */
function money(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.round(n)
}

/**
 * Fotos: rutas subidas a la tienda o enlaces http(s).
 * Se bloquea cualquier otro esquema (javascript:, data:, ...) porque estas
 * cadenas se muestran despues como enlaces en el panel.
 */
function photos(v) {
  if (v === null || v === undefined || v === '') return { data: [] }
  if (!Array.isArray(v)) return { error: 'Las fotos deben enviarse como una lista.' }
  if (v.length > 8) return { error: 'Puedes adjuntar máximo 8 fotos.' }
  const out = []
  for (const item of v) {
    const url = text(item)
    if (!url) continue
    if (url.length > 300) return { error: 'Una de las fotos tiene una dirección demasiado larga.' }
    if (!/^\/[^/]/.test(url) && !/^https?:\/\//i.test(url)) {
      return { error: 'Las fotos deben ser enlaces http(s) o archivos subidos a la tienda.' }
    }
    out.push(url)
  }
  return { data: out }
}

/** Escapa los comodines de LIKE para que el buscador no se comporte raro. */
const like = (q) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

/**
 * nextCode cuenta filas: si se borró una permuta el código podría repetirse
 * y `code` es UNIQUE. Se avanza hasta encontrar uno libre.
 */
function uniqueCode() {
  const exists = db.prepare('SELECT 1 FROM tradeins WHERE code = ?')
  let n = Number(nextCode('PER', 'tradeins').split('-')[1]) || 1
  let code = `PER-${String(n).padStart(5, '0')}`
  while (exists.get(code)) code = `PER-${String(++n).padStart(5, '0')}`
  return code
}

/**
 * Valida la solicitud publica.
 * OJO: estimate, difference y status NO se leen del cuerpo aunque vengan;
 * los pone la tienda, nunca el cliente.
 */
function parseBody(body) {
  const name = text(body?.name)
  if (!name) return { error: 'Escribe tu nombre.' }
  if (name.length > 80) return { error: 'El nombre es demasiado largo (máximo 80 caracteres).' }

  const whatsapp = digits(body?.whatsapp)
  if (!whatsapp) return { error: 'Escribe tu número de WhatsApp.' }
  if (whatsapp.length < 10 || whatsapp.length > 15) {
    return { error: 'El WhatsApp debe tener entre 10 y 15 dígitos, sin espacios ni símbolos.' }
  }

  const device = text(body?.device)
  if (!device) return { error: 'Cuéntanos qué equipo quieres entregar.' }
  if (device.length > 120) return { error: 'La descripción del equipo es demasiado larga (máximo 120 caracteres).' }

  const city = text(body?.city)
  if (city.length > 60) return { error: 'El nombre de la ciudad es demasiado largo (máximo 60 caracteres).' }

  const capacity = text(body?.capacity)
  if (capacity.length > 40) return { error: 'La capacidad es demasiado larga (máximo 40 caracteres).' }

  // El estado del usado lo describe el cliente con sus palabras: no hay lista fija.
  const condition = text(body?.condition)
  if (condition.length > 80) return { error: 'La descripción del estado es demasiado larga (máximo 80 caracteres).' }

  const wants = text(body?.wants)
  if (wants.length > 200) return { error: 'El equipo que buscas se describe en máximo 200 caracteres.' }

  const note = text(body?.note)
  if (note.length > 500) return { error: 'El comentario es demasiado largo (máximo 500 caracteres).' }

  const fotos = photos(body?.photos)
  if (fotos.error) return { error: fotos.error }

  return {
    data: {
      name,
      whatsapp,
      city: city || null,
      device,
      capacity: capacity || null,
      condition: condition || null,
      wants: wants || null,
      note: note || null,
      photos: JSON.stringify(fotos.data),
    },
  }
}

/** Crea la permuta y, de paso, guarda al cliente en la agenda (igual que los pedidos). */
const createTradein = db.transaction((data, code) => {
  db.prepare(
    `INSERT INTO customers (name, whatsapp, city)
     VALUES (@name, @whatsapp, @city)
     ON CONFLICT(whatsapp) DO UPDATE SET
       name = excluded.name,
       city = COALESCE(excluded.city, customers.city)`
  ).run({ name: data.name, whatsapp: data.whatsapp, city: data.city })

  db.prepare(
    `INSERT INTO tradeins
      (code, name, whatsapp, city, device, capacity, condition, photos, wants, note, status)
     VALUES
      (@code, @name, @whatsapp, @city, @device, @capacity, @condition, @photos, @wants, @note, 'nueva')`
  ).run({ ...data, code })

  return db.prepare('SELECT * FROM tradeins WHERE code = ?').get(code)
})

/* ------------------------------------------------------------------ publica */

/**
 * POST /api/tradeins
 * La envia el cliente desde la tienda, sin sesion.
 * Responde solo con el codigo y el estado: un visitante anonimo no recibe de
 * vuelta el registro completo.
 */
r.post('/', (req, res) => {
  const { data, error } = parseBody(req.body)
  if (error) return res.status(400).json({ error })

  // Doble clic en "enviar": se devuelve la misma solicitud en vez de duplicarla.
  const reciente = db
    .prepare(
      `SELECT * FROM tradeins
        WHERE whatsapp = ? AND device = ? AND status = 'nueva'
          AND created_at > datetime('now', '-2 minutes')
        ORDER BY id DESC LIMIT 1`
    )
    .get(data.whatsapp, data.device)
  if (reciente) return res.status(201).json({ tradein: toPublicTradein(reciente) })

  const row = createTradein(data, uniqueCode())
  // sin sesion req.user es null y logActivity lo registra como "sistema"
  logActivity(req.user, 'registró una solicitud de permuta', 'permuta', row.id)
  res.status(201).json({ tradein: toPublicTradein(row) })
})

/* ------------------------------------------------------------ panel: lectura */

/** GET /api/tradeins?status=&q=  (code, nombre, whatsapp o equipo) */
r.get('/', requireRole('tradeins'), (req, res) => {
  const where = []
  const params = {}

  const status = text(req.query.status)
  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `Estado no válido. Los estados son: ${STATUSES.join(', ')}.` })
    }
    where.push('status = @status')
    params.status = status
  }

  const q = text(req.query.q)
  if (q) {
    where.push(
      `(code LIKE @q ESCAPE '\\' OR name LIKE @q ESCAPE '\\' OR whatsapp LIKE @q ESCAPE '\\' OR device LIKE @q ESCAPE '\\')`
    )
    params.q = like(q)
  }

  const sql = `SELECT * FROM tradeins ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC`
  res.json({ tradeins: db.prepare(sql).all(params).map(toTradein) })
})

r.get('/:id', requireRole('tradeins'), (req, res) => {
  const row = db.prepare('SELECT * FROM tradeins WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Permuta no encontrada' })
  res.json({ tradein: toTradein(row) })
})

/* ---------------------------------------------------------- panel: escritura */

/** PATCH /api/tradeins/:id — estado, valoración, diferencia y notas internas. */
r.patch('/:id', requireRole('tradeins'), (req, res) => {
  const current = db.prepare('SELECT * FROM tradeins WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Permuta no encontrada' })

  const body = req.body ?? {}
  const sets = []
  const params = { id: current.id }

  if ('status' in body) {
    const status = text(body.status)
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `Estado no válido. Los estados son: ${STATUSES.join(', ')}.` })
    }
    sets.push('status = @status')
    params.status = status
  }

  for (const key of ['estimate', 'difference']) {
    if (!(key in body)) continue
    const value = money(body[key])
    if (value === undefined) {
      const campo = key === 'estimate' ? 'La valoración del equipo' : 'La diferencia a pagar'
      return res.status(400).json({ error: `${campo} debe ser un número entero mayor o igual a 0, o quedar vacía.` })
    }
    sets.push(`${key} = @${key}`)
    params[key] = value
  }

  if ('note' in body) {
    const note = text(body.note)
    if (note.length > 500) {
      return res.status(400).json({ error: 'El comentario es demasiado largo (máximo 500 caracteres).' })
    }
    sets.push('note = @note')
    params.note = note || null
  }

  if (!sets.length) return res.status(400).json({ error: 'No hay nada que actualizar.' })

  db.prepare(`UPDATE tradeins SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run(params)
  logActivity(req.user, 'actualizó la permuta', 'permuta', current.id)
  res.json({ tradein: toTradein(db.prepare('SELECT * FROM tradeins WHERE id = ?').get(current.id)) })
})

r.delete('/:id', requireRole('tradeins'), (req, res) => {
  const row = db.prepare('SELECT * FROM tradeins WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Permuta no encontrada' })
  db.prepare('DELETE FROM tradeins WHERE id = ?').run(row.id)
  logActivity(req.user, 'eliminó la permuta', 'permuta', row.id)
  res.json({ ok: true })
})

export default r
