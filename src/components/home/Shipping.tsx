import { Link } from 'react-router-dom'
import { MapPin, MessageCircle, Store, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from '@/components/ui/Reveal'
import { COVERAGE } from '@/lib/config'
import { WA_ENVIO } from '@/lib/whatsapp'

const ICONS: LucideIcon[] = [Store, MapPin, Truck]

/** Cobertura real de la tienda: tres tarjetas y el CTA, sin adornos que ocupen pantalla. */
export default function Shipping() {
  return (
    <section
      id="envios"
      aria-labelledby="envios-titulo"
      className="relative overflow-hidden bg-ink py-14 sm:py-16 lg:py-20"
    >
      <div className="container-x">
        <Reveal className="mb-7 flex flex-col gap-5 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow mb-3 flex items-center gap-2.5">
              <span aria-hidden className="h-px w-7 bg-gradient-to-r from-gold-500 to-transparent" />
              Cobertura
            </p>
            <h2 id="envios-titulo" className="title-xl text-metal">
              LLEGAMOS A TODO COLOMBIA{' '}
              {/* bandera dibujada: el emoji no tiene glifo en Windows y degrada a las letras "CO" */}
              <svg
                aria-hidden
                viewBox="0 0 24 16"
                className="inline-block h-[0.62em] w-auto translate-y-[-0.06em] rounded-[3px] align-baseline shadow-card ring-1 ring-white/15"
              >
                <rect width="24" height="8" fill="#FCD116" />
                <rect y="8" width="24" height="4" fill="#003893" />
                <rect y="12" width="24" height="4" fill="#CE1126" />
              </svg>
            </h2>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
            <a
              href={WA_ENVIO}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-gold sheen w-full sm:w-auto"
            >
              <MessageCircle size={15} aria-hidden />
              Consultar envío
            </a>
            <Link to="/envios" className="btn btn-sm btn-ghost w-full sm:w-auto">
              Ver cobertura
            </Link>
          </div>
        </Reveal>

        <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {COVERAGE.map((zone, i) => {
            const Icon = ICONS[i] ?? Truck
            const principal = zone.city === 'Barranquilla'
            return (
              <Reveal
                as="li"
                key={zone.city}
                delay={i * 80}
                className={`flex h-full items-start gap-3.5 rounded-2xl border p-4 sm:p-5 ${
                  principal ? 'border-gold-500/35 bg-gold-500/[0.06]' : 'border-hairline bg-white/[0.03]'
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                    principal
                      ? 'border-gold-500/35 bg-gold-500/[0.12] text-gold-300'
                      : 'border-hairline bg-white/[0.04] text-silver-500'
                  }`}
                >
                  <Icon size={17} strokeWidth={1.9} />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <h3 className="title-md text-silver-100">{zone.city}</h3>
                    <span className={`badge ${principal ? 'badge-gold' : 'badge-muted'}`}>{zone.tag}</span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-silver-500">{zone.detail}</p>
                </div>
              </Reveal>
            )
          })}
        </ul>

        <Reveal className="mt-5">
          <p className="text-[12px] leading-relaxed text-silver-700">
            Los tiempos y el costo de envío se confirman según tu ciudad y la transportadora.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
