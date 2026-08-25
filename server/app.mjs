/**
 * Fabrica de la aplicacion Express de ITOMSTORE.
 *
 * No llama a .listen(): eso lo decide quien la use.
 *   - server/index.mjs  -> proceso tradicional (local, Railway, un VPS): llama .listen(PORT).
 *   - api/index.mjs     -> funcion serverless de Vercel: se exporta la app misma,
 *                          que ya es invocable como (req, res) => {}.
 *
 * Asi el mismo codigo sirve la tienda + el panel + la API sin importar donde corra.
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

export async function createApp() {
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

  /* --------------------- fuera de Vercel tambien sirve la tienda construida.
     En Vercel el archivo estatico lo sirve la CDN directamente (outputDirectory
     de vercel.json); esta funcion solo atiende /api, asi que este bloque no
     hace falta ahi y se salta solo si no encuentra dist/. */
  const DIST = path.join(ROOT, 'dist')
  if (!process.env.VERCEL && fs.existsSync(DIST)) {
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
  return app
}
