'use client'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Lock, PlayCircle, Camera, Check, RefreshCw, ChevronLeft, VideoOff, AlertCircle, Square } from 'lucide-react'
import { practiceModules } from '@/data/mockData'
import type { PracticeModuleData, Task } from '@/data/mockData'
import type { LandmarkPoint } from '@/lib/scoreMovement'
import { scoreSession, scoreLiveFrame } from '@/lib/keypointSimilarity'
import type { ScoreBreakdown } from '@/lib/handScoring'
import { saveSession } from '@/lib/sessions'
import type { SessionFrame } from '@/lib/sessions'
import { useAuth } from '@/context/AuthContext'
import {
  addCompletedTask, addXP, saveAssessmentScore, fetchUserDocument,
  checkAndAwardBadges, ALL_BADGES,
} from '@/lib/authActions'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const SAMPLE_INTERVAL_MS = 100    // throttle stored keypoint frames to ~10fps
const TARGET_FRAMES      = 15     // auto-finish once we have this many hand-present frames to average
const NO_HAND_HINT_MS    = 5000   // show "move closer" hint if no hand seen at all after this long
const MAX_CAPTURE_MS     = 15000  // safety cap so an assessment can never hang forever
const HAND_LOST_GRACE_MS = 2000   // ignore brief dropouts — only treat the hand as "lost" after this long

// ── MediaPipe type interfaces ─────────────────────────────────────────────────
interface MPHandsResults {
  image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  multiHandLandmarks?: LandmarkPoint[][]
}
interface MPHands {
  setOptions(opts: object): void
  onResults(cb: (results: MPHandsResults) => void): void
  send(input: { image: HTMLVideoElement }): Promise<void>
  close(): void
}
type MPConnections = { start: number; end: number }[]
interface MPHandsModule   { Hands: new (opts: object) => MPHands; HAND_CONNECTIONS: MPConnections }
interface MPCameraModule  { Camera: new (video: HTMLVideoElement, opts: object) => { start(): void; stop(): void } }
interface MPDrawingModule {
  drawConnectors: (ctx: CanvasRenderingContext2D, lm: LandmarkPoint[], c: MPConnections, opts: object) => void
  drawLandmarks:  (ctx: CanvasRenderingContext2D, lm: LandmarkPoint[], opts: object) => void
}

// ── Hand tracking hook ────────────────────────────────────────────────────────
function useHandTracking(
  videoEl: HTMLVideoElement | null,
  canvasEl: HTMLCanvasElement | null,
  onLandmarksRef: React.MutableRefObject<((hands: LandmarkPoint[][]) => void) | null>,
  referenceKeypoints: LandmarkPoint[] | null,
) {
  const [accuracy, setAccuracy]         = useState(0)
  const [feedback, setFeedback]         = useState('Initializing hand tracking…')
  const [ready, setReady]               = useState(false)
  const [camError, setCamError]         = useState(false)
  const [handDetected, setHandDetected] = useState(false)
  const cleanupRef      = useRef<() => void>(() => {})
  const handLostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref (not a hook dependency) so a late-arriving reference doc doesn't tear down and
  // reinitialize the whole camera/MediaPipe pipeline — onResults always reads the latest.
  const referenceKeypointsRef = useRef(referenceKeypoints)
  useEffect(() => { referenceKeypointsRef.current = referenceKeypoints }, [referenceKeypoints])

  useEffect(() => {
    if (!videoEl || !canvasEl) return
    const video = videoEl  // narrow to non-null for use inside async init()
    let cancelled = false

    async function init() {
      try {
        const { Hands, HAND_CONNECTIONS }        = await import('@mediapipe/hands') as unknown as MPHandsModule
        const { Camera }                          = await import('@mediapipe/camera_utils') as unknown as MPCameraModule
        const { drawConnectors, drawLandmarks }   = await import('@mediapipe/drawing_utils') as unknown as MPDrawingModule

        const hands = new Hands({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}`,
        })
        // modelComplexity 0 (the "lite" model) + low confidence thresholds trade a little
        // accuracy for much faster, more responsive real-time detection.
        hands.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: 0.4, minTrackingConfidence: 0.3 })

        hands.onResults((results: MPHandsResults) => {
          if (cancelled || !canvasEl) return
          const ctx = canvasEl.getContext('2d')!
          ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
          ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height)
          if (results.multiHandLandmarks?.length) {
            // Hand seen this frame — cancel any pending "lost" reset so brief dropouts
            // (motion blur, a frame at the edge of the model's confidence) don't flicker.
            if (handLostTimerRef.current) {
              clearTimeout(handLostTimerRef.current)
              handLostTimerRef.current = null
            }
            for (const lm of results.multiHandLandmarks) {
              drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: '#18e5f0', lineWidth: 2 })
              drawLandmarks(ctx, lm, { color: '#35e98b', lineWidth: 1, radius: 4 })
            }
            setHandDetected(true)
            const hands = results.multiHandLandmarks as LandmarkPoint[][]
            onLandmarksRef.current?.(hands)
            // Same handSimilarity() math as the final scoreSession() — the live badge
            // and the end-of-assessment score must never be able to disagree.
            const result = scoreLiveFrame(hands, referenceKeypointsRef.current)
            setAccuracy(result.accuracy)
            setFeedback(result.feedback)
          } else if (!handLostTimerRef.current) {
            // Don't reset immediately — only treat the hand as truly gone after it's
            // been missing continuously for HAND_LOST_GRACE_MS.
            handLostTimerRef.current = setTimeout(() => {
              handLostTimerRef.current = null
              setHandDetected(false)
              setFeedback('Show your hand to the camera…')
              setAccuracy(0)
            }, HAND_LOST_GRACE_MS)
          }
        })

        const cam = new Camera(video, {
          onFrame: async () => { if (!cancelled) await hands.send({ image: video }) },
          width: 640, height: 480,
        })
        cam.start()
        if (!cancelled) setReady(true)
        cleanupRef.current = () => { cam.stop(); hands.close() }
      } catch {
        if (!cancelled) {
          setCamError(true)
          setFeedback('Camera access denied or MediaPipe failed to load.')
        }
      }
    }

    init()
    return () => {
      cancelled = true
      cleanupRef.current()
      if (handLostTimerRef.current) clearTimeout(handLostTimerRef.current)
    }
  }, [videoEl, canvasEl])

  return { accuracy, feedback, ready, camError, handDetected }
}

// ── Camera Panel ──────────────────────────────────────────────────────────────
interface CameraPanelProps {
  onLandmarksRef:     React.MutableRefObject<((hands: LandmarkPoint[][]) => void) | null>
  captureMode:        boolean
  framesCaptured:     number
  targetFrames:       number
  showMoveCloserHint: boolean
  referenceKeypoints: LandmarkPoint[] | null
  onReadyChange?:     (ready: boolean) => void
}

function CameraPanel({ onLandmarksRef, captureMode, framesCaptured, targetFrames, showMoveCloserHint, referenceKeypoints, onReadyChange }: CameraPanelProps) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [vidEl, setVidEl]       = useState<HTMLVideoElement | null>(null)
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)

  useEffect(() => { setVidEl(videoRef.current) }, [])
  useEffect(() => { setCanvasEl(canvasRef.current) }, [])

  const { accuracy, feedback, ready, camError, handDetected } = useHandTracking(vidEl, canvasEl, onLandmarksRef, referenceKeypoints)

  useEffect(() => { onReadyChange?.(ready) }, [ready, onReadyChange])

  if (camError) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center gap-4 p-8 text-center"
        style={{ background: '#0d1014', border: '1px solid rgba(248,113,113,0.3)', aspectRatio: '4/3' }}
      >
        <VideoOff size={36} style={{ color: '#f87171' }} />
        <div>
          <div className="text-sm font-semibold text-white mb-1">Camera Access Denied</div>
          <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
            Allow camera access in your browser settings, then refresh the page to use the hand-tracking assessment.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
        >
          Refresh Page
        </button>
      </div>
    )
  }

  // Green means "we can see your hand and are recording it" — the clear visual cue
  // that tracking is actually active, instead of a blind countdown.
  const liveColor  = captureMode ? (handDetected ? '#35e98b' : '#18e5f0') : '#2a3038'
  const borderGlow = captureMode ? (handDetected ? '#35e98b80' : '#18e5f080') : '#18e5f080'

  const statusText = !ready
    ? 'Starting camera…'
    : !captureMode
      ? feedback
      : !handDetected
        ? (showMoveCloserHint ? 'Move your hand closer to camera' : 'Show your hand to the camera…')
        : `Capturing your hand position… (${Math.min(framesCaptured, targetFrames)}/${targetFrames})`

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background:    '#0d1014',
        border:        `1px solid ${liveColor}`,
        aspectRatio:   '4/3',
        transition:    'border-color 0.3s',
      }}
    >
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />

      <div className="absolute inset-0 pointer-events-none">
        {(['tl','tr','bl','br'] as const).map(c => (
          <div key={c} className={`absolute w-6 h-6 ${c[0]==='t'?'top-3':'bottom-3'} ${c[1]==='l'?'left-3':'right-3'}`}
            style={{
              borderTop:    c[0]==='t' ? `2px solid ${captureMode ? liveColor : borderGlow}` : undefined,
              borderBottom: c[0]==='b' ? `2px solid ${captureMode ? liveColor : borderGlow}` : undefined,
              borderLeft:   c[1]==='l' ? `2px solid ${captureMode ? liveColor : borderGlow}` : undefined,
              borderRight:  c[1]==='r' ? `2px solid ${captureMode ? liveColor : borderGlow}` : undefined,
              transition:   'border-color 0.3s',
            }}
          />
        ))}

        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(13,16,20,0.75)' }}>
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <div className="w-7 h-7 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#18e5f0' }} />
              <div>
                <div className="text-sm font-semibold text-white">Loading hand-tracking model…</div>
                <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>Wait for this to finish before showing your hand.</div>
              </div>
            </div>
          </div>
        )}

        {captureMode && (
          <div className="absolute top-4 right-10 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
            style={{
              background: 'rgba(13,16,20,0.85)',
              border:     `1px solid ${handDetected ? '#35e98b' : '#6b7280'}`,
              color:      handDetected ? '#35e98b' : '#9ca3af',
            }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: handDetected ? '#35e98b' : '#6b7280' }} />
            {handDetected ? 'Hand Detected' : 'Searching…'}
          </div>
        )}

        {!captureMode && accuracy > 0 && (
          <div className="absolute top-4 right-10 px-3 py-1.5 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(13,16,20,0.85)', border: '1px solid #35e98b', color: '#35e98b' }}>
            {accuracy}% Accuracy
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 text-xs font-medium"
          style={{ background: 'linear-gradient(transparent, rgba(13,16,20,0.9))', color: ready ? liveColor : '#6b7280' }}>
          <Camera size={12} className="inline mr-1.5" />{statusText}
          {captureMode && handDetected && (
            <div className="mt-1.5 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (framesCaptured / targetFrames) * 100)}%`, background: '#35e98b' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Score Card ────────────────────────────────────────────────────────────────
function ScoreCard({
  score, tier, summary, fingerFeedback, keyFrameHint, xpAwarded, newBadgeIds, onRetry,
}: ScoreBreakdown & { xpAwarded: number; newBadgeIds: string[]; onRetry: () => void }) {
  const palette = {
    excellent: { border: '#35e98b', bg: 'rgba(53,233,139,0.07)',  accent: '#35e98b' },
    good:      { border: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  accent: '#f59e0b' },
    poor:      { border: '#f87171', bg: 'rgba(248,113,113,0.07)', accent: '#f87171' },
  }[tier]

  const feedbackEntries = Object.entries(fingerFeedback) as [string, string][]

  return (
    <div className="mt-4 rounded-2xl p-5" style={{ background: palette.bg, border: `1px solid ${palette.border}` }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-3xl font-black" style={{ color: palette.accent }}>{score}</span>
            <span className="text-sm font-semibold" style={{ color: '#6b7280' }}>/100</span>
          </div>
          <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: palette.accent }}>
            {tier === 'excellent' ? 'Excellent!' : tier === 'good' ? 'Good Attempt' : 'Keep Practicing'}
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl text-sm font-bold shrink-0"
          style={{ background: 'rgba(53,233,139,0.12)', color: '#35e98b', border: '1px solid rgba(53,233,139,0.25)' }}>
          +{xpAwarded} XP
        </div>
      </div>

      <p className="text-sm mb-4" style={{ color: '#9ca3af' }}>{summary}</p>

      {tier === 'excellent' && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4"
          style={{ background: 'rgba(53,233,139,0.1)', border: '1px solid rgba(53,233,139,0.2)' }}>
          <Check size={15} style={{ color: '#35e98b' }} />
          <span className="text-sm font-semibold" style={{ color: '#35e98b' }}>
            Task complete — next task unlocked!
          </span>
        </div>
      )}

      {tier === 'good' && (
        <div className="px-3 py-2.5 rounded-xl mb-4 text-xs"
          style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
          You&apos;re close! Try again focusing on your pinky break position and keeping an even finger curl.
        </div>
      )}

      {tier === 'poor' && feedbackEntries.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="text-[10px] font-bold tracking-widest mb-2" style={{ color: '#6b7280' }}>NEEDS IMPROVEMENT</div>
          {feedbackEntries.map(([finger, tip]) => (
            <div key={finger} className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: '#171c24', border: '1px solid #2a3038' }}>
              <span className="text-xs font-bold capitalize shrink-0 w-12 mt-0.5" style={{ color: '#f87171' }}>
                {finger}
              </span>
              <span className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>{tip}</span>
            </div>
          ))}
        </div>
      )}

      {tier === 'poor' && keyFrameHint && (
        <div className="px-3 py-2.5 rounded-xl mb-4 text-xs leading-relaxed"
          style={{ color: '#6b7280', background: 'rgba(24,229,240,0.03)', border: '1px solid rgba(24,229,240,0.1)' }}>
          Reference tip: {keyFrameHint}
        </div>
      )}

      {/* Badge unlock notification */}
      {newBadgeIds.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl mb-4"
          style={{ background: 'rgba(184,108,255,0.08)', border: '1px solid rgba(184,108,255,0.25)' }}>
          <span className="text-xl">🏆</span>
          <div>
            <div className="text-xs font-bold tracking-wider" style={{ color: '#b86cff' }}>BADGE UNLOCKED!</div>
            <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
              {newBadgeIds
                .map(id => ALL_BADGES.find(b => b.id === id)?.name)
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
      >
        <RefreshCw size={14} /> Redo
      </button>
    </div>
  )
}

// ── Task Row ──────────────────────────────────────────────────────────────────
interface TaskRowProps {
  task:       Task
  moduleId:   string
  trickName:  string
  onComplete: (order: number) => void
}

function TaskRow({ task, moduleId, trickName, onComplete }: TaskRowProps) {
  const { firebaseUser, setUserData } = useAuth()
  const isComplete = task.status === 'complete'
  const isActive   = task.status === 'active'
  const isLocked   = task.status === 'locked'
  const hasCam     = task.order === 3

  type Phase = 'watching' | 'capturing' | 'result'
  const [phase, setPhase]               = useState<Phase>('watching')
  const [cameraReady, setCameraReady]   = useState(false)
  const [reference, setReference]       = useState<Record<string, unknown> | null>(null)
  const [framesCaptured, setFramesCaptured]     = useState(0)
  const [showMoveCloserHint, setShowMoveCloserHint] = useState(false)
  const [scoreResult, setScoreResult]   = useState<ScoreBreakdown | null>(null)
  const [xpAwarded, setXpAwarded]       = useState(0)
  const [newBadgeIds, setNewBadgeIds]   = useState<string[]>([])
  const [busy, setBusy]                 = useState(false)
  const [assessmentError, setAssessmentError] = useState('')

  // Fetched once, as soon as this task exists (alongside the camera preload) — reused for
  // both the live preview badge and the final score, so they can never disagree, and so
  // finishCapture() doesn't need a second Firestore round-trip.
  const referenceKeypoints = (reference?.referenceKeypoints as LandmarkPoint[] | undefined) ?? null

  useEffect(() => {
    if (!hasCam || isComplete) return
    let cancelled = false
    getDoc(doc(db, 'references', trickName)).then(snap => {
      if (!cancelled) setReference(snap.exists() ? (snap.data() as Record<string, unknown>) : null)
    })
    return () => { cancelled = true }
  }, [hasCam, isComplete, trickName])

  const frameBufferRef  = useRef<SessionFrame[]>([])
  const captureStartRef = useRef(0)
  const lastSampleRef   = useRef(0)
  const cancelRef       = useRef(false)
  const finishingRef    = useRef(false)
  const noHandTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxCapTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onLandmarksRef  = useRef<((hands: LandmarkPoint[][]) => void) | null>(null)

  function clearCaptureTimers() {
    if (noHandTimerRef.current) clearTimeout(noHandTimerRef.current)
    if (maxCapTimerRef.current) clearTimeout(maxCapTimerRef.current)
    noHandTimerRef.current = null
    maxCapTimerRef.current = null
  }

  useEffect(() => clearCaptureTimers, [])

  useEffect(() => {
    if (phase === 'capturing') {
      onLandmarksRef.current = (hands) => {
        if (hands.length === 0) return
        setShowMoveCloserHint(false)
        const now = Date.now()
        if (now - lastSampleRef.current < SAMPLE_INTERVAL_MS) return
        lastSampleRef.current = now
        frameBufferRef.current.push({ t: now - captureStartRef.current, hands })
        setFramesCaptured(frameBufferRef.current.length)
        if (frameBufferRef.current.length >= TARGET_FRAMES) finishCapture()
      }
    } else {
      onLandmarksRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  async function finishCapture() {
    if (finishingRef.current || cancelRef.current) return
    finishingRef.current = true
    clearCaptureTimers()

    setBusy(true)
    try {
      // Reference was already fetched when this task mounted (shared with the live preview
      // badge) — fall back to a fresh fetch only if that somehow hasn't resolved yet.
      const resolvedReference = reference ?? await getDoc(doc(db, 'references', trickName))
        .then(snap => (snap.exists() ? (snap.data() as Record<string, unknown>) : null))
        .catch(() => null)

      const capturedFrames = frameBufferRef.current
      const result = scoreSession(capturedFrames.map(f => f.hands), resolvedReference)
      const xp     = result.tier === 'excellent' ? 100 : result.tier === 'good' ? 50 : 25
      setXpAwarded(xp)

      if (firebaseUser) {
        // Raw keypoint frames are telemetry, not user-facing — don't let a failure
        // here (or a doc-size edge case) block the score/XP writes that matter.
        try {
          await saveSession(firebaseUser.uid, {
            trickName,
            frames: capturedFrames,
            score:  result.score,
            tier:   result.tier,
          })
        } catch (sessionErr) {
          console.error('[Practice] Failed to save session keypoints (non-fatal):', sessionErr)
        }

        await saveAssessmentScore(firebaseUser.uid, {
          trickName,
          score:    result.score,
          tier:     result.tier,
          feedback: result.summary,
        })
        await addXP(firebaseUser.uid, xp)
        if (result.tier === 'excellent') {
          await addCompletedTask(firebaseUser.uid, `${moduleId}-${task.order}`)
          onComplete(task.order)
        }
        const updated = await fetchUserDocument(firebaseUser.uid)
        if (updated) {
          const awarded = await checkAndAwardBadges(firebaseUser.uid, updated.badges ?? [], {
            newScore:       result.score,
            completedTasks: updated.completedTasks,
          })
          setNewBadgeIds(awarded)
          setUserData(awarded.length > 0
            ? { ...updated, badges: [...(updated.badges ?? []), ...awarded] }
            : updated,
          )
        }
      }

      setScoreResult(result)
    } catch (err) {
      console.error('[Practice] Failed to save assessment score/XP:', err)
      const detail = err instanceof Error ? ` (${err.message})` : ''
      setAssessmentError(`Failed to save your score. Check your connection and try again.${detail}`)
    } finally {
      setBusy(false)
      setPhase('result')
    }
  }

  function startAssessment() {
    cancelRef.current = false
    finishingRef.current = false
    frameBufferRef.current = []
    captureStartRef.current = Date.now()
    lastSampleRef.current = 0
    setFramesCaptured(0)
    setShowMoveCloserHint(false)
    setScoreResult(null)
    setNewBadgeIds([])
    setAssessmentError('')
    setPhase('capturing')

    noHandTimerRef.current = setTimeout(() => {
      if (!cancelRef.current && frameBufferRef.current.length === 0) setShowMoveCloserHint(true)
    }, NO_HAND_HINT_MS)

    // Safety net: finish with whatever we have (scoreSession handles too-few-frames gracefully)
    // rather than letting an assessment hang forever if tracking never stabilizes.
    maxCapTimerRef.current = setTimeout(() => { finishCapture() }, MAX_CAPTURE_MS)
  }

  function stopAssessment() {
    cancelRef.current = true
    clearCaptureTimers()
    setPhase('watching')
  }

  function retry() {
    setPhase('watching')
    setScoreResult(null)
    setAssessmentError('')
  }

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center pt-1">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: isComplete ? 'rgba(53,233,139,0.15)' : isActive ? 'rgba(24,229,240,0.12)' : 'transparent',
            border:     `2px solid ${isComplete ? '#35e98b' : isActive ? '#18e5f0' : '#2a3038'}`,
          }}
        >
          {isComplete && <CheckCircle2 size={16} style={{ color: '#35e98b' }} />}
          {isActive   && <PlayCircle   size={16} style={{ color: '#18e5f0' }} />}
          {isLocked   && <Lock         size={14} style={{ color: '#4b5563' }} />}
        </div>
      </div>

      <div
        className="flex-1 rounded-2xl p-5 mb-4"
        style={{
          background: isActive ? 'rgba(24,229,240,0.04)' : '#171c24',
          border:     `1px solid ${isActive ? '#18e5f040' : '#2a3038'}`,
          opacity:    isLocked ? 0.45 : 1,
        }}
      >
        <div className="text-[10px] font-bold tracking-widest mb-1" style={{ color: isActive ? '#18e5f0' : '#6b7280' }}>
          Task {String(task.order).padStart(2, '0')}{isActive ? ' · ACTIVE' : ''}
        </div>
        <div className="font-bold text-white text-base">{task.title}</div>
        <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>{task.description}</p>

        {/* Preloaded as soon as this task exists in the module (not gated on isActive) so
            the MediaPipe model is already warm by the time the user reaches this task —
            visually hidden until then, but the camera/model keep initializing in the background. */}
        {hasCam && !isComplete && (
          <div className={isActive ? 'mt-5' : 'h-0 w-0 overflow-hidden opacity-0'}>
            <CameraPanel
              onLandmarksRef={onLandmarksRef}
              captureMode={phase === 'capturing'}
              framesCaptured={framesCaptured}
              targetFrames={TARGET_FRAMES}
              showMoveCloserHint={showMoveCloserHint}
              referenceKeypoints={referenceKeypoints}
              onReadyChange={setCameraReady}
            />
          </div>
        )}

        {isActive && (
          <div className="mt-5">
            {hasCam ? (
              <>
                {phase === 'watching' && (
                  cameraReady ? (
                    <button
                      onClick={startAssessment}
                      className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg,#18e5f0,#b86cff)', color: 'white' }}
                    >
                      <Camera size={15} /> Start Assessment
                    </button>
                  ) : (
                    <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: '#6b7280' }}>
                      <div className="w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                        style={{ borderTopColor: '#18e5f0' }} />
                      Loading hand-tracking model…
                    </div>
                  )
                )}

                {phase === 'capturing' && !busy && (
                  <button
                    onClick={stopAssessment}
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
                  >
                    <Square size={13} /> Stop
                  </button>
                )}

                {busy && (
                  <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: '#18e5f0' }}>
                    <div className="w-4 h-4 rounded-full border-2 border-transparent animate-spin"
                      style={{ borderTopColor: '#18e5f0' }} />
                    Analysing…
                  </div>
                )}

                {assessmentError && phase === 'result' && !busy && (
                  <div className="mt-4 flex items-start gap-2 px-3 py-3 rounded-xl text-xs"
                    style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    {assessmentError}
                    <button onClick={retry} className="ml-auto underline font-semibold shrink-0">Try again</button>
                  </div>
                )}

                {phase === 'result' && scoreResult && !busy && !assessmentError && (
                  <ScoreCard
                    {...scoreResult}
                    xpAwarded={xpAwarded}
                    newBadgeIds={newBadgeIds}
                    onRetry={retry}
                  />
                )}
              </>
            ) : (
              <button
                onClick={() => onComplete(task.order)}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
              >
                <Check size={16} /> Mark Complete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function initModuleTasks(
  rawTasks:     Omit<Task, 'status'>[],
  moduleId:     string,
  completedIds: string[],
): Task[] {
  const tasks: Task[] = rawTasks.map(t => ({
    ...t,
    status: (completedIds.includes(`${moduleId}-${t.order}`) ? 'complete' : 'locked') as Task['status'],
  }))
  const first = tasks.findIndex(t => t.status !== 'complete')
  if (first !== -1) tasks[first] = { ...tasks[first], status: 'active' }
  return tasks
}

// ── Module Picker ─────────────────────────────────────────────────────────────
interface ModulePickerProps {
  onSelect: (m: PracticeModuleData) => void
}

// Only these 3 tricks are active for this phase — the rest stay defined in
// mockData (so existing Firestore completedTasks IDs remain meaningful) but hidden.
const ACTIVE_MODULE_IDS = ['double-lift', 'false-shuffle', 'charlier-cut']

function ModulePicker({ onSelect }: ModulePickerProps) {
  const { userData } = useAuth()
  const completedIds = userData?.completedTasks ?? []
  const activeModules = practiceModules.filter(m => ACTIVE_MODULE_IDS.includes(m.id))

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[900px]">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Practice</h1>
      <p className="text-sm mb-8" style={{ color: '#9ca3af' }}>
        Choose a trick to train. Complete all 6 tasks to master it.
      </p>

      {/* BEGINNER */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] font-bold tracking-widest px-3 py-1 rounded-full"
            style={{ background: 'rgba(53,233,139,0.12)', color: '#35e98b', border: '1px solid rgba(53,233,139,0.25)' }}>
            BEGINNER
          </span>
          <div className="flex-1 h-px" style={{ background: '#2a3038' }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeModules.map(m => {
            const done  = completedIds.filter(id => id.startsWith(`${m.id}-`)).length
            const total = m.tasks.length
            const pct   = Math.round((done / total) * 100)

            return (
              <button
                key={m.id}
                onClick={() => onSelect(m)}
                className="text-left rounded-2xl p-5 transition-all hover:scale-[1.02]"
                style={{ background: '#171c24', border: '1px solid #2a3038', cursor: 'pointer' }}
              >
                <div className="text-3xl mb-3">{m.emoji}</div>
                <div className="font-bold text-white text-sm mb-1">{m.trickName}</div>
                <p className="text-[11px] mb-4 leading-relaxed" style={{ color: '#6b7280' }}>{m.tagline}</p>

                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold" style={{ color: '#6b7280' }}>
                    {done}/{total} tasks
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: pct === 100 ? '#35e98b' : '#18e5f0' }}>
                    {pct === 100 ? 'MASTERED' : `${pct}%`}
                  </span>
                </div>
                <div className="h-1 rounded-full" style={{ background: '#2a3038' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width:      `${pct}%`,
                      background: pct === 100
                        ? 'linear-gradient(90deg,#35e98b,#18e5f0)'
                        : 'linear-gradient(90deg,#18e5f0,#b86cff)',
                    }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* INTERMEDIATE — Coming Soon */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] font-bold tracking-widest px-3 py-1 rounded-full"
            style={{ background: 'rgba(184,108,255,0.1)', color: '#b86cff', border: '1px solid rgba(184,108,255,0.25)' }}>
            INTERMEDIATE
          </span>
          <div className="flex-1 h-px" style={{ background: '#2a3038' }} />
        </div>
        <div className="rounded-2xl p-8 flex items-center justify-center gap-4"
          style={{ background: '#0d1014', border: '1px dashed #2a3038' }}>
          <Lock size={18} style={{ color: '#4b5563' }} />
          <div>
            <div className="text-sm font-semibold text-white">Coming Soon</div>
            <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
              Master all Beginner tricks to unlock Intermediate content.
            </div>
          </div>
        </div>
      </div>

      {/* ADVANCED — Coming Soon */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] font-bold tracking-widest px-3 py-1 rounded-full"
            style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
            ADVANCED
          </span>
          <div className="flex-1 h-px" style={{ background: '#2a3038' }} />
        </div>
        <div className="rounded-2xl p-8 flex items-center justify-center gap-4"
          style={{ background: '#0d1014', border: '1px dashed #2a3038' }}>
          <Lock size={18} style={{ color: '#4b5563' }} />
          <div>
            <div className="text-sm font-semibold text-white">Coming Soon</div>
            <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
              Advanced routines are in development. Stay tuned.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Module View ───────────────────────────────────────────────────────────────
interface ModuleViewProps {
  module: PracticeModuleData
  onBack: () => void
}

function ModuleView({ module, onBack }: ModuleViewProps) {
  const { firebaseUser, userData, setUserData } = useAuth()
  const completedIds = userData?.completedTasks ?? []

  const [tasks, setTasks] = useState<Task[]>(() =>
    initModuleTasks(module.tasks, module.id, completedIds),
  )

  useEffect(() => {
    queueMicrotask(() => {
      setTasks(prev => {
        // Union of local state + Firestore — never regress progress
        const localIds = prev
          .filter(t => t.status === 'complete')
          .map(t => `${module.id}-${t.order}`)
        const merged = [...completedIds, ...localIds.filter(id => !completedIds.includes(id))]
        return initModuleTasks(module.tasks, module.id, merged)
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData])

  const completedCount = tasks.filter(t => t.status === 'complete').length
  const total          = tasks.length

  async function handleComplete(order: number) {
    const taskId = `${module.id}-${order}`

    setTasks(prev => {
      const next: Task[] = prev.map(t =>
        t.order === order ? { ...t, status: 'complete' as const } : t,
      )
      const idx = next.findIndex(t => t.order === order)
      if (idx !== -1 && idx + 1 < next.length && next[idx + 1].status !== 'complete') {
        next[idx + 1] = { ...next[idx + 1], status: 'active' as const }
      }
      return next
    })

    if (firebaseUser && order !== 3) {
      try {
        await addCompletedTask(firebaseUser.uid, taskId)

        if (userData) {
          const updatedTasks = completedIds.includes(taskId)
            ? completedIds
            : [...completedIds, taskId]
          const updatedUser = { ...userData, completedTasks: updatedTasks }

          const awarded = await checkAndAwardBadges(firebaseUser.uid, updatedUser.badges, {
            completedTasks: updatedTasks,
          })

          setUserData(awarded.length > 0
            ? { ...updatedUser, badges: [...updatedUser.badges, ...awarded] }
            : updatedUser,
          )
        }
      } catch {
        // Task marked complete locally; Firestore write will retry on reconnect
      }
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6 gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: '#9ca3af' }}
        >
          <ChevronLeft size={16} /> All Tricks
        </button>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
        >
          End Session
        </button>
      </div>

      {/* Module header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{module.emoji}</span>
            <span
              className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider"
              style={{ background: 'rgba(53,233,139,0.12)', color: '#35e98b', border: '1px solid rgba(53,233,139,0.2)' }}
            >
              {module.difficulty}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">{module.trickName}</h1>
          <p className="text-sm mt-1 max-w-lg" style={{ color: '#9ca3af' }}>{module.tagline}</p>
        </div>

        <div className="rounded-2xl p-4 text-center shrink-0 sm:ml-6"
          style={{ background: '#171c24', border: '1px solid #2a3038', minWidth: 130 }}>
          <div className="text-[10px] font-semibold tracking-widest" style={{ color: '#6b7280' }}>PROGRESS</div>
          <div className="text-3xl font-bold text-white mt-1">
            {completedCount}<span className="text-lg" style={{ color: '#6b7280' }}>/{total}</span>
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>Tasks</div>
          <div className="mt-2 h-1.5 rounded-full w-full" style={{ background: '#2a3038' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width:      `${(completedCount / total) * 100}%`,
                background: 'linear-gradient(90deg,#18e5f0,#35e98b)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Task list */}
      <div>
        {tasks.map(task => (
          <TaskRow
            key={task.order}
            task={task}
            moduleId={module.id}
            trickName={module.trickName}
            onComplete={handleComplete}
          />
        ))}
      </div>
    </div>
  )
}

// ── Practice Screen ───────────────────────────────────────────────────────────
export default function PracticeScreen() {
  const [selectedModule, setSelectedModule] = useState<PracticeModuleData | null>(null)

  if (selectedModule) {
    return <ModuleView module={selectedModule} onBack={() => setSelectedModule(null)} />
  }
  return <ModulePicker onSelect={setSelectedModule} />
}
