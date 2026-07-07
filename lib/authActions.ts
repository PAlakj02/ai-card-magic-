import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, addDoc, collection,
  query, orderBy, limit, getDocs, increment, Timestamp,
} from 'firebase/firestore'
import { auth, db }    from './firebase'
import { levelFromXP } from './xp'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FirestoreUser {
  displayName:    string
  level:          number
  xp:             number
  streak:         number
  lastLogin:      Timestamp
  skillsMastered: number
  accuracy:       number
  badges:         string[]
  completedTasks: string[]
  videosWatched:  number
  hoursPracticed: number
  rank:           number
}

export interface AssessmentScore {
  id:        string
  trickName: string
  score:     number
  tier:      'excellent' | 'good' | 'poor'
  feedback:  string
  createdAt: Timestamp
}

// ── Badge definitions (single source of truth) ────────────────────────────────

export const ALL_BADGES = [
  { id: 'beta-pioneer',  name: 'Beta Pioneer',  emoji: '🌿', color: '#35e98b', bgColor: 'rgba(53,233,139,0.12)',   desc: 'Joined during beta' },
  { id: 'first-miracle', name: 'First Miracle', emoji: '⭐', color: '#f5f5f5', bgColor: 'rgba(245,245,245,0.12)', desc: 'Completed first assessment' },
  { id: 'ghost-hands',   name: 'Ghost Hands',   emoji: '👁️', color: '#18e5f0', bgColor: 'rgba(24,229,240,0.15)',  desc: 'Scored ≥90 on any trick' },
  { id: 'flourish-king', name: 'Flourish King', emoji: '♠️', color: '#b86cff', bgColor: 'rgba(184,108,255,0.15)', desc: 'Completed all 6 beginner tricks' },
] as const

export type BadgeId = typeof ALL_BADGES[number]['id']

const BEGINNER_MODULE_IDS = [
  'double-lift', 'false-shuffle', 'classic-force',
  'charlier-cut', 'invisible-palm', 'thumb-fan',
]

// ── Badge check — returns newly awarded IDs and writes to Firestore ────────────

export async function checkAndAwardBadges(
  uid:           string,
  currentBadges: string[],
  opts: { newScore?: number; completedTasks?: string[]; isNewSignup?: boolean },
): Promise<string[]> {
  const earned = new Set(currentBadges)
  const newly: string[] = []

  if (opts.isNewSignup && !earned.has('beta-pioneer')) {
    newly.push('beta-pioneer')
  }

  if (opts.newScore !== undefined) {
    if (!earned.has('first-miracle')) newly.push('first-miracle')
    if (opts.newScore >= 90 && !earned.has('ghost-hands')) newly.push('ghost-hands')
  }

  if (opts.completedTasks) {
    const allComplete = BEGINNER_MODULE_IDS.every(
      mid => opts.completedTasks!.includes(`${mid}-6`),
    )
    if (allComplete && !earned.has('flourish-king')) newly.push('flourish-king')
  }

  if (newly.length > 0) {
    await updateDoc(doc(db, 'users', uid), { badges: arrayUnion(...newly) })
  }
  return newly
}

// ── User document ─────────────────────────────────────────────────────────────

export async function createUserDocument(uid: string, email: string): Promise<FirestoreUser> {
  const newUser: FirestoreUser = {
    displayName:    email.split('@')[0],
    level:          1,
    xp:             0,
    streak:         0,
    lastLogin:      Timestamp.now(),
    skillsMastered: 0,
    accuracy:       0,
    badges:         [],
    completedTasks: [],
    videosWatched:  0,
    hoursPracticed: 0,
    rank:           999,
  }
  await setDoc(doc(db, 'users', uid), newUser)
  return newUser
}

export async function fetchUserDocument(uid: string): Promise<FirestoreUser | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? (snap.data() as FirestoreUser) : null
}

// ── Streak ────────────────────────────────────────────────────────────────────

export async function refreshStreak(uid: string, current: FirestoreUser): Promise<FirestoreUser> {
  const lastDate = current.lastLogin.toDate()
  const todayMs  = new Date().setHours(0, 0, 0, 0)
  const lastMs   = new Date(lastDate).setHours(0, 0, 0, 0)
  const diffDays = Math.round((todayMs - lastMs) / 86_400_000)

  if (diffDays === 0) return current

  const newStreak    = diffDays === 1 ? current.streak + 1 : 0
  const newLastLogin = Timestamp.now()
  await updateDoc(doc(db, 'users', uid), { lastLogin: newLastLogin, streak: newStreak })
  return { ...current, streak: newStreak, lastLogin: newLastLogin }
}

// ── XP & Level ────────────────────────────────────────────────────────────────

export async function addCompletedTask(uid: string, taskId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { completedTasks: arrayUnion(taskId) })
}

export async function addXP(uid: string, amount: number): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { xp: increment(amount) })
  const fresh = await fetchUserDocument(uid)
  if (!fresh) return
  const newLevel = levelFromXP(fresh.xp)
  if (newLevel !== fresh.level) {
    await updateDoc(doc(db, 'users', uid), { level: newLevel })
  }
}

// ── Assessment scores (users/{uid}/scores subcollection) ──────────────────────

export async function saveAssessmentScore(
  uid:   string,
  entry: Omit<AssessmentScore, 'id' | 'createdAt'>,
): Promise<void> {
  await addDoc(collection(db, 'users', uid, 'scores'), {
    ...entry,
    createdAt: Timestamp.now(),
  })
}

export async function fetchRecentScores(uid: string, count = 5): Promise<AssessmentScore[]> {
  const q    = query(collection(db, 'users', uid, 'scores'), orderBy('createdAt', 'desc'), limit(count))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AssessmentScore))
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string): Promise<FirestoreUser> {
  const cred    = await createUserWithEmailAndPassword(auth, email, password)
  const newUser = await createUserDocument(cred.user.uid, email)
  const newBadgeIds = await checkAndAwardBadges(cred.user.uid, [], { isNewSignup: true })
  return newBadgeIds.length > 0
    ? { ...newUser, badges: newBadgeIds }
    : newUser
}

export async function signIn(email: string, password: string): Promise<FirestoreUser> {
  const cred     = await signInWithEmailAndPassword(auth, email, password)
  const userData = await fetchUserDocument(cred.user.uid)
  if (!userData) return createUserDocument(cred.user.uid, email)
  return refreshStreak(cred.user.uid, userData)
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}
