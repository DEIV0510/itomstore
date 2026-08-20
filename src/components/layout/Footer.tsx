import { Link } from 'react-router-dom'
import { ArrowUp, Facebook, Globe, Instagram, MapPin, MessageCircle, Music2, Phone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BRAND, SOCIALS } from '@/lib/config'
import { NAV_INFO, NAV_TIENDA } from '@/data/nav'
import type { NavItem } from '@/data/nav'
import { LOGO } from '@/lib/images'
import { WA_GENERAL } from '@/lib/whatsapp'

/** Iconos de las redes. Si algun dia aparece una red nueva se usa el globo. */
const SOCIAL_ICON: Record<string, LucideIcon> = {
  Instagram,
  TikTok: Music2,
  Facebook,
}

/** Cobertura real de la tienda (ver COVERAGE en lib/config). */
const COBERTURA = ['Barranquilla', 'Valledupar', 'Envíos nacionales']

function FooterNav({ id, title, items }: { id: string; title: string; items: NavItem[] }) {
  return (
    <nav className="min-w-0" aria-labelledby={id}>
      <h3 id={id} className="eyebrow">
        {title}
      </h3>
      <ul className="mt-5 space-y-2.5">
        {items.map((item) => (
          <li key={`${item.label}-${item.to}`} className="min-w-0">
            <Link
              to={item.to}
              className="inline-flex min-h-[44px] min-w-0 items-center break-words py-2 text-[13.5px] leading-snug text-silver-500 transition-all duration-300 ease-premium hover:translate-x-1 hover:text-white focus-visible:translate-x-1 focus-visible:text-white"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative">
      {/* ------------------------------------------------ banda CTA superior */}
      <section
        aria-labelledby="footer-cta"
        className="glow-gold hairline-t relative overflow-hidden bg-gradient-to-r from-ink via-graphite to-ink py-12"
      >
        <div className="container-x relative z-10 text-center">
          <p className="eyebrow">¿Hablamos?</p>
          <h2 id="footer-cta" className="title-xl text-metal mx-auto mt-3 max-w-3xl">
            ESCRÍBENOS Y TE AYUDAMOS A ENCONTRAR LA MEJOR OPCIÓN.
          </h2>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={WA_GENERAL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-gold sheen w-full max-w-xs sm:w-auto sm:max-w-none"
            >
              <MessageCircle className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{BRAND.whatsappPretty}</span>
            </a>
            <Link to="/catalogo" className="btn btn-ghost w-full max-w-xs sm:w-auto sm:max-w-none">
              Ver catálogo
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ cuerpo */}
      <div className="bg-carbon">
        <div className="container-x grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:py-20">
          {/* ---------------------------------------------------- marca */}
          <div className="col-span-2 min-w-0 md:col-span-4 lg:col-span-1">
            <Link to="/" className="inline-block" aria-label="ITOMSTORE — ir al inicio">
              <img
                src={LOGO}
                alt="ITOMSTORE — tu mundo Apple"
                width={587}
                height={435}
                loading="lazy"
                decoding="async"
                className="h-24 w-auto"
              />
            </Link>

            <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-silver-500">
              Tienda de tecnología y productos del ecosistema Apple en Barranquilla. Vendemos equipos nuevos y
              usados, con atención personalizada por WhatsApp.
            </p>

            <ul className="mt-5 flex flex-wrap gap-2">
              {COBERTURA.map((lugar) => (
                <li key={lugar} className="badge badge-muted">
                  {lugar}
                </li>
              ))}
            </ul>
          </div>

          {/* ---------------------------------------------------- enlaces */}
          <FooterNav id="footer-tienda" title="Tienda" items={NAV_TIENDA} />
          <FooterNav id="footer-info" title="Información" items={NAV_INFO} />

          {/* ---------------------------------------------------- contacto */}
          <div className="col-span-2 min-w-0 lg:col-span-1">
            <h3 className="eyebrow">Contacto</h3>

            <a
              href={WA_GENERAL}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-5 flex min-w-0 items-center gap-3 rounded-2xl border border-hairline bg-white/[0.03] px-4 py-3 transition-all duration-300 ease-premium hover:border-gold-500/45 hover:bg-white/[0.07]"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-500/[0.12] text-gold-300 transition-colors duration-300 ease-premium group-hover:bg-gold-500/20"
                aria-hidden="true"
              >
                <Phone className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-label text-silver-700">
                  WhatsApp
                </span>
                <span className="block truncate font-display text-xl font-extrabold tracking-tightest text-silver-100 transition-colors duration-300 ease-premium group-hover:text-white">
                  {BRAND.whatsappDisplay}
                </span>
              </span>
            </a>

            <ul className="mt-5 space-y-3 text-[13.5px] leading-snug text-silver-500">
              <li className="flex min-w-0 items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" />
                <span className="min-w-0 break-words">Barranquilla, Atlántico — Colombia</span>
              </li>
              <li className="flex min-w-0 items-start gap-2.5">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" />
                <span className="min-w-0 break-words">Atención por WhatsApp</span>
              </li>
            </ul>

            <div className="mt-7">
              <p className="text-[10px] font-semibold uppercase tracking-label text-silver-700">Redes sociales</p>
              <ul className="mt-3 flex flex-wrap items-center gap-2.5">
                {SOCIALS.map((social) => {
                  const Icon = SOCIAL_ICON[social.name] ?? Globe
                  const base =
                    'inline-flex h-11 w-11 items-center justify-center rounded-full border border-hairline transition-all duration-300 ease-premium'

                  return (
                    <li key={social.name}>
                      {social.url ? (
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={social.name}
                          title={social.name}
                          className={`${base} bg-white/[0.03] text-silver-300 hover:border-gold-500/45 hover:bg-white/[0.07] hover:text-white`}
                        >
                          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                        </a>
                      ) : (
                        <span
                          role="img"
                          aria-label={`${social.name} (próximamente)`}
                          title={`${social.name} (próximamente)`}
                          className={`${base} cursor-not-allowed bg-white/[0.02] text-silver-700 opacity-45`}
                        >
                          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- barra inferior */}
      <div className="hairline-t bg-ink">
        <div className="container-x flex flex-wrap items-center justify-between gap-x-6 gap-y-4 py-6">
          <p className="min-w-0 break-words text-[12px] leading-relaxed text-silver-700">
            © {year} ITOMSTORE. Todos los derechos reservados.
          </p>

          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-4 lg:justify-end">
            <p className="min-w-0 max-w-[70ch] break-words text-[12px] leading-relaxed text-silver-700 lg:text-right">
              Apple, Bose, Beats y Samsung son marcas de sus respectivos propietarios. ITOMSTORE es una tienda
              independiente y no es distribuidor ni servicio técnico autorizado.
            </p>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="btn btn-ghost btn-sm group shrink-0 text-[12px]"
            >
              Volver arriba
              <ArrowUp
                className="h-3.5 w-3.5 transition-transform duration-300 ease-premium group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
