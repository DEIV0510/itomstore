/**
 * Configuracion global de la tienda (tabla clave/valor `settings`).
 *
 * Desde aqui se configura ITOMSTORE entera: WhatsApp, ciudad, redes, textos de
 * la portada y SEO. La tienda publica lee todo de un solo GET.
 *
 * Reparto de permisos: los datos de la empresa (brand, socials, coverage, seo)
 * son de administrador; la portada ('home') tambien la puede tocar el editor.
 */
import { Router } from 'express'
import { getSetting, setSetting, logActivity } from '../db.mjs'
import { requireAuth, requireRole } from '../auth.mjs'

const r = Router()

/** Unicas claves que se pueden leer y escribir por esta API. */
const KEYS = ['brand', 'socials', 'coverage', 'home', 'seo']

/** Area de permiso de cada clave (ver PERMISSIONS en auth.mjs). */
const AREA = {
  brand: 'settings',
  socials: 'settings',
  coverage: 'settings',
  seo: 'settings',
  home: 'home',
}

/** Lo que ve la tienda: exactamente las cinco claves publicas, nada mas. */
export function toSettings() {
  return {
    brand: getSetting('brand', {}),
    socials: getSetting('socials', []),
    coverage: getSetting('coverage', []),
    home: getSetting('home', {}),
    seo: getSetting('seo', {}),
  }
}

/* ------------------------------------------------------------ validaciones */

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

/** Mantiene el valor guardado cuando el formulario no manda el campo. */
const pick = (next, current, key) => String(next?.[key] ?? current?.[key] ?? '').trim()

/**
 * Con el numero en crudo arma las dos versiones que muestra la web, para que
 * el administrador escriba el WhatsApp una sola vez y todo quede coherente.
 *   '573022170654' -> { display: '302 217 0654', pretty: '+57 302 217 0654' }
 */
function whatsappFormats(raw) {
  const local = raw.slice(-10)
  const code = raw.slice(0, -10) || '57' // sin indicativo asumimos Colombia
  const display = `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
  return { display, pretty: `+${code} ${display}` }
}

function parseBrand(value) {
  if (!isPlainObject(value)) return { error: 'Los datos de la tienda deben enviarse como un objeto.' }
  const current = getSetting('brand', {}) ?? {}

  const name = pick(value, current, 'name')
  if (!name) return { error: 'El nombre de la tienda es obligatorio.' }

  const whatsapp = String(value.whatsapp ?? current.whatsapp ?? '').trim()
  if (!/^\d{10,15}$/.test(whatsapp)) {
    return { error: 'El WhatsApp debe tener solo números, con indicativo. Ejemplo: 573022170654' }
  }

  const url = pick(value, current, 'url')
  if (url && !/^https?:\/\//.test(url)) {
    return { error: 'La dirección web debe empezar por https://. Ejemplo: https://itomstore.co' }
  }

  const { display, pretty } = whatsappFormats(whatsapp)

  return {
    data: {
      name,
      wordmark: pick(value, current, 'wordmark') || name,
      tagline: pick(value, current, 'tagline'),
      city: pick(value, current, 'city'),
      region: pick(value, current, 'region'),
      country: pick(value, current, 'country'),
      whatsapp,
      // se recalculan solos: nunca se aceptan del cliente
      whatsappDisplay: display,
      whatsappPretty: pretty,
      url,
      hours: pick(value, current, 'hours'),
    },
  }
}

function parseSocials(value) {
  if (!Array.isArray(value)) return { error: 'Las redes sociales deben enviarse como una lista.' }

  const data = []
  for (const item of value) {
    const name = String(item?.name ?? '').trim()
    if (!name) return { error: 'Cada red social necesita un nombre. Ejemplo: Instagram.' }

    const url = item?.url === null || item?.url === undefined ? '' : String(item.url).trim()
    if (url && !url.startsWith('https://')) {
      return { error: `El enlace de ${name} debe empezar por https:// o quedar vacío.` }
    }
    data.push({ name, url: url || null })
  }
  return { data }
}

function parseCoverage(value) {
  if (!Array.isArray(value)) return { error: 'Las zonas de cobertura deben enviarse como una lista.' }

  const data = []
  for (const item of value) {
    const city = String(item?.city ?? '').trim()
    if (!city) return { error: 'Cada zona de cobertura necesita una ciudad.' }
    data.push({
      city,
      detail: String(item?.detail ?? '').trim(),
      tag: String(item?.tag ?? '').trim(),
    })
  }
  return { data }
}

/** home y seo: objetos planos de textos e interruptores. */
function parseFlat(value, label) {
  if (!isPlainObject(value)) return { error: `Los datos de ${label} deben enviarse como un objeto.` }

  const data = {}
  for (const [key, raw] of Object.entries(value)) {
    if (raw === null || raw === undefined) continue // campo vacio: se quita
    if (typeof raw === 'string') data[key] = raw.trim()
    else if (typeof raw === 'boolean') data[key] = raw
    else return { error: `El campo "${key}" de ${label} solo admite texto o sí/no.` }
  }
  return { data }
}

/** Valida segun la clave y devuelve { data } o { error }, como en products.mjs. */
function parseBody(key, value) {
  if (key === 'brand') return parseBrand(value)
  if (key === 'socials') return parseSocials(value)
  if (key === 'coverage') return parseCoverage(value)
  if (key === 'home') return parseFlat(value, 'la portada')
  if (key === 'seo') return parseFlat(value, 'el SEO')
  return { error: 'Esa configuración no existe.' }
}

/* ------------------------------------------------------------------ lectura */

/**
 * GET /api/settings
 * PUBLICA: la tienda entera se configura con esto. Solo salen las cinco claves
 * de la lista blanca, nunca otra fila de la tabla settings.
 */
r.get('/', (_req, res) => {
  res.json(toSettings())
})

/* ---------------------------------------------------------------- escritura */

/** El rol exigido depende de la clave, asi que se resuelve en tiempo de peticion. */
function requireSettingRole(req, res, next) {
  const key = String(req.params.key ?? '')
  if (!KEYS.includes(key)) return res.status(404).json({ error: 'Esa configuración no existe.' })
  return requireRole(AREA[key])(req, res, next)
}

r.put('/:key', requireAuth, requireSettingRole, (req, res) => {
  const key = req.params.key
  // el formulario puede mandar el objeto pelado o envuelto en { value: ... }
  const incoming = req.body?.value !== undefined ? req.body.value : req.body

  const { data, error } = parseBody(key, incoming)
  if (error) return res.status(400).json({ error })

  setSetting(key, data)
  logActivity(req.user, 'actualizó la configuración', 'configuración', key)
  res.json({ [key]: data })
})

export default r
