import type { GestureId } from '../types'

export interface LandmarkLike {
  x: number
  y: number
  z?: number
}

export interface FingerStates {
  thumb: boolean
  index: boolean
  middle: boolean
  ring: boolean
  pinky: boolean
}

export interface GestureClassification {
  gesture: GestureId | null
  fingers: FingerStates
}

const FOLDED: FingerStates = {
  thumb: false,
  index: false,
  middle: false,
  ring: false,
  pinky: false,
}

/**
 * Finger pattern lookup. Order is thumb → index → middle → ring → pinky.
 * Gesture numbers follow the visual music score: fingers 1–5 count extended
 * fingers, while 6/7 are the two extra shapes requested by the design.
 */
const GESTURE_BY_PATTERN: Record<string, GestureId> = {
  '00000': 0,
  '01000': 1,
  '01100': 2,
  '01110': 3,
  '01111': 4,
  '11111': 5,
  '10001': 6,
  '11100': 7,
}

export const GESTURE_META: Record<
  GestureId,
  { label: string; fingers: string }
> = {
  0: { label: 'Fist', fingers: 'All fingers folded · mute' },
  1: { label: 'Point', fingers: 'Index extended' },
  2: { label: 'Peace', fingers: 'Index + middle' },
  3: { label: 'Three', fingers: 'Index + middle + ring' },
  4: { label: 'Four', fingers: 'Four fingers extended' },
  5: { label: 'Open Palm', fingers: 'All five extended' },
  6: { label: 'Shaka', fingers: 'Thumb + pinky' },
  7: { label: 'Trigger', fingers: 'Thumb + index + middle' },
}

const distance = (a: LandmarkLike, b: LandmarkLike): number =>
  Math.hypot(a.x - b.x, a.y - b.y)

/**
 * Rotation-invariant finger extension check based on distances from the wrist.
 * An extended finger's tip is significantly farther from the wrist than its PIP
 * joint; a curled finger folds back toward the palm. This works whether the
 * hand points up, down or sideways, unlike simple y-coordinate checks.
 */
function isLongFingerExtended(
  landmarks: LandmarkLike[],
  wrist: LandmarkLike,
  mcpIndex: number,
  pipIndex: number,
  tipIndex: number,
): boolean {
  const mcp = landmarks[mcpIndex]
  const pip = landmarks[pipIndex]
  const tip = landmarks[tipIndex]

  const tipDistance = distance(tip, wrist)
  const pipDistance = distance(pip, wrist)
  const mcpDistance = distance(mcp, wrist)

  return (
    tipDistance > pipDistance * 1.12 &&
    tipDistance > mcpDistance * 1.35
  )
}

function isThumbExtended(
  landmarks: LandmarkLike[],
  wrist: LandmarkLike,
): boolean {
  const thumbMcp = landmarks[2]
  const thumbTip = landmarks[4]
  const indexMcp = landmarks[5]

  const palmPoints = [landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]]
  const palmCenter = {
    x: palmPoints.reduce((sum, point) => sum + point.x, 0) / palmPoints.length,
    y: palmPoints.reduce((sum, point) => sum + point.y, 0) / palmPoints.length,
  }
  const palmSize = Math.max(distance(wrist, landmarks[9]), 1e-6)

  const awayFromPalm =
    distance(thumbTip, palmCenter) > distance(thumbMcp, palmCenter) * 1.25
  const clearOfIndex = distance(thumbTip, indexMcp) > palmSize * 0.45

  return awayFromPalm && clearOfIndex
}

/**
 * Classify a single hand into one of the eight supported gestures.
 * Returns null for any unsupported finger combination.
 */
export function classifyGesture(
  landmarks: readonly LandmarkLike[],
): GestureClassification {
  if (landmarks.length < 21) {
    return { gesture: null, fingers: { ...FOLDED } }
  }

  const points = landmarks as LandmarkLike[]
  const wrist = points[0]

  const fingers: FingerStates = {
    thumb: isThumbExtended(points, wrist),
    index: isLongFingerExtended(points, wrist, 5, 6, 8),
    middle: isLongFingerExtended(points, wrist, 9, 10, 12),
    ring: isLongFingerExtended(points, wrist, 13, 14, 16),
    pinky: isLongFingerExtended(points, wrist, 17, 18, 20),
  }

  const pattern = [
    fingers.thumb,
    fingers.index,
    fingers.middle,
    fingers.ring,
    fingers.pinky,
  ]
    .map((extended) => (extended ? '1' : '0'))
    .join('')

  return {
    gesture: GESTURE_BY_PATTERN[pattern] ?? null,
    fingers,
  }
}

/**
 * Debounce classifier output. A gesture is only committed after the same value
 * has been observed for `requiredFrames` consecutive frames.
 */
export class GestureSmoother {
  private candidate: GestureId | null = null
  private frames = 0
  private stable: GestureId | null = null
  private readonly requiredFrames: number

  constructor(requiredFrames = 5) {
    this.requiredFrames = requiredFrames
  }

  push(gesture: GestureId | null): boolean {
    if (gesture === this.candidate) {
      this.frames += 1
    } else {
      this.candidate = gesture
      this.frames = 1
    }

    if (this.frames >= this.requiredFrames && this.stable !== this.candidate) {
      this.stable = this.candidate
      return true
    }

    return false
  }

  get value(): GestureId | null {
    return this.stable
  }

  reset(): void {
    this.candidate = null
    this.frames = 0
    this.stable = null
  }
}
