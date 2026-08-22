import { useEffect, useRef, useState } from 'react'
import { Store } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useShop } from '@/lib/shop'
import type { HomeContent as HomeData } from '@/lib/settings'
import ImagePicker from '@/admin/ImagePicker'
import {
  ErrorNote,
  Field,
  Input,
  Loading,
  OkNote,
  PageHead,
  Panel,
  SubmitButton,
  Textarea,
  Toggle,
} from '../ui/kit'

/**
 * /admin/home — textos e interruptores de la portada.
 *
 * Guarda en la clave 'home' de /api/settings y despues refresca useShop(),
 * para que la tienda publica quede al dia sin recargar la pagina.
 */

/** Solo las claves de sí/no: asi el <Toggle> no puede tocar un campo de texto. */
type SwitchKey = 'showTrustBar' | 'showCategories' | 'showBose' | 'showTradeIn' | 'showShipping'

/** Interruptores de las secciones de la portada, con su explicacion. */
const SWITCHES: { key: SwitchKey; label: string; hint: string }[] = [
  { key: 'showTrustBar', label: 'Barra de confianza', hint: 'Franja de mensajes que va justo debajo del héroe.' },
  { key: 'showCategories', label: 'Rejilla de categorías', hint: 'Los accesos a iPhone, MacBook, iPad, Watch y demás.' },
  { key: 'showBose', label: 'Banda de parlantes Bose', hint: 'Banner ancho con las fotos de los Bose S1 Pro+.' },
  { key: 'showTradeIn', label: 'Sección de permutas', hint: 'El bloque que invita a entregar un equipo como parte de pago.' },
  { key: 'showShipping', label: 'Sección de envíos', hint: 'Ciudades y cobertura (se editan en Configuración).' },
]

/** Texto de la vista previa cuando el campo aún está vacío. */
function Placeholder({ children }: { children: string }) {
  return <span className="text-silver-700">{children}</span>
}

export default function HomeContent() {
  const { settings, loading, refresh } = useShop()

  const [form, setForm] = useState<HomeData>(settings.home)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // se siembra una sola vez con lo que hay en la base; despues manda el formulario
  const seeded = useRef(false)
  useEffect(() => {
    if (loading || seeded.current) return
    seeded.current = true
    setForm(settings.home)
  }, [loading, settings.home])

  function set<K extends keyof HomeData>(key: K, value: HomeData[K]) {
    setForm((f) => ({ ...f, [key]: value }) as HomeData)
    setOk(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await api.put('/settings/home', form)
      await refresh()
      setOk('Portada actualizada. Los clientes ya ven estos textos.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos guardar la portada.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading label="Cargando la portada…" />

  return (
    <>
      <PageHead
        title="Portada"
        subtitle="Estos textos son los que ve el cliente en la portada. Los cambios se aplican al guardar."
        actions={
          <>
            <a href="/" target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">
              <Store size={15} aria-hidden />
              Ver portada
            </a>
            <SubmitButton form="form-portada" busy={busy}>
              Guardar cambios
            </SubmitButton>
          </>
        }
      />

      <div className="space-y-3">
        {error && <ErrorNote>{error}</ErrorNote>}
        {ok && <OkNote>{ok}</OkNote>}
      </div>

      <form id="form-portada" onSubmit={onSubmit} className="mt-4 space-y-6">
        {/* ------------------------------------------------------ vista previa */}
        <Panel className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">Vista previa</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-silver-500">
            Aproximación del titular tal como se verá en la tienda. Se actualiza mientras escribes.
          </p>

          <div className="mt-4 overflow-hidden rounded-2xl border border-hairline bg-ink px-5 py-8 sm:px-8 sm:py-10">
            <p className="eyebrow">{form.heroEyebrow || <Placeholder>Sin definir</Placeholder>}</p>

            <p className="mt-3 font-display text-[1.9rem] font-extrabold leading-[1.02] tracking-tightest sm:text-[2.6rem]">
              <span className="text-metal">{form.heroTitle || 'TÍTULO SIN DEFINIR'}</span>{' '}
              <span className="text-gold-metal">{form.heroTitleAccent || 'ACENTO'}</span>
            </p>

            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-silver-500">
              {form.heroSubtitle || <Placeholder>Sin subtítulo definido.</Placeholder>}
            </p>

            <span aria-hidden className="btn btn-sm btn-gold pointer-events-none mt-6">
              {form.heroCta || 'BOTÓN SIN TEXTO'}
            </span>
          </div>

          <p className="mt-3 text-[12px] text-silver-700">
            El botón lleva a <span className="text-silver-300">{form.heroCtaHref || 'ninguna ruta'}</span>.
          </p>
        </Panel>

        {/* -------------------------------------------------------------- héroe */}
        <Panel className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">Héroe</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-silver-500">
            Lo primero que ve el cliente al entrar: el titular grande, la foto y el botón principal.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Línea superior" hint="Texto pequeño en dorado sobre el titular.">
                <Input
                  value={form.heroEyebrow}
                  onChange={(e) => set('heroEyebrow', e.target.value)}
                  placeholder="Barranquilla · Valledupar · Envíos a toda Colombia"
                />
              </Field>
            </div>

            <Field label="Titular" hint="Se muestra en plata.">
              <Input value={form.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} />
            </Field>

            <Field label="Titular en dorado" hint="Segunda parte del titular, con degradado dorado.">
              <Input value={form.heroTitleAccent} onChange={(e) => set('heroTitleAccent', e.target.value)} />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Subtítulo" hint="Una o dos frases. Sin prometer nada que no cumplas.">
                <Textarea
                  rows={3}
                  value={form.heroSubtitle}
                  onChange={(e) => set('heroSubtitle', e.target.value)}
                />
              </Field>
            </div>

            <Field label="Texto del botón">
              <Input value={form.heroCta} onChange={(e) => set('heroCta', e.target.value)} placeholder="VER PRODUCTOS" />
            </Field>

            <Field
              label="Destino del botón"
              hint="Ruta interna del sitio: /catalogo, /categoria/iphone, /permutas, /envios."
            >
              <Input
                value={form.heroCtaHref}
                onChange={(e) => set('heroCtaHref', e.target.value)}
                placeholder="/catalogo"
              />
            </Field>

            <Field label="Título de la etiqueta" hint="Etiqueta flotante sobre la foto del héroe.">
              <Input value={form.heroBadgeTitle} onChange={(e) => set('heroBadgeTitle', e.target.value)} />
            </Field>

            <Field label="Texto de la etiqueta" hint="Detalle corto bajo el título de la etiqueta.">
              <Input value={form.heroBadgeText} onChange={(e) => set('heroBadgeText', e.target.value)} />
            </Field>

            {/* el selector de fotos trae sus propios botones: no puede ir dentro de un <label> */}
            <div className="sm:col-span-2" role="group" aria-label="Foto del héroe">
              <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
                Foto del héroe
              </span>
              <ImagePicker
                max={1}
                value={form.heroImage ? [form.heroImage] : []}
                onChange={(v) => set('heroImage', v[0] ?? '')}
              />
              <p className="mt-1.5 text-[12px] text-silver-700">
                {form.heroImage
                  ? `Clave actual: ${form.heroImage}`
                  : 'Sin foto elegida: el héroe se verá solo con el fondo.'}
              </p>
            </div>
          </div>
        </Panel>

        {/* ------------------------------------------------- sección de productos */}
        <Panel className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">Sección de productos</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-silver-500">
            Encabezado del bloque donde se lista el catálogo en la portada.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Línea superior" hint="Texto pequeño en dorado.">
              <Input
                value={form.productsEyebrow}
                onChange={(e) => set('productsEyebrow', e.target.value)}
                placeholder="Catálogo"
              />
            </Field>

            <Field label="Título de la sección">
              <Input
                value={form.productsTitle}
                onChange={(e) => set('productsTitle', e.target.value)}
                placeholder="NUESTROS PRODUCTOS"
              />
            </Field>
          </div>
        </Panel>

        {/* ------------------------------------------------- secciones visibles */}
        <Panel className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">Secciones visibles</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-silver-500">
            Apaga una sección y desaparece de la portada. El resto del sitio no cambia.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {SWITCHES.map((s) => (
              <Toggle
                key={s.key}
                label={s.label}
                hint={s.hint}
                checked={form[s.key]}
                onChange={(v) => set(s.key, v)}
              />
            ))}
          </div>
        </Panel>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton busy={busy}>Guardar cambios</SubmitButton>
          <span className="text-[12px] text-silver-700">Se aplica en la tienda al instante.</span>
        </div>
      </form>
    </>
  )
}
