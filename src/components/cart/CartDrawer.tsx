import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2, X, MessageCircle } from 'lucide-react'
import Img from '@/components/ui/Img'
import ConditionBadge from '@/components/ui/ConditionBadge'
import { useStore } from '@/lib/store'
import { useLockScroll } from '@/hooks/useLockScroll'
import { useEscape } from '@/hooks/useEscape'
import { useShop } from '@/lib/shop'
import { api } from '@/lib/api'
import { formatCOP, priceLabel } from '@/lib/format'
import { WA_ASESORIA, waCheckout } from '@/lib/whatsapp'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Carrito lateral. El pedido se cierra por WhatsApp: aqui solo se arma.
 * Los productos sin precio publicado se muestran como "A consultar",
 * nunca como $0.
 */
export default function CartDrawer() {
  const { items, count, total, hasPending, setQty, remove, clear, cartOpen, closeCart, toast } = useStore()
  const { settings } = useShop()
  const coverage = settings.coverage

  const [entered, setEntered] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [city, setCity] = useState('')
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const clearTimer = useRef<number | null>(null)

  useLockScroll(cartOpen)
  useEscape(cartOpen, closeCart)

  useEffect(() => {
    if (!cartOpen) {
      setEntered(false)
      setConfirmClear(false)
      return
    }
    closeRef.current?.focus()
    const raf = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(raf)
  }, [cartOpen])

  useEffect(
    () => () => {
      if (clearTimer.current !== null) window.clearTimeout(clearTimer.current)
    },
    []
  )

  if (!cartOpen) return null

  /** Ciudades sugeridas: salen de la cobertura real, editable en /admin/configuracion. */
  const CIUDADES = coverage.map((c) => (c.city === 'Resto de Colombia' ? 'Otra ciudad de Colombia' : c.city))
  const ciudad = city.trim()

  /**
   * Deja constancia del pedido en la tienda antes de abrir WhatsApp, para que
   * aparezca en /admin/pedidos. Si el registro falla NO se interrumpe la compra:
   * el enlace de WhatsApp sigue su curso y el cliente puede escribir igual.
   */
  function registrarPedido() {
    if (!items.length) return
    void api
      .post('/orders', {
        city: ciudad || undefined,
        items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
      })
      .catch(() => {
        /* sin conexion con el servidor: el pedido se gestiona solo por WhatsApp */
      })
  }
  const pendingCount = items.reduce((acc, i) => (i.product.price === null ? acc + i.qty : acc), 0)
  const empty = items.length === 0

  /** El foco no se escapa del panel mientras esta abierto. */
  function trapTab(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return
    const root = panelRef.current
    if (!root) return
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (nodes.length === 0) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  function handleRemove(id: string, name: string) {
    remove(id)
    toast({ title: 'Producto eliminado', detail: name })
  }

  function handleClear() {
    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current)
    if (!confirmClear) {
      setConfirmClear(true)
      clearTimer.current = window.setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearTimer.current = null
    setConfirmClear(false)
    clear()
  }

  return (
    <>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={closeCart}
        className={`fixed inset-0 z-[80] cursor-default bg-ink/75 backdrop-blur-sm transition-opacity duration-[400ms] ease-premium
                    ${entered ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        onKeyDown={trapTab}
        className={`fixed inset-y-0 right-0 z-[81] flex w-full max-w-full flex-col border-l border-hairline bg-carbon
                    shadow-[-28px_0_70px_-18px_rgba(0,0,0,.95)] transition-transform duration-[400ms] ease-premium
                    sm:max-w-[420px] ${entered ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* ------------------------------------------------------- cabecera */}
        <div className="flex shrink-0 items-center gap-3 border-b border-hairline px-4 py-4 sm:px-5">
          <h2 id="cart-title" className="title-md min-w-0 truncate text-silver-100">
            Tu carrito
          </h2>
          {count > 0 && (
            <span className="badge badge-gold shrink-0">
              {count} {count === 1 ? 'unidad' : 'unidades'}
            </span>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border border-hairline text-silver-500
                       transition-colors duration-300 ease-premium hover:border-gold-500/40 hover:text-silver-100"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* ---------------------------------------------------------- cuerpo */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center px-1 text-center">
              <div className="mb-5 grid h-20 w-20 place-items-center rounded-3xl border border-hairline bg-white/[0.03] text-silver-700">
                <ShoppingBag size={34} aria-hidden />
              </div>
              <h3 className="title-md text-silver-100">Tu carrito está vacío</h3>
              <p className="body-lg mt-2 max-w-[30ch]">
                Agrega los equipos que te interesen y armamos tu pedido por WhatsApp.
              </p>
              <div className="mt-7 flex w-full flex-col gap-3">
                <Link to="/catalogo" onClick={closeCart} className="btn btn-gold sheen w-full">
                  Ver catálogo
                </Link>
                <a href={WA_ASESORIA()} target="_blank" rel="noopener noreferrer" className="btn btn-wa w-full">
                  <MessageCircle size={17} aria-hidden />
                  Pedir asesoría
                </a>
              </div>
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {items.map(({ product: p, qty }) => {
                  const attrs = [p.color, p.capacity].filter(Boolean).join(' · ')
                  const price = p.price
                  return (
                    <li
                      key={p.id}
                      className="grid grid-cols-[72px_minmax(0,1fr)] gap-2.5 border-b border-hairline pb-4 last:border-b-0 last:pb-0 sm:gap-4"
                    >
                      <Link
                        to={`/producto/${p.id}`}
                        onClick={closeCart}
                        className="block h-[90px] w-[72px] shrink-0"
                        aria-label={`Ver ${p.name}`}
                      >
                        <Img
                          name={p.images[0]}
                          alt={`${p.name}${p.color ? ` color ${p.color}` : ''}`}
                          className="h-[90px] w-[72px] rounded-xl border border-hairline bg-graphite"
                          imgClassName="object-cover"
                          sizes="72px"
                          fallback={
                            <div className="grid h-full w-full place-items-center bg-graphite text-silver-700">
                              <ShoppingBag size={20} aria-hidden />
                            </div>
                          }
                        />
                      </Link>

                      <div className="min-w-0">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/producto/${p.id}`}
                              onClick={closeCart}
                              className="line-clamp-2 font-display text-[15px] font-extrabold leading-tight tracking-tightest
                                         text-silver-100 transition-colors duration-300 ease-premium hover:text-white"
                            >
                              {p.name}
                            </Link>
                            {attrs && <p className="mt-1 truncate text-[12px] text-silver-700">{attrs}</p>}
                            <ConditionBadge condition={p.condition} className="mt-1" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemove(p.id, p.name)}
                            aria-label={`Eliminar ${p.name} del carrito`}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-hairline text-silver-700
                                       transition-colors duration-300 ease-premium hover:border-gold-500/40 hover:text-silver-100"
                          >
                            <Trash2 size={16} aria-hidden />
                          </button>
                        </div>

                        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          {price === null ? (
                            <span className="font-display text-[14px] font-extrabold leading-none text-gold-300">A consultar</span>
                          ) : (
                            <>
                              <span className="font-display text-[15px] font-extrabold leading-none text-white">
                                {priceLabel(price)}
                              </span>
                              {qty > 1 && (
                                <span className="text-[12px] leading-none text-silver-700">
                                  × {qty} = {formatCOP(price * qty)}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQty(p.id, qty - 1)}
                            aria-label={`Quitar una unidad de ${p.name}`}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-hairline text-silver-300
                                       transition-colors duration-300 ease-premium hover:border-gold-500/40 hover:text-white"
                          >
                            <Minus size={16} aria-hidden />
                          </button>
                          <span
                            aria-live="polite"
                            aria-atomic="true"
                            className="min-w-[2ch] shrink-0 text-center font-display text-sm font-extrabold text-silver-100"
                          >
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(p.id, qty + 1)}
                            disabled={qty >= 99}
                            aria-label={`Agregar una unidad de ${p.name}`}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-hairline text-silver-300
                                       transition-colors duration-300 ease-premium hover:border-gold-500/40 hover:text-white
                                       disabled:pointer-events-none disabled:opacity-40"
                          >
                            <Plus size={16} aria-hidden />
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-5 flex justify-center border-t border-hairline pt-4">
                <button
                  type="button"
                  onClick={handleClear}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[13px] font-semibold
                              transition-colors duration-300 ease-premium
                              ${confirmClear ? 'text-gold-300' : 'text-silver-700 hover:text-silver-300'}`}
                >
                  <Trash2 size={14} aria-hidden />
                  {confirmClear ? '¿Seguro? Toca de nuevo' : 'Vaciar carrito'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* --------------------------------------- pie: solo si hay productos */}
        {!empty && (
          <div className="shrink-0 border-t border-hairline bg-carbon px-4 py-4 sm:px-5">
            <label htmlFor="cart-ciudad" className="eyebrow-muted block">
              Ciudad de entrega
            </label>
            <input
              id="cart-ciudad"
              list="cart-ciudades"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Opcional · ¿a dónde lo enviamos?"
              autoComplete="address-level2"
              className="mt-2 w-full rounded-xl border border-hairline bg-elevated px-3.5 py-3 text-sm text-silver-100
                         transition-colors duration-300 ease-premium placeholder:text-silver-700
                         focus:border-gold-500/45 focus-visible:ring-2 focus-visible:ring-gold-400
                         focus-visible:ring-offset-2 focus-visible:ring-offset-carbon"
            />
            <datalist id="cart-ciudades">
              {CIUDADES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <div className="mt-4 space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-silver-500">Subtotal</span>
                {total > 0 ? (
                  <span className="font-display text-lg font-extrabold tracking-tightest text-white">
                    {formatCOP(total)}
                  </span>
                ) : (
                  <span className="font-display text-lg font-extrabold tracking-tightest text-gold-300">A consultar</span>
                )}
              </div>
              {hasPending && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-silver-500">Productos por cotizar</span>
                  <span className="text-[13px] font-semibold text-gold-300">{pendingCount}</span>
                </div>
              )}
            </div>

            {hasPending && (
              <p className="mt-2 text-[12px] leading-relaxed text-silver-700">
                Algunos productos aún no tienen precio publicado: te lo confirmamos por WhatsApp.
              </p>
            )}
            <p className="mt-2 text-[12px] leading-relaxed text-silver-700">
              El costo de envío se confirma según tu ciudad.
            </p>

            <div className="mt-4 space-y-2">
              <a
                href={waCheckout(items, ciudad || undefined)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={registrarPedido}
                className="btn btn-gold sheen w-full"
              >
                <MessageCircle size={17} aria-hidden />
                FINALIZAR PEDIDO POR WHATSAPP
              </a>
              <button type="button" onClick={closeCart} className="btn btn-ghost w-full">
                Seguir comprando
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
