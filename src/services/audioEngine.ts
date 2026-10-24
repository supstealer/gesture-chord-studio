import * as Tone from 'tone'
import type {
  BeatEvent,
  InstrumentKind,
  RhythmPattern,
  SamplerState,
  SamplerStatusEvent,
  TimeSignature,
} from '../types'

type Voice =
  | Tone.Sampler
  | Tone.PolySynth<Tone.Synth>
  | Tone.PolySynth<Tone.FMSynth>

interface StrumHit {
  step: number
  direction: 'down' | 'up'
  velocity: number
}

interface MeterSpec {
  stepsPerBar: number
  pulseSteps: number[]
  accentSteps: number[]
  clickSteps: number[]
  blockSteps: number[]
  strums: StrumHit[]
}

const METERS: Record<TimeSignature, MeterSpec> = {
  '4/4': {
    stepsPerBar: 8,
    pulseSteps: [0, 2, 4, 6],
    accentSteps: [0],
    clickSteps: [0, 2, 4, 6],
    blockSteps: [0, 2, 4, 6],
    strums: [
      { step: 0, direction: 'down', velocity: 1 },
      { step: 2, direction: 'down', velocity: 0.72 },
      { step: 3, direction: 'up', velocity: 0.6 },
      { step: 5, direction: 'up', velocity: 0.55 },
      { step: 6, direction: 'down', velocity: 0.82 },
    ],
  },
  '3/4': {
    stepsPerBar: 6,
    pulseSteps: [0, 2, 4],
    accentSteps: [0],
    clickSteps: [0, 2, 4],
    blockSteps: [0, 2, 4],
    strums: [
      { step: 0, direction: 'down', velocity: 1 },
      { step: 2, direction: 'up', velocity: 0.62 },
      { step: 4, direction: 'down', velocity: 0.8 },
    ],
  },
  '6/8': {
    stepsPerBar: 6,
    pulseSteps: [0, 1, 2, 3, 4, 5],
    accentSteps: [0, 3],
    clickSteps: [0, 3],
    blockSteps: [0, 3],
    strums: [
      { step: 0, direction: 'down', velocity: 1 },
      { step: 2, direction: 'up', velocity: 0.62 },
      { step: 3, direction: 'down', velocity: 0.84 },
      { step: 5, direction: 'up', velocity: 0.6 },
    ],
  },
}

interface SamplerConfig {
  baseUrl: string
  urls: Record<string, string>
  release: number
  volume: number
}

/**
 * Real sample banks hosted on GitHub Pages:
 * - Piano: Tone.js Salamander grand piano
 * - Guitar: nbrosowsky/tonejs-instruments acoustic guitar
 * Tone.Sampler pitch-shifts between the supplied anchor notes.
 */
const SAMPLER_CONFIG: Record<InstrumentKind, SamplerConfig> = {
  piano: {
    baseUrl: 'https://tonejs.github.io/audio/salamander/',
    urls: {
      A1: 'A1.mp3',
      C2: 'C2.mp3',
      'D#2': 'Ds2.mp3',
      'F#2': 'Fs2.mp3',
      A2: 'A2.mp3',
      C3: 'C3.mp3',
      'D#3': 'Ds3.mp3',
      'F#3': 'Fs3.mp3',
      A3: 'A3.mp3',
      C4: 'C4.mp3',
      'D#4': 'Ds4.mp3',
      'F#4': 'Fs4.mp3',
      A4: 'A4.mp3',
      C5: 'C5.mp3',
      'D#5': 'Ds5.mp3',
      'F#5': 'Fs5.mp3',
      A5: 'A5.mp3',
      C6: 'C6.mp3',
    },
    release: 1.1,
    volume: -4,
  },
  guitar: {
    baseUrl:
      'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/',
    urls: {
      A2: 'A2.mp3',
      C3: 'C3.mp3',
      'D#3': 'Ds3.mp3',
      'F#3': 'Fs3.mp3',
      A3: 'A3.mp3',
      C4: 'C4.mp3',
      'D#4': 'Ds4.mp3',
      'F#4': 'Fs4.mp3',
      A4: 'A4.mp3',
    },
    release: 0.8,
    volume: -6,
  },
}

const SAMPLE_LOAD_TIMEOUT_MS = 12_000

interface InstrumentSlot {
  node: Voice
  fallback: Voice
  kind: 'fallback' | 'sample'
  loading: boolean
  failed: boolean
}

export interface AudioEngineCallbacks {
  onBeat?: (event: BeatEvent) => void
  onSamplerStatus?: (event: SamplerStatusEvent) => void
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index])

/**
 * Owns the complete audio graph: instruments, master chain, Transport loop,
 * metronome and rhythm-pattern scheduling. One instance lives for the lifetime
 * of the app and is disposed on unmount.
 */
export class AudioEngine {
  private readonly callbacks: AudioEngineCallbacks

  private started = false
  private disposed = false

  private instrumentBus: Tone.Gain | null = null
  private masterGain: Tone.Gain | null = null
  private reverb: Tone.Freeverb | null = null
  private limiter: Tone.Limiter | null = null
  private metronomeGain: Tone.Gain | null = null
  private clickSynth: Tone.Synth | null = null

  private readonly slots = new Map<InstrumentKind, InstrumentSlot>()
  private activeVoice: Voice | null = null

  private instrument: InstrumentKind = 'piano'
  private volume = 70
  private bpm = 100
  private timeSignature: TimeSignature = '4/4'
  private pattern: RhythmPattern = 'block'
  private metronomeEnabled = false

  private chordVoicing: string[] | null = null
  private arpeggioIndex = 0
  private stepCounter = 0
  private pulseTick = 0
  private loopId: number | null = null
  private readonly timers = new Set<number>()

  constructor(callbacks: AudioEngineCallbacks = {}) {
    this.callbacks = callbacks
  }

  async start(): Promise<void> {
    if (this.started || this.disposed) return

    // Must be invoked from a user gesture (the Start Audio button).
    await Tone.start()
    if (this.disposed) return

    this.instrumentBus = new Tone.Gain(0.9)
    this.metronomeGain = new Tone.Gain(0.5)
    this.reverb = new Tone.Freeverb({
      roomSize: 0.72,
      dampening: 3600,
      wet: 0.16,
    })
    this.masterGain = new Tone.Gain(this.volumeToGain(this.volume))
    this.limiter = new Tone.Limiter(-1)

    this.instrumentBus.connect(this.reverb)
    this.reverb.connect(this.masterGain)
    this.metronomeGain.connect(this.masterGain)
    this.masterGain.connect(this.limiter)
    this.limiter.connect(Tone.getDestination())

    this.clickSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.028, sustain: 0, release: 0.03 },
      volume: -16,
    }).connect(this.metronomeGain)

    this.started = true

    const transport = Tone.getTransport()
    transport.bpm.value = this.bpm
    transport.timeSignature = this.numerator(this.timeSignature)
    this.loopId = transport.scheduleRepeat(this.handleTick, '8n', 0)
    transport.start()
  }

  setInstrument(kind: InstrumentKind): void {
    const isSwitch = this.instrument !== kind
    this.instrument = kind
    if (!this.started || this.disposed) return

    const existing = this.slots.get(kind)
    if (existing) {
      if (this.activeVoice && this.activeVoice !== existing.node) {
        this.releaseVoice(this.activeVoice)
      }
      this.activeVoice = existing.node
      this.emitStatus(
        kind,
        existing.kind === 'sample'
          ? 'sample'
          : existing.loading
            ? 'loading'
            : 'fallback',
      )
      if (isSwitch && this.pattern === 'once' && this.chordVoicing) {
        this.playChord(Tone.now() + 0.03, '2n', 0.8)
      }
      return
    }

    const fallback = this.createFallback(kind)
    const slot: InstrumentSlot = {
      node: fallback,
      fallback,
      kind: 'fallback',
      loading: true,
      failed: false,
    }

    this.slots.set(kind, slot)
    if (this.activeVoice && this.activeVoice !== fallback) {
      this.releaseVoice(this.activeVoice)
    }
    this.activeVoice = fallback
    this.emitStatus(kind, 'loading')

    if (isSwitch && this.pattern === 'once' && this.chordVoicing) {
      this.playChord(Tone.now() + 0.03, '2n', 0.8)
    }

    void this.loadSampler(kind, slot)
  }

  setVolume(percent: number): void {
    this.volume = clamp(percent, 0, 100)
    this.masterGain?.gain.rampTo(this.volumeToGain(this.volume), 0.08)
  }

  setBpm(bpm: number): void {
    this.bpm = clamp(Math.round(bpm), 60, 180)
    if (this.started) {
      Tone.getTransport().bpm.rampTo(this.bpm, 0.08)
    }
  }

  setTimeSignature(signature: TimeSignature): void {
    if (signature === this.timeSignature) return
    this.timeSignature = signature
    this.stepCounter = 0
    this.arpeggioIndex = 0
    if (this.started) {
      Tone.getTransport().timeSignature = this.numerator(signature)
    }
  }

  setPattern(pattern: RhythmPattern): void {
    if (pattern === this.pattern) return
    this.pattern = pattern
    this.arpeggioIndex = 0

    // Switching into "once" while a chord is held should audibly confirm it.
    if (pattern === 'once' && this.chordVoicing && this.activeVoice) {
      this.playChord(Tone.now() + 0.03, '2n', 0.86)
    }
  }

  setMetronome(enabled: boolean): void {
    this.metronomeEnabled = enabled
  }

  setChord(voicing: string[] | null): void {
    if (!voicing || voicing.length === 0) {
      this.chordVoicing = null
      this.arpeggioIndex = 0
      this.releaseAllInstruments()
      return
    }

    if (this.chordVoicing && arraysEqual(this.chordVoicing, voicing)) return

    this.chordVoicing = [...voicing]
    this.arpeggioIndex = 0

    if (this.pattern === 'once') {
      this.playChord(Tone.now() + 0.03, '2n', 0.88)
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    const transport = Tone.getTransport()
    if (this.loopId !== null) {
      try {
        transport.clear(this.loopId)
      } catch {
        /* ignore */
      }
      this.loopId = null
    }
    try {
      transport.stop()
    } catch {
      /* ignore */
    }
    try {
      Tone.getDraw().cancel(0)
    } catch {
      /* ignore */
    }

    this.releaseAllInstruments()
    this.activeVoice = null

    this.timers.forEach((timer) => window.clearTimeout(timer))
    this.timers.clear()

    this.slots.forEach((slot) => {
      try {
        slot.node.dispose()
      } catch {
        /* ignore */
      }
      if (slot.fallback !== slot.node) {
        try {
          slot.fallback.dispose()
        } catch {
          /* ignore */
        }
      }
    })
    this.slots.clear()

    const nodes = [
      this.clickSynth,
      this.metronomeGain,
      this.reverb,
      this.instrumentBus,
      this.masterGain,
      this.limiter,
    ]
    nodes.forEach((node) => {
      try {
        node?.dispose()
      } catch {
        /* ignore */
      }
    })

    this.clickSynth = null
    this.metronomeGain = null
    this.reverb = null
    this.instrumentBus = null
    this.masterGain = null
    this.limiter = null
    this.started = false
  }

  private handleTick = (time: number): void => {
    if (this.disposed) return

    const meter = METERS[this.timeSignature]
    const step = this.stepCounter % meter.stepsPerBar
    const pulseIndex = meter.pulseSteps.indexOf(step)
    const accent = meter.accentSteps.includes(step)

    if (pulseIndex >= 0) {
      const tick = this.pulseTick
      this.pulseTick += 1

      Tone.getDraw().schedule(() => {
        if (this.disposed) return
        this.callbacks.onBeat?.({
          pulse: pulseIndex,
          pulses: meter.pulseSteps.length,
          accent,
          tick,
        })
      }, time)

      if (this.metronomeEnabled && meter.clickSteps.includes(step)) {
        this.clickSynth?.triggerAttackRelease(
          accent ? 'C6' : 'G5',
          0.04,
          time,
          accent ? 0.9 : 0.55,
        )
      }
    }

    if (this.chordVoicing) {
      switch (this.pattern) {
        case 'block':
          if (meter.blockSteps.includes(step)) {
            this.playChord(time, '4n', accent ? 0.9 : 0.7)
          }
          break
        case 'arpeggio':
          this.playArpeggioStep(time)
          break
        case 'strum': {
          const hit = meter.strums.find((entry) => entry.step === step)
          if (hit) this.playStrum(time, hit)
          break
        }
      }
    }

    this.stepCounter += 1
  }

  private playChord(
    time: number,
    duration: string | number,
    velocity: number,
  ): void {
    if (!this.chordVoicing || !this.activeVoice) return
    this.activeVoice.triggerAttackRelease(
      this.chordVoicing,
      duration,
      time,
      velocity,
    )
  }

  private playArpeggioStep(time: number): void {
    if (!this.chordVoicing || !this.activeVoice) return

    const note = this.chordVoicing[this.arpeggioIndex % this.chordVoicing.length]
    const position = this.arpeggioIndex % 4
    const velocity = position === 0 ? 0.88 : position === 2 ? 0.76 : 0.64

    this.arpeggioIndex += 1
    this.activeVoice.triggerAttackRelease(note, '8n', time, velocity)
  }

  private playStrum(time: number, hit: StrumHit): void {
    if (!this.chordVoicing || !this.activeVoice) return

    const ordered =
      hit.direction === 'down'
        ? this.chordVoicing
        : [...this.chordVoicing].reverse()
    const gap = this.instrument === 'guitar' ? 0.022 : 0.012
    const duration = this.instrument === 'guitar' ? '8n' : '4n'

    ordered.forEach((note, index) => {
      const velocity = clamp(hit.velocity * (1 - index * 0.07), 0.15, 1)
      this.activeVoice?.triggerAttackRelease(
        note,
        duration,
        time + index * gap,
        velocity,
      )
    })
  }

  private createFallback(kind: InstrumentKind): Voice {
    if (kind === 'piano') {
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'custom',
          partials: [1, 0.52, 0.26, 0.1],
        },
        envelope: {
          attack: 0.004,
          decay: 0.35,
          sustain: 0.12,
          release: 1.1,
        },
        volume: -10,
      })
      synth.maxPolyphony = 32
      synth.connect(this.instrumentBus!)
      return synth
    }

    const synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.01,
      modulationIndex: 7.5,
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.001,
        decay: 0.16,
        sustain: 0.03,
        release: 0.85,
      },
      modulation: { type: 'sine' },
      modulationEnvelope: {
        attack: 0.001,
        decay: 0.09,
        sustain: 0,
        release: 0.15,
      },
      volume: -12,
    })
    synth.maxPolyphony = 32
    synth.connect(this.instrumentBus!)
    return synth
  }

  private async loadSampler(
    kind: InstrumentKind,
    slot: InstrumentSlot,
  ): Promise<void> {
    try {
      const sampler = await this.createSampler(kind)
      if (this.disposed) {
        sampler.dispose()
        return
      }

      slot.node = sampler
      slot.kind = 'sample'
      slot.loading = false
      slot.failed = false

      if (this.instrument === kind) {
        this.activeVoice = sampler
        this.emitStatus(kind, 'sample')
        // Audition the real samples if a chord is already held in single-shot mode.
        if (this.pattern === 'once' && this.chordVoicing) {
          this.playChord(Tone.now() + 0.05, '2n', 0.78)
        }
      }

      // Let any fallback tails ring out before reclaiming its voices.
      this.scheduleTimer(() => {
        try {
          slot.fallback.dispose()
        } catch {
          /* ignore */
        }
      }, 2500)
    } catch (error) {
      if (this.disposed) return
      slot.loading = false
      slot.failed = true
      if (this.instrument === kind) {
        this.emitStatus(kind, 'fallback')
      }
      console.warn(`[audio] ${kind} sample bank unavailable, using synth fallback.`, error)
    }
  }

  private createSampler(kind: InstrumentKind): Promise<Tone.Sampler> {
    const config = SAMPLER_CONFIG[kind]
    const bus = this.instrumentBus
    if (!bus) {
      return Promise.reject(new Error('The audio graph is not initialized.'))
    }

    return new Promise<Tone.Sampler>((resolve, reject) => {
      let settled = false
      let sampler: Tone.Sampler | null = null

      const timeout = window.setTimeout(() => {
        if (settled) return
        settled = true
        this.timers.delete(timeout)
        try {
          sampler?.dispose()
        } catch {
          /* ignore */
        }
        reject(new Error(`Timed out loading ${kind} samples.`))
      }, SAMPLE_LOAD_TIMEOUT_MS)
      this.timers.add(timeout)

      const finish = (callback: () => void) => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        this.timers.delete(timeout)
        callback()
      }

      try {
        sampler = new Tone.Sampler({
          urls: config.urls,
          baseUrl: config.baseUrl,
          release: config.release,
          volume: config.volume,
          onload: () => {
            finish(() => {
              if (sampler) resolve(sampler)
            })
          },
          onerror: (error) => {
            finish(() => {
              try {
                sampler?.dispose()
              } catch {
                /* ignore */
              }
              reject(error)
            })
          },
        })
        sampler.connect(bus)
      } catch (error) {
        finish(() => reject(error))
      }
    })
  }

  private releaseVoice(voice: Voice | null): void {
    if (!voice) return
    try {
      voice.releaseAll(Tone.now())
    } catch {
      /* ignore */
    }
  }

  private releaseAllInstruments(): void {
    this.slots.forEach((slot) => {
      this.releaseVoice(slot.node)
      if (slot.fallback !== slot.node) {
        this.releaseVoice(slot.fallback)
      }
    })
  }

  private emitStatus(kind: InstrumentKind, state: SamplerState): void {
    this.callbacks.onSamplerStatus?.({ instrument: kind, state })
  }

  private scheduleTimer(callback: () => void, delay: number): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer)
      if (!this.disposed) callback()
    }, delay)
    this.timers.add(timer)
  }

  private volumeToGain(percent: number): number {
    return Math.pow(percent / 100, 1.6) * 0.9
  }

  private numerator(signature: TimeSignature): number {
    return Number(signature.split('/')[0])
  }
}
