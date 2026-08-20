import { Layers, ShieldCheck, Truck, Wallet } from 'lucide-react'
import Reveal from '@/components/ui/Reveal'

/** Cuatro hechos verificables de la tienda. Nada de cifras ni promesas inventadas. */
const ITEMS = [
  { icon: ShieldCheck, title: 'Compra segura', detail: 'Compra con atención personalizada.' },
  { icon: Wallet, title: 'Pago contra entrega', detail: 'Disponible en Barranquilla.' },
  { icon: Truck, title: 'Envíos nacionales', detail: 'Enviamos a todo Colombia.' },
  { icon: Layers, title: 'Nuevos y usados', detail: 'Opciones según tu presupuesto.' },
]

/** Barra de confianza que remata el hero. */
export default function TrustBar() {
  return (
    <section
      aria-label="Beneficios de comprar en ITOMSTORE"
      className="border-y border-hairline bg-carbon py-8 sm:py-10"
    >
      <div className="container-x">
        <ul className="grid grid-cols-2 gap-x-5 gap-y-7 sm:gap-x-8 lg:grid-cols-4 lg:gap-y-0">
          {ITEMS.map(({ icon: Icon, title, detail }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={i * 80}
              className="flex items-start gap-3 lg:border-l lg:border-hairline lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
            >
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/[0.08]"
              >
                <Icon className="h-5 w-5 text-gold-400" strokeWidth={1.75} />
              </span>
              <span className="block min-w-0">
                <span className="block text-sm font-semibold leading-snug text-silver-100 sm:text-base">
                  {title}
                </span>
                <span className="mt-1 block text-[12px] leading-snug text-silver-500 sm:text-[13px]">
                  {detail}
                </span>
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}
