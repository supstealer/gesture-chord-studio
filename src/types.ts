export type RootNote =
  | 'C'
  | 'C#'
  | 'D'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'Ab'
  | 'A'
  | 'Bb'
  | 'B'

export type ScaleMode = 'major' | 'minor'

export type InstrumentKind = 'piano' | 'guitar'

export type RhythmPattern = 'once' | 'block' | 'arpeggio' | 'strum'

export type TimeSignature = '4/4' | '3/4' | '6/8'

export type GestureId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export type ChordFlavor = 'major' | 'minor' | 'diminished' | 'augmented'

export type VisionStatus = 'idle' | 'requesting' | 'loading' | 'ready' | 'error'

export type SamplerState = 'idle' | 'loading' | 'sample' | 'fallback'

export interface ChordInfo {
  /** Scale degree, 1-indexed. */
  degree: number
  /** Roman numeral, e.g. "IV", "vii°". */
  roman: string
  /** Chord symbol as returned by the key, e.g. "Dm", "Bdim". */
  chordName: string
  /** Root note name, e.g. "D". */
  root: string
  /** Tonal quality name, e.g. "Major", "Minor", "Diminished". */
  quality: string
  flavor: ChordFlavor
  /** Human readable name, e.g. "D Minor". */
  displayName: string
  /** Chord tones without octave, e.g. ["D", "F", "A"]. */
  notes: string[]
  /** Four-note voicing with octaves, e.g. ["D3", "F3", "A3", "D4"]. */
  voicing: string[]
}

export interface BeatEvent {
  /** Zero-based pulse index inside the bar. */
  pulse: number
  /** Number of pulses in the current meter. */
  pulses: number
  /** Whether this pulse is a strong beat. */
  accent: boolean
  /** Monotonically increasing id, useful for restarting CSS animations. */
  tick: number
}

export interface SamplerStatusEvent {
  instrument: InstrumentKind
  state: SamplerState
}
