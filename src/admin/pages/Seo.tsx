import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '@/lib/api'
import { useShop } from '@/lib/shop'
import type { SeoContent } from '@/lib/settings'
import { ErrorNote, Field, Input, Loading, OkNote, PageHead, Panel, SubmitButton, Textarea } from '../ui/kit'

/**
 * /admin/seo — titulo y descripcion de la portada (clave 'seo').
 *
 * Los rangos recomendados son una guia, no una regla: si el texto se pasa se
 * avisa con color, pero el guardado nunca se bloquea por eso.
 */

const TITLE_MIN = 50
const TITLE_MAX = 60
const DESC_MIN = 120
const DESC_MAX = 160

/** Contador con color: verde dentro del rango, ámbar corto, rojo pasado. */
function Counter({ value, min, max }: { value: number; min: number; max: number }) {
  const tone =
    value > max ? 'text-red-300' : value >= min ? 'text-emerald-300' : value === 0 ? 'text-silver-700' : 'text-gold-300'

  const note =
    value > max
      ? `Se pasa de ${max}: los buscadores pueden recortarlo.`
      : value >= min
        ? 'Longitud recomendada.'
        : value === 0
          ? 'Sin definir.'
          : `Corto: lo ideal es entre ${min} y ${max}.`

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
      <span className={`font-semibold tabular-nums ${tone}`}>
        {value} / {min}–{max}
      </span>
      <span className="text-silver-700">{note}</span>
    </span>
  )
}

/** Quita el protocolo para que la vista previa se parezca a un resultado real. */
function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export default function Seo() {
  const { settings, loading, refresh } = useShop()

  const [form, setForm] = useState<SeoContent>(settings.seo)
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const seeded = useRef(false)
  useEffect(() => {
    if (loading || seeded.current) return
    seeded.current = true
    setForm(settings.seo)
  }, [loading, settings.seo])

  function set<K extends keyof SeoContent>(key: K, value: SeoContent[K]) {
    setForm((f) => ({ ...f, [key]: value }) as SeoContent)
    setOk(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await api.put('/settings/seo', { title: form.title.trim(), description: form.description.trim() })
      await refresh()
      setOk('SEO de la portada actualizado.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos guardar el SEO.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading label="Cargando el SEO…" />

  const url = settings.brand.url.trim()

  return (
    <>
      <PageHead
        title="SEO"
        subtitle="Cómo aparece la portada en los resultados de búsqueda y al compartir el enlace."
      />

      <form onSubmit={onSubmit} className="space-y-6">
        {/* -------------------------------------------------- vista previa */}
        <Panel className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">
            Vista previa en buscadores
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-silver-500">
            Aproximación de cómo se vería el resultado. Se actualiza mientras escribes.
          </p>

          <div className="mt-4 overflow-hidden rounded-2xl border border-hairline bg-ink px-4 py-5 sm:px-6">
            {url ? (
              <p className="break-all text-[12px] text-silver-500">{prettyUrl(url)}</p>
            ) : (
              <p className="text-[12px] text-silver-700">
                Sin dirección web definida.{' '}
                <Link to="/admin/configuracion" className="text-gold-300 underline underline-offset-4">
                  Añádela en Configuración
                </Link>
                .
              </p>
            )}

            <p className="mt-1 break-words text-[19px] leading-snug text-sky-300">
              {form.title.trim() || <span className="text-silver-700">Sin título definido</span>}
            </p>

            <p className="mt-1.5 break-words text-[13px] leading-relaxed text-silver-500">
              {form.description.trim() || (
                <span className="text-silver-700">Sin descripción definida.</span>
              )}
            </p>
          </div>
        </Panel>

        {/* -------------------------------------------------------- campos */}
        <Panel className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">Textos de la portada</h2>

          <div className="mt-5 space-y-5">
            <div>
              <Field label="Título" hint="Lo que se lee en azul en el buscador y en la pestaña del navegador.">
                <Input
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="ITOMSTORE | Tecnología Apple en Colombia"
                />
              </Field>
              <div className="mt-1.5">
                <Counter value={form.title.length} min={TITLE_MIN} max={TITLE_MAX} />
              </div>
            </div>

            <div>
              <Field label="Descripción" hint="El párrafo gris del resultado. Describe lo que hay, sin exagerar.">
                <Textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </Field>
              <div className="mt-1.5">
                <Counter value={form.description.length} min={DESC_MIN} max={DESC_MAX} />
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {error && <ErrorNote>{error}</ErrorNote>}
            {ok && <OkNote>{ok}</OkNote>}
            <SubmitButton busy={busy}>Guardar SEO</SubmitButton>
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <p className="text-[13px] leading-relaxed text-silver-500">
            Estos textos son los de la portada. Las fichas de producto generan los suyos con el nombre y la descripción
            de cada producto: se editan en{' '}
            <Link to="/admin/productos" className="text-gold-300 underline underline-offset-4">
              Productos
            </Link>
            .
          </p>
        </Panel>
      </form>
    </>
  )
}
