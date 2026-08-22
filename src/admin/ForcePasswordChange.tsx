import { useRef, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useLockScroll } from '@/hooks/useLockScroll'
import { ErrorNote, Field, Input, SubmitButton } from './ui/kit'

/**
 * Cambio de contraseña obligatorio.
 *
 * Se monta en el panel y se ocupa solo: si el usuario tiene mustChange, tapa
 * la pantalla y no se puede cerrar (sin Escape, sin fondo, sin aspa) hasta que
 * la contraseña quede cambiada. La unica salida es cerrar sesion, que devuelve
 * al login. Cuando changePassword() responde, useAuth() pone mustChange en
 * false y este componente desaparece solo.
 *
 * Uso en AdminLayout:  <ForcePasswordChange />
 */

const MIN_PASSWORD = 10

export default function ForcePasswordChange() {
  const { user, changePassword, logout } = useAuth()
  const panel = useRef<HTMLDivElement>(null)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const open = Boolean(user?.mustChange)

  // los hooks van siempre: reciben si la capa esta activa
  useLockScroll(open)
  useFocusTrap(open, panel)

  if (!open) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await changePassword(current, next)
      // al volver, mustChange queda en false y la capa se desmonta sola
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cambiar la contraseña.')
      setBusy(false)
    }
  }

  const corta = next.length > 0 && next.length < MIN_PASSWORD

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/95 p-4 backdrop-blur-sm sm:p-8">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cambio-clave"
        className="relative my-auto w-full max-w-lg rounded-2xl border border-hairline bg-carbon shadow-lift"
      >
        <div className="flex items-start gap-3 border-b border-hairline px-5 py-4">
          <span aria-hidden className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-500/[0.12] text-gold-300">
            <KeyRound size={17} />
          </span>
          <div className="min-w-0">
            <h2
              id="titulo-cambio-clave"
              className="font-display text-lg font-extrabold tracking-tightest text-silver-100"
            >
              Cambia tu contraseña
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-silver-500">
              Por seguridad, la contraseña que te asignaron solo sirve para entrar la primera vez. Elige una nueva para
              continuar.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-5 py-5">
          <Field label="Contraseña actual" required hint="La que usaste para entrar.">
            <Input
              type="password"
              autoComplete="current-password"
              autoFocus
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </Field>

          <Field
            label="Nueva contraseña"
            required
            hint={`Mínimo ${MIN_PASSWORD} caracteres y distinta de la actual.`}
            error={corta ? `Te faltan ${MIN_PASSWORD - next.length} caracteres.` : undefined}
          >
            <Input
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              minLength={MIN_PASSWORD}
              required
            />
          </Field>

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => void logout()}
              className="btn btn-sm btn-ghost"
              title="Salir del panel sin cambiar la contraseña"
            >
              Cerrar sesión
            </button>

            <SubmitButton busy={busy} disabled={!current || next.length < MIN_PASSWORD}>
              Guardar contraseña
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  )
}
