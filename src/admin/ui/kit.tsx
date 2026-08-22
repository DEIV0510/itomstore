import { forwardRef, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Check, Loader2, X } from 'lucide-react'
import { useLockScroll } from '@/hooks/useLockScroll'
import { useEscape } from '@/hooks/useEscape'
import { useFocusTrap } from '@/hooks/useFocusTrap'

/* =========================================================================
   Kit del panel. Misma marca que la tienda (negro + dorado + Plus Jakarta),
   pero mas denso y funcional: aqui se trabaja, no se vende.
   ========================================================================= */

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-extrabold tracking-tightest text-silver-100 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[13px] leading-relaxed text-silver-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-hairline bg-graphite/70 ${className}`}>{children}</div>
}

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-silver-500">
        {label}
        {required && <span className="text-gold-400">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[12px] text-red-300">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-silver-700">{hint}</span>
      ) : null}
    </label>
  )
}

export const inputClass =
  'w-full min-h-[44px] rounded-xl border border-hairline bg-ink/60 px-3.5 text-[14px] text-silver-100 ' +
  'placeholder:text-silver-700 transition-colors duration-200 focus:border-gold-500/50 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...p }, ref) => <input ref={ref} {...p} className={`${inputClass} ${className}`} />
)
Input.displayName = 'Input'

export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={`${inputClass} py-2.5 ${p.className ?? ''}`} />
)

export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={`${inputClass} ${p.className ?? ''}`} />
)

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-hairline bg-ink/40 px-3.5 py-3 text-left transition-colors duration-200 hover:border-gold-500/30"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-silver-100">{label}</span>
        {hint && <span className="mt-0.5 block text-[12px] text-silver-700">{hint}</span>}
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
          checked ? 'bg-gold-500' : 'bg-white/[0.12]'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-ink transition-all duration-300 ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  )
}

/** Boton con estado de envio: evita dobles guardados. */
export function SubmitButton({
  children,
  busy,
  className = 'btn btn-sm btn-gold',
  type = 'submit',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button {...rest} type={type} disabled={busy || rest.disabled} className={className}>
      {busy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : null}
      {children}
    </button>
  )
}

export function Pill({ tone = 'muted', children }: { tone?: string; children: ReactNode }) {
  const tones: Record<string, string> = {
    muted: 'border-hairline bg-white/[0.04] text-silver-500',
    gold: 'border-gold-500/35 bg-gold-500/[0.12] text-gold-300',
    green: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    blue: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
    violet: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
    red: 'border-red-400/25 bg-red-400/10 text-red-300',
    orange: 'border-orange-400/25 bg-orange-400/10 text-orange-300',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        tones[tone] ?? tones.muted
      }`}
    >
      {children}
    </span>
  )
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline px-6 py-14 text-center">
      <p className="font-display text-lg font-extrabold text-silver-300">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-silver-500">{hint}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-silver-500" role="status">
      <Loader2 size={18} aria-hidden className="animate-spin text-gold-400" />
      <span className="text-[13px]">{label}</span>
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-3 text-[13px] leading-relaxed text-red-200"
    >
      <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export function OkNote({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p className="flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-3 text-[13px] text-emerald-200">
      <Check size={16} aria-hidden className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/** Ventana modal accesible: Escape, foco atrapado y scroll bloqueado. */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLockScroll(open)
  useEscape(open, onClose)
  useFocusTrap(open, ref)

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-ink/80 p-4 backdrop-blur-sm sm:p-8">
      <button type="button" tabIndex={-1} aria-hidden className="fixed inset-0 cursor-default" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative my-auto w-full rounded-2xl border border-hairline bg-carbon shadow-lift ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
          <h2 className="font-display text-lg font-extrabold tracking-tightest text-silver-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-lg border border-hairline text-silver-500 transition-colors hover:border-gold-500/40 hover:text-silver-100"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

/** Confirmacion en dos pasos, sin window.confirm. */
export function useConfirm(ms = 3000) {
  const [armed, setArmed] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timer.current), [])

  return {
    armed,
    /** devuelve true si ya estaba armado (hay que ejecutar), false si solo armó */
    ask(id: string) {
      if (armed === id) {
        clearTimeout(timer.current)
        setArmed(null)
        return true
      }
      setArmed(id)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setArmed(null), ms)
      return false
    },
  }
}

/** Buscador con retardo, para no consultar en cada tecla. */
export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
