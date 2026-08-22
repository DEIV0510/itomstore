import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useShop } from '@/lib/shop'
import type { Brand, Coverage, Social } from '@/lib/settings'
import { ErrorNote, Field, Input, Loading, OkNote, PageHead, Panel, SubmitButton, Textarea } from '../ui/kit'

/**
 * /admin/configuracion — datos de la empresa (solo administrador).
 *
 * Tres claves distintas de /api/settings, cada una con su propio boton:
 *   brand     -> empresa + WhatsApp
 *   socials   -> redes sociales
 *   coverage  -> ciudades y cobertura
 * Tras cada guardado se llama a refresh() para que la tienda quede al dia.
 */

/** Estado de guardado de un bloque: ocupado, mensaje de exito y error real del servidor. */
function useSaver() {
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(task: () => Promise<void>, done: string) {
    setBusy(true)
    setOk(null)
    setError(null)
    try {
      await task()
      setOk(done)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos guardar los cambios.')
    } finally {
      setBusy(false)
    }
  }

  function clear() {
    setOk(null)
    setError(null)
  }

  return { busy, ok, error, run, clear }
}

/** Botonera de fila: 44px de área táctil y siempre con aria-label. */
function RowButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-hairline transition-colors duration-200 disabled:opacity-35 ${
        danger
          ? 'text-silver-500 hover:border-red-400/50 hover:text-red-300'
          : 'text-silver-500 hover:border-gold-500/40 hover:text-silver-100'
      }`}
    >
      {children}
    </button>
  )
}

export default function Settings() {
  const { settings, loading, refresh } = useShop()

  const [brand, setBrand] = useState<Brand>(settings.brand)
  const [socials, setSocials] = useState<Social[]>(settings.socials)
  const [coverage, setCoverage] = useState<Coverage[]>(settings.coverage)

  const empresa = useSaver()
  const whats = useSaver()
  const redes = useSaver()
  const zonas = useSaver()

  // se siembra una sola vez, cuando la API ya respondio
  const seeded = useRef(false)
  useEffect(() => {
    if (loading || seeded.current) return
    seeded.current = true
    setBrand(settings.brand)
    setSocials(settings.socials.map((s) => ({ ...s })))
    setCoverage(settings.coverage.map((c) => ({ ...c })))
  }, [loading, settings])

  /* ------------------------------------------------------------- empresa */

  function setField<K extends keyof Brand>(key: K, value: Brand[K]) {
    setBrand((b) => ({ ...b, [key]: value }) as Brand)
    empresa.clear()
  }

  function saveEmpresa(e: React.FormEvent) {
    e.preventDefault()
    void empresa.run(async () => {
      const name = brand.name.trim()
      if (!name) throw new ApiError('El nombre de la tienda es obligatorio.', 0)

      const url = brand.url.trim()
      if (url && !/^https?:\/\//.test(url)) {
        throw new ApiError('La dirección web debe empezar por https://. Ejemplo: https://itomstore.co', 0)
      }

      await api.put('/settings/brand', {
        name,
        tagline: brand.tagline.trim(),
        city: brand.city.trim(),
        region: brand.region.trim(),
        country: brand.country.trim(),
        url,
        hours: (brand.hours ?? '').trim(),
      })
      await refresh()
    }, 'Datos de la empresa guardados.')
  }

  /* ------------------------------------------------------------ whatsapp */

  const waNumber = brand.whatsapp.trim()
  const waValid = /^\d{10,15}$/.test(waNumber)

  function saveWhatsapp(e: React.FormEvent) {
    e.preventDefault()
    void whats.run(async () => {
      // el servidor recalcula whatsappDisplay y whatsappPretty: aqui solo va el numero
      await api.put('/settings/brand', { whatsapp: waNumber })
      await refresh()
    }, 'WhatsApp actualizado en toda la web.')
  }

  /* --------------------------------------------------------------- redes */

  function setSocial(index: number, patch: Partial<Social>) {
    setSocials((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)))
    redes.clear()
  }

  function saveRedes(e: React.FormEvent) {
    e.preventDefault()
    void redes.run(async () => {
      const clean = socials.map((s) => ({ name: s.name.trim(), url: (s.url ?? '').trim() }))

      if (clean.some((s) => !s.name)) {
        throw new ApiError('Cada red social necesita un nombre. Ejemplo: Instagram.', 0)
      }
      const bad = clean.find((s) => s.url && !s.url.startsWith('https://'))
      if (bad) {
        throw new ApiError(`El enlace de ${bad.name} debe empezar por https:// o quedar vacío.`, 0)
      }

      await api.put(
        '/settings/socials',
        clean.map((s) => ({ name: s.name, url: s.url || null }))
      )
      await refresh()
    }, 'Redes sociales guardadas.')
  }

  /* ------------------------------------------------------------ cobertura */

  function setZone(index: number, patch: Partial<Coverage>) {
    setCoverage((list) => list.map((c, i) => (i === index ? { ...c, ...patch } : c)))
    zonas.clear()
  }

  function moveZone(index: number, delta: number) {
    setCoverage((list) => {
      const target = index + delta
      if (target < 0 || target >= list.length) return list
      const next = [...list]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
    zonas.clear()
  }

  function saveCobertura(e: React.FormEvent) {
    e.preventDefault()
    void zonas.run(async () => {
      const clean = coverage.map((c) => ({
        city: c.city.trim(),
        detail: c.detail.trim(),
        tag: c.tag.trim(),
      }))
      if (clean.some((c) => !c.city)) {
        throw new ApiError('Cada zona de cobertura necesita una ciudad.', 0)
      }

      await api.put('/settings/coverage', clean)
      await refresh()
    }, 'Cobertura guardada.')
  }

  if (loading) return <Loading label="Cargando la configuración…" />

  return (
    <>
      <PageHead
        title="Configuración"
        subtitle="Los datos reales de la tienda. Cada bloque se guarda por separado y se aplica en la web al instante."
      />

      <div className="space-y-6">
        {/* ------------------------------------------------------- empresa */}
        <Panel className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">Empresa</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-silver-500">
            Nombre, lema y ubicación. Se usan en el encabezado, el pie de página y las fichas de producto.
          </p>

          <form onSubmit={saveEmpresa} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre de la tienda" required>
                <Input value={brand.name} onChange={(e) => setField('name', e.target.value)} />
              </Field>

              <Field label="Lema" hint="Frase corta que acompaña al nombre.">
                <Input
                  value={brand.tagline}
                  onChange={(e) => setField('tagline', e.target.value)}
                  placeholder="Tu mundo Apple"
                />
              </Field>

              <Field label="Ciudad">
                <Input value={brand.city} onChange={(e) => setField('city', e.target.value)} />
              </Field>

              <Field label="Departamento">
                <Input value={brand.region} onChange={(e) => setField('region', e.target.value)} />
              </Field>

              <Field label="País">
                <Input value={brand.country} onChange={(e) => setField('country', e.target.value)} />
              </Field>

              <Field label="Dirección web" hint="Debe empezar por https://. Se usa en el SEO y en los enlaces para compartir.">
                <Input
                  type="url"
                  inputMode="url"
                  value={brand.url}
                  onChange={(e) => setField('url', e.target.value)}
                  placeholder="https://itomstore.co"
                />
              </Field>

              <div className="sm:col-span-2">
                <Field
                  label="Horario de atención"
                  hint="Déjalo vacío si prefieres no publicar horario: la web no mostrará ninguno."
                >
                  <Textarea
                    rows={2}
                    value={brand.hours ?? ''}
                    onChange={(e) => setField('hours', e.target.value)}
                    placeholder="Lunes a sábado, 9:00 a. m. – 7:00 p. m."
                  />
                </Field>
              </div>
            </div>

            {empresa.error && <ErrorNote>{empresa.error}</ErrorNote>}
            {empresa.ok && <OkNote>{empresa.ok}</OkNote>}

            <SubmitButton busy={empresa.busy}>Guardar empresa</SubmitButton>
          </form>
        </Panel>

        {/* ------------------------------------------------------ whatsapp */}
        <Panel className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">WhatsApp</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-silver-500">
            El número al que llegan todas las conversaciones de la tienda.
          </p>

          <form onSubmit={saveWhatsapp} className="mt-5 space-y-4">
            <Field
              label="Número de WhatsApp"
              required
              hint="Solo números, con indicativo del país. Ejemplo: 573022170654"
            >
              <Input
                inputMode="numeric"
                value={brand.whatsapp}
                onChange={(e) => {
                  setBrand((b) => ({ ...b, whatsapp: e.target.value }))
                  whats.clear()
                }}
                placeholder="573022170654"
              />
            </Field>

            <div className="rounded-xl border border-hairline bg-ink/50 px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-silver-700">Enlace resultante</p>
              {waValid ? (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 break-all text-[13px] text-gold-300 underline decoration-gold-500/40 underline-offset-4"
                >
                  https://wa.me/{waNumber}
                  <ExternalLink size={13} aria-hidden />
                </a>
              ) : (
                <p className="mt-1 text-[13px] text-silver-500">
                  {waNumber
                    ? 'Aún no es un número válido: se esperan entre 10 y 15 dígitos, sin espacios ni signos.'
                    : 'Sin definir. Escribe el número para ver el enlace.'}
                </p>
              )}
            </div>

            {whats.error && <ErrorNote>{whats.error}</ErrorNote>}
            {whats.ok && <OkNote>{whats.ok}</OkNote>}

            <SubmitButton busy={whats.busy}>Guardar WhatsApp</SubmitButton>
          </form>

          <Panel className="mt-5 bg-ink/40 p-4">
            <p className="text-[13px] leading-relaxed text-silver-500">
              <span className="font-semibold text-silver-100">Este número lo usa toda la web:</span> el botón flotante
              de WhatsApp, el botón de cada producto y el checkout del carrito. Si lo cambias aquí, cambia en los tres
              sitios a la vez. El formato bonito (+57 302 217 0654) lo calcula el servidor solo.
            </p>
          </Panel>
        </Panel>

        {/* --------------------------------------------------------- redes */}
        <Panel className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">Redes sociales</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-silver-500">
            Deja vacío el que no tengas: el icono aparecerá apagado en la tienda, sin enlace roto.
          </p>

          <form onSubmit={saveRedes} className="mt-5 space-y-4">
            {socials.length === 0 ? (
              <p className="rounded-xl border border-dashed border-hairline px-4 py-6 text-center text-[13px] text-silver-500">
                Sin redes configuradas.
              </p>
            ) : (
              <ul className="space-y-3">
                {socials.map((s, i) => (
                  <li key={i} className="rounded-xl border border-hairline bg-ink/40 p-3.5">
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] sm:items-end">
                      <Field label="Red">
                        <Input
                          value={s.name}
                          onChange={(e) => setSocial(i, { name: e.target.value })}
                          placeholder="Instagram"
                        />
                      </Field>

                      <Field label="Enlace" hint="Vacío = sin enlace. Si lo pones, debe empezar por https://">
                        <Input
                          type="url"
                          inputMode="url"
                          value={s.url ?? ''}
                          onChange={(e) => setSocial(i, { url: e.target.value })}
                          placeholder="https://www.instagram.com/tu-cuenta/"
                        />
                      </Field>

                      <div className="flex justify-end sm:pb-1">
                        <RowButton
                          label={`Quitar ${s.name || 'esta red'}`}
                          danger
                          onClick={() => {
                            setSocials((list) => list.filter((_, j) => j !== i))
                            redes.clear()
                          }}
                        >
                          <Trash2 size={16} aria-hidden />
                        </RowButton>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => {
                setSocials((list) => [...list, { name: '', url: null }])
                redes.clear()
              }}
              className="btn btn-sm btn-ghost"
            >
              <Plus size={15} aria-hidden />
              Añadir red
            </button>

            {redes.error && <ErrorNote>{redes.error}</ErrorNote>}
            {redes.ok && <OkNote>{redes.ok}</OkNote>}

            <div>
              <SubmitButton busy={redes.busy}>Guardar redes</SubmitButton>
            </div>
          </form>
        </Panel>

        {/* ----------------------------------------------------- cobertura */}
        <Panel className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">Cobertura</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-silver-500">
            Las ciudades que salen en la sección de envíos de la portada, en este mismo orden.
          </p>

          <form onSubmit={saveCobertura} className="mt-5 space-y-4">
            {coverage.length === 0 ? (
              <p className="rounded-xl border border-dashed border-hairline px-4 py-6 text-center text-[13px] text-silver-500">
                Sin zonas de cobertura. Añade al menos una.
              </p>
            ) : (
              <ul className="space-y-3">
                {coverage.map((c, i) => (
                  <li key={i} className="rounded-xl border border-hairline bg-ink/40 p-3.5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Ciudad" required>
                        <Input value={c.city} onChange={(e) => setZone(i, { city: e.target.value })} />
                      </Field>

                      <Field label="Etiqueta" hint="Palabra corta que se muestra al lado. Ejemplo: Envíos.">
                        <Input value={c.tag} onChange={(e) => setZone(i, { tag: e.target.value })} />
                      </Field>

                      <div className="sm:col-span-2">
                        <Field label="Detalle" hint="Cómo se entrega allí. Sin prometer plazos que no puedas cumplir.">
                          <Input value={c.detail} onChange={(e) => setZone(i, { detail: e.target.value })} />
                        </Field>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[12px] text-silver-700">Posición {i + 1}</span>
                      <div className="flex gap-2">
                        <RowButton
                          label={`Subir ${c.city || 'esta zona'}`}
                          disabled={i === 0}
                          onClick={() => moveZone(i, -1)}
                        >
                          <ArrowUp size={16} aria-hidden />
                        </RowButton>
                        <RowButton
                          label={`Bajar ${c.city || 'esta zona'}`}
                          disabled={i === coverage.length - 1}
                          onClick={() => moveZone(i, 1)}
                        >
                          <ArrowDown size={16} aria-hidden />
                        </RowButton>
                        <RowButton
                          label={`Quitar ${c.city || 'esta zona'}`}
                          danger
                          onClick={() => {
                            setCoverage((list) => list.filter((_, j) => j !== i))
                            zonas.clear()
                          }}
                        >
                          <Trash2 size={16} aria-hidden />
                        </RowButton>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => {
                setCoverage((list) => [...list, { city: '', detail: '', tag: '' }])
                zonas.clear()
              }}
              className="btn btn-sm btn-ghost"
            >
              <Plus size={15} aria-hidden />
              Añadir zona
            </button>

            {zonas.error && <ErrorNote>{zonas.error}</ErrorNote>}
            {zonas.ok && <OkNote>{zonas.ok}</OkNote>}

            <div>
              <SubmitButton busy={zonas.busy}>Guardar cobertura</SubmitButton>
            </div>
          </form>
        </Panel>
      </div>
    </>
  )
}
