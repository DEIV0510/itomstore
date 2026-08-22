import { Link } from 'react-router-dom'
import { ArrowRight, Bluetooth, BatteryFull, MessageCircle, Move, Volume2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Img from '@/components/ui/Img'
import Reveal from '@/components/ui/Reveal'
import ConditionBadge from '@/components/ui/ConditionBadge'
import { useShop } from '@/lib/shop'
import { priceLabel } from '@/lib/format'
import { waProduct } from '@/lib/whatsapp'

/** Iconos para las 4 caracteristicas reales del banner propio de la tienda. */
const FEATURE_ICON: LucideIcon[] = [Volume2, BatteryFull, Move, Bluetooth]

/**
 * Banda de producto destacado: el Bose S1 Pro+.
 * Usa el banner grafico real de ITOMSTORE, que ya trae su propio lettering,
 * asi que no se le superpone texto encima.
 *
 * El producto sale de la base de datos: si el administrador lo despublica o lo
 * borra, la seccion desaparece sola en vez de mostrar datos que ya no existen.
 */
export default function BoseBand() {
  const { getProduct } = useShop()
  const p = getProduct('bose-s1-pro-plus')
  if (!p) return null

  return (
    <section id="parlantes" aria-labelledby="parlantes-title" className="relative overflow-hidden bg-ink py-12 sm:py-16 lg:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(48% 60% at 78% 40%, rgba(201,162,39,0.16) 0%, rgba(201,162,39,0) 68%)',
        }}
      />
      <div className="container-x relative z-10">
        <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          {/* banner propio de la tienda */}
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-hairline shadow-lift">
              <Img
                name="bose-banner"
                alt="Bose S1 Pro+ junto al muro de cajas en la bodega de ITOMSTORE"
                className="aspect-[600/742] w-full"
                imgClassName="object-cover"
                sizes="(min-width:1024px) 40vw, 90vw"
              />
            </div>
          </Reveal>

          <Reveal delay={90}>
            <p className="eyebrow mb-3">Parlantes</p>
            <h2 id="parlantes-title" className="title-xl text-metal">
              POTENCIA QUE SE ESCUCHA
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ConditionBadge condition={p.condition} />
              <span className="badge badge-muted">{p.brand}</span>
            </div>

            <p className="body-lg mt-4 max-w-xl">{p.description}</p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {p.features.map((f, i) => {
                const Icon = FEATURE_ICON[i] ?? Volume2
                return (
                  <li key={f} className="flex items-center gap-3 rounded-xl border border-hairline bg-white/[0.03] px-3 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gold-500/25 bg-gold-500/[0.08] text-gold-300">
                      <Icon size={16} aria-hidden strokeWidth={1.9} />
                    </span>
                    <span className="text-[13px] font-medium text-silver-100">{f}</span>
                  </li>
                )
              })}
            </ul>

            <div className="mt-7 flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-display text-lg font-extrabold leading-none text-gold-300">{priceLabel(p.price)}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to={`/producto/${p.id}`} className="btn btn-sm btn-gold sheen">
                  Ver ficha
                  <ArrowRight size={15} aria-hidden />
                </Link>
                <a href={waProduct(p)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-wa">
                  <MessageCircle size={15} aria-hidden />
                  Consultar
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
