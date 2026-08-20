import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Home, Laptop, MessageCircle, Smartphone, Speaker, Tablet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Reveal from '@/components/ui/Reveal'
import { useSeo } from '@/lib/seo'
import { getCategory } from '@/data/catalog'
import { WA_GENERAL } from '@/lib/whatsapp'
import type { CategoryId } from '@/lib/types'

/** Atajos para recuperar la navegacion sin adivinar rutas. */
const DESTACADAS: { id: CategoryId; icon: LucideIcon }[] = [
  { id: 'iphone', icon: Smartphone },
  { id: 'macbook', icon: Laptop },
  { id: 'ipad', icon: Tablet },
  { id: 'parlantes', icon: Speaker },
]

export default function NotFound() {
  const location = useLocation()

  useSeo({
    title: 'Página no encontrada | ITOMSTORE',
    description:
      'La página que buscas no existe o cambió de dirección. Vuelve al inicio, revisa el catálogo de ITOMSTORE o escríbenos por WhatsApp.',
    /** el canonical apunta a la URL que el visitante abrió, no a la home */
    path: location.pathname,
  })

  return (
    <div className="relative flex min-h-[70vh] items-center overflow-hidden py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[900px] max-w-[170vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(201,162,39,.14), rgba(201,162,39,0))' }}
      />

      <div className="container-x relative z-10">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p
            aria-hidden
            className="select-none font-display text-[6rem] font-extrabold leading-none tracking-tightest text-gold-metal opacity-60 sm:text-[9rem]"
          >
            404
          </p>

          <h1 className="title-xl mt-2 text-metal">Esta página no existe</h1>

          <p className="body-lg mx-auto mt-5 max-w-md">
            Puede que el enlace esté incompleto o que ese contenido haya cambiado de lugar. No te preocupes:
            desde aquí vuelves a lo importante.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/" className="btn btn-gold sheen w-full sm:w-auto">
              <Home size={17} aria-hidden />
              IR AL INICIO
            </Link>
            <Link to="/catalogo" className="btn btn-ghost w-full sm:w-auto">
              VER CATÁLOGO
            </Link>
            <a
              href={WA_GENERAL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-wa w-full sm:w-auto"
            >
              <MessageCircle size={17} aria-hidden />
              ESCRIBIR POR WHATSAPP
            </a>
          </div>
        </Reveal>

        <Reveal delay={120} className="mx-auto mt-14 max-w-3xl">
          <h2 className="eyebrow-muted text-center">O empieza por una categoría</h2>

          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DESTACADAS.map(({ id, icon: Icon }) => {
              const c = getCategory(id)
              if (!c) return null
              return (
                <li key={id}>
                  <Link
                    to={`/categoria/${id}`}
                    className="group flex h-full items-center gap-3 rounded-2xl border border-hairline bg-graphite/60 p-4 transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-gold-500/35 hover:bg-graphite"
                  >
                    <span
                      aria-hidden
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold-500/25 bg-gold-500/10 text-gold-300"
                    >
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-silver-100">{c.name}</span>
                      <span className="block truncate text-[12px] text-silver-700">{c.blurb}</span>
                    </span>
                    <ArrowRight
                      size={15}
                      aria-hidden
                      className="shrink-0 text-silver-700 transition-colors duration-300 ease-premium group-hover:text-gold-300"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Reveal>
      </div>
    </div>
  )
}
