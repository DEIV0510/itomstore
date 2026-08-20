import { BRAND } from './config'
import type { Product } from './types'
import { formatCOP } from './format'

const base = `https://wa.me/${BRAND.whatsapp}`

/** Construye el enlace a WhatsApp con un mensaje ya redactado. */
export function wa(message: string): string {
  return `${base}?text=${encodeURIComponent(message)}`
}

export const WA_GENERAL = wa(
  'Hola ITOMSTORE, estoy interesado en sus productos. Me pueden brindar mas informacion?'
)

export const WA_ASESORIA = wa(
  'Hola ITOMSTORE, quiero asesoria para elegir mi proximo equipo. Me ayudan?'
)

export const WA_PERMUTA = wa(
  'Hola ITOMSTORE, quiero cotizar mi equipo usado para entregarlo como parte de pago. Quisiera saber cuanto me reconocen.'
)

export const WA_ENVIO = wa(
  'Hola ITOMSTORE, quiero consultar el envio a mi ciudad. Me confirman tiempos y costo?'
)

export const WA_USADOS = wa(
  'Hola ITOMSTORE, quiero ver los equipos usados que tienen disponibles en este momento.'
)

/** Mensaje para un producto concreto del catalogo. */
export function waProduct(p: Product, qty = 1): string {
  const partes = [`Hola ITOMSTORE! Estoy interesado en el ${p.name}`]
  const detalle: string[] = []
  if (p.color) detalle.push(`color ${p.color}`)
  if (p.capacity) detalle.push(p.capacity)
  if (detalle.length) partes.push(` (${detalle.join(', ')})`)
  if (qty > 1) partes.push(` - cantidad: ${qty}`)
  partes.push('. Esta disponible?')
  return wa(partes.join(''))
}

/** Consulta por una categoria completa. */
export function waCategory(name: string): string {
  return wa(`Hola ITOMSTORE, quiero ver que tienen disponible en ${name}. Me pasan el catalogo actualizado?`)
}

export interface CheckoutLine {
  product: Product
  qty: number
}

/** Pedido completo del carrito -> mensaje ordenado y legible en WhatsApp. */
export function waCheckout(lines: CheckoutLine[], ciudad?: string): string {
  const items = lines.map(({ product, qty }, i) => {
    const attrs = [product.color, product.capacity].filter(Boolean).join(' / ')
    const precio = product.price === null ? 'a consultar' : formatCOP(product.price)
    const sub = product.price === null ? 'a consultar' : formatCOP(product.price * qty)
    return [
      `${i + 1}. ${product.name}${attrs ? ` (${attrs})` : ''}`,
      `   Estado: ${product.condition}`,
      `   Cantidad: ${qty}`,
      `   Precio unitario: ${precio}`,
      `   Subtotal: ${sub}`,
    ].join('\n')
  })

  const conPrecio = lines.filter((l) => l.product.price !== null)
  const total = conPrecio.reduce((acc, l) => acc + (l.product.price as number) * l.qty, 0)
  const totalTxt =
    conPrecio.length === 0
      ? 'Total: a confirmar con ustedes'
      : conPrecio.length === lines.length
        ? `Total: ${formatCOP(total)}`
        : `Total parcial: ${formatCOP(total)} (faltan productos por cotizar)`

  return wa(
    [
      'Hola ITOMSTORE! Quiero hacer este pedido:',
      '',
      ...items,
      '',
      totalTxt,
      '',
      ciudad ? `Ciudad de entrega: ${ciudad}` : 'Ciudad de entrega: (la indico por aqui)',
      'Quedo atento para confirmar disponibilidad y el envio.',
    ].join('\n')
  )
}
