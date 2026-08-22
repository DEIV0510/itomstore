import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { LOGO } from '@/lib/images'
import { ErrorNote, Field, Input, Loading, SubmitButton } from './ui/kit'

/** Solo se aceptan destinos internos: evita que un enlace manipulado
 *  mande al usuario a otro sitio despues de iniciar sesion. */
function safeTarget(value: unknown): string {
  if (typeof value !== 'string') return '/admin'
  if (!value.startsWith('/admin')) return '/admin'
  if (value.startsWith('//') || value.includes('\\')) return '/admin'
  return value
}

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const emailRef = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  if (loading) return <Loading label="Comprobando tu sesión…" />
  if (user) return <Navigate to={safeTarget((location.state as { from?: string })?.from)} replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      navigate(safeTarget((location.state as { from?: string })?.from), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión.')
      setBusy(false)
    }
  }

  return (
    <div className="grain relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(45% 45% at 50% 30%, rgba(201,162,39,0.13) 0%, rgba(201,162,39,0) 70%)' }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={LOGO} alt="ITOMSTORE" width={587} height={435} className="h-24 w-auto" />
          <p className="eyebrow mt-4">Panel de administración</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-hairline bg-graphite/80 p-6 shadow-lift">
          <div className="space-y-4">
            <Field label="Correo" required>
              <Input
                ref={emailRef}
                type="email"
                name="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@itomstore.co"
              />
            </Field>

            <Field label="Contraseña" required>
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
              />
            </Field>

            {error && <ErrorNote>{error}</ErrorNote>}

            <SubmitButton busy={busy} className="btn btn-gold sheen w-full">
              <Lock size={16} aria-hidden />
              Entrar
            </SubmitButton>
          </div>
        </form>

        <p className="mt-5 flex items-center justify-center gap-2 text-[12px] text-silver-700">
          <ShieldCheck size={14} aria-hidden className="text-gold-500" />
          Área privada de ITOMSTORE
        </p>

        <p className="mt-6 text-center">
          <a href="/" className="text-[13px] text-silver-500 underline-offset-4 transition-colors hover:text-silver-100 hover:underline">
            Volver a la tienda
          </a>
        </p>
      </div>
    </div>
  )
}
