import manifest from '@/data/images.json'

export interface ImageAsset {
  src: string
  srcSet?: string
  width?: number
  height?: number
  lqip?: string
}

const map = manifest as unknown as Record<string, ImageAsset>

/**
 * Devuelve la foto real por su clave, en tres formas posibles:
 * - clave del catalogo (ej. 'iphone-pro-mano'): trae srcSet/lqip/medidas.
 * - subida en desarrollo local (ej. 'uploads/<archivo>.jpg'): se resuelve a /img/<clave>.
 * - subida en produccion, Vercel Blob (URL absoluta https://...): se usa tal cual.
 * Cualquier otra clave (o null) devuelve null: el llamador muestra su fallback
 * en vez de una imagen rota.
 */
export function img(key: string | null | undefined): ImageAsset | null {
  if (!key) return null
  if (map[key]) return map[key]
  if (/^https?:\/\//.test(key)) return { src: key }
  if (key.includes('/')) return { src: `/img/${key}` }
  return null
}

export const LOGO = '/img/logo.webp'
export const LOGO_SM = '/img/logo-sm.webp'
export const LOGO_MARK = '/img/logo-mark.webp'
