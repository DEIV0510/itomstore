import type { Category, Product } from '@/lib/types'

/* ---------------------------------------------------------------------------
 * CATALOGO ITOMSTORE
 *
 * REGLA: aqui solo entra informacion verificable en las fotos reales de la
 * tienda o en el material grafico propio de ITOMSTORE.
 *
 * Lo que NO conocemos queda en null y la interfaz lo muestra como
 * "A consultar" -> el cliente lo resuelve por WhatsApp.
 *
 * Para publicar precios: pon un numero en `price` (pesos colombianos, sin
 * puntos: 5990000). El precio, el total del carrito y el badge de descuento
 * aparecen solos. `oldPrice` activa el badge de promocion.
 * ------------------------------------------------------------------------- */

export const CATEGORIES: Category[] = [
  { id: 'iphone', name: 'iPhone', short: 'iPhone', blurb: 'Equipos sellados y usados.', image: 'iphone-pro-colores', icon: 'smartphone' },
  { id: 'macbook', name: 'MacBook', short: 'MacBook', blurb: 'Portatiles Apple.', image: 'macbook-cajas', icon: 'laptop' },
  { id: 'ipad', name: 'iPad', short: 'iPad', blurb: 'Tablets Apple.', image: 'ipad-air-colores', icon: 'tablet' },
  { id: 'watch', name: 'Apple Watch', short: 'Watch', blurb: 'Relojes inteligentes.', image: 'watch-abierto', icon: 'watch' },
  { id: 'airpods', name: 'AirPods', short: 'AirPods', blurb: 'Audio Apple.', image: null, icon: 'headphones' },
  { id: 'parlantes', name: 'Parlantes', short: 'Parlantes', blurb: 'Sonido profesional Bose.', image: 'bose-inventario', icon: 'speaker' },
  { id: 'accesorios', name: 'Accesorios', short: 'Accesorios', blurb: 'Fundas y complementos.', image: 'beats-fundas', icon: 'cable' },
  { id: 'android', name: 'Samsung', short: 'Samsung', blurb: 'Gama alta Android.', image: 'galaxy-s26-ultra', icon: 'android' },
]

const CONFIRM_BASE = ['Precio vigente', 'Capacidad disponible', 'Stock del color']

export const PRODUCTS: Product[] = [
  {
    id: 'iphone-17-pro-max-plata',
    name: 'iPhone 17 Pro Max',
    category: 'iphone',
    brand: 'Apple',
    price: null,
    oldPrice: null,
    condition: 'nuevo',
    capacity: null,
    color: 'Plata',
    images: ['iphone-pro-unidad', 'iphone-pro-mano', 'iphone-cajas-mesa'],
    description:
      'iPhone 17 Pro Max en color plata, en caja sellada. Manejamos varias unidades; la capacidad disponible se confirma al momento de la compra.',
    features: ['Caja sellada', 'Color plata', 'Varias unidades disponibles'],
    available: true,
    featured: true,
    confirm: CONFIRM_BASE,
  },
  {
    id: 'iphone-17-pro-max-cosmic-orange',
    name: 'iPhone 17 Pro Max',
    category: 'iphone',
    brand: 'Apple',
    price: null,
    oldPrice: null,
    condition: 'nuevo',
    capacity: null,
    color: 'Cosmic Orange',
    images: ['iphone-pro-colores', 'iphone-pro-mano', 'iphone-cajas-mesa'],
    description:
      'iPhone 17 Pro Max en Cosmic Orange, en caja sellada. Es uno de los colores que mas rota, escribenos para confirmar existencias.',
    features: ['Caja sellada', 'Color Cosmic Orange', 'Alta rotacion'],
    available: true,
    featured: true,
    confirm: CONFIRM_BASE,
  },
  {
    id: 'iphone-17-pro-plata',
    name: 'iPhone 17 Pro',
    category: 'iphone',
    brand: 'Apple',
    price: null,
    oldPrice: null,
    condition: 'nuevo',
    capacity: null,
    color: 'Plata',
    images: ['iphone-pro-mano', 'iphone-pro-unidad', 'iphone-cajas-mesa'],
    description:
      'iPhone 17 Pro en color plata, sellado. Ideal si buscas el rendimiento Pro en un formato mas compacto.',
    features: ['Caja sellada', 'Color plata'],
    available: true,
    featured: true,
    confirm: CONFIRM_BASE,
  },
  {
    id: 'iphone-17-pro-cosmic-orange',
    name: 'iPhone 17 Pro',
    category: 'iphone',
    brand: 'Apple',
    price: null,
    oldPrice: null,
    condition: 'nuevo',
    capacity: null,
    color: 'Cosmic Orange',
    images: ['iphone-pro-colores', 'iphone-cajas-mesa'],
    description: 'iPhone 17 Pro en Cosmic Orange, sellado. Consultanos por disponibilidad de capacidad.',
    features: ['Caja sellada', 'Color Cosmic Orange'],
    available: true,
    featured: false,
    confirm: CONFIRM_BASE,
  },
  {
    id: 'macbook-neo',
    name: 'MacBook Neo',
    category: 'macbook',
    brand: 'Apple',
    price: null,
    oldPrice: null,
    condition: 'nuevo',
    capacity: null,
    color: 'Rosa',
    images: ['macbook-cajas', 'macbook-inventario'],
    description:
      'MacBook Neo en caja sellada, color rosa. Tenemos varias unidades en bodega; la configuracion exacta se confirma por WhatsApp.',
    features: ['Caja sellada', 'Color rosa', 'Varias unidades disponibles'],
    available: true,
    featured: true,
    confirm: ['Precio vigente', 'Configuracion (chip, RAM, almacenamiento)', 'Stock'],
  },
  {
    id: 'ipad-air',
    name: 'iPad Air',
    category: 'ipad',
    brand: 'Apple',
    price: null,
    oldPrice: null,
    condition: 'nuevo',
    capacity: null,
    color: 'Azul, Morado, Starlight, Gris',
    images: ['ipad-air-colores'],
    description:
      'iPad Air sellado, disponible en varios colores. Escribenos y te decimos que colores y capacidades tenemos en este momento.',
    features: ['Caja sellada', 'Varios colores disponibles'],
    available: true,
    featured: true,
    confirm: ['Precio vigente', 'Capacidad', 'Color disponible', 'Version (WiFi / Celular)'],
  },
  {
    id: 'apple-watch',
    name: 'Apple Watch',
    category: 'watch',
    brand: 'Apple',
    price: null,
    oldPrice: null,
    condition: 'nuevo',
    capacity: null,
    color: 'Negro',
    images: ['watch-abierto', 'watch-caja'],
    description:
      'Apple Watch con correa deportiva negra, en caja sellada con su cable de carga. Confirmanos el modelo y el tamano que necesitas.',
    features: ['Caja sellada', 'Correa deportiva negra', 'Incluye cable de carga'],
    available: true,
    featured: true,
    confirm: ['Precio vigente', 'Modelo y generacion', 'Tamano de caja', 'Version (GPS / Celular)'],
  },
  {
    id: 'bose-s1-pro-plus',
    name: 'Bose S1 Pro+',
    category: 'parlantes',
    brand: 'Bose',
    price: null,
    oldPrice: null,
    condition: 'nuevo',
    capacity: null,
    color: 'Negro',
    images: ['bose-banner', 'bose-inventario'],
    description:
      'Sistema de sonido portatil Bose S1 Pro+ (Wireless PA System). El sonido que eleva cada momento: ideal para eventos, musicos, presentaciones y fiestas.',
    features: ['Sonido potente 360', 'Bateria de larga duracion', 'Diseno portatil', 'Conectividad Bluetooth'],
    available: true,
    featured: true,
    confirm: ['Precio vigente', 'Unidades disponibles'],
  },
  {
    id: 'beats-funda-iphone-17-pro-max',
    name: 'Funda Beats Rugged Case - iPhone 17 Pro Max',
    category: 'accesorios',
    brand: 'Beats',
    price: null,
    oldPrice: null,
    condition: 'nuevo',
    capacity: null,
    color: 'Gris, Azul, Blanco, Naranja',
    images: ['beats-fundas'],
    description:
      'Funda Beats Rugged Case para iPhone 17 Pro Max, con MagSafe y Camera Control. Disponible en varios colores.',
    features: ['Compatible con MagSafe', 'Camera Control', 'Para iPhone 17 Pro Max', 'Varios colores'],
    available: true,
    featured: true,
    confirm: ['Precio vigente', 'Color disponible'],
  },
  {
    id: 'galaxy-s26-ultra',
    name: 'Samsung Galaxy S26 Ultra',
    category: 'android',
    brand: 'Samsung',
    price: null,
    oldPrice: null,
    condition: 'nuevo',
    capacity: null,
    color: 'Negro',
    images: ['galaxy-s26-ultra'],
    description:
      'Samsung Galaxy S26 Ultra en caja sellada. Tambien manejamos gama alta Android: escribenos y te confirmamos capacidad y color.',
    features: ['Caja sellada', 'Varias unidades disponibles'],
    available: true,
    featured: true,
    confirm: CONFIRM_BASE,
  },
]

export const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id)
export const getCategory = (id: string) => CATEGORIES.find((c) => c.id === id)
export const productsIn = (id: string) => PRODUCTS.filter((p) => p.category === id)
