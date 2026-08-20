const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** Pesos colombianos sin decimales. */
export function formatCOP(value: number): string {
  return cop.format(value).replace(/\s/g, ' ')
}

/** Precio para la interfaz. null = todavia no publicado. */
export function priceLabel(price: number | null): string {
  return price === null ? 'Precio a consultar' : formatCOP(price)
}

export function discountPct(price: number | null, oldPrice: number | null): number | null {
  if (price === null || oldPrice === null || oldPrice <= price) return null
  return Math.round(((oldPrice - price) / oldPrice) * 100)
}

export const CONDITION_LABEL: Record<string, string> = {
  nuevo: 'Nuevo',
  seminuevo: 'Seminuevo',
  usado: 'Usado',
}
