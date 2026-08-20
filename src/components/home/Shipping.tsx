import { Link } from 'react-router-dom'
import { MapPin, MessageCircle, Store, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from '@/components/ui/Reveal'
import SectionHead from '@/components/ui/SectionHead'
import { COVERAGE } from '@/lib/config'
import { WA_ENVIO } from '@/lib/whatsapp'

/** Silueta simplificada de Colombia: Guajira al nororiente, istmo al noroccidente
 *  y el brazo amazonico hacia el sur. Es una insinuacion elegante, no un mapa tecnico. */
const COLOMBIA =
  'M238 40 Q258 70 268 104 Q276 128 258 148 Q244 162 262 186 Q276 206 258 236 Q240 266 222 296 Q208 322 202 366 Q186 344 172 322 Q156 300 132 282 Q108 264 92 238 Q74 210 62 178 Q52 150 42 126 Q34 108 22 92 Q34 80 48 92 Q62 104 84 96 Q118 82 150 74 Q190 62 238 40 Z'

interface Spot {
  name: string
  x: number
  y: number
  labelX: number
  labelY: number
  anchor: 'start' | 'middle' | 'end'
  pulse: boolean
}

const SPOTS: Spot[] = [
  { name: 'Barranquilla', x: 140, y: 82, labelX: 138, labelY: 64, anchor: 'middle', pulse: true },
  { name: 'Valledupar', x: 192, y: 98, labelX: 204, labelY: 102, anchor: 'start', pulse: true },
  { name: 'Resto del país', x: 128, y: 192, labelX: 128, labelY: 214, anchor: 'middle', pulse: false },
]

const COVERAGE_ICONS: LucideIcon[] = [Store, MapPin, Truck]

/** Cobertura de envios: mapa estilizado + las tres zonas reales de COVERAGE. */
export default function Shipping() {
  return (
    <section id="envios" aria-labelledby="envios-titulo" className="section-y relative overflow-hidden bg-ink">
      <div className="container-x">
        <SectionHead
          id="envios-titulo"
          align="center"
          eyebrow="Cobertura"
          title={
            <>
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
            </>
          }
          blurb="Sede en Barranquilla, entregas en Valledupar y envíos al resto del país."
        />

        <div className="grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-10">
          {/* mapa estilizado */}
          <Reveal className="glow-gold surface relative overflow-hidden p-6 sm:p-10">
            <div className="relative z-10 flex justify-center">
              <svg
                viewBox="0 0 320 400"
                role="img"
                aria-labelledby="mapa-colombia-titulo"
                className="h-auto w-full max-w-[300px]"
              >
                <title id="mapa-colombia-titulo">Cobertura de ITOMSTORE en Colombia</title>
                <defs>
                  <linearGradient id="gradiente-dorado" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F3E3B6" />
                    <stop offset="46%" stopColor="#C9A227" />
                    <stop offset="100%" stopColor="#7C6120" />
                  </linearGradient>
                </defs>

                <path
                  d={COLOMBIA}
                  fill="rgba(201,162,39,.05)"
                  stroke="url(#gradiente-dorado)"
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* rutas insinuadas entre las ciudades */}
                <path
                  d="M140 82 L128 192 M192 98 L128 192"
                  fill="none"
                  stroke="rgba(201,162,39,.28)"
                  strokeWidth={1}
                  strokeDasharray="3 6"
                />

                {SPOTS.map((s) => (
                  <g key={s.name}>
                    {s.pulse && (
                      <circle
                        cx={s.x}
                        cy={s.y}
                        r={9}
                        fill="none"
                        stroke="#C9A227"
                        strokeWidth={1}
                        className="animate-pulse-ring"
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                      />
                    )}
                    <circle cx={s.x} cy={s.y} r={5.5} fill="rgba(201,162,39,.18)" stroke="#DCBB66" strokeWidth={1} />
                    <circle cx={s.x} cy={s.y} r={2.2} fill="#F3E3B6" />
                    <text
                      x={s.labelX}
                      y={s.labelY}
                      textAnchor={s.anchor}
                      fill="#9AA0AA"
                      fontSize={10}
                      letterSpacing="0.04em"
                    >
                      {s.name}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </Reveal>

          {/* zonas de cobertura reales */}
          <ul className="grid gap-3 sm:gap-4">
            {COVERAGE.map((zone, i) => {
              const Icon = COVERAGE_ICONS[i] ?? Truck
              const principal = zone.city === 'Barranquilla'
              return (
                <Reveal
                  as="li"
                  key={zone.city}
                  delay={i * 90}
                  className={`surface flex items-start gap-4 p-5 transition-colors duration-300 ease-premium ${
                    principal ? 'border-gold-500/40 shadow-goldglow' : 'hover:border-gold-500/25'
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
                      principal
                        ? 'border-gold-500/35 bg-gold-500/[0.12] text-gold-300'
                        : 'border-hairline bg-white/[0.04] text-silver-500'
                    }`}
                  >
                    <Icon size={19} aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <h3 className="title-md text-silver-100">{zone.city}</h3>
                      <span className={`badge ${principal ? 'badge-gold' : 'badge-muted'}`}>{zone.tag}</span>
                    </div>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-silver-500">{zone.detail}</p>
                  </div>
                </Reveal>
              )
            })}
          </ul>
        </div>

        <Reveal className="mt-10 flex flex-col items-center gap-4 text-center sm:mt-12">
          <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <a
              href={WA_ENVIO}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-gold sheen w-full max-w-sm sm:w-auto"
            >
              <MessageCircle size={17} aria-hidden />
              CONSULTAR ENVÍO
            </a>
            <Link to="/envios" className="btn btn-ghost w-full max-w-sm sm:w-auto">
              Ver cobertura completa
            </Link>
          </div>

          <p className="max-w-md text-[12px] leading-relaxed text-silver-700">
            Los tiempos y el costo de envío se confirman según tu ciudad y la transportadora.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
