import { Outlet } from 'react-router-dom'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Preloader from '@/components/layout/Preloader'
import WhatsAppFab from '@/components/layout/WhatsAppFab'
import CartDrawer from '@/components/cart/CartDrawer'
import SearchOverlay from '@/components/search/SearchOverlay'
import Toasts from '@/components/ui/Toasts'
import AdminBar from '@/admin/AdminBar'

/** Marco de la tienda publica. El panel /admin usa su propio marco. */
export default function PublicLayout() {
  return (
    <>
      <Preloader />

      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:bg-gold-500 focus:px-5 focus:py-3 focus:font-semibold focus:text-ink"
      >
        Saltar al contenido
      </a>

      <Header />

      {/* la barra fija de la ficha de producto reserva su alto aqui para no tapar el pie */}
      <div style={{ paddingBottom: 'var(--sticky-bar-h, 0px)' }}>
        <main id="contenido" tabIndex={-1}>
          <Outlet />
        </main>
        <Footer />
      </div>

      <WhatsAppFab />
      <CartDrawer />
      <SearchOverlay />
      <Toasts />
      {/* solo se pinta si hay sesion con permisos: el cliente nunca la ve */}
      <AdminBar />
    </>
  )
}
