/**
 * Servidor de ITOMSTORE: una sola aplicacion.
 *   /api/*  -> datos de la tienda y del panel (misma base de datos)
 *   /*      -> la SPA (en produccion sirve dist/; en desarrollo la sirve Vite)
 */
import express from 'express'
import cookieParser from 'cookie-parser'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { attachUser } from './auth.mjs'
import { seed } from './seed.mjs'

import authRoutes from './routes/auth.mjs'
import productRoutes from './routes/products.mjs'
import categoryRoutes from './routes/categories.mjs'
import orderRoutes from './routes/orders.mjs'
import tradeinRoutes from './routes/tradeins.mjs'
import customerRoutes from './routes/customers.mjs'
import promotionRoutes from './routes/promotions.mjs'
import settingRoutes from './routes/settings.mjs'
import userRoutes from './routes/users.mjs'
import statsRoutes from './routes/stats.mjs'
import mediaRoutes from './routes/media.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.PORT) || 5257

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

/** Cabeceras basicas de seguridad. */
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

app.use('/api', attachUser)

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/tradeins', tradeinRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/promotions', promotionRoutes)
app.use('/api/settings', settingRoutes)
app.use('/api/users', userRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/media', mediaRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta de API no encontrada' }))

/** Errores: mensaje util para el cliente, detalle solo en el log del servidor. */
app.use('/api', (err, _req, res, _next) => {
  console.error('[api]', err)
  res.status(err.status || 500).json({ error: err.publicMessage || 'Error interno del servidor' })
})

/* --------------------- en produccion tambien sirve la tienda construida */
const DIST = path.join(ROOT, 'dist')
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1y', index: false }))
  app.use(express.static(path.join(ROOT, 'public'), { maxAge: '1d', index: false }))
  // cualquier otra ruta la resuelve el enrutador del navegador (incluido /admin).
  // Se usa app.use y no app.get('*') porque Express 5 ya no acepta ese comodin.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    res.sendFile(path.join(DIST, 'index.html'))
  })
}

await seed()

const server = app.listen(PORT, () => {
  console.log(`\n  ITOMSTORE API  ->  http://localhost:${PORT}/api`)
  if (fs.existsSync(DIST)) console.log(`  Tienda         ->  http://localhost:${PORT}`)
  console.log(`  Panel          ->  /admin\n`)
})

/**
 * Un puerto ocupado en silencio deja la web sin API: el login empieza a devolver
 * errores incomprensibles porque las peticiones acaban en otro servidor.
 * Mejor parar aqui y decirlo con todas las letras.
 */
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n  ERROR: el puerto ${PORT} ya esta ocupado por otro proceso.\n` +
        `  Cierra ese proceso o arranca la API en otro puerto:  PORT=5357 npm start\n`
    )
    process.exit(1)
  }
  throw err
})
