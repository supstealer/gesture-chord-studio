import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface SectionCardProps {
  index: string
  title: string
  hint?: string
  children: ReactNode
  className?: string
}

export function SectionCard({
  index,
  title,
  hint,
  children,
  className,
}: SectionCardProps) {
  return (
    <section className={cn('app-card shrink-0 p-4 sm:p-5', className)}>
      <header className="mb-4 flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-50 font-mono text-[10px] font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            {index}
          </span>
          <h2 className="truncate font-display text-[13px] font-semibold tracking-tight text-ink sm:text-sm">
            {title}
          </h2>
        </div>
        {hint && (
          <span className="shrink-0 text-[10px] font-medium text-ink-3">
            {hint}
          </span>
        )}
      </header>
      {children}
    </section>
  )
}
