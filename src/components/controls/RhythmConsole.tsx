import {
  Activity,
  Bell,
  Repeat,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { BeatEvent, RhythmPattern, TimeSignature } from '../../types'
import { cn } from '../../utils/cn'
import { Slider } from '../ui/Slider'
import { BeatLights } from './BeatLights'

interface RhythmConsoleProps {
  bpm: number
  onBpmChange: (bpm: number) => void
  timeSignature: TimeSignature
  onTimeSignatureChange: (timeSignature: TimeSignature) => void
  pattern: RhythmPattern
  onPatternChange: (pattern: RhythmPattern) => void
  metronome: boolean
  onMetronomeChange: (enabled: boolean) => void
  beat: BeatEvent | null
  audioReady: boolean
}

const TIME_SIGNATURES: TimeSignature[] = ['4/4', '3/4', '6/8']

const PATTERNS: Array<{
  value: RhythmPattern
  label: string
  description: string
  icon: LucideIcon
}> = [
  {
    value: 'once',
    label: 'Trigger once',
    description: 'Strike once on gesture change',
    icon: Zap,
  },
  {
    value: 'block',
    label: 'Block loop',
    description: 'Full chord on every beat',
    icon: Repeat,
  },
  {
    value: 'arpeggio',
    label: 'Arpeggio',
    description: 'Root · 3rd · 5th · octave at 8n',
    icon: Activity,
  },
  {
    value: 'strum',
    label: 'Strum / groove',
    description: 'D–D U–U D with micro strum',
    icon: Waves,
  },
]

function tempoLabel(bpm: number): string {
  if (bpm < 76) return 'Adagio'
  if (bpm < 108) return 'Moderato'
  if (bpm < 140) return 'Allegro'
  return 'Presto'
}

export function RhythmConsole({
  bpm,
  onBpmChange,
  timeSignature,
  onTimeSignatureChange,
  pattern,
  onPatternChange,
  metronome,
  onMetronomeChange,
  beat,
  audioReady,
}: RhythmConsoleProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] font-medium text-ink-2">Tempo</div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-semibold tabular-nums tracking-tight text-ink">
                {bpm}
              </span>
              <span className="text-[10px] font-medium text-ink-3">BPM</span>
            </div>
          </div>
          <span className="mb-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            {tempoLabel(bpm)}
          </span>
        </div>
        <Slider
          className="mt-3"
          value={bpm}
          min={60}
          max={180}
          onChange={onBpmChange}
          ariaLabel="Tempo in beats per minute"
        />
        <div className="mt-1.5 flex justify-between text-[10px] text-ink-3">
          <span>60</span>
          <span>180</span>
        </div>
      </div>

      <div className="h-px bg-line" />

      <div>
        <div className="mb-2 text-[11px] font-medium text-ink-2">
          Time signature
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface-2 p-1">
          {TIME_SIGNATURES.map((signature) => {
            const active = signature === timeSignature
            return (
              <button
                key={signature}
                type="button"
                onClick={() => onTimeSignatureChange(signature)}
                aria-pressed={active}
                className={cn(
                  'rounded-lg py-1.5 text-[11px] font-medium transition-all duration-200',
                  active
                    ? 'bg-surface text-ink shadow-sm dark:bg-white/10'
                    : 'text-ink-2 hover:text-ink',
                )}
              >
                {signature}
              </button>
            )
          })}
        </div>
        <div className="mt-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
          <BeatLights
            timeSignature={timeSignature}
            beat={beat}
            audioReady={audioReady}
          />
        </div>
      </div>

      <div className="h-px bg-line" />

      <div>
        <div className="mb-2 text-[11px] font-medium text-ink-2">
          Rhythm pattern
        </div>
        <div className="space-y-1.5">
          {PATTERNS.map((entry) => {
            const Icon = entry.icon
            const active = entry.value === pattern
            return (
              <button
                key={entry.value}
                type="button"
                onClick={() => onPatternChange(entry.value)}
                aria-pressed={active}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-200',
                  active
                    ? 'border-brand-200 bg-brand-50/70 dark:border-brand-500/30 dark:bg-brand-500/10'
                    : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
                )}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-lg border transition-colors',
                    active
                      ? 'border-brand-100 bg-white text-brand-600 dark:border-brand-500/20 dark:bg-brand-500/15 dark:text-brand-300'
                      : 'border-line bg-surface-2 text-ink-3 group-hover:text-ink',
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-ink">
                    {entry.label}
                  </span>
                  <span className="block truncate text-[10px] text-ink-3">
                    {entry.description}
                  </span>
                </span>
                <span
                  className={cn(
                    'size-2 shrink-0 rounded-full transition-all',
                    active
                      ? 'bg-brand-500 shadow-[0_0_0_3px_rgba(77,107,254,0.14)] dark:bg-brand-300'
                      : 'bg-line-strong',
                  )}
                />
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-line" />

      <button
        type="button"
        role="switch"
        aria-checked={metronome}
        onClick={() => onMetronomeChange(!metronome)}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-3"
      >
        <span className="flex items-center gap-2 text-[12px] font-medium text-ink">
          <Bell className="size-3.5 text-ink-3" />
          Metronome click
        </span>
        <span
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors duration-200',
            metronome ? 'bg-brand-500' : 'bg-line-strong',
          )}
        >
          <span
            className={cn(
              'absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200',
              metronome && 'translate-x-4',
            )}
          />
        </span>
      </button>
    </div>
  )
}
