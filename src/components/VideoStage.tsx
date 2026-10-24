import type { RefObject } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Hand,
  Loader2,
  Power,
  RefreshCw,
} from 'lucide-react'
import type { ChordInfo, GestureId, VisionStatus } from '../types'
import { GESTURE_META } from '../services/gestureClassifier'
import { cn } from '../utils/cn'

interface VideoStageProps {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  cameraOn: boolean
  visionStatus: VisionStatus
  visionError: string | null
  handPresent: boolean
  gesture: GestureId | null
  activeChord: ChordInfo | null
  audioReady: boolean
  onEnableCamera: () => void
  onRetryCamera: () => void
  onStartAudio: () => void
}

export function VideoStage({
  videoRef,
  canvasRef,
  cameraOn,
  visionStatus,
  visionError,
  handPresent,
  gesture,
  activeChord,
  audioReady,
  onEnableCamera,
  onRetryCamera,
  onStartAudio,
}: VideoStageProps) {
  const ready = visionStatus === 'ready'

  return (
    <section className="app-card relative isolate h-[320px] min-w-0 overflow-hidden sm:aspect-video sm:h-auto xl:aspect-auto xl:h-full xl:min-h-0">
      <video
        ref={videoRef}
        className={cn(
          'absolute inset-0 h-full w-full -scale-x-100 object-cover transition-opacity duration-500',
          cameraOn ? 'opacity-100' : 'opacity-0',
        )}
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 z-10 h-full w-full -scale-x-100 object-cover transition-opacity duration-500',
          ready ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-slate-950/15 via-transparent to-slate-950/20" />

      {ready && (
        <>
          <div className="absolute left-3 top-3 z-30 rounded-2xl border border-white/70 bg-white/85 px-3 py-2.5 shadow-[0_12px_36px_-20px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:left-5 sm:top-5 sm:px-4 sm:py-3 dark:border-white/10 dark:bg-slate-950/60">
            <div className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  handPresent
                    ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.16)]'
                    : 'bg-slate-400/70 dark:bg-slate-500',
                )}
              />
              {handPresent ? 'Hand tracked' : 'No hand detected'}
            </div>
            <div className="mt-2 flex items-end gap-2.5">
              <span
                className={cn(
                  'font-display text-4xl font-semibold leading-none tracking-tight sm:text-5xl',
                  gesture !== null
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-400 dark:text-slate-500',
                )}
              >
                {gesture ?? '—'}
              </span>
              <div className="mb-0.5 min-w-0">
                <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  {gesture !== null ? GESTURE_META[gesture].label : 'Gesture'}
                </span>
                <p className="mt-1 hidden max-w-[160px] text-[10px] leading-snug text-slate-500 sm:block dark:text-slate-400">
                  {gesture !== null
                    ? GESTURE_META[gesture].fingers
                    : handPresent
                      ? 'Adjust your fingers…'
                      : 'Show one hand to the camera'}
                </p>
              </div>
            </div>
          </div>

          <div className="absolute right-3 top-3 z-30 max-w-[48%] rounded-2xl border border-white/70 bg-white/85 px-3 py-2.5 text-right shadow-[0_12px_36px_-20px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:right-5 sm:top-5 sm:max-w-[52%] sm:px-4 sm:py-3 dark:border-white/10 dark:bg-slate-950/60">
            <div className="flex items-center justify-end gap-1.5 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
              {activeChord && (
                <span className="flex h-2.5 items-end gap-[2px]">
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className="eq-bar w-[2px] rounded-full bg-brand-500 dark:bg-brand-300"
                      style={{
                        height: `${6 + index * 2}px`,
                        animationDelay: `${index * 120}ms`,
                      }}
                    />
                  ))}
                </span>
              )}
              Now sounding
            </div>
            {activeChord ? (
              <div className="mt-1.5">
                <div className="flex items-baseline justify-end gap-1.5 sm:gap-2">
                  <span className="rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    {activeChord.roman}
                  </span>
                  <span className="font-display text-2xl font-semibold leading-none tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    {activeChord.chordName}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-slate-500 sm:text-[11px] dark:text-slate-400">
                  {activeChord.displayName}
                </div>
                <div className="mt-0.5 hidden font-mono text-[9px] text-slate-400 sm:block dark:text-slate-500">
                  {activeChord.notes.join(' · ')}
                </div>
              </div>
            ) : (
              <div className="mt-1.5">
                <div className="font-display text-lg font-medium text-slate-400 sm:text-xl dark:text-slate-500">
                  Muted
                </div>
                <div className="mt-0.5 text-[9px] text-slate-400 dark:text-slate-500">
                  Fist to release
                </div>
              </div>
            )}
          </div>

          <div className="absolute inset-x-3 bottom-3 z-30 flex flex-wrap items-end justify-between gap-2 sm:inset-x-5 sm:bottom-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-[10px] text-slate-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Hand className="size-3 text-brand-500 dark:text-brand-300" />
                1–7 chords
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                Fist mutes
              </span>
              <span className="hidden text-slate-400 sm:inline dark:text-slate-500">
                5-frame debounce
              </span>
            </div>

            {!audioReady && (
              <button
                type="button"
                onClick={onStartAudio}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-[10px] font-semibold text-white shadow-[var(--shadow-button)] transition-colors hover:bg-brand-600"
              >
                <Power className="size-3" />
                Start audio
              </button>
            )}
          </div>

          {!handPresent && (
            <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
              <div className="rounded-2xl border border-white/70 bg-white/85 px-5 py-4 text-center shadow-[0_16px_44px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
                <div className="mx-auto grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Hand className="size-5" />
                </div>
                <p className="mt-2.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                  Show one hand
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  Palm to camera · good lighting
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {!cameraOn && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-surface bg-[radial-gradient(circle_at_50%_38%,rgba(77,107,254,0.10),transparent_62%)] p-6">
          <div className="max-w-xs text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20">
              <Camera className="size-6" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
              Camera is offline
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-ink-2">
              Enable your webcam and conduct the diatonic deck with one hand.
              Show 1–7 to play chords, make a fist to mute.
            </p>
            <button
              type="button"
              onClick={onEnableCamera}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white shadow-[var(--shadow-button)] transition-colors hover:bg-brand-600"
            >
              Enable camera
              <ArrowRight className="size-3.5" />
            </button>
            <p className="mt-3 text-[10px] text-ink-3">
              Video stays on-device · nothing uploaded
            </p>
          </div>
        </div>
      )}

      {cameraOn &&
        (visionStatus === 'requesting' || visionStatus === 'loading') && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-white/85 backdrop-blur-xl dark:bg-slate-950/75">
            <div className="text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
                <Loader2 className="size-5 animate-spin text-brand-600 dark:text-brand-300" />
              </div>
              <p className="mt-3 text-[13px] font-medium text-ink">
                {visionStatus === 'requesting'
                  ? 'Requesting camera access…'
                  : 'Loading hand landmarker…'}
              </p>
              <p className="mt-1 text-[10px] text-ink-3">
                MediaPipe · WASM · GPU delegate
              </p>
            </div>
          </div>
        )}

      {cameraOn && visionStatus === 'error' && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-white/90 p-6 backdrop-blur-xl dark:bg-slate-950/85">
          <div className="max-w-xs text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20">
              <AlertCircle className="size-5" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-ink">
              Camera unavailable
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              {visionError}
            </p>
            <button
              type="button"
              onClick={onRetryCamera}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-3"
            >
              <RefreshCw className="size-3.5" />
              Retry camera
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
