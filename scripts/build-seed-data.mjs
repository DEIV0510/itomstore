/**
 * Compila los dos archivos de datos que usa la semilla del servidor
 * (src/data/catalog.ts y src/lib/config.ts) a JavaScript plano en generated/.
 *
 * Por que existe este paso: antes, server/seed.mjs invocaba a esbuild EN
 * TIEMPO DE EJECUCION para leer esos .ts directamente desde el disco. Eso
 * funciona en un proceso tradicional (local, Railway, un VPS), pero en una
 * funcion serverless de Vercel el empaquetador solo incluye los archivos que
 * detecta por una importacion ESTATICA: una lectura dinamica con fs/esbuild
 * en tiempo real no se rastrea, y el archivo .ts simplemente no viaja al
 * paquete de la funcion (falla con "Could not resolve", verificado en
 * produccion). La solucion es generar el JavaScript ANTES del despliegue y
 * que server/seed.mjs lo importe con un `import` normal, que si se rastrea.
 *
 * Se ejecuta antes de `dev`, `build` y `start` (ver package.json). Es rapido
 * (dos archivos pequeños) y su salida se regenera siempre: no se versiona.
 */
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'generated')
fs.mkdirSync(OUT_DIR, { recursive: true })

const FILES = [
  { entry: 'src/data/catalog.ts', out: 'catalog.mjs' },
  { entry: 'src/lib/config.ts', out: 'config.mjs' },
]

for (const { entry, out } of FILES) {
  const result = await build({
    entryPoints: [path.join(ROOT, entry)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    // catalog.ts solo importa TIPOS de '@/lib/types', que esbuild ya elimina
    // por ser `import type`; no hace falta resolver el alias.
    external: ['@/*'],
    logLevel: 'silent',
  })
  fs.writeFileSync(path.join(OUT_DIR, out), result.outputFiles[0].text)
  console.log(`  generated/${out} <- ${entry}`)
}
