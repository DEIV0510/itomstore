import { useEffect } from 'react'

/** Bloquea el scroll del body sin que la pagina salte (drawer, menu, buscador). */
export function useLockScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const body = document.body
    const prevOverflow = body.style.overflow
    const prevPad = body.style.paddingRight
    const gap = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (gap > 0) body.style.paddingRight = gap + 'px'
    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPad
    }
  }, [locked])
}
