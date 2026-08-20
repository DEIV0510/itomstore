import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider } from '@/lib/store'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Preloader from '@/components/layout/Preloader'
import WhatsAppFab from '@/components/layout/WhatsAppFab'
import CartDrawer from '@/components/cart/CartDrawer'
import SearchOverlay from '@/components/search/SearchOverlay'
import Toasts from '@/components/ui/Toasts'
import RouteFallback from '@/components/ui/RouteFallback'
import Home from '@/pages/Home'

const Catalog = lazy(() => import('@/pages/Catalog'))
const CategoryPage = lazy(() => import('@/pages/CategoryPage'))
const ProductPage = lazy(() => import('@/pages/ProductPage'))
const InfoPage = lazy(() => import('@/pages/InfoPage'))
const NotFound = lazy(() => import('@/pages/NotFound'))

/** Al cambiar de ruta se vuelve arriba, salvo cuando la URL trae un ancla. */
function ScrollTop() {
  const { pathname, hash, search } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, hash, search])
  return null
}

export default function App() {
  return (
    <StoreProvider>
      <Preloader />
      <ScrollTop />

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
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalogo" element={<Catalog />} />
              <Route path="/categoria/:id" element={<CategoryPage />} />
              <Route path="/producto/:id" element={<ProductPage />} />
              <Route path="/nosotros" element={<InfoPage slug="nosotros" />} />
              <Route path="/envios" element={<InfoPage slug="envios" />} />
              <Route path="/preguntas-frecuentes" element={<InfoPage slug="faq" />} />
              <Route path="/garantias" element={<InfoPage slug="garantias" />} />
              <Route path="/permutas" element={<InfoPage slug="permutas" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>
      <WhatsAppFab />
      <CartDrawer />
      <SearchOverlay />
      <Toasts />
    </StoreProvider>
  )
}
