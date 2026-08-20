import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  MapPin,
  MessageCircle,
  MessageSquare,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import Reveal from '@/components/ui/Reveal'
import { useSeo } from '@/lib/seo'
import { BRAND, COVERAGE } from '@/lib/config'
import { CATEGORIES } from '@/data/catalog'
import { WA_ENVIO, WA_GENERAL, WA_PERMUTA, WA_USADOS, wa } from '@/lib/whatsapp'

export type InfoSlug = 'nosotros' | 'envios' | 'faq' | 'garantias' | 'permutas'

const WA_GARANTIAS = wa(
  'Hola ITOMSTORE, quiero saber que condiciones de cambio y garantia aplican para el producto que me interesa.'
)

/* -------------------------------------------------------------------------- */
/*  Metadatos de cada pagina                                                  */
/* -------------------------------------------------------------------------- */

interface Meta {
  crumb: string
  eyebrow: string
  h1: string
  intro: string
  path: string
  seoTitle: string
  seoDesc: string
  ctaTitle: string
  ctaText: string
  ctaHref: string
  ctaLabel: string
}

const META: Record<InfoSlug, Meta> = {
  nosotros: {
    crumb: 'Sobre nosotros',
    eyebrow: 'Sobre nosotros',
    h1: 'TU MUNDO APPLE, EN BARRANQUILLA',
    intro:
      'ITOMSTORE es una tienda de tecnología en Barranquilla. Vendemos equipos Apple nuevos y usados, parlantes, accesorios y gama alta Android, con atención directa por WhatsApp.',
    path: '/nosotros',
    seoTitle: 'Sobre nosotros | ITOMSTORE',
    seoDesc:
      'ITOMSTORE es una tienda de tecnología en Barranquilla: iPhone, MacBook, iPad, Apple Watch, AirPods, parlantes, accesorios y Samsung, nuevos y usados.',
    ctaTitle: '¿Quieres saber qué tenemos disponible hoy?',
    ctaText:
      'Escríbenos y te contamos qué hay en tienda en este momento, con el precio vigente.',
    ctaHref: WA_GENERAL,
    ctaLabel: 'ESCRIBIR POR WHATSAPP',
  },
  envios: {
    crumb: 'Envíos y cobertura',
    eyebrow: 'Envíos y cobertura',
    h1: 'TE LLEVAMOS TU EQUIPO',
    intro:
      'Entregamos a domicilio en Barranquilla con pago contra entrega, tenemos entregas disponibles en Valledupar y hacemos envíos al resto de Colombia.',
    path: '/envios',
    seoTitle: 'Envíos y cobertura | ITOMSTORE',
    seoDesc:
      'Domicilios y pago contra entrega en Barranquilla, entregas en Valledupar y envíos nacionales. Coordinamos tu envío por WhatsApp.',
    ctaTitle: '¿Enviamos a tu ciudad?',
    ctaText:
      'Cuéntanos dónde estás y qué equipo quieres. Te confirmamos el tiempo y el costo del envío antes de despachar.',
    ctaHref: WA_ENVIO,
    ctaLabel: 'CONSULTAR MI ENVÍO',
  },
  faq: {
    crumb: 'Preguntas frecuentes',
    eyebrow: 'Preguntas frecuentes',
    h1: 'LO QUE MÁS NOS PREGUNTAN',
    intro:
      'Respuestas claras sobre estados, precios, envíos, pagos y permutas. Si te queda una duda, la resolvemos por WhatsApp antes de que compres.',
    path: '/preguntas-frecuentes',
    seoTitle: 'Preguntas frecuentes | ITOMSTORE',
    seoDesc:
      'Estados de los equipos, precios, envíos a toda Colombia, pago contra entrega en Barranquilla y permutas. Las dudas más comunes de ITOMSTORE.',
    ctaTitle: '¿Te quedó una duda?',
    ctaText: 'Escríbenos y te respondemos con la información real de tu equipo, sin rodeos.',
    ctaHref: WA_GENERAL,
    ctaLabel: 'HACER MI PREGUNTA',
  },
  garantias: {
    crumb: 'Cambios y garantías',
    eyebrow: 'Cambios y garantías',
    h1: 'CLARIDAD ANTES DE COMPRAR',
    intro:
      'Las condiciones de cambio y garantía dependen del producto y de si es nuevo o usado. Te las explicamos por WhatsApp antes de cerrar la compra, no después.',
    path: '/garantias',
    seoTitle: 'Cambios y garantías | ITOMSTORE',
    seoDesc:
      'En ITOMSTORE las condiciones de cambio y garantía dependen de cada producto y se informan por WhatsApp antes de cerrar la compra.',
    ctaTitle: '¿Qué aplica para el equipo que quieres?',
    ctaText:
      'Dinos qué producto te interesa y te decimos exactamente qué condiciones tiene antes de que pagues.',
    ctaHref: WA_GARANTIAS,
    ctaLabel: 'PREGUNTAR POR GARANTÍAS',
  },
  permutas: {
    crumb: 'Permutas',
    eyebrow: 'Recibimos tu equipo',
    h1: 'CAMBIA TU EQUIPO USADO',
    intro:
      'Recibimos tu teléfono usado y puedes entregarlo como parte de pago para adquirir uno nuevo. Cinco pasos, sin letra pequeña.',
    path: '/permutas',
    seoTitle: 'Permutas | ITOMSTORE',
    seoDesc:
      'Entrega tu equipo usado como parte de pago en ITOMSTORE. Evaluamos su estado, calculamos su valor y pagas la diferencia.',
    ctaTitle: '¿Cuánto vale tu equipo?',
    ctaText:
      'El valor depende del modelo y del estado real del equipo. Escríbenos y te lo confirmamos por WhatsApp.',
    ctaHref: WA_PERMUTA,
    ctaLabel: 'QUIERO COTIZAR MI EQUIPO',
  },
}

/* -------------------------------------------------------------------------- */
/*  Piezas compartidas                                                        */
/* -------------------------------------------------------------------------- */

function Bloque({ title, children, delay = 0 }: { title: string; children: ReactNode; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <section className="surface p-6 sm:p-8">
        <h2 className="title-md text-silver-100">{title}</h2>
        <div className="mt-4 flex flex-col gap-4 text-[15px] leading-relaxed text-silver-500">{children}</div>
      </section>
    </Reveal>
  )
}

function Punto({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] leading-relaxed text-silver-300 sm:text-[15px]">
      <span
        aria-hidden
        className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-300"
      >
        <Check size={11} strokeWidth={3} />
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  )
}

function AvisoMarcas() {
  return (
    <Reveal>
      <p className="rounded-2xl border border-hairline bg-white/[0.02] p-5 text-[12px] leading-relaxed text-silver-700 sm:p-6">
        ITOMSTORE es una tienda independiente. No somos distribuidor autorizado, reseller oficial ni servicio
        técnico autorizado de Apple, Bose, Beats o Samsung. Todas las marcas y sus logotipos pertenecen a sus
        respectivos titulares y se mencionan únicamente para describir los productos que vendemos.
      </p>
    </Reveal>
  )
}

interface Paso {
  n: string
  icon: LucideIcon
  title: string
  text: string
}

function Pasos({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {pasos.map((paso, i) => {
        const Icon = paso.icon
        return (
          <Reveal as="li" key={paso.n} delay={i * 70}>
            <div className="flex items-start gap-4 rounded-2xl border border-hairline bg-white/[0.02] p-4 transition-colors duration-300 ease-premium hover:border-gold-500/25 sm:p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-gold-500/25 bg-carbon">
                <span className="font-display text-lg font-extrabold leading-none tracking-tightest text-gold-metal">
                  {paso.n}
                </span>
              </span>
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 font-display text-[17px] font-extrabold tracking-tightest text-silver-100">
                  <Icon size={16} aria-hidden className="shrink-0 text-gold-400" />
                  {paso.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-silver-500 sm:text-[15px]">{paso.text}</p>
              </div>
            </div>
          </Reveal>
        )
      })}
    </ol>
  )
}

/* -------------------------------------------------------------------------- */
/*  nosotros                                                                  */
/* -------------------------------------------------------------------------- */

const PASOS_COMPRA: Paso[] = [
  { n: '01', icon: MessageSquare, title: 'Elige', text: 'Mira el catálogo y guarda lo que te interesa en el carrito.' },
  { n: '02', icon: MessageCircle, title: 'Consulta', text: 'Nos escribes por WhatsApp con tu pedido o desde la ficha del producto.' },
  { n: '03', icon: Check, title: 'Confirma', text: 'Verificamos disponibilidad, precio vigente y condiciones del equipo.' },
  { n: '04', icon: PackageCheck, title: 'Recibe', text: 'Coordinamos la entrega en Barranquilla o el envío a tu ciudad.' },
]

function Nosotros() {
  return (
    <>
      <Bloque title="Quiénes somos">
        <p>
          {BRAND.name} es una tienda de tecnología ubicada en {BRAND.city} (Atlántico). Nuestro lema es
          sencillo: <strong className="font-semibold text-silver-100">{BRAND.tagline}</strong>. Trabajamos
          equipos Apple nuevos en caja sellada y también equipos usados, siempre diciendo cuál es cuál.
        </p>
        <p>
          Atendemos de forma directa por WhatsApp: sin formularios eternos, sin intermediarios y sin promesas
          que no podamos cumplir. Si algo no lo tenemos, te lo decimos de una vez.
        </p>
      </Bloque>

      <Bloque title="Qué vendemos" delay={70}>
        <p>Estas son las categorías que manejamos hoy en tienda:</p>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link
                to={`/categoria/${c.id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-hairline bg-white/[0.02] px-4 py-3 transition-all duration-300 ease-premium hover:border-gold-500/35 hover:bg-white/[0.05]"
              >
                <span className="min-w-0">
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
          ))}
        </ul>
      </Bloque>

      <Bloque title="Nuevos y usados" delay={140}>
        <p>
          En la ficha de cada producto verás su estado: nuevo, seminuevo o usado. Los equipos nuevos van en
          caja sellada; en los usados te contamos el estado real antes de que compres. Todavía no publicamos
          los usados en la web: escríbenos y te contamos cuáles tenemos disponibles.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/catalogo?estado=nuevo" className="btn btn-sm btn-ghost">
            Ver equipos nuevos
          </Link>
          <a href={WA_USADOS} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-wa">
            <MessageCircle size={15} aria-hidden />
            Preguntar por usados
          </a>
        </div>
      </Bloque>

      <Bloque title="Dónde estamos y hasta dónde llegamos" delay={210}>
        <ul className="flex flex-col gap-3">
          {COVERAGE.map((c) => (
            <li key={c.city} className="flex items-start gap-3 rounded-xl border border-hairline bg-white/[0.02] p-4">
              <MapPin size={16} aria-hidden className="mt-0.5 shrink-0 text-gold-400" />
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-silver-100">{c.city}</span>
                <span className="block text-[13px] text-silver-500">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <p>
          Nuestro canal de atención es WhatsApp: <strong className="font-semibold text-silver-100">{BRAND.whatsappPretty}</strong>.
        </p>
      </Bloque>

      <Bloque title="Cómo se compra" delay={280}>
        <p>Cuatro pasos y una conversación directa con la tienda:</p>
        <Pasos pasos={PASOS_COMPRA} />
      </Bloque>

      <AvisoMarcas />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  envios                                                                    */
/* -------------------------------------------------------------------------- */

const PASOS_ENVIO: Paso[] = [
  { n: '01', icon: MessageCircle, title: 'Nos escribes', text: 'Envíanos el producto que quieres desde la ficha o con el pedido del carrito.' },
  { n: '02', icon: Check, title: 'Confirmamos', text: 'Verificamos disponibilidad, precio vigente y las condiciones del equipo.' },
  { n: '03', icon: MapPin, title: 'Nos dices tu ciudad', text: 'Con la ciudad y la dirección de entrega calculamos cómo hacerte llegar el equipo.' },
  { n: '04', icon: Truck, title: 'Coordinamos el despacho', text: 'Te confirmamos el tiempo estimado, el costo del envío y la forma de pago antes de despachar.' },
  { n: '05', icon: PackageCheck, title: 'Recibes tu equipo', text: 'En Barranquilla puedes pagar contra entrega; en el resto del país acordamos el pago por WhatsApp.' },
]

function Envios() {
  return (
    <>
      <Bloque title="Nuestra cobertura">
        <ul className="flex flex-col gap-3">
          {COVERAGE.map((c) => (
            <li key={c.city} className="rounded-xl border border-hairline bg-white/[0.02] p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <MapPin size={16} aria-hidden className="shrink-0 text-gold-400" />
                <span className="text-[15px] font-semibold text-silver-100">{c.city}</span>
                <span className="badge badge-muted">{c.tag}</span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-silver-500">{c.detail}</p>
            </li>
          ))}
        </ul>
        <p>
          En Barranquilla entregamos a domicilio y puedes pagar cuando recibes. En Valledupar tenemos entregas
          disponibles y al resto de Colombia enviamos por transportadora.
        </p>
      </Bloque>

      <Bloque title="Cómo coordinamos tu envío" delay={70}>
        <p>Todo el proceso se coordina por WhatsApp, paso a paso:</p>
        <Pasos pasos={PASOS_ENVIO} />
      </Bloque>

      <Bloque title="Tiempos y costos" delay={140}>
        <p>
          No publicamos una tarifa ni un plazo único porque dependen de tu ciudad, del tamaño del pedido y de
          la transportadora que se use. Preferimos decírtelo exacto antes de despachar que prometer algo que no
          podamos cumplir.
        </p>
        <ul className="flex flex-col gap-2.5">
          <Punto>El costo del envío se confirma según la ciudad de entrega.</Punto>
          <Punto>El tiempo estimado depende de la transportadora que cubra tu zona.</Punto>
          <Punto>Antes de despachar te confirmamos costo, tiempo y forma de pago.</Punto>
        </ul>
      </Bloque>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  faq                                                                       */
/* -------------------------------------------------------------------------- */

interface Faq {
  q: string
  a: string
  /** `external` = enlace a WhatsApp; si no, es una ruta interna del sitio. */
  link?: { to: string; label: string; external?: boolean }
}

const ENLACE_FAQ =
  'mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-medium text-gold-300 transition-colors duration-300 ease-premium hover:text-gold-200'

const FAQS: Faq[] = [
  {
    q: '¿Los productos son nuevos?',
    a: 'En la ficha de cada producto verás su estado: nuevo, seminuevo o usado. Los equipos nuevos se entregan en caja sellada. Si tienes dudas sobre una unidad en particular, te confirmamos su estado exacto por WhatsApp antes de que compres.',
    link: { to: '/catalogo?estado=nuevo', label: 'Ver equipos nuevos' },
  },
  {
    q: '¿Manejan equipos usados?',
    a: 'Sí. Trabajamos equipos nuevos y usados. En los usados te contamos el estado real antes de la compra. Todavía no publicamos los usados en la web: escríbenos y te decimos cuáles tenemos disponibles en el momento.',
    link: { to: WA_USADOS, label: 'Consultar usados por WhatsApp', external: true },
  },
  {
    q: '¿Cómo sé el precio de un producto?',
    a: 'Los precios cambian según el modelo, la capacidad y la disponibilidad del día, por eso los confirmamos uno a uno. Escríbenos por WhatsApp con el producto que te interesa y te decimos el precio vigente al instante.',
  },
  {
    q: '¿Hacen envíos a mi ciudad?',
    a: 'Hacemos envíos a toda Colombia. En Barranquilla entregamos a domicilio y en Valledupar tenemos entregas disponibles. El tiempo y el costo dependen de tu ciudad y de la transportadora, y te los confirmamos por WhatsApp antes de despachar.',
    link: { to: '/envios', label: 'Ver cobertura y envíos' },
  },
  {
    q: '¿Puedo pagar contra entrega?',
    a: 'En Barranquilla sí: te llevamos el equipo y pagas al recibirlo. Para otras ciudades acordamos contigo la forma de pago por WhatsApp antes de hacer el envío.',
  },
  {
    q: '¿Reciben mi equipo usado como parte de pago?',
    a: 'Sí. Nos cuentas qué equipo tienes, evaluamos su estado, calculamos su valor y pagas la diferencia por el equipo nuevo. El valor depende del modelo y del estado real, así que se confirma por WhatsApp.',
    link: { to: '/permutas', label: 'Cómo funciona la permuta' },
  },
  {
    q: '¿Cómo compro?',
    a: 'Puedes agregar productos al carrito y enviarnos el pedido por WhatsApp, o escribirnos directo desde la ficha del producto. Confirmamos disponibilidad, precio y forma de entrega, y cerramos la compra por ahí mismo.',
    link: { to: '/catalogo', label: 'Ir al catálogo' },
  },
  {
    q: '¿Qué pasa si no veo el producto que busco?',
    a: 'No todo lo que tenemos alcanza a estar publicado en la web. Si no ves lo que buscas, escríbenos: si lo tenemos, te lo confirmamos, y si no lo tenemos, te lo decimos de una vez.',
  },
]

const FAQ_JSONLD: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

function PreguntasFrecuentes() {
  return (
    <>
      {FAQS.map((f, i) => (
        <Reveal key={f.q} delay={i * 55}>
          <details className="surface group overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[15px] font-semibold text-silver-100 transition-colors duration-300 ease-premium hover:text-white sm:p-6 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0">{f.q}</span>
              <ChevronDown
                size={18}
                aria-hidden
                className="shrink-0 text-gold-400 transition-transform duration-300 ease-premium group-open:rotate-180"
              />
            </summary>
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <p className="text-[14px] leading-relaxed text-silver-500 sm:text-[15px]">{f.a}</p>
              {f.link &&
                (f.link.external ? (
                  <a href={f.link.to} target="_blank" rel="noopener noreferrer" className={ENLACE_FAQ}>
                    {f.link.label}
                    <ArrowRight size={14} aria-hidden />
                  </a>
                ) : (
                  <Link to={f.link.to} className={ENLACE_FAQ}>
                    {f.link.label}
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                ))}
            </div>
          </details>
        </Reveal>
      ))}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  garantias                                                                 */
/* -------------------------------------------------------------------------- */

function Garantias() {
  return (
    <>
      <Bloque title="Por qué no publicamos un plazo único">
        <p>
          Las condiciones de cambio y garantía dependen del producto y de si es nuevo o usado. Un equipo
          sellado y uno usado no se manejan igual, y tampoco se maneja igual un parlante que un teléfono.
        </p>
        <p>
          Por eso no publicamos un plazo genérico para todo: sería más fácil, pero no sería honesto. Lo que sí
          hacemos es decirte, antes de que pagues, exactamente qué aplica para el equipo que estás comprando.
        </p>
      </Bloque>

      <Bloque title="Qué te confirmamos antes de cerrar la compra" delay={70}>
        <ul className="flex flex-col gap-2.5">
          <Punto>El estado real del equipo: nuevo, seminuevo o usado.</Punto>
          <Punto>Qué incluye la caja y con qué accesorios se entrega.</Punto>
          <Punto>Las condiciones de cambio o garantía que aplican a ese producto en particular.</Punto>
          <Punto>La forma de entrega y la forma de pago.</Punto>
        </ul>
        <p>
          Si algo no te queda claro, pregúntalo por WhatsApp antes de pagar. Preferimos resolver dudas antes
          que después.
        </p>
      </Bloque>

      <Bloque title="Recomendaciones al recibir tu equipo" delay={140}>
        <ul className="flex flex-col gap-2.5">
          <Punto>Revisa el equipo cuando lo recibas, con calma.</Punto>
          <Punto>Conserva la caja, los accesorios y el comprobante de compra.</Punto>
          <Punto>Si notas algo raro, escríbenos de inmediato por WhatsApp.</Punto>
        </ul>
      </Bloque>

      <AvisoMarcas />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  permutas                                                                  */
/* -------------------------------------------------------------------------- */

const PASOS_PERMUTA: Paso[] = [
  {
    n: '01',
    icon: MessageSquare,
    title: 'Cuéntanos qué equipo tienes',
    text: 'Escríbenos por WhatsApp el modelo, el color y, si lo sabes, la capacidad. Cuéntanos también si tiene algún detalle o falla: entre más claro, más rápido avanzamos.',
  },
  {
    n: '02',
    icon: Search,
    title: 'Evaluamos su estado',
    text: 'Revisamos el estado real del equipo: pantalla, carcasa, batería y funcionamiento. Puedes enviarnos fotos y video por WhatsApp o traerlo a Barranquilla.',
  },
  {
    n: '03',
    icon: Calculator,
    title: 'Calculamos su valor',
    text: 'Te decimos cuánto reconocemos por tu equipo. El valor depende del modelo y del estado, así que no manejamos tablas fijas: te lo confirmamos caso por caso.',
  },
  {
    n: '04',
    icon: CreditCard,
    title: 'Pagas el restante',
    text: 'Al valor del equipo nuevo le descontamos lo que reconocemos por el tuyo y pagas la diferencia. La forma de pago la acordamos contigo.',
  },
  {
    n: '05',
    icon: PackageCheck,
    title: 'Te llevas tu nuevo equipo',
    text: 'Coordinamos la entrega en Barranquilla o el envío a tu ciudad, según donde estés.',
  },
]

function Permutas() {
  return (
    <>
      <Bloque title="Cómo funciona la permuta">
        <p>
          Recibimos tu teléfono usado y lo tomamos como parte de pago para que estrenes equipo. El proceso es
          el mismo siempre y son cinco pasos:
        </p>
        <Pasos pasos={PASOS_PERMUTA} />
      </Bloque>

      <Bloque title="Qué necesitas tener a la mano" delay={70}>
        <ul className="flex flex-col gap-2.5">
          <Punto>El modelo exacto del equipo y, si la conoces, su capacidad.</Punto>
          <Punto>El estado real: golpes, cambios de pantalla o batería, y cualquier falla que tenga.</Punto>
          <Punto>Los accesorios y la caja, si todavía los conservas.</Punto>
          <Punto>Poder cerrar sesión de tu cuenta en el equipo y que no tenga bloqueos activos.</Punto>
        </ul>
        <p>
          Con esa información avanzamos rápido. Lo demás lo revisamos nosotros al momento de la evaluación.
        </p>
      </Bloque>

      <Bloque title="Lo que no prometemos" delay={140}>
        <p>
          No publicamos porcentajes ni valores fijos por modelo, porque el estado de cada equipo cambia mucho
          el resultado. El valor final siempre se confirma contigo por WhatsApp antes de cerrar cualquier
          cambio.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/catalogo" className="btn btn-sm btn-ghost">
            Ver a qué equipo cambiarte
          </Link>
        </div>
      </Bloque>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  pagina                                                                    */
/* -------------------------------------------------------------------------- */

function Contenido({ slug }: { slug: InfoSlug }) {
  switch (slug) {
    case 'nosotros':
      return <Nosotros />
    case 'envios':
      return <Envios />
    case 'faq':
      return <PreguntasFrecuentes />
    case 'garantias':
      return <Garantias />
    case 'permutas':
      return <Permutas />
  }
}

export default function InfoPage({ slug }: { slug: InfoSlug }) {
  const meta = META[slug]

  useSeo({
    title: meta.seoTitle,
    description: meta.seoDesc,
    path: meta.path,
    jsonLd: slug === 'faq' ? FAQ_JSONLD : undefined,
  })

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[900px] max-w-[160vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(201,162,39,.13), rgba(201,162,39,0))' }}
      />

      <div className="container-x relative z-10 pb-16 pt-7 sm:pt-9 lg:pb-24">
        <nav aria-label="Ruta de navegación">
          <ol className="flex items-center gap-1.5 text-[12px] text-silver-700">
            <li>
              <Link to="/" className="transition-colors duration-300 ease-premium hover:text-gold-300">
                Inicio
              </Link>
            </li>
            <ChevronRight size={13} aria-hidden className="shrink-0" />
            <li aria-current="page" className="text-silver-500">
              {meta.crumb}
            </li>
          </ol>
        </nav>

        <header className="mt-8 max-w-3xl">
          <p className="eyebrow flex items-center gap-2.5">
            <span aria-hidden className="h-px w-7 bg-gradient-to-r from-gold-500 to-transparent" />
            {meta.eyebrow}
          </p>
          <h1 className="title-xl mt-3 text-metal">{meta.h1}</h1>
          <p className="body-lg mt-5">{meta.intro}</p>
        </header>

        <div className="mt-10 flex max-w-3xl flex-col gap-4 sm:mt-12 sm:gap-5">
          <Contenido slug={slug} />

          {/* ------------------------------ CTA final ------------------------------ */}
          <Reveal>
            <section className="surface-glass glow-gold relative overflow-hidden p-6 text-center sm:p-9">
              <div className="relative z-10">
                <span
                  aria-hidden
                  className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-gold-500/25 bg-gold-500/10 text-gold-300"
                >
                  <ShieldCheck size={22} />
                </span>
                <h2 className="title-md mt-5 text-silver-100">{meta.ctaTitle}</h2>
                <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-silver-500">
                  {meta.ctaText}
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <a
                    href={meta.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-gold sheen w-full sm:w-auto"
                  >
                    <MessageCircle size={17} aria-hidden />
                    {meta.ctaLabel}
                  </a>
                  <Link to="/catalogo" className="btn btn-ghost w-full sm:w-auto">
                    Ver el catálogo
                  </Link>
                </div>
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
