import { useSeo } from '@/lib/seo'
import Hero from '@/components/home/Hero'
import TrustBar from '@/components/home/TrustBar'
import CategoryGrid from '@/components/home/CategoryGrid'
import ProductsGrid from '@/components/home/ProductsGrid'
import BoseBand from '@/components/home/BoseBand'
import TradeIn from '@/components/home/TradeIn'
import Shipping from '@/components/home/Shipping'

const TITLE = 'ITOMSTORE | Tecnología Apple y productos premium en Colombia'

const DESCRIPTION =
  'Compra iPhone, MacBook, iPad, Apple Watch, audífonos, parlantes Bose y tecnología en ITOMSTORE. ' +
  'Domicilios en Barranquilla, entregas en Valledupar y envíos a toda Colombia.'

/**
 * Portada de ITOMSTORE, enfocada al producto.
 * Se entra, se ven las categorias y a continuacion TODO el catalogo.
 * La informacion de apoyo (nosotros, envios, garantias, permutas, preguntas)
 * vive en sus propias paginas: no ocupa la portada.
 */
export default function Home() {
  useSeo({ title: TITLE, description: DESCRIPTION, path: '/' })

  return (
    <>
      <Hero />
      <TrustBar />
      <CategoryGrid />
      <ProductsGrid />
      <BoseBand />
      <TradeIn />
      <Shipping />
    </>
  )
}
