import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ImageOff, Loader2, Star, Upload, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { img } from '@/lib/images'
import { ErrorNote, Loading } from './ui/kit'

/**
 * Selector de fotos del producto.
 *
 * Lee /api/media (las claves reales del manifiesto del sitio) y permite subir
 * fotos nuevas. Una foto recien subida NO esta en el manifiesto: su clave ya es
 * una ruta ('uploads/<archivo>' -> '/img/uploads/<archivo>'), por eso se guarda
 * aparte en `uploaded` para que su miniatura se vea sin recargar la pagina.
 */

interface Asset {
  key: string
  src: string
  width: number | null
  height: number | null
}

interface Props {
  value: string[]
  onChange: (v: string[]) => void
  /**
   * Cuantas fotos se pueden elegir. Con `max={1}` el selector trabaja en modo
   * foto unica: elegir o subir una reemplaza a la anterior y se ocultan los
   * controles de orden, que ahi no significan nada.
   */
  max?: number
}

const errMsg = (e: unknown) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Ocurrió un error inesperado.'

const iconBtn =
  'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-hairline text-silver-500 ' +
  'transition-colors duration-200 hover:border-gold-500/40 hover:text-silver-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 ' +
  'disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-hairline'

export default function ImagePicker({ value, onChange, max = Infinity }: Props) {
  const single = max === 1
  const full = value.length >= max
  const [assets, setAssets] = useState<Asset[]>([])
  const [uploaded, setUploaded] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    try {
      const list = await api.get<Asset[]>('/media')
      setAssets(Array.isArray(list) ? list : [])
      setError(null)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** Subidas primero, sin claves repetidas. */
  const all = useMemo(() => {
    const seen = new Set<string>()
    const out: Asset[] = []
    for (const a of [...uploaded, ...assets]) {
      if (seen.has(a.key)) continue
      seen.add(a.key)
      out.push(a)
    }
    return out
  }, [uploaded, assets])

  /** Ruta usable de una clave, aunque no este en la lista cargada. */
  const srcFor = useCallback(
    (key: string): string | null => {
      const found = all.find((a) => a.key === key)
      if (found) return found.src
      if (key.includes('/')) return `/img/${key}`
      return img(key)?.src ?? null
    },
    [all]
  )

  function toggle(key: string) {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key))
      return
    }
    // Con foto unica la nueva reemplaza a la anterior; con varias, se anade al
    // final salvo que ya se haya llegado al tope.
    if (single) onChange([key])
    else if (!full) onChange([...value, key])
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function move(index: number, to: number) {
    if (to < 0 || to >= value.length) return
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploading(true)
    setUploadError(null)
    try {
      const asset = await api.upload<{ key: string; src: string }>('/media/upload', file)
      setUploaded((u) => [{ key: asset.key, src: asset.src, width: null, height: null }, ...u.filter((x) => x.key !== asset.key)])
      if (single) onChange([asset.key])
      else if (!value.includes(asset.key) && !full) onChange([...value, asset.key])
      await load()
    } catch (err) {
      setUploadError(errMsg(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------ fotos elegidas */}
      <div>
        {single ? (
          <p className="mb-2 text-[12px] leading-relaxed text-silver-500">
            Solo se usa <strong className="text-silver-300">una foto</strong>. Si eliges otra, reemplaza a la actual.
          </p>
        ) : (
          <p className="mb-2 text-[12px] leading-relaxed text-silver-500">
            La <strong className="text-silver-300">primera foto es la principal</strong>: es la que se ve en el catálogo
            y en los resultados de búsqueda. Usa las flechas para cambiar el orden.
          </p>
        )}

        {value.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hairline px-4 py-6 text-center">
            <p className="text-[13px] text-silver-500">Todavía no has elegido ninguna foto.</p>
            <p className="mt-1 text-[12px] text-silver-700">
              {single
                ? 'Sin foto elegida, se muestra el diseño por defecto.'
                : 'El producto se publicará sin imagen hasta que selecciones o subas una.'}
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {value.map((key, i) => {
              const src = srcFor(key)
              return (
                <li
                  key={`${key}-${i}`}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-ink/40 p-2"
                >
                  <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-hairline bg-ink">
                    {src ? (
                      <img src={src} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-silver-700">
                        <ImageOff size={14} aria-hidden />
                      </span>
                    )}
                    {!single && (
                      <span className="absolute left-0 top-0 grid h-5 w-5 place-items-center rounded-br-lg bg-gold-500 text-[10px] font-bold text-ink">
                        {i + 1}
                      </span>
                    )}
                  </span>

                  <span className="min-w-[6rem] flex-1 truncate text-[12px] text-silver-500" title={key}>
                    {key}
                    {!single && i === 0 && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-400">
                        Principal
                      </span>
                    )}
                  </span>

                  <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {!single && (
                      <>
                        <button
                          type="button"
                          onClick={() => move(i, 0)}
                          disabled={i === 0}
                          aria-label={`Poner ${key} como foto principal`}
                          title="Poner como principal"
                          className={iconBtn}
                        >
                          <Star size={15} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, i - 1)}
                          disabled={i === 0}
                          aria-label={`Subir ${key} una posición`}
                          title="Subir"
                          className={iconBtn}
                        >
                          <ArrowUp size={15} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, i + 1)}
                          disabled={i === value.length - 1}
                          aria-label={`Bajar ${key} una posición`}
                          title="Bajar"
                          className={iconBtn}
                        >
                          <ArrowDown size={15} aria-hidden />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      aria-label={`Quitar ${key} de la selección`}
                      title="Quitar"
                      className={`${iconBtn} hover:border-red-400/50 hover:text-red-300`}
                    >
                      <X size={15} aria-hidden />
                    </button>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* --------------------------------------------- galeria disponible */}
      <div className="rounded-xl border border-hairline bg-ink/30 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
            Fotos disponibles {all.length > 0 && <span className="text-silver-700">({all.length})</span>}
          </p>

          <label className="btn btn-sm btn-ghost cursor-pointer">
            {uploading ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Upload size={15} aria-hidden />}
            {uploading ? 'Subiendo…' : 'Subir una foto'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFile}
              disabled={uploading}
              className="sr-only"
              aria-label="Subir una foto nueva (JPG, PNG o WebP, hasta 6 MB)"
            />
          </label>
        </div>

        {uploadError && (
          <div className="mb-3">
            <ErrorNote>{uploadError}</ErrorNote>
          </div>
        )}

        {loading ? (
          <Loading label="Cargando las fotos…" />
        ) : error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : all.length === 0 ? (
          <p className="px-2 py-6 text-center text-[13px] text-silver-500">
            No hay fotos en el sitio todavía. Sube la primera con el botón de arriba.
          </p>
        ) : (
          <ul className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
            {all.map((a) => {
              const order = value.indexOf(a.key)
              const selected = order >= 0
              // Con foto unica siempre se puede cambiar; con varias, el tope bloquea.
              const blocked = !selected && !single && full
              return (
                <li key={a.key}>
                  <button
                    type="button"
                    onClick={() => toggle(a.key)}
                    disabled={blocked}
                    aria-pressed={selected}
                    aria-label={selected ? `Quitar ${a.key} de la selección` : `Elegir ${a.key}`}
                    title={blocked ? `Ya elegiste el máximo de ${max} fotos` : a.key}
                    className={`relative block aspect-[4/5] w-full overflow-hidden rounded-lg border-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60 disabled:cursor-not-allowed disabled:opacity-35 ${
                      selected ? 'border-gold-500' : 'border-hairline hover:border-gold-500/40'
                    }`}
                  >
                    <img src={a.src} alt="" aria-hidden loading="lazy" className="h-full w-full object-cover" />
                    {selected && (
                      <span className="absolute right-1 top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-ink">
                        {single ? <Check size={12} aria-hidden strokeWidth={3} /> : order + 1}
                      </span>
                    )}
                  </button>
                  <span className="mt-1 block truncate text-[10px] text-silver-700" title={a.key}>
                    {a.key}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-silver-700">
          Se aceptan JPG, PNG o WebP de hasta 6 MB. El servidor renombra el archivo al guardarlo.
        </p>
      </div>
    </div>
  )
}
