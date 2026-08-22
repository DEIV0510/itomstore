import { BRAND as BRAND_SEMILLA, COVERAGE as COVERAGE_SEMILLA, SOCIALS as SOCIALS_SEMILLA } from './config'

/**
 * Configuracion viva de la tienda.
 *
 * La fuente de verdad es la base de datos (tabla `settings`, editable en
 * /admin/configuracion). Los valores de config.ts son solo el punto de partida
 * con el que se sembro la base y lo que se muestra en el primer pintado, antes
 * de que llegue la respuesta de la API.
 */

export interface Brand {
  name: string
  wordmark: string
  tagline: string
  city: string
  region: string
  country: string
  whatsapp: string
  whatsappDisplay: string
  whatsappPretty: string
  url: string
  hours?: string
}

export interface Social {
  name: string
  url: string | null
}

export interface Coverage {
  city: string
  detail: string
  tag: string
}

export interface HomeContent {
  heroEyebrow: string
  heroTitle: string
  heroTitleAccent: string
  heroSubtitle: string
  heroCta: string
  heroCtaHref: string
  heroImage: string
  heroBadgeTitle: string
  heroBadgeText: string
  productsTitle: string
  productsEyebrow: string
  showTrustBar: boolean
  showCategories: boolean
  showBose: boolean
  showTradeIn: boolean
  showShipping: boolean
}

export interface SeoContent {
  title: string
  description: string
}

export interface Settings {
  brand: Brand
  socials: Social[]
  coverage: Coverage[]
  home: HomeContent
  seo: SeoContent
}

export const DEFAULT_SETTINGS: Settings = {
  brand: { ...BRAND_SEMILLA, hours: '' },
  socials: SOCIALS_SEMILLA.map((s) => ({ ...s })),
  coverage: COVERAGE_SEMILLA.map((c) => ({ ...c })),
  home: {
    heroEyebrow: 'Barranquilla · Valledupar · Envíos a toda Colombia',
    heroTitle: 'TECNOLOGÍA QUE ESTÁ',
    heroTitleAccent: 'A OTRO NIVEL',
    heroSubtitle:
      'Encuentra iPhone, MacBook, iPad, Apple Watch, audífonos, parlantes y mucho más en ITOMSTORE.',
    heroCta: 'VER PRODUCTOS',
    heroCtaHref: '/catalogo',
    heroImage: 'iphone-pro-mano',
    heroBadgeTitle: 'iPhone 17 Pro',
    heroBadgeText: 'Sellado · varios colores',
    productsTitle: 'NUESTROS PRODUCTOS',
    productsEyebrow: 'Catálogo',
    showTrustBar: true,
    showCategories: true,
    showBose: true,
    showTradeIn: true,
    showShipping: true,
  },
  seo: {
    title: 'ITOMSTORE | Tecnología Apple y productos premium en Colombia',
    description:
      'Compra iPhone, MacBook, iPad, Apple Watch, audífonos, parlantes Bose y tecnología en ITOMSTORE. Domicilios en Barranquilla, entregas en Valledupar y envíos a toda Colombia.',
  },
}

/**
 * Copia viva en memoria. La actualiza <ShopProvider> al recibir la API.
 * Existe para que helpers que no son componentes (los constructores de enlaces
 * de WhatsApp) usen SIEMPRE el numero vigente sin tener que ser hooks.
 */
let current: Settings = DEFAULT_SETTINGS

export const getSettings = (): Settings => current

export function applySettings(next: Partial<Settings>): Settings {
  current = {
    brand: { ...current.brand, ...(next.brand ?? {}) },
    socials: next.socials ?? current.socials,
    coverage: next.coverage ?? current.coverage,
    home: { ...current.home, ...(next.home ?? {}) },
    seo: { ...current.seo, ...(next.seo ?? {}) },
  }
  return current
}
