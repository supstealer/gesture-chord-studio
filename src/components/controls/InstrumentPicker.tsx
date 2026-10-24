import {
  AlertCircle,
  Check,
  Guitar,
  Loader2,
  Piano,
  Sparkles,
} from 'lucide-react'
import type { InstrumentKind, SamplerStatusEvent } from '../../types'
import { cn } from '../../utils/cn'

interface InstrumentPickerProps {
  instrument: InstrumentKind
  onChange: (instrument: InstrumentKind) => void
  status: SamplerStatusEvent
}

const INSTRUMENTS: Array<{
  value: InstrumentKind
  name: string
  description: string
}> = [
  { value: 'piano', name: 'Piano', description: 'Concert grand' },
  { value: 'guitar', name: 'Guitar', description: 'Acoustic steel' },
]

function StatusLine({
  instrument,
  status,
}: {
  instrument: InstrumentKind
  status: SamplerStatusEvent
}) {
  const current = status.instrument === instrument

  if (current && status.state === 'loading') {
    return (
      <>
        <Loader2 className="size-3 animate-spin text-brand-500 dark:text-brand-300" />
        <span>Loading samples…</span>
      </>
    )
  }

  if (current && status.state === 'sample') {
    return (
      <>
        <Check className="size-3 text-emerald-500" />
        <span>Studio samples ready</span>
      </>
    )
  }

  if (current && status.state === 'fallback') {
    return (
      <>
        <AlertCircle className="size-3 text-amber-500" />
        <span className="text-amber-600 dark:text-amber-400">
          Synth fallback active
        </span>
      </>
    )
  }

  return (
    <>
      <Sparkles className="size-3 text-ink-3" />
      <span>Samples load on start</span>
    </>
  )
}

export function InstrumentPicker({
  instrument,
  onChange,
  status,
}: InstrumentPickerProps) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {INSTRUMENTS.map((entry) => {
          const active = entry.value === instrument
          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => onChange(entry.value)}
              aria-pressed={active}
              className={cn(
                'group relative overflow-hidden rounded-xl border p-3 text-left transition-all duration-200',
                active
                  ? 'border-brand-200 bg-brand-50/80 dark:border-brand-500/30 dark:bg-brand-500/10'
                  : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-lg transition-colors',
                    active
                      ? 'bg-white text-brand-600 shadow-sm dark:bg-brand-500/15 dark:text-brand-300'
                      : 'bg-surface-2 text-ink-3 group-hover:text-ink',
                  )}
                >
                  {entry.value === 'piano' ? (
                    <Piano className="size-4" />
                  ) : (
                    <Guitar className="size-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <div
                    className={cn(
                      'truncate text-[13px] font-semibold',
                      active
                        ? 'text-brand-700 dark:text-brand-200'
                        : 'text-ink',
                    )}
                  >
                    {entry.name}
                  </div>
                  <div
                    className={cn(
                      'truncate text-[10px]',
                      active
                        ? 'text-brand-600/70 dark:text-brand-300/70'
                        : 'text-ink-3',
                    )}
                  >
                    {entry.description}
                  </div>
                </div>
              </div>
              {active && (
                <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-brand-500 dark:bg-brand-300" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-ink-3">
        <StatusLine instrument={instrument} status={status} />
      </div>
    </div>
  )
}
