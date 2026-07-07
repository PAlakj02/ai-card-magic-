// ─── Types ────────────────────────────────────────────────────────────────────
export type Screen = 'home' | 'courses' | 'videos' | 'practice' | 'video-lesson' | 'profile' | 'feedback'
export type TaskStatus = 'complete' | 'active' | 'locked'
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type NodeStatus = 'complete' | 'active' | 'locked'

export interface Task {
  id: number
  title: string
  description: string
  status: TaskStatus
  order: number
}

export interface Video {
  id: number
  title: string
  thumbnailSeed: string
  videoUrl: string
  difficulty: Difficulty
  tags: string[]
  durationSeconds: number
  views: number
  postedAt: string
  description: string
  youtubeId?: string
}

export interface CourseNode {
  id: number
  title: string
  status: NodeStatus
  subtitle?: string
}

export interface Badge {
  id: number
  name: string
  emoji: string
  unlocked: boolean
  color: string
  bgColor: string
}

export interface FeedbackBreakdown {
  category: string
  score: number
}

export interface AIReview {
  id: number
  title: string
  thumbnailSeed: string
  score: number
  grade: string
  date: string
}

// ─── User ─────────────────────────────────────────────────────────────────────
export const user = {
  name: 'Julian Vane',
  avatarSeed: 'juliavane',
  level: 8,
  rankTitle: 'Sleight Master',
  grandTitle: 'GRANDMASTER LEVEL',
  totalXP: 12450,
  currentXP: 2450,
  xpToNextLevel: 3000,
  dayStreak: 14,
  skillsMastered: 12,
  accuracyScore: 94,
  videosWatched: 42,
  hoursPracticed: 18.5,
  rank: 42,
  dashboardXP: 1250,
  overallProgress: 38,
}

// ─── Badges ───────────────────────────────────────────────────────────────────
export const badges: Badge[] = [
  { id: 1, name: 'Ghost Hands',    emoji: '👁️',  unlocked: true,  color: '#18e5f0', bgColor: 'rgba(24,229,240,0.15)' },
  { id: 2, name: 'Flourish King',  emoji: '♠️',  unlocked: true,  color: '#b86cff', bgColor: 'rgba(184,108,255,0.15)' },
  { id: 3, name: 'Mind Reader',    emoji: '🔮',  unlocked: true,  color: '#35e98b', bgColor: 'rgba(53,233,139,0.15)' },
  { id: 4, name: 'Legendary Deck', emoji: '🔒',  unlocked: false, color: '#6b7280', bgColor: 'rgba(107,114,128,0.10)' },
  { id: 5, name: 'First Miracle',  emoji: '⭐',  unlocked: true,  color: '#f5f5f5', bgColor: 'rgba(245,245,245,0.12)' },
  { id: 6, name: 'Beta Pioneer',   emoji: '🌿',  unlocked: true,  color: '#35e98b', bgColor: 'rgba(53,233,139,0.12)' },
]

// ─── Home stat cards ──────────────────────────────────────────────────────────
export const statCards = [
  { label: 'VIDEOS WATCHED',   value: '42',    icon: 'Eye' },
  { label: 'HOURS PRACTICED',  value: '18.5h', icon: 'Clock' },
  { label: 'SKILLS MASTERED',  value: '12',    icon: 'Award' },
  { label: 'ACCURACY SCORE',   value: '94%',   icon: 'Target' },
]

// ─── Videos ───────────────────────────────────────────────────────────────────
export const videos: Video[] = [
  {
    id: 1,
    title: 'The Invisible Palm',
    thumbnailSeed: 'magic1',
    videoUrl: '',
    difficulty: 'ADVANCED',
    tags: ['PALMING', 'PERFORMANCE'],
    durationSeconds: 762,
    views: 2400,
    postedAt: '2 days ago',
    description: 'Master the sleight that fooled the greatest minds in magic. The Invisible Palm allows you to vanish and reproduce cards with zero visual clues.',
    youtubeId: '-3NNX_4InXI',
  },
  {
    id: 2,
    title: 'Classic Force Tutorial',
    thumbnailSeed: 'magic2',
    videoUrl: '',
    difficulty: 'INTERMEDIATE',
    tags: ['FORCES', 'SLEIGHT'],
    durationSeconds: 495,
    views: 8100,
    postedAt: '1 week ago',
    description: 'The Classic Force is the most elegant way to force a card. Learn the psychology, timing, and mechanics from Grandmaster AI.',
    youtubeId: '0kxSPJzKYkg',
  },
  {
    id: 3,
    title: 'Charlier Cut Basics',
    thumbnailSeed: 'magic3',
    videoUrl: '',
    difficulty: 'BEGINNER',
    tags: ['FLOURISHES'],
    durationSeconds: 330,
    views: 15200,
    postedAt: '2 weeks ago',
    description: 'The foundation of all one-handed cuts. Master this move and you unlock a world of flourish combinations.',
    youtubeId: 'BNC_DD9XccI',
  },
  {
    id: 4,
    title: 'False Shuffle Masterclass',
    thumbnailSeed: 'magic4',
    videoUrl: '',
    difficulty: 'INTERMEDIATE',
    tags: ['SLEIGHT', 'SHUFFLE'],
    durationSeconds: 540,
    views: 9800,
    postedAt: '3 days ago',
    description: 'Shuffle the deck convincingly while keeping every card in place. The perfect false shuffle is invisible even under scrutiny.',
    youtubeId: 'ZGHd-iYJyMk',
  },
  {
    id: 5,
    title: 'The Double Lift Masterclass',
    thumbnailSeed: 'magic5',
    videoUrl: '',
    difficulty: 'INTERMEDIATE',
    tags: ['TECHNIQUE', 'CORE'],
    durationSeconds: 585,
    views: 45000,
    postedAt: '1 month ago',
    description: 'The most fundamental and powerful sleight in card magic. Learn the physics, the psychology, and the flawless execution from Grandmaster AI.',
    youtubeId: 'Gjd4EDm3EWU',
  },
  {
    id: 6,
    title: 'Thumb Fan Perfection',
    thumbnailSeed: 'magic6',
    videoUrl: '',
    difficulty: 'BEGINNER',
    tags: ['FLOURISHES'],
    durationSeconds: 260,
    views: 12000,
    postedAt: '3 weeks ago',
    description: 'Create a perfect fan every single time. This technique-focused lesson breaks down the pressure, angle, and humidity considerations.',
    youtubeId: 'M85gA8Zwzzk',
  },
]

// ─── Featured course (home screen) ───────────────────────────────────────────
export const featuredCourse = {
  id: 1,
  title: 'Mastering the Double Lift',
  progress: 65,
  thumbnailSeed: 'magic5',
}

// ─── Course path nodes ────────────────────────────────────────────────────────
export const courseNodes: CourseNode[] = [
  { id: 1, title: 'Double Lift',   status: 'complete', subtitle: 'Module 1 · 4 tasks' },
  { id: 2, title: 'False Shuffle', status: 'complete', subtitle: 'Module 2 · 5 tasks' },
  { id: 3, title: 'Forces',        status: 'complete', subtitle: 'Module 3 · 6 tasks' },
  { id: 4, title: 'Card Control',  status: 'active',   subtitle: 'Module 4 · 6 tasks' },
  { id: 5, title: 'The Palm',      status: 'locked',   subtitle: 'Module 5 · 8 tasks' },
]

// ─── Practice tasks ───────────────────────────────────────────────────────────
export const practiceTasks: Task[] = [
  {
    id: 1,
    title: '20 Slow Repetitions',
    description: 'Focus on the break and the thumb positioning.',
    status: 'complete',
    order: 1,
  },
  {
    id: 2,
    title: 'Self-Recording',
    description: 'Review your footage for any finger flashes.',
    status: 'complete',
    order: 2,
  },
  {
    id: 3,
    title: 'Blind Practice',
    description: 'Perform the move without looking at your hands. Develop muscle memory by feeling the thickness of two cards as one.',
    status: 'active',
    order: 3,
  },
  {
    id: 4,
    title: 'Variable Speed',
    description: 'Practice at 0.5x, 1x, and 2x real-time speed.',
    status: 'locked',
    order: 4,
  },
  {
    id: 5,
    title: 'Mirror Work',
    description: 'Practice in front of a mirror to spot visible breaks.',
    status: 'locked',
    order: 5,
  },
  {
    id: 6,
    title: 'Performance Ready',
    description: 'Execute the move within a complete routine.',
    status: 'locked',
    order: 6,
  },
]

// ─── Practice module meta ─────────────────────────────────────────────────────
export const practiceModule = {
  title: 'Mastering the Lift',
  difficulty: 'Intermediate Sleight',
  moduleNum: 4,
  description:
    'The double lift is the foundation of modern card magic. This session focuses on making the action look identical to a single turnover.',
  totalTasks: 6,
  completedTasks: 2,
}

// ─── Practice modules (all 6 beginner tricks) ────────────────────────────────
export interface PracticeModuleData {
  id:         string       // slug used as Firestore task-ID prefix e.g. "double-lift"
  trickName:  string       // matches references/{trickName} in Firestore
  emoji:      string
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  tagline:    string
  tasks:      Omit<Task, 'status'>[]
}

export const practiceModules: PracticeModuleData[] = [
  {
    id: 'double-lift', trickName: 'Double Lift', emoji: '♠️',
    difficulty: 'BEGINNER',
    tagline: 'The foundation of modern card magic.',
    tasks: [
      { id: 1, order: 1, title: '20 Slow Repetitions',   description: 'Focus on the break and the thumb positioning.' },
      { id: 2, order: 2, title: 'Self-Recording',         description: 'Review your footage for any finger flashes.' },
      { id: 3, order: 3, title: 'Blind Practice',         description: 'Perform the move without looking at your hands. Develop muscle memory by feeling the thickness of two cards as one.' },
      { id: 4, order: 4, title: 'Variable Speed',         description: 'Practice at 0.5x, 1x, and 2x real-time speed.' },
      { id: 5, order: 5, title: 'Mirror Work',            description: 'Practice in front of a mirror to spot visible breaks.' },
      { id: 6, order: 6, title: 'Performance Ready',      description: 'Execute the Double Lift within a complete routine.' },
    ],
  },
  {
    id: 'false-shuffle', trickName: 'False Shuffle', emoji: '♣️',
    difficulty: 'BEGINNER',
    tagline: 'Shuffle convincingly while keeping every card in place.',
    tasks: [
      { id: 1, order: 1, title: 'Learn the In-jog',       description: 'Practice in-jogging the first packet consistently to mark the original deck order.' },
      { id: 2, order: 2, title: 'Build the Sequence',      description: 'Complete the full shuffle cycle slowly — in-jog, shuffle above, break, and cut.' },
      { id: 3, order: 3, title: 'Blind Practice',          description: 'Execute the false shuffle without looking at your hands. Focus on feeling the in-jog step.' },
      { id: 4, order: 4, title: 'Speed Progression',       description: 'Gradually increase shuffle speed until it looks natural and casual.' },
      { id: 5, order: 5, title: 'Mirror Inspection',       description: 'Check in a mirror that no packets flash or visibly separate.' },
      { id: 6, order: 6, title: 'Performance Ready',       description: 'Use the false shuffle in a full card routine to demonstrate a fair shuffle.' },
    ],
  },
  {
    id: 'classic-force', trickName: 'Classic Force', emoji: '♥️',
    difficulty: 'BEGINNER',
    tagline: 'Guide any spectator to your chosen card.',
    tasks: [
      { id: 1, order: 1, title: 'Timing Study',            description: 'Watch tutorial video 3 times focusing only on the moment the force card is pushed.' },
      { id: 2, order: 2, title: 'Solo Dry Runs',           description: 'Practice spreading with the force card on top 20 times, no spectator.' },
      { id: 3, order: 3, title: 'Blind Practice',          description: 'Execute the spread and force without looking at your own hands — trust muscle memory.' },
      { id: 4, order: 4, title: 'Casual Spread',           description: 'Make the spread look natural and unhurried — vary your pace each run.' },
      { id: 5, order: 5, title: 'Partner Practice',        description: 'Force on a willing friend 5 times. Aim for 4 out of 5 successful forces.' },
      { id: 6, order: 6, title: 'Performance Ready',       description: 'Execute the force in a complete effect with a reveal.' },
    ],
  },
  {
    id: 'charlier-cut', trickName: 'Charlier Cut', emoji: '♦️',
    difficulty: 'BEGINNER',
    tagline: 'The essential one-handed cut.',
    tasks: [
      { id: 1, order: 1, title: 'One-Handed Balance',      description: 'Hold the deck on four fingers with thumb raised. Find the natural balance point.' },
      { id: 2, order: 2, title: 'Bottom Drop Drill',       description: 'Practice letting the bottom half drop cleanly without the top half collapsing.' },
      { id: 3, order: 3, title: 'Blind Practice',          description: 'Execute the full Charlier Cut without looking at your hand. Feel each stage.' },
      { id: 4, order: 4, title: 'Flow Repetitions',        description: '20 clean cuts in a row without stopping or re-gripping between cuts.' },
      { id: 5, order: 5, title: 'Speed Build',             description: 'Increase cut speed while maintaining clean packet separation on every rep.' },
      { id: 6, order: 6, title: 'Performance Ready',       description: 'Integrate the Charlier Cut into a flourish sequence.' },
    ],
  },
  {
    id: 'invisible-palm', trickName: 'Invisible Palm', emoji: '👁️',
    difficulty: 'BEGINNER',
    tagline: 'Vanish cards from one hand — produce them in the other.',
    tasks: [
      { id: 1, order: 1, title: 'Palm Mechanics',          description: 'Learn the classic palm with a single card. Hold it for 30 seconds without dropping.' },
      { id: 2, order: 2, title: 'Count and Palm',          description: 'Practice counting four cards into the left hand while secretly retaining one in the right palm.' },
      { id: 3, order: 3, title: 'Blind Practice',          description: 'Palm and reproduce cards without looking at your hands. Rely entirely on feel.' },
      { id: 4, order: 4, title: 'Angle Check',             description: 'Practice from a low angle, straight-on, and side-on to eliminate flashes.' },
      { id: 5, order: 5, title: 'Show Empty Drill',        description: 'Perfect the casual "empty hand" display with a palmed card. Must look natural.' },
      { id: 6, order: 6, title: 'Performance Ready',       description: 'Execute the full Invisible Palm sequence with a strong dramatic reveal.' },
    ],
  },
  {
    id: 'thumb-fan', trickName: 'Thumb Fan', emoji: '🌟',
    difficulty: 'BEGINNER',
    tagline: 'Create a perfect fan every single time.',
    tasks: [
      { id: 1, order: 1, title: 'Grip Foundation',         description: 'Establish the correct loading grip — deck vertical, four fingers as pivot, thumb at lower-left corner.' },
      { id: 2, order: 2, title: 'Pressure Arc Drill',      description: 'Practice the thumb sweep without cards to build muscle memory of the arc.' },
      { id: 3, order: 3, title: 'Blind Practice',          description: 'Execute the full fan without watching your thumb. Focus on consistent pressure through the arc.' },
      { id: 4, order: 4, title: 'Even Fan Work',           description: 'Focus on consistent spacing between all cards. Aim for a clean semicircle every rep.' },
      { id: 5, order: 5, title: 'Open and Close Drills',   description: 'Fan and close smoothly 20 times without cards catching or clumping.' },
      { id: 6, order: 6, title: 'Performance Ready',       description: 'Open a perfect Thumb Fan on demand as part of a performance introduction.' },
    ],
  },
]

// ─── Video lesson (single video detail) ──────────────────────────────────────
export const videoLesson = {
  ...videos[4], // "The Double Lift Masterclass"
  overview:
    "The double lift is not just a move; it's a piece of theater. In this lesson, we break down the Stuart Gordon turnover and examine the exact finger pressure that makes detection impossible.",
  materials: [
    { name: 'Standard Deck', note: 'Recommended: Bicycle Rider Back or similar finish for optimal slip.' },
    { name: 'Camera Setup', note: 'Optional: Record yourself to review finger flash tendencies.' },
  ],
  instructions: [
    'Start with a pinky break above the bottom two cards.',
    'Apply gentle upward pressure with your thumb at the outer left corner.',
    'Execute the turnover in one smooth arc — same tempo as a single-card turnover.',
    'Square the two cards as one before displaying.',
  ],
  relatedLessons: [
    { id: 1, title: 'The Pinky Count Masterclass', meta: 'Lesson 04 · 12 mins', thumbnailSeed: 'rel1' },
    { id: 2, title: 'Ambitious Card Routine',        meta: 'Project · 45 mins',  thumbnailSeed: 'rel2' },
  ],
  xpPotential: 450,
  estimatedMins: 15,
}

// ─── Feedback / Mastery Report ────────────────────────────────────────────────
export const feedbackReport = {
  overallScore: 4.2,
  maxScore: 5,
  rank: 'Aspiring Illusionist',
  breakdown: [
    { category: 'Technique',    score: 4.5 },
    { category: 'Timing',       score: 4.0 },
    { category: 'Concealment',  score: 3.8 },
    { category: 'Consistency',  score: 4.3 },
  ] as FeedbackBreakdown[],
}

// ─── AI Reviews (profile screen) ─────────────────────────────────────────────
export const aiReviews: AIReview[] = [
  { id: 1, title: 'Classic Force',        thumbnailSeed: 'rev1', score: 92, grade: 'GREAT',  date: '2 days ago' },
  { id: 2, title: 'The Invisible Palm',   thumbnailSeed: 'rev2', score: 88, grade: 'SOLID',  date: '5 days ago' },
  { id: 3, title: 'Diagonal Palm Shift',  thumbnailSeed: 'rev3', score: 74, grade: 'GOOD',   date: '1 week ago' },
]

// helper
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
