/**
 * Usuarios del panel. Area 'users' = SOLO administrador (ver PERMISSIONS en auth.mjs).
 *
 * Reglas que se comprueban aqui, en el servidor, pase lo que pase en el frontend:
 *   - el hash de la contraseña NUNCA sale en una respuesta,
 *   - nadie puede eliminarse ni degradarse a si mismo,
 *   - la tienda nunca se queda sin un administrador activo que pueda entrar.
 */
import { Router } from 'express'
import { db, bool, logActivity } from '../db.mjs'
import { ROLES, hashPassword, publicUser, requireRole } from '../auth.mjs'

const r = Router()

/** Fila de SQLite -> objeto para el panel. publicUser() ya deja fuera el hash. */
export function toUser(row) {
  return {
    ...publicUser(row),
    active: row.active === 1,
    createdAt: row.created_at,
    lastLogin: row.last_login,
  }
}

const find = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)

/** Cuantos administradores activos quedarian si excluimos a este usuario. */
const otherActiveAdmins = (id) =>
  db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1 AND id != ?").get(id).n

/** Valida y normaliza lo que llega del formulario del panel. */
function parseBody(body, { creating, current = null }) {
  const name = String(body?.name ?? '').trim()
  if (!name) return { error: 'El nombre del usuario es obligatorio.' }

  const role = body?.role === undefined || body?.role === null ? current?.role ?? 'editor' : String(body.role).trim()
  if (!ROLES.includes(role)) return { error: 'El rol debe ser administrador o editor.' }

  const active = body != null && 'active' in body ? (bool(body.active) ? 1 : 0) : current?.active ?? 1

  let email = null
  if (creating) {
    email = String(body?.email ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email)) {
      return { error: 'Escribe un correo válido. Ejemplo: nombre@itomstore.co' }
    }
  }

  // al editar la contraseña es opcional: si no viene, se deja la que ya tenia
  const raw = body?.password
  const password = raw === undefined || raw === null || raw === '' ? null : String(raw)
  if (creating && password === null) return { error: 'La contraseña es obligatoria.' }
  if (password !== null && password.length < 10) {
    return { error: 'La contraseña debe tener al menos 10 caracteres.' }
  }

  return { data: { email, name, role, active, password } }
}

/* ------------------------------------------------------------------ lectura */

r.get('/', requireRole('users'), (_req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY active DESC, role, name').all()
  res.json({ users: rows.map(toUser) })
})

r.get('/:id', requireRole('users'), (req, res) => {
  const row = find(req.params.id)
  if (!row) return res.status(404).json({ error: 'Usuario no encontrado' })
  res.json({ user: toUser(row) })
})

/* ---------------------------------------------------------------- escritura */

r.post('/', requireRole('users'), (req, res) => {
  const { data, error } = parseBody(req.body, { creating: true })
  if (error) return res.status(400).json({ error })

  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(data.email)) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' })
  }

  const info = db
    .prepare(
      `INSERT INTO users (email, password, name, role, active, must_change)
       VALUES (@email, @password, @name, @role, @active, 1)`
    )
    .run({ ...data, password: hashPassword(data.password) })

  logActivity(req.user, 'creó el usuario', 'usuario', info.lastInsertRowid)
  res.status(201).json({ user: toUser(find(info.lastInsertRowid)) })
})

r.put('/:id', requireRole('users'), (req, res) => {
  const current = find(req.params.id)
  if (!current) return res.status(404).json({ error: 'Usuario no encontrado' })

  const { data, error } = parseBody(req.body, { creating: false, current })
  if (error) return res.status(400).json({ error })

  const losesAdmin = current.role === 'admin' && current.active === 1 && (data.role !== 'admin' || data.active !== 1)

  // (b) nadie se quita a si mismo el acceso de administrador
  if (losesAdmin && current.id === req.user.id) {
    return res.status(400).json({ error: 'No puedes quitarte a ti mismo el acceso de administrador.' })
  }
  // (c) la tienda nunca se queda sin administrador activo
  if (losesAdmin && otherActiveAdmins(current.id) === 0) {
    return res.status(409).json({ error: 'Debe quedar al menos un administrador activo.' })
  }

  const sets = ['name = @name', 'role = @role', 'active = @active']
  const params = { id: current.id, name: data.name, role: data.role, active: data.active }

  if (data.password !== null) {
    sets.push('password = @password', 'must_change = @must_change')
    params.password = hashPassword(data.password)
    // si el admin le pone la clave a otra persona, esa persona debe cambiarla al entrar
    params.must_change = current.id === req.user.id ? 0 : 1
  }

  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = @id`).run(params)

  logActivity(req.user, data.password !== null ? 'cambió la contraseña del usuario' : 'editó el usuario', 'usuario', current.id)
  res.json({ user: toUser(find(current.id)) })
})

r.delete('/:id', requireRole('users'), (req, res) => {
  const row = find(req.params.id)
  if (!row) return res.status(404).json({ error: 'Usuario no encontrado' })

  // (a) nadie se elimina a si mismo
  if (row.id === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario.' })
  }
  // (c) la tienda nunca se queda sin administrador activo
  if (row.role === 'admin' && row.active === 1 && otherActiveAdmins(row.id) === 0) {
    return res.status(409).json({ error: 'Debe quedar al menos un administrador activo.' })
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(row.id)
  logActivity(req.user, 'eliminó el usuario', 'usuario', row.id)
  res.json({ ok: true })
})

export default r
