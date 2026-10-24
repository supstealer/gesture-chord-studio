import {
  Camera,
  CameraOff,
  Hand,
  Info,
  Loader2,
  Moon,
  Power,
  Sun,
  Volume2,
} from 'lucide-react'
import type { Theme } from '../hooks/useTheme'
import { cn } from '../utils/cn'
import { Slider } from './ui/Slider'

interface TopBarProps {
  audioReady: boolean
  audioStarting: boolean
  onStartAudio: () => void
  cameraOn: boolean
  visionBusy: boolean
  onToggleCamera: () => void
  volume: number
  onVolumeChange: (value: number) => void
  theme: Theme
  onToggleTheme: () => void
}

export function TopBar({
  audioReady,
  audioStarting,
  onStartAudio,
  cameraOn,
  visionBusy,
  onToggleCamera,
  volume,
  onVolumeChange,
  theme,
  onToggleTheme,
}: TopBarProps) {
  return (
    <header className="app-card flex min-w-0 shrink-0 flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="brand-gradient relative grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-[var(--shadow-button)] ring-1 ring-brand-300/30">
          <Hand className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-[15px] font-semibold tracking-tight text-ink sm:text-base">
              Gesture Chord Studio
            </span>
            <span className="hidden shrink-0 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-2 sm:inline">
              Beta
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-2">
            <span
              className={cn(
                'size-1.5 rounded-full',
                audioReady
                  ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]'
                  : 'bg-ink-3',
              )}
            />
            <span>{audioReady ? 'Audio engine online' : 'Ready to play'}</span>
            <span className="text-ink-3">·</span>
            <span className="hidden sm:inline">Hand-controlled harmony</span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-2.5 py-2 sm:px-3">
          <Volume2 className="size-3.5 shrink-0 text-ink-2" />
          <div className="w-16 sm:w-24">
            <Slider
              value={volume}
              min={0}
              max={100}
              onChange={onVolumeChange}
              ariaLabel="Master volume"
            />
          </div>
          <span className="w-8 text-right text-[10px] tabular-nums text-ink-2">
            {volume}%
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {theme === 'dark' ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCamera}
          aria-pressed={cameraOn}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors duration-200',
            cameraOn
              ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300'
              : 'border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink',
          )}
        >
          {visionBusy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : cameraOn ? (
            <Camera className="size-3.5" />
          ) : (
            <CameraOff className="size-3.5" />
          )}
          {cameraOn ? 'Camera on' : 'Camera'}
        </button>

        {audioReady ? (
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Audio live
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartAudio}
            disabled={audioStarting}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-button)] transition-colors duration-200 hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
          >
            {audioStarting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Power className="size-3.5" />
            )}
            {audioStarting ? 'Starting…' : 'Start audio'}
          </button>
        )}
      </div>

      {!audioReady && (
        <div className="flex w-full items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-[11px] text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 md:hidden">
          <Info className="size-3.5 shrink-0" />
          Browser audio is locked until you tap Start audio.
        </div>
      )}
    </header>
  )
}
