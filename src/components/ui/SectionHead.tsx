import type { ReactNode } from 'react'
import Reveal from './Reveal'

interface Props {
  eyebrow?: string
  title: ReactNode
  blurb?: ReactNode
  align?: 'left' | 'center'
  aside?: ReactNode
  id?: string
}

export default function SectionHead({ eyebrow, title, blurb, align = 'left', aside, id }: Props) {
  const centered = align === 'center'
  return (
    <Reveal
      className={`mb-10 flex flex-col gap-6 sm:mb-14 ${
        centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'
      }`}
    >
      <div className={`max-w-2xl ${centered ? 'mx-auto' : ''}`}>
        {eyebrow && (
          <p className="eyebrow mb-3 flex items-center gap-2.5">
            {!centered && <span aria-hidden className="h-px w-7 bg-gradient-to-r from-gold-500 to-transparent" />}
            {eyebrow}
          </p>
        )}
        <h2 id={id} className="title-xl text-metal">
          {title}
        </h2>
        {blurb && <p className="body-lg mt-4">{blurb}</p>}
      </div>
      {aside && <div className={centered ? '' : 'shrink-0'}>{aside}</div>}
    </Reveal>
  )
}
