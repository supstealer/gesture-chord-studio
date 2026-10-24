import type {
  BeatEvent,
  InstrumentKind,
  RhythmPattern,
  RootNote,
  SamplerStatusEvent,
  ScaleMode,
  TimeSignature,
} from '../types'
import { formatKeyLabel } from '../utils/musicTheory'
import { InstrumentPicker } from './controls/InstrumentPicker'
import { KeySelector } from './controls/KeySelector'
import { RhythmConsole } from './controls/RhythmConsole'
import { SectionCard } from './ui/SectionCard'

interface ControlPanelProps {
  instrument: InstrumentKind
  onInstrumentChange: (instrument: InstrumentKind) => void
  samplerStatus: SamplerStatusEvent
  root: RootNote
  scaleMode: ScaleMode
  onRootChange: (root: RootNote) => void
  onScaleModeChange: (mode: ScaleMode) => void
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

export function ControlPanel({
  instrument,
  onInstrumentChange,
  samplerStatus,
  root,
  scaleMode,
  onRootChange,
  onScaleModeChange,
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
}: ControlPanelProps) {
  return (
    <aside className="panel-scroll flex min-h-0 min-w-0 flex-col gap-4 xl:overflow-y-auto xl:pr-2">
      <SectionCard index="01" title="Instrument">
        <InstrumentPicker
          instrument={instrument}
          onChange={onInstrumentChange}
          status={samplerStatus}
        />
      </SectionCard>

      <SectionCard
        index="02"
        title="Key & Scale"
        hint={formatKeyLabel(root, scaleMode)}
      >
        <KeySelector
          root={root}
          mode={scaleMode}
          onRootChange={onRootChange}
          onModeChange={onScaleModeChange}
        />
      </SectionCard>

      <SectionCard
        index="03"
        title="Rhythm Console"
        hint={`${bpm} BPM · ${timeSignature}`}
      >
        <RhythmConsole
          bpm={bpm}
          onBpmChange={onBpmChange}
          timeSignature={timeSignature}
          onTimeSignatureChange={onTimeSignatureChange}
          pattern={pattern}
          onPatternChange={onPatternChange}
          metronome={metronome}
          onMetronomeChange={onMetronomeChange}
          beat={beat}
          audioReady={audioReady}
        />
      </SectionCard>
    </aside>
  )
}
