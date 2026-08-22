import { Router } from 'express'
import { db, logActivity } from '../db.mjs'
import {
  checkPassword,
  clearLoginAttempts,
  clearSession,
  hashPassword,
  issueSession,
  loginLimiter,
  noteFailedLogin,
  publicUser,
  requireAuth,
} from '../auth.mjs'

const r = Router()

/** Quien soy. La tienda publica tambien lo llama: si no hay sesion devuelve user: null. */
r.get('/me', (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null })
})

r.post('/login', loginLimiter, (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')

  if (!email || !password) {
    return res.status(400).json({ error: 'Escribe tu correo y tu contraseña.' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)

  // mismo mensaje exista o no el correo: no confirmamos que usuarios hay
  if (!user || !user.active || !checkPassword(password, user.password)) {
    noteFailedLogin(req)
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' })
  }

  clearLoginAttempts(req)
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id)
  issueSession(res, user)
  logActivity(user, 'inicio de sesión', 'usuario', user.id)
  res.json({ user: publicUser(user) })
})

r.post('/logout', (req, res) => {
  if (req.user) logActivity(req.user, 'cerró sesión', 'usuario', req.user.id)
  clearSession(res)
  res.json({ ok: true })
})

/** Cambio de contraseña propio (obligatorio en el primer acceso). */
r.post('/password', requireAuth, (req, res) => {
  const current = String(req.body?.current ?? '')
  const next = String(req.body?.next ?? '')

  if (next.length < 10) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 10 caracteres.' })
  }
  if (!checkPassword(current, req.user.password)) {
    return res.status(400).json({ error: 'La contraseña actual no es correcta.' })
  }
  if (checkPassword(next, req.user.password)) {
    return res.status(400).json({ error: 'La nueva contraseña debe ser distinta de la actual.' })
  }

  db.prepare('UPDATE users SET password = ?, must_change = 0 WHERE id = ?').run(hashPassword(next), req.user.id)
  logActivity(req.user, 'cambió su contraseña', 'usuario', req.user.id)
  res.json({ ok: true })
})

export default r
