/** Datos reales de ITOMSTORE. Unica fuente de verdad para contacto y textos de marca. */
export const BRAND = {
  name: 'ITOMSTORE',
  wordmark: 'iTOM STORE',
  tagline: 'Tu mundo Apple',
  city: 'Barranquilla',
  region: 'Atlantico',
  country: 'Colombia',
  /** Numero real de la tienda. Formato internacional sin signos para wa.me */
  whatsapp: '573022170654',
  whatsappDisplay: '302 217 0654',
  whatsappPretty: '+57 302 217 0654',
  url: 'https://itomstore.vercel.app',
} as const

/** Redes: se activan solo cuando exista el enlace oficial. No inventamos perfiles. */
export const SOCIALS: { name: string; url: string | null }[] = [
  { name: 'Instagram', url: null },
  { name: 'TikTok', url: null },
  { name: 'Facebook', url: null },
]

export const COVERAGE = [
  { city: 'Barranquilla', detail: 'Domicilios y pago contra entrega.', tag: 'Sede principal' },
  { city: 'Valledupar', detail: 'Entregas disponibles.', tag: 'Entregas' },
  { city: 'Resto de Colombia', detail: 'Envios nacionales.', tag: 'Envios' },
]
