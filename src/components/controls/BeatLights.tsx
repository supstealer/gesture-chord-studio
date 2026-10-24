import type { BeatEvent, TimeSignature } from '../../types'
import { cn } from '../../utils/cn'

interface BeatLightsProps {
  timeSignature: TimeSignature
  beat: BeatEvent | null
  audioReady: boolean
}

const PULSES: Record<TimeSignature, number> = {
  '4/4': 4,
  '3/4': 3,
  '6/8': 6,
}

const STRONG_PULSES: Record<TimeSignature, number[]> = {
  '4/4': [0],
  '3/4': [0],
  '6/8': [0, 3],
}

export function BeatLights({
  timeSignature,
  beat,
  audioReady,
}: BeatLightsProps) {
  const count = beat?.pulses ?? PULSES[timeSignature]
  const strongPulses = STRONG_PULSES[timeSignature]

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-medium text-ink-3">Pulse</span>
      <div className="flex flex-1 items-center justify-between gap-2">
        {Array.from({ length: count }).map((_, index) => {
          const active = audioReady && beat?.pulse === index
          const accent = active ? beat?.accent : strongPulses.includes(index)
          return (
            <span
              key={`${index}-${active ? beat?.tick : 'idle'}`}
              className={cn(
                'block size-2.5 rounded-full transition-all duration-150',
                active
                  ? accent
                    ? 'beat-hit scale-110 bg-brand-600 shadow-[0_0_0_4px_rgba(77,107,254,0.14)] dark:bg-brand-300 dark:shadow-[0_0_0_4px_rgba(126,155,255,0.12)]'
                    : 'beat-hit bg-brand-400 dark:bg-brand-400/80'
                  : accent
                    ? 'bg-brand-200 dark:bg-brand-500/30'
                    : 'bg-line-strong',
              )}
            />
          )
        })}
      </div>
      <span className="text-[10px] text-ink-3">{timeSignature}</span>
    </div>
  )
}
