/** Navegacion compartida por header, menu movil y footer. Solo rutas reales. */

export interface NavItem {
  label: string
  to: string
}

export const NAV_MAIN: NavItem[] = [
  { label: 'Inicio', to: '/' },
  { label: 'iPhone', to: '/categoria/iphone' },
  { label: 'MacBook', to: '/categoria/macbook' },
  { label: 'iPad', to: '/categoria/ipad' },
  { label: 'Apple Watch', to: '/categoria/watch' },
  { label: 'AirPods', to: '/categoria/airpods' },
  { label: 'Parlantes', to: '/categoria/parlantes' },
  { label: 'Accesorios', to: '/categoria/accesorios' },
  { label: 'Samsung', to: '/categoria/android' },
]

/** Enlaces destacados que no son categorias. */
export const NAV_EXTRA: NavItem[] = [
  { label: 'Usados', to: '/catalogo?estado=usado' },
  { label: 'Recibe tu equipo', to: '/permutas' },
]

export const NAV_TIENDA: NavItem[] = [
  { label: 'Todo el catálogo', to: '/catalogo' },
  { label: 'iPhone', to: '/categoria/iphone' },
  { label: 'MacBook', to: '/categoria/macbook' },
  { label: 'iPad', to: '/categoria/ipad' },
  { label: 'Apple Watch', to: '/categoria/watch' },
  { label: 'AirPods', to: '/categoria/airpods' },
  { label: 'Parlantes', to: '/categoria/parlantes' },
  { label: 'Accesorios', to: '/categoria/accesorios' },
  { label: 'Usados', to: '/catalogo?estado=usado' },
]

export const NAV_INFO: NavItem[] = [
  { label: 'Sobre nosotros', to: '/nosotros' },
  { label: 'Envíos y cobertura', to: '/envios' },
  { label: 'Preguntas frecuentes', to: '/preguntas-frecuentes' },
  { label: 'Cambios y garantías', to: '/garantias' },
  { label: 'Permutas', to: '/permutas' },
]
