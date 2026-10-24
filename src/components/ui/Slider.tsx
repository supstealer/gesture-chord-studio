import type { CSSProperties } from 'react'
import { cn } from '../../utils/cn'

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  ariaLabel: string
  className?: string
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
  className,
}: SliderProps) {
  const fill = ((value - min) / (max - min)) * 100

  return (
    <input
      type="range"
      className={cn('range-input', className)}
      style={{ '--range-fill': `${fill}%` } as CSSProperties}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  )
}
