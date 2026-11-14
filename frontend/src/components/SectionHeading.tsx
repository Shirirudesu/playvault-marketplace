import { Link } from 'react-router'
import { ArrowRightIcon } from './Icons'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  href?: string
  actionLabel?: string
}

export function SectionHeading({ eyebrow, title, description, href, actionLabel = 'View all' }: SectionHeadingProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#63E3C2]">{eyebrow}</p>}
        <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-white">{title}</h2>
        {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
      </div>
      {href && <Link to={href} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-white">{actionLabel} <ArrowRightIcon /></Link>}
    </div>
  )
}
