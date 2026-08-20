import { useEffect, useRef, useState } from 'react'
import { LOGO } from '@/lib/images'
import { useLockScroll } from '@/hooks/useLockScroll'

/** Bandera de sesion: el preloader se ve una sola vez por pestaña. */
const FLAG = 'itomstore.loaded'

/** Tiempo minimo en pantalla, techo absoluto y duracion del fundido de salida. */
const MIN_MS = 900
const MAX_MS = 2600
const FADE_MS = 600
const FADE_REDUCED_MS = 240

/** Particulas doradas con posiciones fijas: nada de aleatorio durante el render. */
const PARTICLES = [
  { left: '14%', top: '26%', size: 3, delay: '0s', duration: '7s', opacity: 0.2 },
  { left: '83%', top: '21%', size: 2, delay: '0.9s', duration: '8.5s', opacity: 0.14 },
  { left: '25%', top: '74%', size: 2, delay: '1.6s', duration: '9s', opacity: 0.16 },
  { left: '71%', top: '69%', size: 4, delay: '0.4s', duration: '7.5s', opacity: 0.12 },
  { left: '47%', top: '13%', size: 2, delay: '2.1s', duration: '10s', opacity: 0.1 },
  { left: '61%', top: '87%', size: 3, delay: '1.2s', duration: '8s', opacity: 0.13 },
] as const

function readFlag(): boolean {
  try {
    return window.sessionStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}

function writeFlag(): void {
  try {
    window.sessionStorage.setItem(FLAG, '1')
  } catch {
    /* sin almacenamiento disponible: el preloader simplemente podra repetirse */
  }
}

function readReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * Pantalla de carga inicial de ITOMSTORE.
 * Se retira cuando el documento termino de cargar y ya pasaron 900ms,
 * con un techo duro de 2600ms para que nunca se quede pegada.
 */
export default function Preloader() {
  const [skip] = useState(readFlag)
  const [reduced] = useState(readReducedMotion)
  const [entered, setEntered] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const fade = reduced ? FADE_REDUCED_MS : FADE_MS

  useLockScroll(!skip && !gone)

  useEffect(() => {
    if (skip) return
    writeFlag()

    const start = Date.now()
    const timers: number[] = []
    let raf = 0
    let done = false
    let shown = 0

    const paint = (pct: number) => {
      const clamped = Math.min(100, Math.max(0, pct))
      if (barRef.current) barRef.current.style.width = `${clamped.toFixed(1)}%`
    }

    const finish = () => {
      if (done) return
      done = true
      cancelAnimationFrame(raf)
      paint(100)
      setLeaving(true)
      timers.push(window.setTimeout(() => setGone(true), fade))
    }

    /** Cierra respetando el minimo de permanencia en pantalla. */
    const settle = () => {
      const elapsed = Date.now() - start
      if (elapsed >= MIN_MS) finish()
      else timers.push(window.setTimeout(finish, MIN_MS - elapsed))
    }

    const onLoad = () => settle()
    if (document.readyState === 'complete') settle()
    else window.addEventListener('load', onLoad)

    // techo absoluto: pase lo que pase, el preloader se retira
    timers.push(window.setTimeout(finish, MAX_MS))

    // el relleno avanza con el tiempo real y se completa al terminar la carga
    const tick = () => {
      const elapsed = Date.now() - start
      const target = document.readyState === 'complete' ? 100 : Math.min(90, 6 + (elapsed / MAX_MS) * 84)
      shown += (target - shown) * 0.12
      paint(shown)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // aparicion progresiva del lockup en el primer cuadro tras el montaje
    timers.push(window.setTimeout(() => setEntered(true), 40))

    return () => {
      done = true
      cancelAnimationFrame(raf)
      window.removeEventListener('load', onLoad)
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [skip, fade])

  if (skip || gone) return null

  return (
    <div
      data-preloader
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-[100] overflow-hidden bg-ink transition-opacity ease-premium ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${fade}ms` }}
    >
      <span className="sr-only">Cargando ITOMSTORE</span>

      <div aria-hidden="true" className="absolute inset-0 grid place-items-center px-6">
        {/* halo calido muy tenue, como la luz del local */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(58% 46% at 50% 46%, rgba(201,162,39,.13) 0%, rgba(201,162,39,0) 70%)',
          }}
        />

        {!reduced &&
          PARTICLES.map((p, i) => (
            <span
              key={i}
              className="pointer-events-none absolute animate-float rounded-full bg-gold-300"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                opacity: p.opacity,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}

        <div className="relative flex flex-col items-center">
          {/* lockup completo con barrido dorado que cruza una sola vez */}
          <div
            className={`relative overflow-hidden transition-all duration-[900ms] ease-premium ${
              entered ? 'scale-100 opacity-100' : 'scale-[0.96] opacity-0'
            }`}
          >
            <img
              src={LOGO}
              alt=""
              width={587}
              height={435}
              draggable={false}
              className="h-auto w-[190px] select-none sm:w-[230px]"
            />
            {!reduced && (
              <span className="pointer-events-none absolute inset-0 overflow-hidden">
                <span className="absolute inset-y-0 left-0 block w-2/5 -skew-x-12">
                  <span
                    className="block h-full w-full animate-sweep"
                    style={{
                      background: 'linear-gradient(100deg, rgba(233,208,144,0) 0%, rgba(233,208,144,.26) 50%, rgba(233,208,144,0) 100%)',
                      animationIterationCount: 1,
                      animationDelay: '0.35s',
                      animationFillMode: 'forwards',
                    }}
                  />
                </span>
              </span>
            )}
          </div>

          {/* barra de progreso: 160 x 2 */}
          <div className="mt-8 h-[2px] w-40 overflow-hidden rounded-full bg-hairline">
            <div ref={barRef} className="h-full w-0 rounded-full bg-gold-metal" />
          </div>

          <p className="eyebrow mt-5 animate-fade-in text-center" style={{ animationDelay: '0.55s' }}>
            Tu mundo Apple
          </p>
        </div>
      </div>
    </div>
  )
}
