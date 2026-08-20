import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  Info,
  MapPin,
  MessageCircle,
  Minus,
  PackageSearch,
  Plus,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Img from '@/components/ui/Img'
import Reveal from '@/components/ui/Reveal'
import ProductCard from '@/components/ui/ProductCard'
import ConditionBadge from '@/components/ui/ConditionBadge'
import EmptyState from '@/components/ui/EmptyState'
import { useStore } from '@/lib/store'
import { useSeo } from '@/lib/seo'
import { BRAND } from '@/lib/config'
import { PRODUCTS, getCategory, getProduct, productsIn } from '@/data/catalog'
import { discountPct, formatCOP, priceLabel } from '@/lib/format'
import { WA_GENERAL, waProduct } from '@/lib/whatsapp'
import { img } from '@/lib/images'
import type { Product } from '@/lib/types'

const MAX_QTY = 10

interface Signal {
  icon: LucideIcon
  text: string
}

/** Ventajas reales de la tienda. Nada de garantias ni plazos inventados. */
const SIGNALS: Signal[] = [
  { icon: MapPin, text: 'Pago contra entrega en Barranquilla' },
  { icon: Truck, text: 'Envíos a toda Colombia' },
  { icon: MessageCircle, text: 'Atención personalizada por WhatsApp' },
]

/* -------------------------------------------------------------------------- */
/*  Producto inexistente: no se revienta, se convierte                        */
/* -------------------------------------------------------------------------- */

function ProductoNoEncontrado() {
  useSeo({
    title: 'Producto no encontrado | ITOMSTORE',
    description:
      'Ese producto ya no está publicado en ITOMSTORE. Mira el catálogo completo o escríbenos por WhatsApp y te decimos qué tenemos disponible.',
    path: '/catalogo',
  })

  return (
    <div className="section-y">
      <div className="container-x">
        <nav aria-label="Ruta de navegación" className="mb-8">
          <ol className="-my-1.5 flex items-center gap-1.5 text-[12px] text-silver-700">
            <li>
              <Link
                to="/"
                className="inline-flex py-1.5 text-silver-500 transition-colors duration-300 ease-premium hover:text-gold-300"
              >
                Inicio
              </Link>
            </li>
            <ChevronRight size={13} aria-hidden className="shrink-0" />
            <li>
              <Link
                to="/catalogo"
                className="inline-flex py-1.5 text-silver-500 transition-colors duration-300 ease-premium hover:text-gold-300"
              >
                Catálogo
              </Link>
            </li>
          </ol>
        </nav>

        <EmptyState
          icon={<PackageSearch size={26} aria-hidden />}
          title="No encontramos ese producto"
          blurb="Puede que ya no esté publicado o que el enlace esté incompleto. Revisa el catálogo completo o escríbenos y te decimos qué tenemos disponible hoy."
          waHref={WA_GENERAL}
          waLabel="Escribir por WhatsApp"
          secondary={
            <Link to="/catalogo" className="btn btn-ghost w-full sm:w-auto">
              Ver el catálogo
            </Link>
          }
        />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Ficha completa                                                            */
/* -------------------------------------------------------------------------- */

function ProductDetail({ p }: { p: Product }) {
  const { add, openCart, toast } = useStore()
  const [active, setActive] = useState(0)
  const [qty, setQty] = useState(1)
  const barRef = useRef<HTMLDivElement>(null)

  /* La barra fija solo existe en movil (`lg:hidden`), asi que en escritorio su
     alto medido es 0. Publicamos ese alto real en `--sticky-bar-h` para que el
     layout global reserve el espacio: el pie deja de quedar tapado y el boton
     flotante de WhatsApp se levanta por encima de la barra. */
  useEffect(() => {
    const root = document.documentElement
    const set = () => {
      const h = barRef.current?.offsetHeight ?? 0
      root.style.setProperty('--sticky-bar-h', `${h}px`)
    }
    set()
    window.addEventListener('resize', set)
    return () => {
      window.removeEventListener('resize', set)
      root.style.setProperty('--sticky-bar-h', '0px')
    }
  }, [])

  const category = getCategory(p.category)
  const categoryName = category?.name ?? 'Catálogo'
  const off = discountPct(p.price, p.oldPrice)
  const heroSrc = img(p.images[0])?.src
  const url = `${BRAND.url}/producto/${p.id}`
  const activeKey = p.images[active] ?? p.images[0]

  const related = useMemo(() => {
    const mismos = productsIn(p.category).filter((x) => x.id !== p.id)
    if (mismos.length >= 3) return mismos.slice(0, 4)
    const extra = PRODUCTS.filter((x) => x.featured && x.id !== p.id && !mismos.some((m) => m.id === x.id))
    return [...mismos, ...extra].slice(0, 4)
  }, [p])

  const jsonLd = useMemo<Record<string, unknown>>(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.description,
      image: heroSrc ? BRAND.url + heroSrc : undefined,
      brand: { '@type': 'Brand', name: p.brand },
      category: categoryName,
      itemCondition:
        p.condition === 'nuevo' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      offers: {
        '@type': 'Offer',
        availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        priceCurrency: 'COP',
        url,
      },
    }),
    [p, heroSrc, categoryName, url]
  )

  useSeo({
    title: `${p.name} | ITOMSTORE`,
    description: p.description.length > 155 ? `${p.description.slice(0, 152).trimEnd()}…` : p.description,
    path: `/producto/${p.id}`,
    image: heroSrc,
    jsonLd,
  })

  function handleAdd() {
    add(p.id, qty)
    toast({
      title: qty > 1 ? `${qty} unidades agregadas` : 'Agregado al carrito',
      detail: p.name,
      image: heroSrc,
      action: { label: 'Ver carrito', onClick: openCart },
    })
    openCart()
  }

  return (
    <div className="pb-4 lg:pb-0">
      <div className="container-x pt-7 sm:pt-9">
        {/* ------------------------------- migas ------------------------------- */}
        <nav
          aria-label="Ruta de navegación"
          className="-mx-5 -my-1.5 overflow-x-auto px-5 no-scrollbar sm:-mx-7 sm:px-7 lg:mx-0 lg:px-0"
        >
          <ol className="flex w-max items-center gap-1.5 whitespace-nowrap text-[12px] text-silver-700">
            <li>
              <Link
                to="/"
                className="inline-flex py-1.5 text-silver-500 transition-colors duration-300 ease-premium hover:text-gold-300"
              >
                Inicio
              </Link>
            </li>
            <ChevronRight size={13} aria-hidden className="shrink-0" />
            <li>
              <Link
                to="/catalogo"
                className="inline-flex py-1.5 text-silver-500 transition-colors duration-300 ease-premium hover:text-gold-300"
              >
                Catálogo
              </Link>
            </li>
            <ChevronRight size={13} aria-hidden className="shrink-0" />
            <li>
              <Link
                to={`/categoria/${p.category}`}
                className="inline-flex py-1.5 text-silver-500 transition-colors duration-300 ease-premium hover:text-gold-300"
              >
                {categoryName}
              </Link>
            </li>
            <ChevronRight size={13} aria-hidden className="shrink-0" />
            <li aria-current="page" className="py-1.5">
              {p.name}
            </li>
          </ol>
        </nav>

        {/* ------------------------------ contenido ---------------------------- */}
        <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
          {/* ----------------------------- galeria ----------------------------- */}
          <Reveal className="min-w-0">
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 -inset-y-5 sm:-inset-y-8"
                style={{
                  background:
                    'radial-gradient(58% 48% at 50% 46%, rgba(201,162,39,.16) 0%, rgba(201,162,39,0) 72%)',
                }}
              />

              <div className="relative z-10 aspect-[4/5] overflow-hidden rounded-3xl border border-hairline bg-carbon shadow-card lg:aspect-square">
                <Img
                  key={activeKey}
                  name={activeKey}
                  alt={`${p.name}${p.color ? ` color ${p.color}` : ''} en ITOMSTORE`}
                  className="h-full w-full"
                  imgClassName="object-cover"
                  sizes="(min-width:1024px) 620px, 100vw"
                  priority
                  fallback={
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-elevated to-ink">
                      <PackageSearch size={34} aria-hidden className="text-gold-400/60" />
                    </div>
                  }
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent"
                />

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <ConditionBadge condition={p.condition} />
                  {off !== null && <span className="badge badge-gold">-{off}%</span>}
                </div>

                {!p.available && (
                  <div className="absolute inset-0 grid place-items-center bg-ink/70 backdrop-blur-[2px]">
                    <span className="badge badge-muted">Agotado</span>
                  </div>
                )}
              </div>
            </div>

            {p.images.length > 1 && (
              <div className="relative z-10 mt-4 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {p.images.map((key, i) => (
                  <button
                    key={`${key}-${i}`}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={i === active}
                    aria-label={`Ver imagen ${i + 1} de ${p.images.length}`}
                    className={`h-[90px] w-[72px] shrink-0 overflow-hidden rounded-xl border bg-carbon transition-all duration-300 ease-premium ${
                      i === active
                        ? 'border-gold-500/70 shadow-goldglow'
                        : 'border-hairline opacity-70 hover:border-gold-500/35 hover:opacity-100'
                    }`}
                  >
                    <Img
                      name={key}
                      alt=""
                      className="h-full w-full"
                      imgClassName="object-cover"
                      sizes="72px"
                      fallback={<span aria-hidden className="block h-full w-full bg-elevated" />}
                    />
                  </button>
                ))}
              </div>
            )}
          </Reveal>

          {/* --------------------------- informacion --------------------------- */}
          <Reveal delay={90} className="min-w-0">
            <p className="eyebrow">{p.brand}</p>
            <h1 className="title-xl mt-3 text-metal">{p.name}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {p.color && <span className="badge badge-muted">Color: {p.color}</span>}
              <span className="badge badge-muted">
                Capacidad: {p.capacity !== null ? p.capacity : 'a consultar'}
              </span>
            </div>

            {/* -------------------------- precio -------------------------- */}
            <div className="mt-6">
              {p.price === null ? (
                <div className="rounded-2xl border border-gold-500/25 bg-gold-500/[0.06] p-5 sm:p-6">
                  <p className="font-display text-2xl font-extrabold tracking-tightest text-gold-metal">
                    Precio a consultar
                  </p>
                  <p className="mt-2.5 max-w-md text-[13px] leading-relaxed text-silver-500 sm:text-[14px]">
                    Los precios cambian según el modelo y la disponibilidad del día. Escríbenos y te lo
                    confirmamos al instante.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-baseline gap-3">
                  <p className="font-display text-3xl font-extrabold leading-none tracking-tightest text-white sm:text-4xl">
                    {formatCOP(p.price)}
                  </p>
                  {p.oldPrice !== null && (
                    <p className="text-[15px] leading-none text-silver-700 line-through">
                      {formatCOP(p.oldPrice)}
                    </p>
                  )}
                  {off !== null && <span className="badge badge-gold">-{off}% de descuento</span>}
                </div>
              )}
            </div>

            {/* ----------------------- disponibilidad ---------------------- */}
            <p className="mt-4 flex items-center gap-2 text-[13px] text-silver-500">
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full ${
                  p.available ? 'bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.14)]' : 'bg-silver-700'
                }`}
              />
              {p.available ? 'Disponible' : 'Agotado por ahora'}
            </p>

            <p className="body-lg mt-6">{p.description}</p>

            {/* ----------------------- caracteristicas --------------------- */}
            {p.features.length > 0 && (
              <div className="mt-8">
                <h2 className="text-[11px] font-semibold uppercase tracking-label text-silver-700">
                  Características
                </h2>
                <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-silver-300">
                      <span
                        aria-hidden
                        className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-300"
                      >
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span className="min-w-0">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ------------------ confirmamos por WhatsApp ------------------ */}
            {p.confirm && p.confirm.length > 0 && (
              <div className="surface-glass mt-8 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gold-500/25 bg-gold-500/10 text-gold-300"
                  >
                    <Info size={17} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="title-md text-silver-100">Antes de comprar confirmamos contigo</h2>
                    <p className="mt-2 text-[13px] leading-relaxed text-silver-500">
                      Para que no haya sorpresas, estos datos los verificamos por WhatsApp antes de cerrar la
                      compra:
                    </p>
                    <ul className="mt-4 flex flex-col gap-2">
                      {p.confirm.map((c) => (
                        <li key={c} className="flex items-start gap-2.5 text-[14px] text-silver-300">
                          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                          <span className="min-w-0">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------- cantidad ------------------------- */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <span id="cantidad-label" className="text-[13px] font-medium text-silver-500">
                Cantidad
              </span>
              <div
                role="group"
                aria-labelledby="cantidad-label"
                className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white/[0.03] p-1"
              >
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Disminuir cantidad"
                  className="grid h-11 w-11 place-items-center rounded-full text-silver-300 transition-colors duration-300 ease-premium hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-40"
                >
                  <Minus size={16} aria-hidden />
                </button>
                <span aria-live="polite" className="w-9 text-center font-display text-base font-extrabold text-white">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                  disabled={qty >= MAX_QTY}
                  aria-label="Aumentar cantidad"
                  className="grid h-11 w-11 place-items-center rounded-full text-silver-300 transition-colors duration-300 ease-premium hover:bg-white/[0.06] hover:text-white disabled:pointer-events-none disabled:opacity-40"
                >
                  <Plus size={16} aria-hidden />
                </button>
              </div>
            </div>

            {/* --------------------------- acciones ------------------------- */}
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!p.available}
                className="btn btn-gold sheen w-full"
              >
                <ShoppingBag size={17} aria-hidden />
                AGREGAR AL CARRITO
              </button>
              <a
                href={waProduct(p, qty)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-wa w-full"
              >
                <MessageCircle size={17} aria-hidden />
                {p.available ? 'COMPRAR POR WHATSAPP' : 'CONSULTAR DISPONIBILIDAD'}
              </a>
            </div>

            {/* ------------------------ micro-señales ----------------------- */}
            <ul className="mt-7 flex flex-col gap-2.5 border-t border-hairline pt-6">
              {SIGNALS.map((s) => {
                const Icon = s.icon
                return (
                  <li key={s.text} className="flex items-center gap-2.5 text-[13px] text-silver-500">
                    <Icon size={15} aria-hidden className="shrink-0 text-gold-400" />
                    <span className="min-w-0">{s.text}</span>
                  </li>
                )
              })}
            </ul>
          </Reveal>
        </div>
      </div>

      {/* ------------------------- productos relacionados ------------------- */}
      {related.length > 0 && (
        <section aria-labelledby="relacionados-titulo" className="section-y mt-4 border-t border-hairline bg-carbon">
          <div className="container-x">
            <Reveal className="mb-8 sm:mb-10">
              <p className="eyebrow mb-3 flex items-center gap-2.5">
                <span aria-hidden className="h-px w-7 bg-gradient-to-r from-gold-500 to-transparent" />
                Sigue mirando
              </p>
              <h2 id="relacionados-titulo" className="title-xl text-metal">
                También te puede interesar
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {related.map((r, i) => (
                <Reveal key={r.id} delay={i * 80}>
                  <ProductCard product={r} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------- barra pegajosa en movil --------------------- */}
      <div
        ref={barRef}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-carbon/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}
      >
        <div className="flex items-center gap-3 px-4 pt-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] text-silver-500">{p.name}</p>
            <p
              className={`truncate font-display text-[15px] font-extrabold leading-tight ${
                p.price === null ? 'text-gold-300' : 'text-white'
              }`}
            >
              {priceLabel(p.price)}
            </p>
          </div>
          <a
            href={waProduct(p, qty)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-wa h-11 w-11 shrink-0 px-0"
            aria-label={`Comprar ${p.name} por WhatsApp`}
          >
            <MessageCircle size={17} aria-hidden />
          </a>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!p.available}
            className="btn btn-sm btn-gold shrink-0"
            aria-label={`Agregar ${p.name} al carrito`}
          >
            <ShoppingBag size={15} aria-hidden />
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const p = id ? getProduct(id) : undefined

  if (!p) return <ProductoNoEncontrado />
  return <ProductDetail key={p.id} p={p} />
}
