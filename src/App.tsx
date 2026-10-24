import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Lock, X } from 'lucide-react'
import { ChordDeck } from './components/ChordDeck'
import { ControlPanel } from './components/ControlPanel'
import { TopBar } from './components/TopBar'
import { VideoStage } from './components/VideoStage'
import { useHandTracking } from './hooks/useHandTracking'
import { useTheme } from './hooks/useTheme'
import { AudioEngine } from './services/audioEngine'
import type {
  BeatEvent,
  GestureId,
  InstrumentKind,
  RhythmPattern,
  RootNote,
  SamplerStatusEvent,
  ScaleMode,
  TimeSignature,
} from './types'
import { formatKeyLabel, getDiatonicChords } from './utils/musicTheory'

function App() {
  const { theme, toggleTheme } = useTheme()

  // Musical state.
  const [root, setRoot] = useState<RootNote>('C')
  const [scaleMode, setScaleMode] = useState<ScaleMode>('major')
  const [instrument, setInstrument] = useState<InstrumentKind>('piano')
  const [bpm, setBpm] = useState(100)
  const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4')
  const [pattern, setPattern] = useState<RhythmPattern>('block')
  const [metronome, setMetronome] = useState(false)
  const [volume, setVolume] = useState(70)

  const chords = useMemo(
    () => getDiatonicChords(root, scaleMode),
    [root, scaleMode],
  )
  const keyLabel = formatKeyLabel(root, scaleMode)

  // Playback state.
  const [audioReady, setAudioReady] = useState(false)
  const [audioStarting, setAudioStarting] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [samplerStatus, setSamplerStatus] = useState<SamplerStatusEvent>({
    instrument: 'piano',
    state: 'idle',
  })
  const [beat, setBeat] = useState<BeatEvent | null>(null)
  const [activeDegree, setActiveDegree] = useState<number | null>(null)

  // Vision state.
  const [cameraOn, setCameraOn] = useState(false)
  const [handPresent, setHandPresent] = useState(false)
  const [gesture, setGesture] = useState<GestureId | null>(null)

  // Refs.
  const engineRef = useRef<AudioEngine | null>(null)
  const startPromiseRef = useRef<Promise<boolean> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const handLostTimerRef = useRef<number | null>(null)

  const activeChord =
    activeDegree !== null ? chords[activeDegree - 1] ?? null : null

  const clearHandLostTimer = () => {
    if (handLostTimerRef.current !== null) {
      window.clearTimeout(handLostTimerRef.current)
      handLostTimerRef.current = null
    }
  }

  const releaseChord = () => {
    setActiveDegree(null)
    engineRef.current?.setChord(null)
  }

  const handleStableGesture = (next: GestureId | null) => {
    setGesture(next)
    if (next === null) return
    if (next === 0) {
      setActiveDegree(null)
      return
    }
    setActiveDegree(next)
  }

  const handleHandPresence = (present: boolean) => {
    setHandPresent(present)
    if (present) {
      clearHandLostTimer()
      return
    }

    clearHandLostTimer()
    // Fist is the intentional mute gesture; losing the hand entirely gets a
    // short grace period so a brief tracking dropout does not cut the loop.
    handLostTimerRef.current = window.setTimeout(() => {
      handLostTimerRef.current = null
      setGesture(null)
      setActiveDegree(null)
      engineRef.current?.setChord(null)
    }, 1200)
  }

  const { status: visionStatus, error: visionError } = useHandTracking({
    enabled: cameraOn,
    videoRef,
    canvasRef,
    onGesture: handleStableGesture,
    onHandPresence: handleHandPresence,
  })

  const startAudio = (): Promise<boolean> => {
    if (audioReady && engineRef.current) return Promise.resolve(true)
    if (startPromiseRef.current) return startPromiseRef.current

    const promise = (async () => {
      setAudioStarting(true)
      setAudioError(null)

      try {
        let engine = engineRef.current
        if (!engine) {
          engine = new AudioEngine({
            onBeat: setBeat,
            onSamplerStatus: setSamplerStatus,
          })
          engineRef.current = engine
        }

        await engine.start()

        // Apply the current UI state before exposing the engine as ready.
        engine.setVolume(volume)
        engine.setBpm(bpm)
        engine.setTimeSignature(timeSignature)
        engine.setPattern(pattern)
        engine.setMetronome(metronome)
        engine.setInstrument(instrument)

        setAudioReady(true)
        return true
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown audio error.'
        setAudioError(`Audio engine failed to start: ${message}`)
        engineRef.current?.dispose()
        engineRef.current = null
        setAudioReady(false)
        return false
      } finally {
        setAudioStarting(false)
      }
    })()

    startPromiseRef.current = promise
    void promise.finally(() => {
      startPromiseRef.current = null
    })

    return promise
  }

  const triggerDegree = (degree: number) => {
    if (activeDegree === degree) {
      releaseChord()
      return
    }

    setActiveDegree(degree)
    // Direct card / keyboard interaction is a valid user gesture, so it may
    // also unlock the audio context.
    void startAudio()
  }

  const toggleCamera = () => {
    if (cameraOn) {
      setCameraOn(false)
      setHandPresent(false)
      setGesture(null)
      clearHandLostTimer()
      setActiveDegree(null)
      engineRef.current?.setChord(null)
      return
    }

    setCameraOn(true)
  }

  const retryCamera = () => {
    setCameraOn(false)
    window.setTimeout(() => setCameraOn(true), 80)
  }

  // Keep the engine in sync with UI controls once it is running.
  useEffect(() => {
    if (!audioReady) return
    const engine = engineRef.current
    if (!engine) return

    if (activeDegree === null) {
      engine.setChord(null)
    } else {
      const chord = chords[activeDegree - 1]
      engine.setChord(chord ? chord.voicing : null)
    }
  }, [audioReady, activeDegree, chords])

  useEffect(() => {
    if (audioReady) engineRef.current?.setInstrument(instrument)
  }, [audioReady, instrument])

  useEffect(() => {
    if (audioReady) engineRef.current?.setBpm(bpm)
  }, [audioReady, bpm])

  useEffect(() => {
    if (audioReady) engineRef.current?.setTimeSignature(timeSignature)
  }, [audioReady, timeSignature])

  useEffect(() => {
    if (audioReady) engineRef.current?.setPattern(pattern)
  }, [audioReady, pattern])

  useEffect(() => {
    if (audioReady) engineRef.current?.setMetronome(metronome)
  }, [audioReady, metronome])

  useEffect(() => {
    if (audioReady) engineRef.current?.setVolume(volume)
  }, [audioReady, volume])

  // Keyboard performance controls: 1–7 play the degrees, 0/Esc releases.
  const actionsRef = useRef({ triggerDegree, releaseChord })
  actionsRef.current = { triggerDegree, releaseChord }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if (event.key >= '1' && event.key <= '7') {
        event.preventDefault()
        actionsRef.current.triggerDegree(Number(event.key))
      } else if (event.key === '0' || event.key === 'Escape') {
        event.preventDefault()
        actionsRef.current.releaseChord()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    return () => {
      clearHandLostTimer()
      engineRef.current?.dispose()
      engineRef.current = null
    }
    // Engine lifecycle is intentionally tied to the app lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visionBusy =
    visionStatus === 'requesting' || visionStatus === 'loading'

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans text-ink">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:p-6 xl:h-screen xl:min-h-[760px] xl:overflow-hidden">
        <TopBar
          audioReady={audioReady}
          audioStarting={audioStarting}
          onStartAudio={() => void startAudio()}
          cameraOn={cameraOn}
          visionBusy={visionBusy}
          onToggleCamera={toggleCamera}
          volume={volume}
          onVolumeChange={setVolume}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {audioError && (
          <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">{audioError}</span>
            <button
              type="button"
              onClick={() => setAudioError(null)}
              className="rounded-md p-1 text-rose-500/70 transition-colors hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300/70 dark:hover:text-rose-200"
              aria-label="Dismiss audio error"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <main className="grid min-w-0 flex-1 grid-cols-1 gap-4 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_380px] xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden">
          <VideoStage
            videoRef={videoRef}
            canvasRef={canvasRef}
            cameraOn={cameraOn}
            visionStatus={visionStatus}
            visionError={visionError}
            handPresent={handPresent}
            gesture={gesture}
            activeChord={activeChord}
            audioReady={audioReady}
            onEnableCamera={() => setCameraOn(true)}
            onRetryCamera={retryCamera}
            onStartAudio={() => void startAudio()}
          />

          <ControlPanel
            instrument={instrument}
            onInstrumentChange={setInstrument}
            samplerStatus={samplerStatus}
            root={root}
            scaleMode={scaleMode}
            onRootChange={setRoot}
            onScaleModeChange={setScaleMode}
            bpm={bpm}
            onBpmChange={setBpm}
            timeSignature={timeSignature}
            onTimeSignatureChange={setTimeSignature}
            pattern={pattern}
            onPatternChange={setPattern}
            metronome={metronome}
            onMetronomeChange={setMetronome}
            beat={beat}
            audioReady={audioReady}
          />
        </main>

        <ChordDeck
          chords={chords}
          activeDegree={activeDegree}
          keyLabel={keyLabel}
          audioReady={audioReady}
          onSelect={triggerDegree}
          onMute={releaseChord}
        />

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1 pb-1 text-[11px] text-ink-3">
          <span>Tone.js · MediaPipe · Tonal</span>
          <span className="flex items-center gap-1.5">
            <Lock className="size-3" />
            All audio & vision processing stays in your browser
          </span>
        </footer>
      </div>
    </div>
  )
}

export default App
