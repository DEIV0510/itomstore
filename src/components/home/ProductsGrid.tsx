import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle } from 'lucide-react'
import ProductCard from '@/components/ui/ProductCard'
import Reveal from '@/components/ui/Reveal'
import EmptyState from '@/components/ui/EmptyState'
import { useShop } from '@/lib/shop'
import { DEFAULT_SETTINGS } from '@/lib/settings'
import { CATEGORY_ICON } from '@/data/categoryIcons'
import { WA_ASESORIA, waCategory } from '@/lib/whatsapp'

/**
 * El corazon de la home: todos los productos publicados, con filtro instantaneo
 * por categoria. Sin relleno: se entra directo a lo que se vende.
 * Productos y categorias vienen de la base de datos via useShop().
 */
export default function ProductsGrid() {
  const { products, categories, settings, loading } = useShop()
  const [active, setActive] = useState<string>('todos')

  /** Solo se ofrecen categorias que tienen productos publicados. */
  const chips = useMemo(() => {
    const withStock = categories.filter((c) => products.some((p) => p.category === c.id))
    return [
      { id: 'todos', name: 'Todos', icon: null },
      ...withStock.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
    ]
  }, [categories, products])

  const shown = useMemo(
    () => (active === 'todos' ? products : products.filter((p) => p.category === active)),
    [active, products]
  )

  const activeName = categories.find((c) => c.id === active)?.name ?? 'productos'
  const total = products.length

  // el titulo da nombre accesible a la seccion: no puede quedar vacio nunca
  const titulo = settings.home.productsTitle.trim() || DEFAULT_SETTINGS.home.productsTitle
  const eyebrow = settings.home.productsEyebrow.trim()

  return (
    <section id="productos" aria-labelledby="productos-title" className="section-y relative bg-carbon">
      <div className="container-x relative z-10">
        <Reveal className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            {eyebrow !== '' && (
              <p className="eyebrow mb-3 flex items-center gap-2.5">
                <span aria-hidden className="h-px w-7 bg-gradient-to-r from-gold-500 to-transparent" />
                {eyebrow}
              </p>
            )}
            <h2 id="productos-title" className="title-xl text-metal">
              {titulo}
            </h2>
            <p className="body-lg mt-3">
              {/* mientras carga no se anuncia ninguna cifra: nunca "0 referencias" */}
              {!loading && `${total} ${total === 1 ? 'referencia disponible' : 'referencias disponibles'}. `}
              Confirmamos precio y disponibilidad por WhatsApp.
            </p>
          </div>
          <Link to="/catalogo" className="btn btn-sm btn-ghost shrink-0 self-start sm:self-auto">
            Ver catálogo completo
            <ArrowRight size={15} aria-hidden />
          </Link>
        </Reveal>

        {/* filtro instantaneo por categoria */}
        <Reveal className="mb-7 -mx-5 px-5 sm:mx-0 sm:px-0">
          {loading ? (
            <div aria-hidden className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-11 w-28 shrink-0 rounded-full" />
              ))}
            </div>
          ) : (
            <div
              role="tablist"
              aria-label="Filtrar productos por categoría"
              className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
            >
              {chips.map((c) => {
                const on = active === c.id
                const Icon = c.icon ? CATEGORY_ICON[c.icon] : null
                const count = c.id === 'todos' ? total : products.filter((p) => p.category === c.id).length
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setActive(c.id)}
                    className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold
                                transition-all duration-300 ease-premium ${
                                  on
                                    ? 'border-gold-500/50 bg-gold-500/[0.12] text-gold-200'
                                    : 'border-hairline bg-white/[0.03] text-silver-500 hover:border-gold-500/30 hover:text-silver-100'
                                }`}
                  >
                    {Icon && <Icon size={15} aria-hidden strokeWidth={1.9} />}
                    {c.name}
                    <span className={`text-[11px] font-medium ${on ? 'text-gold-400' : 'text-silver-700'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </Reveal>

        {loading ? (
          // ocho tarjetas esqueleto en la misma rejilla: el diseño no salta cuando llegan los datos
          <div aria-hidden className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/5] w-full rounded-2xl" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            title={`Todavía no publicamos ${activeName} en la web`}
            blurb="Escríbenos y te confirmamos qué tenemos disponible."
            waHref={waCategory(activeName)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i, 6) * 50}>
                <ProductCard product={p} priority={i < 4} />
              </Reveal>
            ))}
          </div>
        )}

        <Reveal className="mt-8">
          <div className="surface-glass flex flex-col items-center justify-between gap-4 rounded-2xl px-5 py-5 sm:flex-row sm:px-7">
            <p className="text-center text-[13px] leading-relaxed text-silver-500 sm:text-left">
              <span className="font-semibold text-silver-100">¿No ves lo que buscas?</span> Escríbenos y te decimos qué
              tenemos disponible hoy.
            </p>
            <a
              href={WA_ASESORIA()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-wa w-full shrink-0 sm:w-auto"
            >
              <MessageCircle size={15} aria-hidden />
              Preguntar por WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
