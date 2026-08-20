import { useEffect, useRef, useState } from 'react'
import { img } from '@/lib/images'

interface Props {
  /** clave del manifiesto de fotos reales */
  name: string | null | undefined
  alt: string
  className?: string
  /** clases del <img> interno (object-fit, position...) */
  imgClassName?: string
  sizes?: string
  priority?: boolean
  /** contenido a mostrar cuando esa categoria aun no tiene foto real */
  fallback?: React.ReactNode
}

/**
 * Foto real con LQIP, srcset responsive y fade-in.
 * Si la clave no existe (no tenemos foto de ese producto) renderiza `fallback`
 * en lugar de inventar una imagen.
 */
export default function Img({ name, alt, className = '', imgClassName = '', sizes = '100vw', priority = false, fallback = null }: Props) {
  const asset = img(name)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (ref.current?.complete) setLoaded(true)
  }, [asset?.src])

  if (!asset) {
    return <div className={`relative overflow-hidden ${className}`}>{fallback}</div>
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: `url("${asset.lqip}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <img
        ref={ref}
        src={asset.src}
        srcSet={asset.srcSet}
        sizes={sizes}
        alt={alt}
        // alt vacio = imagen decorativa (o el nombre lo da el boton/enlace que la envuelve):
        // se oculta tambien al lector de pantalla para no anunciarla dos veces
        aria-hidden={alt === '' ? true : undefined}
        width={asset.width}
        height={asset.height}
        loading={priority ? 'eager' : 'lazy'}
        // @ts-expect-error fetchpriority aun no esta tipado en React 18
        fetchpriority={priority ? 'high' : undefined}
        decoding={priority ? 'sync' : 'async'}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full transition-opacity duration-700 ease-premium ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName || 'object-cover'}`}
      />
    </div>
  )
}
