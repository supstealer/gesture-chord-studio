import type { RootNote, ScaleMode } from '../../types'
import { cn } from '../../utils/cn'
import {
  getKeyMeta,
  ROOT_NOTES,
  SCALE_MODES,
} from '../../utils/musicTheory'

interface KeySelectorProps {
  root: RootNote
  mode: ScaleMode
  onRootChange: (root: RootNote) => void
  onModeChange: (mode: ScaleMode) => void
}

export function KeySelector({
  root,
  mode,
  onRootChange,
  onModeChange,
}: KeySelectorProps) {
  const meta = getKeyMeta(root, mode)

  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5">
        {ROOT_NOTES.map((note) => {
          const active = note === root
          return (
            <button
              key={note}
              type="button"
              onClick={() => onRootChange(note)}
              aria-pressed={active}
              className={cn(
                'h-9 rounded-lg border text-[12px] font-medium transition-all duration-200',
                active
                  ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300'
                  : 'border-transparent bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink',
              )}
            >
              {note}
            </button>
          )
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1">
        {SCALE_MODES.map((entry) => {
          const active = entry.value === mode
          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => onModeChange(entry.value)}
              aria-pressed={active}
              className={cn(
                'rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all duration-200',
                active
                  ? 'bg-surface text-ink shadow-sm dark:bg-white/10'
                  : 'text-ink-2 hover:text-ink',
              )}
            >
              {entry.label}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-1.5 text-[10px] text-ink-3">
        <span>{meta.signatureLabel}</span>
        <span>
          Relative{' '}
          <span className="font-medium text-ink-2">{meta.relative}</span>
        </span>
      </div>

      <div className="mt-2.5 px-0.5 text-[10px] text-ink-3">
        Diatonic set · 7 chords
      </div>
    </div>
  )
}
