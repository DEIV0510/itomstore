import { useEffect, useRef, useState } from 'react'
import type { ElementType, ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  /** retardo en ms para escalonar elementos de una misma fila */
  delay?: number
  as?: ElementType
}

/** Aparicion suave al entrar en pantalla. Se desactiva sola si el usuario
 *  pidio menos movimiento, y solo se dispara una vez. */
export default function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // se muestra al entrar en pantalla y tambien si el usuario paso de largo
          // con un scroll muy rapido o con un salto de ancla: nunca queda invisible
          const passed = e.boundingClientRect.bottom <= 0
          if (e.isIntersecting || passed) {
            setSeen(true)
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={`reveal ${seen ? 'is-in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
