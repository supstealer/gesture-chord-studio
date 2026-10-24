import { Square } from 'lucide-react'
import type { ChordFlavor, ChordInfo } from '../types'
import { cn } from '../utils/cn'

interface ChordDeckProps {
  chords: ChordInfo[]
  activeDegree: number | null
  keyLabel: string
  audioReady: boolean
  onSelect: (degree: number) => void
  onMute: () => void
}

const FLAVOR_TEXT: Record<ChordFlavor, string> = {
  major: 'text-brand-600/80 dark:text-brand-300/80',
  minor: 'text-sky-600/80 dark:text-sky-300/80',
  diminished: 'text-amber-600/80 dark:text-amber-300/80',
  augmented: 'text-rose-600/80 dark:text-rose-300/80',
}

export function ChordDeck({
  chords,
  activeDegree,
  keyLabel,
  audioReady,
  onSelect,
  onMute,
}: ChordDeckProps) {
  return (
    <section className="app-card shrink-0 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-brand-500" />
          <span className="shrink-0 text-[11px] font-semibold text-ink">
            Diatonic deck
          </span>
          <span className="truncate rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            {keyLabel}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[10px] text-ink-3 md:inline">
            {audioReady
              ? 'Click a card or press 1–7'
              : 'Click a card to start audio'}
          </span>
          <button
            type="button"
            onClick={onMute}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-[10px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Square className="size-2.5" />
            Mute
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {chords.map((chord) => {
          const active = activeDegree === chord.degree
          return (
            <button
              key={chord.degree}
              type="button"
              onClick={() => onSelect(chord.degree)}
              aria-pressed={active}
              className={cn(
                'group relative flex min-h-[108px] flex-col overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all duration-200',
                active
                  ? '-translate-y-0.5 border-brand-300 bg-brand-50 shadow-[0_12px_32px_-20px_rgba(77,107,254,0.55)] dark:border-brand-500/40 dark:bg-brand-500/10 dark:shadow-none'
                  : 'border-line bg-surface hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-2',
              )}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    'font-mono text-[10px] font-medium',
                    active
                      ? 'text-brand-600 dark:text-brand-300'
                      : 'text-ink-3',
                  )}
                >
                  {chord.roman}
                </span>
                <span
                  className={cn(
                    'grid size-4 place-items-center rounded-full border font-mono text-[8px]',
                    active
                      ? 'border-brand-200 bg-white/70 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300'
                      : 'border-line text-ink-3',
                  )}
                >
                  {chord.degree}
                </span>
              </div>

              <div className="mt-auto">
                <div
                  className={cn(
                    'font-display text-xl font-semibold tracking-tight sm:text-2xl',
                    active
                      ? 'text-brand-700 dark:text-brand-200'
                      : 'text-ink',
                  )}
                >
                  {chord.chordName}
                </div>
                <div
                  className={cn(
                    'mt-0.5 text-[9px] font-medium uppercase tracking-wide',
                    active
                      ? 'text-brand-600/70 dark:text-brand-300/70'
                      : FLAVOR_TEXT[chord.flavor],
                  )}
                >
                  {chord.quality}
                </div>
              </div>

              <div className="mt-2 flex h-4 items-end gap-[3px]">
                {active ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={index}
                      className="eq-bar w-1 rounded-full bg-gradient-to-t from-brand-500 to-sky-400 dark:from-brand-400 dark:to-sky-300"
                      style={{
                        height: `${[8, 14, 11, 16, 9][index]}px`,
                        animationDelay: `${index * 85}ms`,
                      }}
                    />
                  ))
                ) : (
                  <span className="truncate font-mono text-[9px] text-ink-3">
                    {chord.notes.join(' · ')}
                  </span>
                )}
              </div>

              {active && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
