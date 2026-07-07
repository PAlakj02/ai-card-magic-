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

export async function saveSession(
  uid:   string,
  entry: Omit<PracticeSession, 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'users', uid, 'sessions'), {
    ...entry,
    createdAt: Timestamp.now(),
  })
  return ref.id
}
