import { Link } from 'react-router-dom'
import { MessageCircle, Plus, Check } from 'lucide-react'
import { useState } from 'react'
import Img from './Img'
import ConditionBadge from './ConditionBadge'
import { discountPct, priceLabel } from '@/lib/format'
import { waProduct } from '@/lib/whatsapp'
import { useStore } from '@/lib/store'
import { img } from '@/lib/images'
import type { Product } from '@/lib/types'

interface Props {
  product: Product
  /** ancho fijo para los carruseles horizontales en movil */
  railed?: boolean
  priority?: boolean
}

export default function ProductCard({ product: p, railed = false, priority = false }: Props) {
  const { add, openCart, toast } = useStore()
  const [justAdded, setJustAdded] = useState(false)
  const off = discountPct(p.price, p.oldPrice)
  const attrs = [p.color, p.capacity].filter(Boolean).join(' · ')

  function handleAdd() {
    add(p.id, 1)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 1600)
    toast({
      title: 'Agregado al carrito',
      detail: p.name,
      image: img(p.images[0])?.src,
      action: { label: 'Ver carrito', onClick: openCart },
    })
  }

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-hairline bg-graphite/70 shadow-card
                  transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-gold-500/30 hover:shadow-lift
                  ${railed ? 'w-[76vw] shrink-0 sm:w-[300px]' : ''}`}
    >
      <Link
        to={`/producto/${p.id}`}
        className="relative block aspect-[4/5] overflow-hidden bg-carbon"
        aria-label={`Ver ${p.name}`}
      >
        <Img
          name={p.images[0]}
          alt={`${p.name}${p.color ? ` color ${p.color}` : ''} disponible en ITOMSTORE`}
          className="h-full w-full"
          imgClassName="object-cover transition-transform duration-[900ms] ease-premium group-hover:scale-[1.06]"
          sizes="(min-width:1024px) 300px, (min-width:640px) 45vw, 76vw"
          priority={priority}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/5 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <ConditionBadge condition={p.condition} />
          {off !== null && <span className="badge badge-gold">-{off}%</span>}
        </div>

        {!p.available && (
          <div className="absolute inset-0 grid place-items-center bg-ink/[0.72] backdrop-blur-[2px]">
            <span className="badge badge-muted">Agotado</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="eyebrow mb-1.5 truncate">{p.brand}</p>
          <h3 className="title-md line-clamp-2 text-silver-100">
            <Link to={`/producto/${p.id}`} className="transition-colors hover:text-white">
              {p.name}
            </Link>
          </h3>
          {attrs && <p className="mt-1.5 truncate text-[13px] text-silver-500">{attrs}</p>}
        </div>

        <div className="mt-auto">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              {p.price === null ? (
                <p className="font-display text-[15px] font-extrabold leading-none text-gold-300">Precio a consultar</p>
              ) : (
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="font-display text-lg font-extrabold leading-none text-white">{priceLabel(p.price)}</p>
                  {p.oldPrice !== null && (
                    <p className="text-[13px] leading-none text-silver-700 line-through">{priceLabel(p.oldPrice)}</p>
                  )}
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-silver-700">
                {p.available ? 'Disponible' : 'Sin stock por ahora'}
              </p>
            </div>
          </div>

          {/* en tarjetas muy estrechas los dos botones se apilan a ancho completo */}
          <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-[1fr_auto]">
            <a
              href={waProduct(p)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-wa min-w-0 px-3"
              aria-label={`Consultar ${p.name} por WhatsApp`}
            >
              <MessageCircle size={15} aria-hidden className="shrink-0" />
              <span className="truncate">Consultar</span>
            </a>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!p.available}
              className="btn btn-sm btn-gold px-3"
              aria-label={`Agregar ${p.name} al carrito`}
            >
              {justAdded ? (
                <Check size={16} aria-hidden className="shrink-0" />
              ) : (
                <Plus size={16} aria-hidden className="shrink-0" />
              )}
              <span className="truncate min-[420px]:hidden">Agregar</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
