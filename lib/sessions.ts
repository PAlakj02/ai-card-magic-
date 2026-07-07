// Persists practice-session hand-tracking captures to Firestore under
// users/{uid}/sessions/{sessionId}, one document per attempt (fresh doc on every Redo).
import { addDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { LandmarkPoint } from './scoreMovement'

export interface SessionFrame {
  t:     number              // ms since capture start
  hands: LandmarkPoint[][]   // one entry per detected hand (0-2), each 21 landmarks
}

export interface PracticeSession {
  trickName: string
  frames:    SessionFrame[]
  score:     number
  tier:      'excellent' | 'good' | 'poor'
  createdAt: Timestamp
}

// Firestore rejects arrays nested directly inside arrays ("Nested arrays are not
// supported"). `hands: LandmarkPoint[][]` is exactly that, so each hand's landmark
// array is wrapped in a map before writing — the in-memory/scoring shape elsewhere
// in the app is untouched, this conversion only happens at the Firestore boundary.
function toFirestoreFrames(frames: SessionFrame[]) {
  return frames.map(f => ({
    t:     f.t,
    hands: f.hands.map(landmarks => ({ landmarks })),
  }))
}

export async function saveSession(
  uid:   string,
  entry: Omit<PracticeSession, 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'sessions'), {
    trickName: entry.trickName,
    score:     entry.score,
    tier:      entry.tier,
    frames:    toFirestoreFrames(entry.frames),
    createdAt: Timestamp.now(),
  })
  return ref.id
}

// ── Practice heatmap (real session counts per day, straight from users/{uid}/sessions) ──
const DAY_MS = 86_400_000

function intensityFromAttempts(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  return 3
}

/**
 * Returns `days` intensity levels (0-3), oldest first, one per calendar day, ending
 * today. Driven entirely by real users/{uid}/sessions documents — a brand-new user
 * with zero sessions gets an all-zero (all-empty) array, never a placeholder pattern.
 */
export async function fetchPracticeHeatmap(uid: string, days = 35): Promise<number[]> {
  const since = Timestamp.fromMillis(Date.now() - days * DAY_MS)
  const q     = query(collection(db, 'users', uid, 'sessions'), where('createdAt', '>=', since))
  const snap  = await getDocs(q)

  const attemptsByDay = new Map<string, number>()
  for (const d of snap.docs) {
    const createdAt = (d.data() as PracticeSession).createdAt
    const key = createdAt.toDate().toDateString()
    attemptsByDay.set(key, (attemptsByDay.get(key) ?? 0) + 1)
  }

  const cells: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(Date.now() - i * DAY_MS).toDateString()
    cells.push(intensityFromAttempts(attemptsByDay.get(key) ?? 0))
  }
  return cells
}
