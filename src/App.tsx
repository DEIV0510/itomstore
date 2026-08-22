import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ShopProvider } from '@/lib/shop'
import { AuthProvider } from '@/lib/auth'
import { StoreProvider } from '@/lib/store'
import RouteFallback from '@/components/ui/RouteFallback'
import PublicLayout from '@/components/layout/PublicLayout'
import Home from '@/pages/Home'

const Catalog = lazy(() => import('@/pages/Catalog'))
const CategoryPage = lazy(() => import('@/pages/CategoryPage'))
const ProductPage = lazy(() => import('@/pages/ProductPage'))
const InfoPage = lazy(() => import('@/pages/InfoPage'))
const NotFound = lazy(() => import('@/pages/NotFound'))

/** Todo el panel viaja en su propio paquete: el cliente que solo compra nunca lo descarga. */
const AdminApp = lazy(() => import('@/admin/AdminApp'))

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

/**
 * Una sola aplicacion con dos niveles de acceso:
 *   /*       tienda publica
 *   /admin/* panel privado (protegido de verdad en el servidor)
 * Ambas partes leen y escriben la MISMA base de datos a traves de /api.
 */
export default function App() {
  return (
    <ShopProvider>
      <AuthProvider>
        <StoreProvider>
          <ScrollTop />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/admin/*" element={<AdminApp />} />

              <Route element={<PublicLayout />}>
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
              </Route>
            </Routes>
          </Suspense>
        </StoreProvider>
      </AuthProvider>
    </ShopProvider>
  )
}
