import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Img from '@/components/ui/Img'
import Reveal from '@/components/ui/Reveal'
import SectionHead from '@/components/ui/SectionHead'
import { useShop } from '@/lib/shop'
import { CATEGORY_ICON } from '@/data/categoryIcons'

/** AirPods todavia no tiene foto real: se dibuja un panel propio, nunca la foto de otro producto. */
function IconoSinFoto({ Icon }: { Icon: LucideIcon }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-elevated via-graphite to-ink">
      <span
        aria-hidden
        className="absolute h-32 w-32 rounded-full bg-gold-500/[0.12] blur-3xl transition-opacity duration-700 ease-premium group-hover:bg-gold-500/20"
      />
      <Icon
        size={72}
        strokeWidth={0.9}
        aria-hidden
        className="relative text-silver-700/70 transition-transform duration-[900ms] ease-premium group-hover:scale-[1.07]"
      />
    </div>
  )
}

export default function CategoryGrid() {
  // las categorias llegan de la base de datos: solo las activas y ya con el
  // numero de productos publicados calculado por la API
  const { categories, settings, loading } = useShop()

  // sin categorias activas no hay nada que explorar: se oculta la seccion entera
  // en vez de dejar un titulo sobre una rejilla vacia
  if (!loading && categories.length === 0) return null

  return (
    <section id="categorias" aria-labelledby="categorias-titulo" className="section-y">
      <div className="container-x">
        <SectionHead
          id="categorias-titulo"
          eyebrow="Categorías"
          title="EXPLORA NUESTRO CATÁLOGO"
          blurb="Entra a la categoría que estás buscando. Te confirmamos disponibilidad, capacidad y precio del día por WhatsApp."
          aside={
            <Link to="/catalogo" className="btn btn-ghost btn-sm">
              Ver todo
              <ArrowUpRight size={15} aria-hidden />
            </Link>
          }
        />

        {loading ? (
          <div aria-hidden className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/5] w-full rounded-2xl sm:aspect-square" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((c, i) => {
              const Icon = CATEGORY_ICON[c.icon]
              const total = c.productCount ?? 0

              return (
                <Reveal key={c.id} delay={i * 60}>
                  <Link
                    to={`/categoria/${c.id}`}
                    className="group relative block aspect-[4/5] overflow-hidden rounded-2xl border border-hairline bg-graphite shadow-card
                               transition-all duration-500 ease-premium hover:border-gold-500/35 hover:shadow-lift sm:aspect-square"
                  >
                    <Img
                      name={c.image}
                      alt={`Categoría ${c.name} en ${settings.brand.name}`}
                      className="h-full w-full"
                      imgClassName="object-cover transition-transform duration-[900ms] ease-premium group-hover:scale-[1.07]"
                      sizes="(min-width:1024px) 300px, (min-width:768px) 30vw, 46vw"
                      fallback={<IconoSinFoto Icon={Icon} />}
                    />

                    {/* veladura base: el texto siempre queda legible sobre la foto */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-transparent"
                    />
                    {/* tinte dorado muy leve al pasar el mouse */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gold-500/[0.16] via-gold-500/[0.04] to-transparent
                                 opacity-0 transition-opacity duration-500 ease-premium group-hover:opacity-100"
                    />

                    <span className="absolute left-2.5 top-2.5 z-10">
                      {total === 0 ? (
                        <span className="badge badge-muted">Consultar stock</span>
                      ) : (
                        <span className="badge badge-gold">
                          {total} {total === 1 ? 'producto' : 'productos'}
                        </span>
                      )}
                    </span>

                    <span
                      aria-hidden
                      className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 translate-y-1 place-items-center rounded-full border border-gold-500/30
                                 bg-ink/60 text-gold-300 opacity-0 backdrop-blur-sm transition-all duration-500 ease-premium
                                 group-hover:translate-y-0 group-hover:opacity-100"
                    >
                      <ArrowUpRight size={15} />
                    </span>

                    <span className="absolute inset-x-0 bottom-0 z-10 block p-3 sm:p-4">
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-hairline bg-white/[0.07] text-gold-300 backdrop-blur-sm"
                        >
                          <Icon size={15} />
                        </span>
                        <span className="title-md block min-w-0 truncate text-silver-100">{c.name}</span>
                      </span>
                      {c.blurb && (
                        <span className="mt-1.5 hidden truncate text-[12px] text-silver-500 sm:block">{c.blurb}</span>
                      )}
                    </span>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
