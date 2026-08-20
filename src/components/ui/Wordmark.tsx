import { LOGO_MARK } from '@/lib/images'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  withTagline?: boolean
  className?: string
}

/** Unica escala del lockup. El interletraje de STORE es el mismo en las tres variantes. */
const SIZES = {
  sm: { px: 32, mark: 'h-8 w-8', gap: 'gap-2.5', itom: 'text-[15px]', store: 'text-[11px]' },
  md: { px: 36, mark: 'h-9 w-9', gap: 'gap-3', itom: 'text-[20px]', store: 'text-[13px]' },
  lg: { px: 48, mark: 'h-12 w-12', gap: 'gap-3.5', itom: 'text-[26px]', store: 'text-[15px]' },
} as const

/**
 * Lockup de marca de ITOMSTORE: marca circular + ITOM/STORE (+ lema opcional).
 * No incluye enlace: quien lo use lo envuelve en su propio <Link> con aria-label.
 */
export default function Wordmark({ size = 'md', withTagline = false, className = '' }: Props) {
  const s = SIZES[size]

  return (
    <span className={`inline-flex min-w-0 items-center ${s.gap} ${className}`}>
      <img
        src={LOGO_MARK}
        alt=""
        aria-hidden="true"
        width={s.px}
        height={s.px}
        className={`${s.mark} shrink-0 rounded-full transition-transform duration-500 ease-premium group-hover:rotate-[8deg]`}
      />

      <span className="flex min-w-0 flex-col overflow-hidden leading-none">
        <span className="flex items-baseline whitespace-nowrap">
          <span className={`font-display ${s.itom} font-extrabold tracking-tightest text-metal`}>ITOM</span>
          <span className={`pl-[3px] font-sans ${s.store} font-medium tracking-[0.2em] text-silver-300`}>STORE</span>
        </span>
        {withTagline && <span className="eyebrow-xs mt-[5px]">Tu mundo Apple</span>}
      </span>
    </span>
  )
}
