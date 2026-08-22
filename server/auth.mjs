/**
 * Autenticacion y roles.
 *
 * - Las contraseñas se guardan con bcrypt; nunca en claro y nunca salen del servidor.
 * - La sesion viaja en una cookie httpOnly + sameSite: el token NO es accesible
 *   desde JavaScript, asi que no se puede robar con un XSS.
 * - Cada ruta de escritura pasa por requireRole(): ocultar el boton en el
 *   frontend no protege nada, la comprobacion real esta aqui.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from './db.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const COOKIE = 'itomstore_session'
const MAX_AGE_MS = 1000 * 60 * 60 * 12

/** El secreto vive en .env (ignorado por git). Si no existe se genera uno. */
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  const envFile = path.join(ROOT, '.env')
  const found = fs.existsSync(envFile) && fs.readFileSync(envFile, 'utf8').match(/^JWT_SECRET=(.+)$/m)
  if (found) return found[1].trim()
  const secret = crypto.randomBytes(48).toString('hex')
  fs.appendFileSync(envFile, `${fs.existsSync(envFile) ? '\n' : ''}JWT_SECRET=${secret}\n`)
  console.log('  se genero un JWT_SECRET nuevo en .env')
  return secret
}

const SECRET = loadSecret()

export const ROLES = ['admin', 'editor']

/** Permisos por rol. El editor gestiona el catalogo, no la casa. */
const PERMISSIONS = {
  admin: ['*'],
  editor: ['products', 'categories', 'promotions', 'home', 'orders', 'tradeins', 'customers', 'media'],
}

export function can(user, area) {
  if (!user) return false
  const list = PERMISSIONS[user.role] ?? []
  return list.includes('*') || list.includes(area)
}

export const hashPassword = (plain) => bcrypt.hashSync(plain, 12)
export const checkPassword = (plain, hash) => bcrypt.compareSync(plain, hash)

/** Datos que SI pueden salir al frontend (nunca el hash). */
export const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  mustChange: u.must_change === 1,
})

export function issueSession(res, user) {
  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '12h' })
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_MS,
    path: '/',
  })
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' })
}

/** Lee la cookie y cuelga req.user si la sesion es valida. Nunca lanza. */
export function attachUser(req, _res, next) {
  req.user = null
  const token = req.cookies?.[COOKIE]
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET)
      const row = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(payload.id)
      if (row) req.user = row
    } catch {
      /* token invalido o caducado: se sigue como visitante */
    }
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'No autorizado. Inicia sesión.' })
  next()
}

/** Comprobacion real de rol en el servidor, por area. */
export function requireRole(area) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autorizado. Inicia sesión.' })
    if (!can(req.user, area)) {
      return res.status(403).json({ error: 'Tu rol no tiene permiso para esta acción.' })
    }
    next()
  }
}

/* ----------------------------------------------- freno a la fuerza bruta */

const attempts = new Map()
const WINDOW_MS = 15 * 60 * 1000
const MAX_TRIES = 8

export function loginLimiter(req, res, next) {
  const key = req.ip || 'anon'
  const now = Date.now()
  const rec = attempts.get(key)
  if (rec && now - rec.first < WINDOW_MS && rec.count >= MAX_TRIES) {
    const mins = Math.ceil((WINDOW_MS - (now - rec.first)) / 60000)
    return res.status(429).json({ error: `Demasiados intentos. Vuelve a intentar en ${mins} minutos.` })
  }
  if (!rec || now - rec.first >= WINDOW_MS) attempts.set(key, { first: now, count: 0 })
  next()
}

export function noteFailedLogin(req) {
  const key = req.ip || 'anon'
  const rec = attempts.get(key) ?? { first: Date.now(), count: 0 }
  rec.count += 1
  attempts.set(key, rec)
}

export function clearLoginAttempts(req) {
  attempts.delete(req.ip || 'anon')
}
