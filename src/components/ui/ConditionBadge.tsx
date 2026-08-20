import { CONDITION_LABEL } from '@/lib/format'
import type { Condition } from '@/lib/types'

const CLASS: Record<Condition, string> = {
  nuevo: 'badge-new',
  seminuevo: 'badge-semi',
  usado: 'badge-used',
}

/** El estado del producto nunca se oculta. */
export default function ConditionBadge({ condition, className = '' }: { condition: Condition; className?: string }) {
  return (
    <span className={`badge ${CLASS[condition]} ${className}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {CONDITION_LABEL[condition]}
    </span>
  )
}
