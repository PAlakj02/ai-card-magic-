'use client'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Lock, PlayCircle, Camera, Check, RefreshCw, ChevronLeft, VideoOff, AlertCircle } from 'lucide-react'
import { practiceModules } from '@/data/mockData'
import type { PracticeModuleData, Task } from '@/data/mockData'
import { scoreMovement } from '@/lib/scoreMovement'
import type { LandmarkPoint } from '@/lib/scoreMovement'
import { computeAverageMetrics, scoreDoubleLift } from '@/lib/handScoring'
import type { ScoreBreakdown } from '@/lib/handScoring'
import { useAuth } from '@/context/AuthContext'
import {
  addCompletedTask, addXP, saveAssessmentScore, fetchUserDocument,
  checkAndAwardBadges, ALL_BADGES,
} from '@/lib/authActions'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// ── Hand tracking hook ────────────────────────────────────────────────────────
function useHandTracking(
  videoEl: HTMLVideoElement | null,
  canvasEl: HTMLCanvasElement | null,
  onLandmarksRef: React.MutableRefObject<((lm: LandmarkPoint[]) => void) | null>,
) {
  const [accuracy, setAccuracy] = useState(0)
  const [feedback, setFeedback] = useState('Initializing hand tracking…')
  const [ready, setReady]       = useState(false)
  const [camError, setCamError] = useState(false)
  const cleanupRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!videoEl || !canvasEl) return
    let cancelled = false

    async function init() {
      try {
        const { Hands, HAND_CONNECTIONS }        = await import('@mediapipe/hands') as any
        const { Camera }                          = await import('@mediapipe/camera_utils') as any
        const { drawConnectors, drawLandmarks }   = await import('@mediapipe/drawing_utils') as any

        const hands = new Hands({
          locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${f}`,
        })
        hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 })

        hands.onResults((results: any) => {
          if (cancelled || !canvasEl) return
          const ctx = canvasEl.getContext('2d')!
          ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
          ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height)
          if (results.multiHandLandmarks?.length) {
            for (const lm of results.multiHandLandmarks) {
              drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: '#18e5f0', lineWidth: 2 })
              drawLandmarks(ctx, lm, { color: '#35e98b', lineWidth: 1, radius: 4 })
            }
            const lm = results.multiHandLandmarks[0] as LandmarkPoint[]
            onLandmarksRef.current?.(lm)
            const result = scoreMovement(results.multiHandLandmarks)
            setAccuracy(result.accuracy)
            setFeedback(result.feedback)
          } else {
            setFeedback('Show your hand to the camera…')
            setAccuracy(0)
          }
        })

        const cam = new Camera(videoEl, {
          onFrame: async () => { if (!cancelled) await hands.send({ image: videoEl }) },
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
    return () => { cancelled = true; cleanupRef.current() }
  }, [videoEl, canvasEl])

  return { accuracy, feedback, ready, camError }
}

// ── Camera Panel ──────────────────────────────────────────────────────────────
interface CameraPanelProps {
  onLandmarksRef: React.MutableRefObject<((lm: LandmarkPoint[]) => void) | null>
  captureMode:   boolean
  countdown:     number
}

function CameraPanel({ onLandmarksRef, captureMode, countdown }: CameraPanelProps) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [vidEl, setVidEl]       = useState<HTMLVideoElement | null>(null)
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)

  useEffect(() => { setVidEl(videoRef.current) }, [])
  useEffect(() => { setCanvasEl(canvasRef.current) }, [])

  const { accuracy, feedback, ready, camError } = useHandTracking(vidEl, canvasEl, onLandmarksRef)

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

  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        background:    '#0d1014',
        border:        `1px solid ${captureMode ? '#18e5f0' : '#2a3038'}`,
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
              borderTop:    c[0]==='t' ? `2px solid ${captureMode?'#18e5f0':'#18e5f080'}` : undefined,
              borderBottom: c[0]==='b' ? `2px solid ${captureMode?'#18e5f0':'#18e5f080'}` : undefined,
              borderLeft:   c[1]==='l' ? `2px solid ${captureMode?'#18e5f0':'#18e5f080'}` : undefined,
              borderRight:  c[1]==='r' ? `2px solid ${captureMode?'#18e5f0':'#18e5f080'}` : undefined,
            }}
          />
        ))}

        {captureMode && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(13,16,20,0.55)' }}>
            <div className="text-center">
              <div className="text-7xl font-black mb-2" style={{ color: 'white', textShadow: '0 0 40px #18e5f0' }}>
                {countdown}
              </div>
              <div className="text-sm font-semibold tracking-wider" style={{ color: '#18e5f0' }}>
                HOLD YOUR POSITION
              </div>
            </div>
          </div>
        )}

        {!captureMode && accuracy > 0 && (
          <div className="absolute top-4 right-10 px-3 py-1.5 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(13,16,20,0.85)', border: '1px solid #35e98b', color: '#35e98b' }}>
            {accuracy}% Accuracy
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 text-xs font-medium"
          style={{ background: 'linear-gradient(transparent, rgba(13,16,20,0.9))', color: ready ? '#18e5f0' : '#6b7280' }}>
          {ready
            ? <><Camera size={12} className="inline mr-1.5" />{captureMode ? 'Capturing your hand position…' : feedback}</>
            : 'Starting camera…'}
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

      {tier !== 'excellent' && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
        >
          <RefreshCw size={14} /> Try Again
        </button>
      )}
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
  const [countdown, setCountdown]       = useState(3)
  const [scoreResult, setScoreResult]   = useState<ScoreBreakdown | null>(null)
  const [xpAwarded, setXpAwarded]       = useState(0)
  const [newBadgeIds, setNewBadgeIds]   = useState<string[]>([])
  const [busy, setBusy]                 = useState(false)
  const [assessmentError, setAssessmentError] = useState('')

  const frameBufferRef = useRef<LandmarkPoint[][]>([])
  const onLandmarksRef = useRef<((lm: LandmarkPoint[]) => void) | null>(null)

  useEffect(() => {
    if (phase === 'capturing') {
      onLandmarksRef.current = (lm) => { frameBufferRef.current.push(lm) }
    } else {
      onLandmarksRef.current = null
    }
  }, [phase])

  async function startAssessment() {
    frameBufferRef.current = []
    setScoreResult(null)
    setNewBadgeIds([])
    setAssessmentError('')
    setPhase('capturing')

    for (let t = 3; t >= 1; t--) {
      setCountdown(t)
      await new Promise(r => setTimeout(r, 1000))
    }
    setCountdown(0)

    setBusy(true)
    try {
      const refSnap   = await getDoc(doc(db, 'references', trickName))
      const reference = refSnap.exists() ? (refSnap.data() as Record<string, unknown>) : null

      const metrics = computeAverageMetrics(frameBufferRef.current)
      const result  = scoreDoubleLift(metrics, reference)
      const xp      = result.tier === 'excellent' ? 100 : result.tier === 'good' ? 50 : 25
      setXpAwarded(xp)

      if (firebaseUser) {
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
    } catch {
      setAssessmentError('Failed to save your score. Check your connection and try again.')
    } finally {
      setBusy(false)
      setPhase('result')
    }
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

        {isActive && (
          <div className="mt-5">
            {hasCam ? (
              <>
                <CameraPanel
                  onLandmarksRef={onLandmarksRef}
                  captureMode={phase === 'capturing'}
                  countdown={countdown}
                />

                {phase === 'watching' && (
                  <button
                    onClick={startAssessment}
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#18e5f0,#b86cff)', color: 'white' }}
                  >
                    <Camera size={15} /> Start 3-Second Assessment
                  </button>
                )}

                {busy && phase === 'result' && (
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

function ModulePicker({ onSelect }: ModulePickerProps) {
  const { userData } = useAuth()
  const completedIds = userData?.completedTasks ?? []

  return (
    <div className="p-8 max-w-[900px]">
      <h1 className="text-3xl font-bold text-white mb-1">Practice</h1>
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

        <div className="grid grid-cols-3 gap-4">
          {practiceModules.map(m => {
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
    setTasks(prev => {
      // Union of local state + Firestore — never regress progress
      const localIds = prev
        .filter(t => t.status === 'complete')
        .map(t => `${module.id}-${t.order}`)
      const merged = [...completedIds, ...localIds.filter(id => !completedIds.includes(id))]
      return initModuleTasks(module.tasks, module.id, merged)
    })
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
    <div className="p-8 max-w-3xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium mb-6 transition-opacity hover:opacity-70"
        style={{ color: '#9ca3af' }}
      >
        <ChevronLeft size={16} /> All Tricks
      </button>

      {/* Module header */}
      <div className="flex items-start justify-between mb-7">
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

        <div className="rounded-2xl p-4 text-center shrink-0 ml-6"
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
