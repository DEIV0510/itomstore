import { Link } from 'react-router-dom'
import { ArrowRight, Calculator, CreditCard, MessageCircle, MessageSquare, PackageCheck, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from '@/components/ui/Reveal'
import SectionHead from '@/components/ui/SectionHead'
import { WA_PERMUTA } from '@/lib/whatsapp'

interface Step {
  n: string
  icon: LucideIcon
  text: string
}

/** Los cinco pasos reales del sistema de permuta. Sin cifras ni tiempos prometidos. */
const STEPS: Step[] = [
  { n: '01', icon: MessageSquare, text: 'Cuéntanos qué equipo tienes.' },
  { n: '02', icon: Search, text: 'Evaluamos su estado.' },
  { n: '03', icon: Calculator, text: 'Calculamos su valor.' },
  { n: '04', icon: CreditCard, text: 'Pagas el restante.' },
  { n: '05', icon: PackageCheck, text: 'Te llevas tu nuevo equipo.' },
]

/**
 * Seccion de permuta: recibimos el equipo usado como parte de pago.
 * Tratamiento visual especial (halo dorado + grano) porque es el gancho
 * de conversion mas fuerte de la home.
 */
export default function TradeIn() {
  return (
    <section
      id="permuta"
      aria-labelledby="permuta-titulo"
      className="grain section-y relative overflow-hidden border-t border-hairline bg-gradient-to-b from-carbon via-ink to-carbon"
    >
      {/* halo dorado grande, puramente decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[1000px] max-w-[160vw] -translate-x-1/2 -translate-y-[38%] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(201,162,39,.16), rgba(201,162,39,0))' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-[320px] w-[760px] max-w-[150vw] -translate-x-1/2 translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(201,162,39,.10), rgba(201,162,39,0))' }}
      />

      <div className="container-x relative z-10">
        <SectionHead
          id="permuta-titulo"
          align="center"
          eyebrow="Recibimos tu equipo"
          title="¿TIENES UN IPHONE QUE QUIERES CAMBIAR?"
          blurb="Recibimos tu teléfono usado y puedes entregarlo como parte de pago para adquirir uno nuevo."
        />

        {/* proceso visual: fila conectada en escritorio, columna con linea en movil */}
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent lg:block"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-8 left-8 top-8 w-px bg-gradient-to-b from-transparent via-gold-500/40 to-transparent lg:hidden"
          />

          <ol className="relative grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-5">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <Reveal
                  as="li"
                  key={step.n}
                  delay={i * 90}
                  className="flex items-start gap-4 lg:flex-col lg:items-center lg:gap-0 lg:text-center"
                >
                  <span className="relative z-10 grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-gold-500/25 bg-carbon shadow-card">
                    <span className="font-display text-3xl font-extrabold leading-none tracking-tightest text-gold-metal">
                      {step.n}
                    </span>
                  </span>

                  <div className="surface min-w-0 flex-1 p-5 lg:mt-5 lg:w-full lg:flex-none">
                    <Icon size={18} aria-hidden className="text-gold-400 lg:mx-auto" />
                    <p className="mt-3 text-[14px] leading-relaxed text-silver-300 sm:text-[15px]">{step.text}</p>
                  </div>
                </Reveal>
              )
            })}
          </ol>
        </div>

        <Reveal className="mt-9 flex flex-col items-center gap-4 text-center sm:mt-10">
          <a
            href={WA_PERMUTA}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-gold sheen w-full max-w-sm sm:w-auto"
          >
            <MessageCircle size={17} aria-hidden />
            QUIERO COTIZAR MI EQUIPO
          </a>

          <p className="max-w-md text-[12px] leading-relaxed text-silver-700">
            El valor depende del modelo y del estado del equipo. Te lo confirmamos por WhatsApp.
          </p>

          <Link
            to="/permutas"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-silver-500 transition-colors duration-300 ease-premium hover:text-gold-300"
          >
            Cómo funciona la permuta
            <ArrowRight size={14} aria-hidden />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
