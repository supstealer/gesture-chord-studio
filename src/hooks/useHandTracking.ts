import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { classifyGesture, GestureSmoother } from '../services/gestureClassifier'
import type { GestureId, VisionStatus } from '../types'

const ASSET_BASE = import.meta.env.BASE_URL
const LOCAL_WASM_PATH = `${ASSET_BASE}wasm`
const LOCAL_MODEL_PATH = `${ASSET_BASE}models/hand_landmarker.task`

// The wasm files are bundled locally (see public/wasm). The CDN is only used as
// a last-resort fallback if the local runtime assets cannot be loaded.
const CDN_WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm'
const CDN_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const FINGERTIPS = new Set([4, 8, 12, 16, 20])

export interface UseHandTrackingOptions {
  enabled: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  onGesture: (gesture: GestureId | null) => void
  onHandPresence: (present: boolean) => void
}

export interface UseHandTrackingResult {
  status: VisionStatus
  error: string | null
}

async function resolveFileset() {
  try {
    return await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH)
  } catch {
    return FilesetResolver.forVisionTasks(CDN_WASM_PATH)
  }
}

async function createHandLandmarker(): Promise<HandLandmarker> {
  const fileset = await resolveFileset()

  const attempts: Array<{
    modelPath: string
    delegate: 'GPU' | 'CPU'
  }> = [
    { modelPath: LOCAL_MODEL_PATH, delegate: 'GPU' },
    { modelPath: LOCAL_MODEL_PATH, delegate: 'CPU' },
    { modelPath: CDN_MODEL_PATH, delegate: 'GPU' },
    { modelPath: CDN_MODEL_PATH, delegate: 'CPU' },
  ]

  let lastError: unknown

  for (const attempt of attempts) {
    try {
      return await HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: attempt.modelPath,
          delegate: attempt.delegate,
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      })
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to load the hand landmarker model.')
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return
  const context = canvas.getContext('2d')
  context?.clearRect(0, 0, canvas.width, canvas.height)
}

function traceConnections(
  context: CanvasRenderingContext2D,
  landmarks: readonly NormalizedLandmark[],
  width: number,
  height: number,
) {
  context.beginPath()
  const connections = HandLandmarker.HAND_CONNECTIONS ?? []
  for (const connection of connections) {
    const start = landmarks[connection.start]
    const end = landmarks[connection.end]
    if (!start || !end) continue
    context.moveTo(start.x * width, start.y * height)
    context.lineTo(end.x * width, end.y * height)
  }
}

function drawSkeleton(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: NormalizedLandmark[] | undefined,
) {
  const context = canvas.getContext('2d')
  if (!context) return

  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  context.clearRect(0, 0, width, height)
  if (!landmarks) return

  const scale = Math.max(width, height)
  const lineWidth = Math.max(2.5, scale * 0.0022)

  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'

  // Soft glow underlay.
  traceConnections(context, landmarks, width, height)
  context.strokeStyle = 'rgba(77, 107, 254, 0.24)'
  context.lineWidth = lineWidth * 3.6
  context.shadowColor = 'rgba(77, 107, 254, 0.85)'
  context.shadowBlur = lineWidth * 8
  context.stroke()

  // Crisp blue → periwinkle bone lines.
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, 'rgba(77, 107, 254, 0.98)')
  gradient.addColorStop(1, 'rgba(147, 176, 255, 0.98)')
  traceConnections(context, landmarks, width, height)
  context.strokeStyle = gradient
  context.lineWidth = lineWidth
  context.shadowBlur = lineWidth * 2.5
  context.stroke()

  // Joints and fingertip accents.
  landmarks.forEach((landmark, index) => {
    const isTip = FINGERTIPS.has(index)
    context.beginPath()
    context.arc(
      landmark.x * width,
      landmark.y * height,
      isTip ? lineWidth * 2.4 : lineWidth * 1.5,
      0,
      Math.PI * 2,
    )
    context.fillStyle = isTip ? '#bfd3ff' : '#ffffff'
    context.shadowColor = isTip
      ? 'rgba(126, 155, 255, 0.95)'
      : 'rgba(77, 107, 254, 0.8)'
    context.shadowBlur = lineWidth * (isTip ? 4 : 2)
    context.fill()
  })

  context.restore()
}

function toFriendlyError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'The vision engine could not start. Please try again.'
  }

  switch (error.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was denied. Allow camera permissions for this site, then retry.'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found on this device.'
    case 'NotReadableError':
      return 'The camera is already in use by another application.'
    case 'OverconstrainedError':
      return 'The camera does not support the requested resolution.'
    case 'AbortError':
      return 'Camera startup was interrupted. Please retry.'
    default:
      return error.message || 'The vision engine could not start. Please try again.'
  }
}

export function useHandTracking({
  enabled,
  videoRef,
  canvasRef,
  onGesture,
  onHandPresence,
}: UseHandTrackingOptions): UseHandTrackingResult {
  const [status, setStatus] = useState<VisionStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const callbacksRef = useRef({ onGesture, onHandPresence })

  useEffect(() => {
    callbacksRef.current = { onGesture, onHandPresence }
  }, [onGesture, onHandPresence])

  useEffect(() => {
    if (!enabled) {
      // oxlint-disable-next-line react/set-state-in-effect -- reset UI when camera is switched off
      setStatus('idle')
      // oxlint-disable-next-line react/set-state-in-effect -- reset UI when camera is switched off
      setError(null)
      return
    }

    const videoElement = videoRef.current
    const canvasElement = canvasRef.current

    let cancelled = false
    let stream: MediaStream | null = null
    let landmarker: HandLandmarker | null = null
    let animationFrame = 0
    let lastVideoTime = -1
    let lastDetectionAt = 0
    let lastPresence = false
    const smoother = new GestureSmoother(5)

    const stopStream = () => {
      stream?.getTracks().forEach((track) => track.stop())
      if (videoElement && videoElement.srcObject === stream) {
        videoElement.srcObject = null
      }
      stream = null
    }

    const processFrame = () => {
      if (cancelled) return
      animationFrame = requestAnimationFrame(processFrame)

      if (!landmarker || !videoElement || !canvasElement) return

      const now = performance.now()
      // MediaPipe at ~30fps is plenty for gesture control and keeps the CPU cool.
      if (now - lastDetectionAt < 1000 / 30) return
      lastDetectionAt = now

      if (videoElement.readyState < 2 || !videoElement.videoWidth) return
      if (videoElement.currentTime === lastVideoTime) return
      lastVideoTime = videoElement.currentTime

      let result
      try {
        result = landmarker.detectForVideo(videoElement, now)
      } catch {
        return
      }

      const hand = result.landmarks[0]
      const present = Boolean(hand)

      if (present !== lastPresence) {
        lastPresence = present
        callbacksRef.current.onHandPresence(present)
      }

      const classification = hand
        ? classifyGesture(hand)
        : { gesture: null, fingers: null }

      if (smoother.push(classification.gesture)) {
        callbacksRef.current.onGesture(smoother.value)
      }

      drawSkeleton(canvasElement, videoElement, hand)
    }

    const init = async () => {
      try {
        setStatus('requesting')
        setError(null)

        if (!videoElement) {
          throw new Error('The video element is not mounted yet.')
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Camera access requires a modern browser over HTTPS or localhost.',
          )
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 60 },
          },
        })

        if (cancelled) {
          stopStream()
          return
        }

        videoElement.srcObject = stream
        await videoElement.play()

        if (cancelled) {
          stopStream()
          return
        }

        setStatus('loading')
        landmarker = await createHandLandmarker()

        if (cancelled) {
          try {
            landmarker.close()
          } catch {
            /* the engine was torn down before it finished loading */
          }
          landmarker = null
          stopStream()
          return
        }

        setStatus('ready')
        processFrame()
      } catch (err) {
        if (cancelled) return
        setError(toFriendlyError(err))
        setStatus('error')
        try {
          landmarker?.close()
        } catch {
          /* ignore close errors */
        }
        landmarker = null
        stopStream()
      }
    }

    void init()

    return () => {
      cancelled = true
      cancelAnimationFrame(animationFrame)
      try {
        landmarker?.close()
      } catch {
        /* ignore close errors */
      }
      landmarker = null
      stopStream()
      clearCanvas(canvasElement)
      smoother.reset()
    }
  }, [enabled, videoRef, canvasRef])

  return { status, error }
}
