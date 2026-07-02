'use client'
import Image from 'next/image'
import { Flame, ArrowRight, Loader2 } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import ProgressRing from '@/components/ui/ProgressRing'
import BadgeIcon from '@/components/ui/BadgeIcon'
import { featuredCourse } from '@/data/mockData'
import { useAuth } from '@/context/AuthContext'
import { rankTitle } from '@/lib/xp'
import { ALL_BADGES } from '@/lib/authActions'
import type { Screen } from '@/data/mockData'

// Total beginner tasks: 6 modules × 6 tasks = 36
const TOTAL_TASKS = 36

interface Props { onNavigate: (s: Screen) => void }

export default function HomeScreen({ onNavigate }: Props) {
  const { userData } = useAuth()

  const level           = userData?.level   ?? 1
  const dayStreak       = userData?.streak  ?? 0
  const dashboardXP     = userData?.xp      ?? 0
  const overallProgress = userData
    ? Math.min(Math.round((userData.completedTasks.length / TOTAL_TASKS) * 100), 100)
    : 0

  const liveStatCards = [
    { label: 'VIDEOS WATCHED',  value: String(userData?.videosWatched  ?? 0),  icon: 'Eye'   },
    { label: 'HOURS PRACTICED', value: `${userData?.hoursPracticed ?? 0}h`,     icon: 'Clock' },
    { label: 'SKILLS MASTERED', value: String(userData?.skillsMastered ?? 0),  icon: 'Award' },
    { label: 'ACCURACY SCORE',  value: `${userData?.accuracy ?? 0}%`,           icon: 'Target'},
  ]

  // Build badge display objects from real Firestore data
  const earnedSet = new Set(userData?.badges ?? [])
  const displayBadges = ALL_BADGES.map((b, i) => ({
    id:       i + 1,
    name:     b.name,
    emoji:    b.emoji,
    color:    b.color,
    bgColor:  b.bgColor,
    unlocked: earnedSet.has(b.id),
  }))
  const hasAnyBadge = earnedSet.size > 0

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {userData?.displayName ?? 'Magician'}.
          </h1>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(24,229,240,0.12)', color: '#18e5f0', border: '1px solid rgba(24,229,240,0.25)' }}
            >
              Level {level} · {rankTitle(level)}
            </span>
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(53,233,139,0.1)', color: '#35e98b', border: '1px solid rgba(53,233,139,0.25)' }}
            >
              <Flame size={12} /> {dayStreak}-day Streak
            </span>
          </div>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="text-[10px] font-semibold tracking-widest" style={{ color: '#6b7280' }}>CURRENT XP</div>
            <div className="text-2xl font-bold text-white mt-0.5">{dashboardXP.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold tracking-widest" style={{ color: '#6b7280' }}>LEVEL</div>
            <div className="text-2xl font-bold mt-0.5" style={{ color: '#18e5f0' }}>{level}</div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {liveStatCards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Featured + Progress */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div
          className="col-span-2 rounded-2xl overflow-hidden relative cursor-pointer group"
          style={{ background: '#171c24', border: '1px solid #2a3038', minHeight: 240 }}
          onClick={() => onNavigate('video-lesson')}
        >
          <Image
            src={`https://picsum.photos/seed/${featuredCourse.thumbnailSeed}/700/300`}
            alt={featuredCourse.title}
            fill
            className="object-cover opacity-40 group-hover:opacity-50 transition-opacity"
          />
          <div className="absolute inset-0 flex flex-col justify-end p-6" style={{ background: 'linear-gradient(to top, rgba(13,16,20,0.95) 0%, transparent 60%)' }}>
            <span
              className="inline-block mb-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider w-fit"
              style={{ background: 'rgba(24,229,240,0.2)', color: '#18e5f0', border: '1px solid rgba(24,229,240,0.3)' }}
            >
              Recommended
            </span>
            <h2 className="text-2xl font-bold text-white">{featuredCourse.title}</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs" style={{ color: '#9ca3af' }}>Course Progress</span>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: '#2a3038' }}>
                <div className="h-full rounded-full" style={{ width: `${overallProgress}%`, background: 'linear-gradient(90deg,#18e5f0,#35e98b)' }} />
              </div>
              <span className="text-xs font-bold text-white">{overallProgress}%</span>
            </div>
            <button
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white w-fit transition-all hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
            >
              Continue Learning <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <div
          className="rounded-2xl p-6 flex flex-col items-center justify-center gap-4"
          style={{ background: '#171c24', border: '1px solid #2a3038' }}
        >
          <div className="text-sm font-semibold text-white">Overall Progress</div>
          <ProgressRing
            pct={overallProgress}
            size={130}
            stroke={9}
            color="#18e5f0"
            label={
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{overallProgress}%</div>
                <div className="text-[10px] tracking-widest mt-0.5" style={{ color: '#6b7280' }}>COMPLETE</div>
              </div>
            }
          />
          <p className="text-xs text-center" style={{ color: '#6b7280' }}>
            {overallProgress === 0
              ? 'Start practicing to track your progress!'
              : `${userData?.completedTasks.length ?? 0} / ${TOTAL_TASKS} tasks completed`}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="rounded-2xl p-6" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-sm font-semibold text-white">Achievement Badges</span>
          <button
            className="text-xs font-medium"
            onClick={() => onNavigate('profile')}
            style={{ color: '#18e5f0' }}
          >
            View All →
          </button>
        </div>

        {!userData ? (
          <div className="flex items-center justify-center py-6 gap-2" style={{ color: '#6b7280' }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        ) : !hasAnyBadge ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="text-3xl">🏆</div>
            <p className="text-xs text-center" style={{ color: '#6b7280' }}>
              No badges yet.<br />Complete your first assessment to earn one!
            </p>
          </div>
        ) : (
          <div className="flex gap-6 flex-wrap">
            {displayBadges.filter(b => b.unlocked).map(b => (
              <BadgeIcon key={b.id} badge={b} size="sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
