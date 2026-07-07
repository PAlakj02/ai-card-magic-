// Persists practice-session hand-tracking captures to Firestore under
// users/{uid}/sessions/{sessionId}, one document per attempt (fresh doc on every Redo).
import { addDoc, collection, Timestamp } from 'firebase/firestore'
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
