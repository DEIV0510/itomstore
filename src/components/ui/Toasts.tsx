import { CheckCircle2, X } from 'lucide-react'
import { useStore } from '@/lib/store'

/**
 * Avisos breves (agregado al carrito, etc.).
 * La region viva vive aparte y solo lee el texto del aviso: asi los lectores de
 * pantalla no releen los botones de cerrar y de accion en cada cambio.
 */
export default function Toasts() {
  const { toasts, dismiss } = useStore()

  return (
    <>
      {/* region viva: siempre en el DOM, solo anuncia titulo y detalle */}
      <div role="status" aria-live="polite" className="sr-only">
        {toasts.map((t) => (
          <p key={t.id}>{t.detail ? `${t.title}: ${t.detail}` : t.title}</p>
        ))}
      </div>

      {/* en escritorio queda por encima del boton flotante de WhatsApp */}
      <div
        className="pointer-events-none fixed bottom-24 left-4 right-4 z-[90] flex flex-col gap-2
                   sm:bottom-28 sm:left-auto sm:right-6 sm:w-[360px] sm:max-w-[calc(100vw-3rem)]"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="surface-glass pointer-events-auto flex animate-fade-up items-start gap-3 border-l-2 border-l-gold-500 p-3"
          >
            {t.image && (
              <img
                src={t.image}
                alt=""
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                className="h-10 w-10 shrink-0 rounded-lg border border-hairline bg-carbon object-cover"
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} aria-hidden className="shrink-0 text-emerald-400" />
                <p className="truncate text-sm font-semibold text-silver-100">{t.title}</p>
              </div>

              {t.detail && <p className="mt-0.5 truncate text-[13px] text-silver-500">{t.detail}</p>}

              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick()
                    dismiss(t.id)
                  }}
                  className="-mx-2 -mb-2 mt-0.5 inline-flex min-h-[44px] items-center rounded-lg px-2 py-2
                             text-[13px] font-semibold text-gold-300 underline-offset-4 transition-colors
                             hover:bg-white/[0.05] hover:text-gold-200 hover:underline"
                >
                  {t.action.label}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-silver-500
                         transition-colors hover:bg-white/[0.06] hover:text-silver-100"
            >
              <X size={15} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
