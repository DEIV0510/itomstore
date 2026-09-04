/**
 * Imagenes disponibles para el panel.
 *
 * Las fotos reales ya procesadas viven en public/img y su manifiesto es
 * src/data/images.json (clave -> src, srcSet, width, height, lqip). El
 * formulario de producto elige entre esas claves.
 *
 * SUBIDAS: el frontend resuelve las claves del manifiesto con img(clave), pero
 * una foto recien subida NO esta en el manifiesto, asi que su clave ya es una
 * ruta o URL usable tal cual (ver toKey/toSrc mas abajo).
 *
 * Donde se guarda el archivo:
 * - Si existe BLOB_READ_WRITE_TOKEN (produccion en Vercel, con el store de
 *   Blob conectado) se sube a Vercel Blob: persiste de verdad y se sirve
 *   desde su propia URL publica.
 * - Si no existe (desarrollo local) se guarda en public/img/uploads, igual
 *   que siempre: nada cambia para quien trabaja en su maquina.
 * El disco de una funcion serverless de Vercel es de solo lectura (salvo
 * /tmp, efimero y no servido a los visitantes), por eso hace falta Blob ahi.
 */
import { Router } from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { put as blobPut } from '@vercel/blob'
import { logActivity } from '../db.mjs'
import { requireAuth, requireRole } from '../auth.mjs'

const r = Router()

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const MANIFEST = path.join(ROOT, 'src', 'data', 'images.json')
const UPLOAD_DIR = path.join(ROOT, 'public', 'img', 'uploads')
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN

const MAX_BYTES = 6 * 1024 * 1024
/** Lista blanca: del mimetype sale la extension, nunca del nombre del cliente. */
const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
const BAD_FILE = 'Solo se aceptan imágenes JPG, PNG o WebP de hasta 6 MB.'

/** Entrada del manifiesto -> lo que necesita el selector de imagenes (sin lqip: pesa y no hace falta). */
export function toAsset(key, entry) {
  return {
    key,
    src: typeof entry?.src === 'string' ? entry.src : `/img/${key}`,
    width: Number.isFinite(entry?.width) ? entry.width : null,
    height: Number.isFinite(entry?.height) ? entry.height : null,
  }
}

/** Valida el archivo recibido. Devuelve { data } o { error }, nunca confia en el cliente. */
function parseUpload(file) {
  if (!file || !file.buffer?.length) return { error: BAD_FILE }
  const ext = TYPES[file.mimetype]
  if (!ext) return { error: BAD_FILE }
  const size = Number(file.size)
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return { error: BAD_FILE }
  return { data: { ext } }
}

/**
 * En memoria y con tope de 6 MB: asi nada llega al disco antes de estar
 * validado y una subida abortada no deja archivos a medias en public/.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, Boolean(TYPES[file.mimetype])),
}).single('file')

/* ------------------------------------------------------------------ lectura */

/** GET /api/media — claves del manifiesto, ordenadas. Solo con sesion iniciada. */
r.get('/', requireAuth, (_req, res) => {
  let manifest
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  } catch {
    return res.status(500).json({ error: 'No pudimos leer el listado de imágenes del sitio.' })
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return res.status(500).json({ error: 'El listado de imágenes del sitio está dañado.' })
  }

  const images = Object.keys(manifest)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((key) => toAsset(key, manifest[key]))

  res.json(images)
})

/* ---------------------------------------------------------------- escritura */

/**
 * POST /api/media/upload — sube una imagen nueva.
 * El nombre lo pone el servidor (UUID + extension de la lista blanca): el
 * originalname del cliente se descarta entero, asi no hay forma de escribir
 * fuera de la carpeta ni de colar una extension ejecutable.
 *
 * Con Blob conectado (produccion): la clave que se guarda en el producto ES
 * la URL publica y permanente que devuelve Blob. Sin Blob (desarrollo local):
 * se escribe en public/img/uploads y la clave es 'uploads/<archivo>', como
 * siempre. src/lib/images.ts sabe resolver ambas formas en toda la tienda.
 */
r.post('/upload', requireRole('media'), (req, res) => {
  upload(req, res, async (err) => {
    // tamaño excedido, mimetype rechazado o multipart invalido: mismo mensaje claro
    if (err) return res.status(400).json({ error: BAD_FILE })

    const { data, error } = parseUpload(req.file)
    if (error) return res.status(400).json({ error })

    const file = `${crypto.randomUUID()}${data.ext}`

    if (USE_BLOB) {
      let blob
      try {
        blob = await blobPut(file, req.file.buffer, {
          access: 'public',
          contentType: req.file.mimetype,
          addRandomSuffix: false,
        })
      } catch {
        return res.status(500).json({ error: 'No pudimos guardar la imagen. Intenta de nuevo.' })
      }
      await logActivity(req.user, 'subió una imagen', 'imagen', blob.url)
      return res.status(201).json({ key: blob.url, src: blob.url })
    }

    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
      fs.writeFileSync(path.join(UPLOAD_DIR, file), req.file.buffer)
    } catch {
      return res.status(500).json({ error: 'No pudimos guardar la imagen en el servidor.' })
    }

    const key = `uploads/${file}`
    await logActivity(req.user, 'subió una imagen', 'imagen', key)
    res.status(201).json({ key, src: `/img/uploads/${file}` })
  })
})

export default r
