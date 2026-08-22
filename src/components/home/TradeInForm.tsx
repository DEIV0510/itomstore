import { useRef, useState } from 'react'
import { Check, MessageCircle, Send, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useShop } from '@/lib/shop'
import { wa } from '@/lib/whatsapp'
import { useEscape } from '@/hooks/useEscape'
import { useLockScroll } from '@/hooks/useLockScroll'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface Props {
  open: boolean
  onClose: () => void
}

const ESTADOS = ['Como nuevo', 'Buen estado', 'Con detalles', 'Con daños'] as const

/**
 * Formulario publico de permuta.
 *
 * Deja la solicitud registrada en la tienda (aparece en /admin/permutas) y ademas
 * abre WhatsApp para seguir la conversacion. El valor del equipo NO se calcula
 * aqui: lo define la tienda despues de revisarlo.
 */
export default function TradeInForm({ open, onClose }: Props) {
  const { settings } = useShop()
  const panelRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({ name: '', whatsapp: '', city: '', device: '', capacity: '', condition: '', wants: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ code: string } | null>(null)

  useLockScroll(open)
  useEscape(open, onClose)
  useFocusTrap(open, panelRef)

  if (!open) return null

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await api.post<{ tradein: { code: string } }>('/tradeins', form)
      setDone({ code: r.tradein.code })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar tu solicitud.')
    } finally {
      setBusy(false)
    }
  }

  const mensajeWa = wa(
    done
      ? `Hola ITOMSTORE! Acabo de enviar la solicitud de permuta ${done.code}. Mi equipo es un ${form.device}.`
      : 'Hola ITOMSTORE, quiero cotizar mi equipo usado para entregarlo como parte de pago.'
  )

  const campo =
    'w-full min-h-[48px] rounded-xl border border-hairline bg-ink/60 px-3.5 text-[14px] text-silver-100 ' +
    'placeholder:text-silver-700 transition-colors duration-200 focus:border-gold-500/50 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60'

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-ink/85 p-4 backdrop-blur-sm sm:p-8">
      <button type="button" tabIndex={-1} aria-hidden onClick={onClose} className="fixed inset-0 cursor-default" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="permuta-form-title"
        className="relative my-auto w-full max-w-lg rounded-3xl border border-hairline bg-carbon shadow-lift"
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div>
            <p className="eyebrow">Recibimos tu equipo</p>
            <h2 id="permuta-form-title" className="mt-1 font-display text-xl font-extrabold tracking-tightest text-silver-100">
              {done ? 'Solicitud enviada' : 'Cotiza tu equipo'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-hairline text-silver-500 transition-colors hover:border-gold-500/40 hover:text-silver-100"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <Check size={24} aria-hidden />
            </span>
            <p className="text-[15px] leading-relaxed text-silver-100">
              Recibimos tu solicitud <strong className="text-gold-300">{done.code}</strong>.
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-silver-500">
              La revisamos y te decimos cuánto te reconocemos por tu equipo. Escríbenos por WhatsApp para agilizarlo.
            </p>
            <a href={mensajeWa} target="_blank" rel="noopener noreferrer" className="btn btn-gold sheen mt-6 w-full">
              <MessageCircle size={17} aria-hidden />
              Continuar por WhatsApp
            </a>
            <button type="button" onClick={onClose} className="btn btn-ghost mt-2 w-full">
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3.5 px-5 py-5">
            <p className="text-[13px] leading-relaxed text-silver-500">
              Cuéntanos qué equipo tienes. El valor lo confirmamos después de revisarlo: aquí no damos precios
              automáticos.
            </p>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
                  Tu nombre <span className="text-gold-400">*</span>
                </span>
                <input required value={form.name} onChange={set('name')} className={campo} placeholder="Nombre y apellido" />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
                  WhatsApp <span className="text-gold-400">*</span>
                </span>
                <input
                  required
                  inputMode="tel"
                  value={form.whatsapp}
                  onChange={set('whatsapp')}
                  className={campo}
                  placeholder="3001234567"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
                ¿Qué equipo entregas? <span className="text-gold-400">*</span>
              </span>
              <input
                required
                value={form.device}
                onChange={set('device')}
                className={campo}
                placeholder="Ej: iPhone 13 Pro"
              />
            </label>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
                  Capacidad
                </span>
                <input value={form.capacity} onChange={set('capacity')} className={campo} placeholder="Ej: 128GB" />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
                  Estado del equipo
                </span>
                <select value={form.condition} onChange={set('condition')} className={campo}>
                  <option value="">Selecciona…</option>
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
                  Tu ciudad
                </span>
                <input
                  value={form.city}
                  onChange={set('city')}
                  className={campo}
                  placeholder={settings.brand.city}
                  list="permuta-ciudades"
                />
                <datalist id="permuta-ciudades">
                  {settings.coverage.map((c) => (
                    <option key={c.city} value={c.city} />
                  ))}
                </datalist>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
                  ¿Qué equipo quieres?
                </span>
                <input value={form.wants} onChange={set('wants')} className={campo} placeholder="Ej: iPhone 17 Pro" />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
                Detalles
              </span>
              <textarea
                rows={3}
                value={form.note}
                onChange={set('note')}
                className={`${campo} py-2.5`}
                placeholder="Golpes, batería, si tiene caja y accesorios…"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-3 text-[13px] text-red-200">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-gold sheen w-full">
              <Send size={16} aria-hidden />
              {busy ? 'Enviando…' : 'Enviar solicitud'}
            </button>

            <p className="text-center text-[12px] text-silver-700">
              También puedes{' '}
              <a href={mensajeWa} target="_blank" rel="noopener noreferrer" className="text-gold-300 underline-offset-4 hover:underline">
                escribirnos directo por WhatsApp
              </a>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
