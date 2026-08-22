import { useSeo } from '@/lib/seo'
import { useShop } from '@/lib/shop'
import Hero from '@/components/home/Hero'
import TrustBar from '@/components/home/TrustBar'
import CategoryGrid from '@/components/home/CategoryGrid'
import ProductsGrid from '@/components/home/ProductsGrid'
import BoseBand from '@/components/home/BoseBand'
import TradeIn from '@/components/home/TradeIn'
import Shipping from '@/components/home/Shipping'

/**
 * Portada de ITOMSTORE, enfocada al producto.
 * Se entra, se ven las categorias y a continuacion TODO el catalogo.
 * La informacion de apoyo (nosotros, envios, garantias, permutas, preguntas)
 * vive en sus propias paginas: no ocupa la portada.
 *
 * Que secciones se pintan lo decide el administrador desde la base de datos
 * (settings.home). El hero y la rejilla de productos van siempre.
 */
export default function Home() {
  const { settings } = useShop()
  const { home, seo } = settings

  useSeo({ title: seo.title, description: seo.description, path: '/' })

  return (
    <>
      <Hero />
      {home.showTrustBar && <TrustBar />}
      {home.showCategories && <CategoryGrid />}
      <ProductsGrid />
      {home.showBose && <BoseBand />}
      {home.showTradeIn && <TradeIn />}
      {home.showShipping && <Shipping />}
    </>
  )
}
