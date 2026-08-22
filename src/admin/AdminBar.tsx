import { Link } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/lib/auth'

/**
 * Acceso al panel mientras se navega la tienda.
 *
 * Solo existe en el DOM si hay una sesion valida. Un cliente normal no ve nada,
 * y aunque lo viera, la API seguiria exigiendo sesion y rol para cualquier accion.
 */
export default function AdminBar() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <Link
      to="/admin"
      className="fixed bottom-5 left-5 z-[60] inline-flex min-h-[44px] items-center gap-2 rounded-full border border-gold-500/40 bg-carbon/95 px-4 text-[13px] font-semibold text-gold-200 shadow-lift backdrop-blur transition-colors duration-300 hover:border-gold-500/70 hover:text-gold-100"
      style={{ bottom: 'calc(1.25rem + var(--sticky-bar-h, 0px) + env(safe-area-inset-bottom))' }}
    >
      <LayoutDashboard size={16} aria-hidden />
      <span className="hidden sm:inline">Panel de administración</span>
      <span className="sm:hidden">Panel</span>
    </Link>
  )
}
