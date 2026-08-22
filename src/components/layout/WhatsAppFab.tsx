import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { WA_GENERAL } from '@/lib/whatsapp'

/** Cualquier capa modal abierta en el documento (menu movil, filtros, drawer...). */
const MODAL_SELECTOR = '[role="dialog"][aria-modal="true"]'

/**
 * Boton flotante de WhatsApp, siempre disponible.
 * Se aparta cuando hay una capa modal abierta (carrito, buscador, menu, filtros)
 * y se levanta por encima de la barra fija de la ficha de producto.
 */
export default function WhatsAppFab() {
  const { cartOpen, searchOpen } = useStore()
  const [modalOpen, setModalOpen] = useState(false)

  // vigila la aparicion de cualquier dialogo modal, aunque su estado sea local a otro componente
  useEffect(() => {
    const sync = () => setModalOpen(document.querySelector(MODAL_SELECTOR) !== null)
    sync()

    const observer = new MutationObserver(sync)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'aria-modal'],
    })

    return () => observer.disconnect()
  }, [])

  const hidden = cartOpen || searchOpen || modalOpen

  return (
    <a
      href={WA_GENERAL()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir a ITOMSTORE por WhatsApp"
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : 0}
      className={`group fixed right-5 z-[60] flex h-14 items-center rounded-full bg-whatsapp text-white
                  shadow-[0_10px_24px_rgba(0,0,0,.55),0_18px_44px_-12px_rgba(37,211,102,.6)]
                  transition-all duration-300 ease-premium hover:-translate-y-0.5 sm:hover:pr-5
                  ${hidden ? 'pointer-events-none translate-y-3 opacity-0' : 'opacity-100'}`}
      style={{ bottom: 'calc(1.25rem + var(--sticky-bar-h, 0px) + env(safe-area-inset-bottom))' }}
    >
      {/* anillo pulsante detras del boton */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 animate-pulse-ring rounded-full bg-whatsapp/45"
      />

      <span className="grid h-14 w-14 shrink-0 place-items-center">
        <svg
          viewBox="0 0 24 24"
          width="27"
          height="27"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      </span>

      <span
        aria-hidden="true"
        className="hidden max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0
                   transition-all duration-300 ease-premium sm:block sm:group-hover:max-w-[9rem] sm:group-hover:opacity-100"
      >
        Escríbenos
      </span>
    </a>
  )
}
