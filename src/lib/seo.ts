import { useEffect } from 'react'
import { BRAND } from './config'

interface Seo {
  title: string
  description: string
  path?: string
  image?: string
  /** JSON-LD adicional para esta ruta */
  jsonLd?: Record<string, unknown>
}

function meta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Actualiza title, description, canonical, Open Graph y JSON-LD por ruta. */
export function useSeo({ title, description, path = '/', image = '/img/og.jpg', jsonLd }: Seo) {
  useEffect(() => {
    const url = BRAND.url + path
    const abs = image.startsWith('http') ? image : BRAND.url + image

    document.title = title
    meta('meta[name="description"]', 'name', 'description', description)
    meta('meta[property="og:title"]', 'property', 'og:title', title)
    meta('meta[property="og:description"]', 'property', 'og:description', description)
    meta('meta[property="og:url"]', 'property', 'og:url', url)
    meta('meta[property="og:image"]', 'property', 'og:image', abs)
    meta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    meta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    meta('meta[name="twitter:image"]', 'name', 'twitter:image', abs)

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = url

    if (!jsonLd) return
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.route = 'true'
    script.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(script)
    return () => {
      script.remove()
    }
  }, [title, description, path, image, jsonLd])
}
