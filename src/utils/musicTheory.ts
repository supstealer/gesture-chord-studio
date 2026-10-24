import { Chord, Interval, Key, Note } from 'tonal'
import type {
  ChordFlavor,
  ChordInfo,
  RootNote,
  ScaleMode,
} from '../types'

export const ROOT_NOTES: RootNote[] = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
]

export const SCALE_MODES: Array<{
  value: ScaleMode
  label: string
  short: string
}> = [
  { value: 'major', label: 'Major', short: 'MAJ' },
  { value: 'minor', label: 'Natural Minor', short: 'MIN' },
]

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const

/** C3. All chords are voiced in close position in the C3–B4 range. */
const BASE_ROOT_MIDI = 48

function flavorOf(quality: string): ChordFlavor {
  const normalized = quality.toLowerCase()
  if (normalized.includes('dim')) return 'diminished'
  if (normalized.includes('aug')) return 'augmented'
  if (normalized.includes('minor')) return 'minor'
  return 'major'
}

function romanFor(degree: number, flavor: ChordFlavor): string {
  const base = ROMAN[degree - 1] ?? `${degree}`
  if (flavor === 'minor' || flavor === 'diminished') {
    return `${base.toLowerCase()}${flavor === 'diminished' ? '°' : ''}`
  }
  if (flavor === 'augmented') return `${base}+`
  return base
}

function buildVoicing(
  tonic: string | null,
  intervals: readonly string[],
): string[] {
  if (!tonic) return []
  const chroma = Note.chroma(tonic)
  if (chroma === undefined) return []

  const rootMidi = BASE_ROOT_MIDI + chroma
  const semitones = intervals.map((interval) => {
    const value = Interval.semitones(interval)
    return typeof value === 'number' ? value : 0
  })

  const midis = semitones.map((semitonesFromRoot) => rootMidi + semitonesFromRoot)
  // Add the root an octave above for a fuller four-note voicing and a natural
  // top note for the arpeggio pattern.
  midis.push(rootMidi + 12)

  return midis.map((midi) => Note.fromMidi(midi))
}

/**
 * Compute the seven diatonic triads of a key, plus voicings and roman numerals.
 * Tonal gives us correctly spelled chord symbols for both major and natural
 * minor keys; the octave assignment is handled here.
 */
export function getDiatonicChords(
  root: RootNote,
  mode: ScaleMode,
): ChordInfo[] {
  const key =
    mode === 'major'
      ? Key.majorKey(root)
      : Key.minorKey(root).natural

  return key.triads.map((chordName, index) => {
    const chord = Chord.get(chordName)
    const flavor = flavorOf(chord.quality)
    const chordRoot = chord.tonic ?? chordName

    return {
      degree: index + 1,
      roman: romanFor(index + 1, flavor),
      chordName,
      root: chordRoot,
      quality: chord.quality,
      flavor,
      displayName: `${chordRoot} ${chord.quality}`,
      notes: [...chord.notes],
      voicing: buildVoicing(chord.tonic, chord.intervals),
    }
  })
}

export interface KeyMeta {
  keySignature: string
  signatureLabel: string
  relative: string
}

function signatureLabel(alteration: number): string {
  if (alteration === 0) return 'No accidentals'
  const count = Math.abs(alteration)
  return `${count} ${alteration > 0 ? 'sharp' : 'flat'}${count === 1 ? '' : 's'}`
}

export function getKeyMeta(root: RootNote, mode: ScaleMode): KeyMeta {
  if (mode === 'major') {
    const key = Key.majorKey(root)
    return {
      keySignature: key.keySignature,
      signatureLabel: signatureLabel(key.alteration),
      relative: `${key.minorRelative} minor`,
    }
  }

  const key = Key.minorKey(root)
  return {
    keySignature: key.keySignature,
    signatureLabel: signatureLabel(key.alteration),
    relative: `${key.relativeMajor} major`,
  }
}

export function formatKeyLabel(root: RootNote, mode: ScaleMode): string {
  return `${root} ${mode === 'major' ? 'Major' : 'Minor'}`
}
