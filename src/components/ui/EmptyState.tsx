import { MessageCircle, PackageSearch } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  blurb: string
  /** enlace de WhatsApp ya construido con wa()/waCategory() */
  waHref: string
  waLabel?: string
  icon?: ReactNode
  /** accion secundaria opcional (p. ej. limpiar filtros) */
  secondary?: ReactNode
}

/**
 * Estado vacio honesto: cuando todavia no publicamos stock de algo,
 * lo decimos y abrimos la conversacion en vez de inventar productos.
 */
export default function EmptyState({ title, blurb, waHref, waLabel = 'Consultar por WhatsApp', icon, secondary }: Props) {
  return (
    <div className="glow-gold relative overflow-hidden rounded-3xl border border-hairline bg-graphite/60 px-6 py-14 text-center sm:px-10 sm:py-20">
      <div className="relative z-10 mx-auto max-w-md">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-gold-500/25 bg-gold-500/10 text-gold-300">
          {icon ?? <PackageSearch size={26} aria-hidden />}
        </div>
        <h3 className="title-md text-silver-100">{title}</h3>
        <p className="body-lg mt-3">{blurb}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-gold sheen w-full sm:w-auto">
            <MessageCircle size={17} aria-hidden />
            {waLabel}
          </a>
          {secondary}
        </div>
      </div>
    </div>
  )
}
