/**
 * Arranque tradicional (local, Railway, un VPS): un solo proceso que sirve
 * la tienda + el panel + la API. En Vercel se usa api/index.mjs en su lugar,
 * que reutiliza exactamente la misma app de server/app.mjs.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.PORT) || 5257
const hasDist = fs.existsSync(path.join(ROOT, 'dist'))

const app = await createApp()

const server = app.listen(PORT, () => {
  console.log(`\n  ITOMSTORE API  ->  http://localhost:${PORT}/api`)
  if (hasDist) console.log(`  Tienda         ->  http://localhost:${PORT}`)
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
