import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle, Wallet } from 'lucide-react'
import Img from '@/components/ui/Img'
import ConditionBadge from '@/components/ui/ConditionBadge'
import { WA_GENERAL } from '@/lib/whatsapp'

/**
 * Primera pantalla de la tienda.
 * Las fotos son de celular: la del fondo va desenfocada y casi apagada (textura),
 * y la principal va enmarcada en una composicion, nunca estirada a pantalla completa.
 */
export default function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="grain relative min-h-[86svh] overflow-hidden bg-ink pb-16 pt-28 lg:min-h-[90svh] lg:pb-20 lg:pt-32"
    >
      {/* ------------------------------------------------------------ fondo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        {/* a) foto de inventario como textura */}
        <div className="absolute inset-0 scale-110 opacity-[0.16] blur-[3px]">
          <Img
            name="iphone-cajas-mesa"
            alt=""
            className="h-full w-full"
            imgClassName="object-cover"
            sizes="100vw"
          />
        </div>

        {/* c) veladura para asegurar contraste del texto */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/40" />

        {/* b) luz calida arriba a la derecha + frio muy tenue abajo a la izquierda */}
        <div
          className="absolute -right-[18%] -top-[22%] h-[68vh] w-[68vh] max-w-[880px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(201,162,39,.16) 0%, rgba(201,162,39,0) 68%)' }}
        />
        <div
          className="absolute -bottom-[26%] -left-[16%] h-[56vh] w-[56vh] max-w-[760px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(126,158,214,.10) 0%, rgba(126,158,214,0) 70%)' }}
        />

        {/* d) reticula tecnica: 4 lineas verticales hairline */}
        <div className="absolute inset-y-0 left-[12%] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
        <div className="absolute inset-y-0 left-[38%] w-px bg-gradient-to-b from-transparent via-white/[0.05] to-transparent" />
        <div className="absolute inset-y-0 left-[64%] w-px bg-gradient-to-b from-transparent via-white/[0.05] to-transparent" />
        <div className="absolute inset-y-0 left-[88%] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* --------------------------------------------------------- contenido */}
      <div className="container-x relative z-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
          {/* ------------------------------------------------ columna texto */}
          <div>
            <p
              className="surface-glass inline-flex animate-fade-up items-center gap-2.5 rounded-full px-4 py-2 text-[11px] text-silver-300 sm:text-xs"
              style={{ animationDelay: '40ms' }}
            >
              <span aria-hidden className="relative flex h-2 w-2 items-center justify-center">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-gold-400/70" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-gold-400" />
              </span>
              Barranquilla · Valledupar · Envíos a toda Colombia
            </p>

            <h1 id="hero-title" className="title-hero mt-6">
              <span className="block animate-fade-up text-metal" style={{ animationDelay: '120ms' }}>
                TECNOLOGÍA QUE ESTÁ
              </span>
              <span className="block animate-fade-up text-gold-metal" style={{ animationDelay: '240ms' }}>
                A OTRO NIVEL
              </span>
            </h1>

            <p
              className="body-lg mt-6 max-w-xl animate-fade-up"
              style={{ animationDelay: '340ms' }}
            >
              Encuentra iPhone, MacBook, iPad, Apple Watch, audífonos, parlantes y mucho más en
              ITOMSTORE.
            </p>

            <div
              className="mt-9 flex animate-fade-up flex-col gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: '430ms' }}
            >
              <Link to="/catalogo" className="btn btn-gold sheen w-full sm:w-auto">
                VER PRODUCTOS
                <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              </Link>
              <a
                href={WA_GENERAL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost w-full sm:w-auto"
              >
                <MessageCircle aria-hidden className="h-4 w-4" strokeWidth={2} />
                HABLAR POR WHATSAPP
              </a>
            </div>

          </div>

          {/* ----------------------------------------------- columna visual */}
          <div
            className="relative mx-auto w-full max-w-[340px] animate-fade-up lg:max-w-none"
            style={{ animationDelay: '300ms' }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-8 rounded-[48px] bg-gold-500/20 blur-3xl"
            />

            <div className="surface-glass relative rounded-[28px] p-[10px] shadow-lift lg:rotate-[1.5deg]">
              <Img
                name="iphone-pro-mano"
                alt="Mano sosteniendo cuatro cajas de iPhone 17 Pro, en color plata y Cosmic Orange, en ITOMSTORE"
                priority
                className="aspect-[431/746] max-h-[560px] w-full rounded-[20px]"
                imgClassName="object-cover"
                sizes="(min-width: 1024px) 460px, 90vw"
              />
            </div>

            <div className="surface-glass absolute -left-3 top-6 z-10 animate-float rounded-2xl px-3.5 py-3 shadow-lift sm:-left-6 sm:top-10">
              <p className="font-display text-[13px] font-extrabold leading-none tracking-tightest text-silver-100 sm:text-sm">
                iPhone 17 Pro
              </p>
              <p className="mt-1.5 text-[11px] leading-tight text-silver-500">Sellado · varios colores</p>
              <ConditionBadge condition="nuevo" className="mt-2.5" />
            </div>

            <div
              className="surface-glass absolute -right-3 bottom-8 z-10 hidden animate-float items-center gap-3 rounded-2xl px-3.5 py-3 shadow-lift sm:flex sm:-right-6"
              style={{ animationDelay: '1.6s' }}
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-500/20 bg-gold-500/[0.08]"
              >
                <Wallet className="h-4 w-4 text-gold-400" strokeWidth={1.75} />
              </span>
              <span className="block">
                <span className="block text-[13px] font-semibold leading-none text-silver-100">
                  Pago contra entrega
                </span>
                <span className="mt-1.5 block text-[11px] leading-tight text-silver-500">
                  Disponible en Barranquilla
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------- indicador de scroll */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-6 z-10 hidden justify-center lg:flex"
      >
        <span className="flex flex-col items-center gap-3">
          <span className="eyebrow">Desliza</span>
          <span className="relative block h-14 w-px bg-gradient-to-b from-gold-500/45 via-white/10 to-transparent">
            {/* el contenedor va girado 180deg para que el `float` empuje el punto hacia abajo */}
            <span className="absolute inset-y-0 left-1/2 flex w-2 -translate-x-1/2 rotate-180 items-end justify-center">
              <span className="h-1.5 w-1.5 animate-float rounded-full bg-gold-300 shadow-[0_0_12px_rgba(201,162,39,.85)]" />
            </span>
          </span>
        </span>
      </div>
    </section>
  )
}
