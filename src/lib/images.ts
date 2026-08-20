import manifest from '@/data/images.json'

export interface ImageAsset {
  src: string
  srcSet: string
  width: number
  height: number
  lqip: string
}

const map = manifest as unknown as Record<string, ImageAsset>

/** Devuelve la foto real por su clave; null si esa categoria aun no tiene foto. */
export function img(key: string | null | undefined): ImageAsset | null {
  if (!key) return null
  return map[key] ?? null
}

export const LOGO = '/img/logo.webp'
export const LOGO_SM = '/img/logo-sm.webp'
export const LOGO_MARK = '/img/logo-mark.webp'
