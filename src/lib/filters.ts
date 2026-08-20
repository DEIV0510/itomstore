import type { Condition, Product } from './types'

export type SortKey = 'destacados' | 'precio-asc' | 'precio-desc' | 'nombre'

export interface FilterState {
  q: string
  cat: string[]
  brand: string[]
  condition: Condition[]
  capacity: string[]
  /** [min, max] en pesos; null = sin limite */
  price: [number | null, number | null]
  onlyAvailable: boolean
  sort: SortKey
}

export const EMPTY_FILTERS: FilterState = {
  q: '',
  cat: [],
  brand: [],
  condition: [],
  capacity: [],
  price: [null, null],
  onlyAvailable: false,
  sort: 'destacados',
}

/** Marcas diacriticas combinantes (U+0300..U+036F) que deja NFD. */
const COMBINING = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g')

/** Quita tildes y pasa a minusculas para que la busqueda sea tolerante. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING, '')
    .trim()
}

function haystack(p: Product): string {
  return norm([p.name, p.brand, p.color, p.capacity, p.description, p.features.join(' ')].filter(Boolean).join(' '))
}

/** Busqueda por todas las palabras (AND), tolerante a tildes y orden. */
export function matchesQuery(p: Product, q: string): boolean {
  const terms = norm(q).split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  const hay = haystack(p)
  return terms.every((t) => hay.includes(t))
}

export function applyFilters(products: Product[], f: FilterState): Product[] {
  const [min, max] = f.price
  const out = products.filter((p) => {
    if (!matchesQuery(p, f.q)) return false
    if (f.cat.length && !f.cat.includes(p.category)) return false
    if (f.brand.length && !f.brand.includes(p.brand)) return false
    if (f.condition.length && !f.condition.includes(p.condition)) return false
    if (f.capacity.length && (!p.capacity || !f.capacity.includes(p.capacity))) return false
    if (f.onlyAvailable && !p.available) return false
    // los productos sin precio publicado no se descartan por rango de precio
    if (p.price !== null) {
      if (min !== null && p.price < min) return false
      if (max !== null && p.price > max) return false
    }
    return true
  })

  const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, 'es')
  switch (f.sort) {
    case 'precio-asc':
      return out.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || byName(a, b))
    case 'precio-desc':
      return out.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity) || byName(a, b))
    case 'nombre':
      return out.sort(byName)
    default:
      return out.sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.available) - Number(a.available) || byName(a, b))
  }
}

/** Solo se ofrecen filtros que existen realmente en el catalogo. */
export function facets(products: Product[]) {
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'es'))
  return {
    brands: uniq(products.map((p) => p.brand)),
    conditions: [...new Set(products.map((p) => p.condition))] as Condition[],
    capacities: uniq(products.map((p) => p.capacity)),
    categories: [...new Set(products.map((p) => p.category))],
  }
}

export function countActive(f: FilterState): number {
  return (
    f.cat.length +
    f.brand.length +
    f.condition.length +
    f.capacity.length +
    (f.onlyAvailable ? 1 : 0) +
    (f.price[0] !== null || f.price[1] !== null ? 1 : 0)
  )
}
