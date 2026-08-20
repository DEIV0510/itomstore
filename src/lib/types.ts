export type CategoryId =
  | 'iphone' | 'macbook' | 'ipad' | 'watch' | 'airpods'
  | 'parlantes' | 'accesorios' | 'android'

export type Condition = 'nuevo' | 'seminuevo' | 'usado'

export interface Category {
  id: CategoryId
  name: string
  short: string
  blurb: string
  /** clave dentro de src/data/images.json; null = sin foto real disponible */
  image: string | null
  icon: 'smartphone' | 'laptop' | 'tablet' | 'watch' | 'headphones' | 'speaker' | 'cable' | 'android'
}

export interface Product {
  id: string
  name: string
  category: CategoryId
  brand: string
  /** null = precio no publicado todavia -> la UI muestra "Precio a consultar" */
  price: number | null
  oldPrice: number | null
  condition: Condition
  /** null = no confirmado; nunca inventamos capacidades */
  capacity: string | null
  color: string | null
  /** claves de src/data/images.json (la primera es la principal) */
  images: string[]
  description: string
  /** solo caracteristicas verificables en la foto/empaque o en material oficial de ITOMSTORE */
  features: string[]
  available: boolean
  featured: boolean
  /** aviso honesto sobre lo que hay que confirmar por WhatsApp */
  confirm?: string[]
}

export interface CartLine {
  id: string
  qty: number
}
