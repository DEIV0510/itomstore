import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import Img from '@/components/ui/Img'
import ProductCard from '@/components/ui/ProductCard'
import EmptyState from '@/components/ui/EmptyState'
import SectionHead from '@/components/ui/SectionHead'
import RouteFallback from '@/components/ui/RouteFallback'
import { useSeo } from '@/lib/seo'
import { useShop } from '@/lib/shop'
import { CATEGORY_ICON } from '@/data/categoryIcons'
import { WA_GENERAL, waCategory } from '@/lib/whatsapp'

/**
 * Texto de entrada por categoria. Solo describe: nada de precios ni promesas.
 * Si el administrador crea una categoria nueva se usa la descripcion corta que
 * el mismo escribio en /admin/categorias (`blurb`): nunca se inventa un texto.
 */
const INTRO: Record<string, string> = {
  iphone:
    'Equipos sellados y también usados. Antes de que compres te confirmamos capacidad, color y el precio del día por WhatsApp.',
  macbook:
    'Portátiles Apple en caja sellada. La configuración exacta —chip, memoria y almacenamiento— la confirmamos contigo antes de la entrega.',
  ipad: 'Tablets Apple selladas. Escríbenos y te decimos qué colores, capacidades y versiones tenemos en este momento.',
  watch:
    'Relojes inteligentes de Apple. Confirmamos modelo, tamaño de caja y versión antes de separar el tuyo.',
  airpods:
    'Todavía no publicamos este catálogo en la web. Escríbenos y te confirmamos qué hay disponible.',
  parlantes:
    'Sonido profesional Bose para eventos, músicos y presentaciones. Escríbenos y revisamos contigo cuál te sirve.',
  accesorios:
    'Fundas y complementos para proteger tu equipo. Consúltanos por los colores que tenemos disponibles.',
  android:
    'Gama alta Android en caja sellada. Te confirmamos capacidad y color al momento de la compra.',
}

export default function CategoryPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  /* categorias y productos vivos: lo que el panel publica es lo que se ve aqui */
  const { categories, settings, loading, error, getCategory, productsIn } = useShop()
  const [term, setTerm] = useState('')

  const brand = settings.brand
  const cat = getCategory(id)
  const items = useMemo(() => (cat ? productsIn(cat.id) : []), [cat, productsIn])
  const others = useMemo(() => categories.filter((c) => c.id !== cat?.id), [categories, cat])
  const intro = cat ? (INTRO[cat.id] ?? cat.blurb) : ''

  const jsonLd = useMemo(
    () =>
      cat
        ? {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${brand.url}/` },
              { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${brand.url}/catalogo` },
              { '@type': 'ListItem', position: 3, name: cat.name, item: `${brand.url}/categoria/${cat.id}` },
            ],
          }
        : undefined,
    [cat, brand.url]
  )

  /* Mientras cargan los datos no se anuncia un 404: se usan los textos generales
     de la tienda y el canonical de la propia URL. */
  const seo = cat
    ? {
        title: `${cat.name} en ITOMSTORE | Envíos a toda Colombia`,
        description: `${intro} Domicilios en Barranquilla, entregas en Valledupar y envíos nacionales.`,
        path: `/categoria/${cat.id}`,
      }
    : loading
      ? { title: settings.seo.title, description: settings.seo.description, path: `/categoria/${id}` }
      : {
          title: 'Categoría no encontrada | ITOMSTORE',
          description: 'Esa categoría no existe en el catálogo de ITOMSTORE. Explora todo lo que tenemos publicado.',
          path: '/catalogo',
        }

  useSeo({ ...seo, jsonLd })

  /* Mientras la API responde NO se puede decir que la categoria no existe:
     primero se espera a los datos, si no saldria un 404 falso por un instante. */
  if (loading) return <RouteFallback />

  if (!cat) {
    return (
      <div className="container-x section-y">
        <EmptyState
          title={error ? 'No pudimos cargar la categoría' : 'Esa categoría no existe'}
          blurb={
            error
              ? `${error} Puedes ver todo lo que tenemos publicado o escribirnos y te ayudamos a encontrar lo que buscas.`
              : 'El enlace que abriste no corresponde a ninguna categoría de nuestro catálogo. Puedes ver todo lo que tenemos publicado o escribirnos y te ayudamos a encontrar lo que buscas.'
          }
          waHref={WA_GENERAL()}
          waLabel="Escribirnos por WhatsApp"
          secondary={
            <Link to="/catalogo" className="btn btn-ghost w-full sm:w-auto">
              Ver todo el catálogo
            </Link>
          }
        />
      </div>
    )
  }

  const category = cat
  const Icon = CATEGORY_ICON[category.icon]

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const params = new URLSearchParams({ cat: category.id })
    const q = term.trim()
    if (q) params.set('q', q)
    navigate(`/catalogo?${params.toString()}`)
  }

  return (
    <>
      {/* --------------------------------------------------- banda cinematografica */}
      <section className="relative isolate flex min-h-[max(320px,44vh)] flex-col justify-end overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Img
            name={category.image}
            alt=""
            className="h-full w-full"
            imgClassName="object-cover"
            sizes="100vw"
            priority
            fallback={
              <div className="glow-gold absolute inset-0 bg-gradient-to-br from-elevated via-carbon to-ink">
                <span className="absolute inset-0 z-10 grid place-items-center text-gold-500/20">
                  <Icon size={132} strokeWidth={1} aria-hidden />
                </span>
              </div>
            }
          />
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/30" />

        <div className="container-x relative w-full pb-10 pt-24 sm:pb-14 sm:pt-28">
          <nav
            aria-label="Ruta de navegación"
            className="mb-5 flex flex-wrap items-center gap-2 text-[12px] text-silver-500"
          >
            <Link to="/" className="transition-colors hover:text-silver-100">
              Inicio
            </Link>
            <ChevronRight size={13} aria-hidden className="text-silver-700" />
            <Link to="/catalogo" className="transition-colors hover:text-silver-100">
              Catálogo
            </Link>
            <ChevronRight size={13} aria-hidden className="text-silver-700" />
            <span aria-current="page" className="text-silver-100">
              {category.name}
            </span>
          </nav>

          <p className="eyebrow mb-3 flex items-center gap-2.5">
            <span aria-hidden className="h-px w-7 bg-gradient-to-r from-gold-500 to-transparent" />
            Categoría
          </p>
          <h1 className="title-hero text-shadow-deep">
            <span className="text-metal">{category.name}</span>
          </h1>
          <p className="body-lg mt-5 max-w-xl text-silver-300">{intro}</p>
        </div>
      </section>

      {/* --------------------------------------------------- sub-filtros */}
      <section aria-labelledby="filtros-categoria" className="border-b border-hairline bg-carbon">
        <div className="container-x flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="filtros-categoria" className="sr-only">
            Filtrar {category.name}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow-muted mr-1">Ver</span>
            <Link to={`/catalogo?cat=${category.id}`} className="btn btn-sm btn-ghost">
              Todo en {category.short}
            </Link>
            <Link to={`/catalogo?cat=${category.id}&estado=nuevo`} className="btn btn-sm btn-ghost">
              Nuevo
            </Link>
            <Link to={`/catalogo?cat=${category.id}&estado=usado`} className="btn btn-sm btn-ghost">
              Usado
            </Link>
          </div>

          <form role="search" onSubmit={onSearch} className="w-full lg:w-72">
            <label htmlFor="buscar-categoria" className="sr-only">
              Buscar dentro de {category.name}
            </label>
            <div className="relative">
              <Search
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-silver-500"
              />
              <input
                id="buscar-categoria"
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={`Buscar en ${category.short}...`}
                autoComplete="off"
                className="h-12 w-full rounded-full border border-hairline bg-graphite/80 pl-11 pr-24 text-[14px] text-silver-100 outline-none transition-colors duration-300 ease-premium placeholder:text-silver-700 focus:border-gold-500/50"
              />
              <button type="submit" className="btn btn-sm btn-light absolute right-1.5 top-1/2 -translate-y-1/2">
                Buscar
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* --------------------------------------------------- productos */}
      <section className="section-y">
        <div className="container-x">
          {items.length > 0 ? (
            <>
              <SectionHead
                eyebrow="Publicado en la web"
                title={`Lo que tenemos en ${category.name}`}
                blurb="Los precios y las capacidades se confirman por WhatsApp: así te decimos siempre lo que hay de verdad en bodega."
                aside={
                  <Link to="/catalogo" className="btn btn-sm btn-ghost">
                    Ver todo el catálogo
                  </Link>
                }
              />
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 4} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="Todavía no hay unidades publicadas"
              blurb={`Aún no tenemos publicadas unidades de ${category.name} en la web. Escríbenos y te confirmamos qué tenemos disponible en este momento.`}
              waHref={waCategory(category.name)}
              waLabel={`Consultar ${category.short} por WhatsApp`}
              icon={<Icon size={26} aria-hidden />}
              secondary={
                <Link to="/catalogo" className="btn btn-ghost w-full sm:w-auto">
                  Ver todo el catálogo
                </Link>
              }
            />
          )}
        </div>
      </section>

      {/* --------------------------------------------------- otras categorias */}
      <section aria-labelledby="otras-categorias" className="section-y border-t border-hairline bg-carbon">
        <div className="container-x">
          <SectionHead
            id="otras-categorias"
            eyebrow="Sigue explorando"
            title="Otras categorías"
            blurb={`Todo el mundo Apple de ${brand.name} en un mismo lugar.`}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {others.map((c) => {
              const CardIcon = CATEGORY_ICON[c.icon]
              return (
                <Link
                  key={c.id}
                  to={`/categoria/${c.id}`}
                  className="group overflow-hidden rounded-2xl border border-hairline bg-graphite/70 shadow-card transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-gold-500/30 hover:shadow-lift"
                >
                  <Img
                    name={c.image}
                    alt={`Productos de la categoría ${c.name} en ITOMSTORE`}
                    className="aspect-[4/3] w-full bg-carbon"
                    imgClassName="object-cover transition-transform duration-[900ms] ease-premium group-hover:scale-[1.06]"
                    sizes="(min-width:1024px) 240px, 45vw"
                    fallback={
                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-elevated to-ink text-gold-500/30">
                        <CardIcon size={34} strokeWidth={1.2} aria-hidden />
                      </div>
                    }
                  />
                  <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                    <span className="min-w-0 truncate font-display text-[14px] font-extrabold tracking-tightest text-silver-100">
                      {c.name}
                    </span>
                    <ChevronRight
                      size={15}
                      aria-hidden
                      className="shrink-0 text-silver-700 transition-all duration-300 ease-premium group-hover:translate-x-0.5 group-hover:text-gold-300"
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
