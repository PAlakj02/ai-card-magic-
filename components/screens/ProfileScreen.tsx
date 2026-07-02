'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Gem, LogOut, Loader2 } from 'lucide-react'
import BadgeIcon from '@/components/ui/BadgeIcon'
import { heatmapData } from '@/data/mockData'
import { useAuth } from '@/context/AuthContext'
import { signOut, fetchRecentScores, ALL_BADGES, type AssessmentScore } from '@/lib/authActions'
import { xpProgress, rankTitle, MAX_LEVEL } from '@/lib/xp'

const heatColors = ['#171c24', '#1a3a2a', '#1e5236', '#22c55e40', '#35e98b']

function formatDate(ts: { toDate: () => Date }): string {
  const d    = ts.toDate()
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ProfileScreen() {
  const { userData, firebaseUser } = useAuth()
  const [recentScores, setRecentScores] = useState<AssessmentScore[]>([])
  const [scoresDone, setScoresDone]     = useState(false)
  const scoresLoading = !!firebaseUser && !scoresDone

  useEffect(() => {
    if (!firebaseUser) return
    fetchRecentScores(firebaseUser.uid, 5)
      .then(s => { setRecentScores(s); setScoresDone(true) })
      .catch(() => setScoresDone(true))
  }, [firebaseUser])

  const displayName = userData?.displayName ?? ''
  const totalXP     = userData?.xp          ?? 0
  const level       = userData?.level       ?? 1
  const title       = rankTitle(level)
  const dayStreak   = userData?.streak      ?? 0
  const skillsMastered = userData?.skillsMastered ?? 0
  const avatarSeed  = firebaseUser?.uid?.slice(0, 8) ?? 'default'

  const prog = xpProgress(totalXP)
  const atMax = level >= MAX_LEVEL

  // Real badge display — all 4, locked/unlocked from Firestore
  const earnedSet = new Set(userData?.badges ?? [])
  const displayBadges = ALL_BADGES.map((b, i) => ({
    id:       i + 1,
    name:     b.name,
    emoji:    b.emoji,
    color:    b.color,
    bgColor:  b.bgColor,
    unlocked: earnedSet.has(b.id),
  }))

  async function handleSignOut() {
    await signOut()
  }

  if (!userData) {
    return (
      <div className="p-8 flex items-center justify-center h-64 gap-3" style={{ color: '#18e5f0' }}>
        <Loader2 size={22} className="animate-spin" />
        <span className="text-sm">Loading profile…</span>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      {/* User header */}
      <div className="rounded-2xl p-6 mb-5 flex items-center gap-6"
        style={{ background: '#171c24', border: '1px solid #2a3038' }}>
        <div className="relative shrink-0">
          <div className="relative w-24 h-24 rounded-full overflow-hidden"
            style={{ border: '2px solid #35e98b', boxShadow: '0 0 20px rgba(53,233,139,0.3)' }}>
            <Image src={`https://picsum.photos/seed/${avatarSeed}/96/96`} alt={displayName || 'avatar'} fill className="object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#18e5f0,#b86cff)', border: '2px solid #0d1014' }}>
            {level}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-white">{displayName || 'Magician'}</h1>
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#35e98b' }}>
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M2 5l2 2 4-4" stroke="#0d1014" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold"
              style={{ background: 'rgba(24,229,240,0.12)', color: '#18e5f0', border: '1px solid rgba(24,229,240,0.25)' }}>
              ✦ {title.toUpperCase()}
            </span>
            <span className="flex items-center gap-1.5 text-sm" style={{ color: '#9ca3af' }}>
              <Gem size={14} style={{ color: '#b86cff' }} />{totalXP.toLocaleString()} XP Total
            </span>
          </div>
        </div>

        <button onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left column */}
        <div className="col-span-2 flex flex-col gap-5">
          {/* Level progress */}
          <div className="rounded-2xl p-5" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">Level {level} Journey</span>
              <span className="text-xs" style={{ color: '#6b7280' }}>
                {atMax
                  ? 'MAX LEVEL REACHED'
                  : `${prog.current.toLocaleString()} / ${prog.needed.toLocaleString()} XP to Level ${level + 1}`}
              </span>
            </div>
            <div className="h-2.5 rounded-full" style={{ background: '#2a3038' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${prog.pct}%`, background: 'linear-gradient(90deg,#18e5f0,#35e98b)' }} />
            </div>
            <p className="text-xs mt-3 italic" style={{ color: '#6b7280' }}>
              {atMax
                ? '"You have reached Grand Master — the pinnacle of card magic mastery."'
                : `"Only ${(prog.needed - prog.current).toLocaleString()} XP away from unlocking ${rankTitle(level + 1)}."`}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'DAY STREAK',      value: dayStreak,      emoji: '🔥' },
              { label: 'SKILLS MASTERED', value: skillsMastered, emoji: '🎓' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
                <div className="text-3xl mb-1">{s.emoji}</div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-[10px] font-semibold tracking-widest mt-0.5" style={{ color: '#6b7280' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Achievement badges — all 4, locked/unlocked */}
          <div className="rounded-2xl p-5" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold text-white">Achievement Showcase</span>
              <span className="text-xs" style={{ color: '#6b7280' }}>
                {earnedSet.size}/{ALL_BADGES.length} unlocked
              </span>
            </div>
            {earnedSet.size === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <div className="text-3xl">🏆</div>
                <p className="text-xs text-center" style={{ color: '#6b7280' }}>
                  No badges yet. Complete your first assessment to start earning!
                </p>
              </div>
            ) : (
              <div className="flex gap-5 flex-wrap">
                {displayBadges.map(b => <BadgeIcon key={b.id} badge={b} />)}
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div className="rounded-2xl p-5" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
            <div className="text-sm font-semibold text-white mb-4">Practice Intensity</div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {heatmapData.map((v, i) => (
                <div key={i} className="rounded aspect-square"
                  style={{ background: heatColors[Math.min(v, 4)] }} title={`Intensity: ${v}`} />
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 mt-3">
              {heatColors.map((c, i) => (
                <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c, border: '1px solid #2a3038' }} />
              ))}
              <span className="text-[10px]" style={{ color: '#6b7280' }}>more</span>
            </div>
          </div>
        </div>

        {/* Right column — real assessment scores */}
        <div>
          <div className="rounded-2xl p-5 h-full" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
            <h3 className="text-sm font-semibold text-white mb-4">Recent Assessments</h3>

            {scoresLoading ? (
              <div className="flex items-center justify-center h-32 gap-2" style={{ color: '#18e5f0' }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Loading…</span>
              </div>
            ) : recentScores.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <div className="text-2xl">🎴</div>
                <p className="text-xs text-center" style={{ color: '#6b7280' }}>
                  No assessments yet.<br />Complete a practice task to see results here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentScores.map(r => {
                  const color = r.score >= 75 ? '#35e98b' : r.score >= 50 ? '#f59e0b' : '#f87171'
                  const grade = r.score >= 75 ? 'GREAT' : r.score >= 50 ? 'GOOD' : 'RETRY'
                  return (
                    <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: '#0d1014', border: '1px solid #2a3038' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ background: 'rgba(24,229,240,0.08)', border: '1px solid #2a3038' }}>
                        🎴
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{r.trickName}</div>
                        <div className="text-[10px] mt-0.5 truncate" style={{ color: '#6b7280' }}>
                          {formatDate(r.createdAt)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold" style={{ color }}>{r.score}%</div>
                        <div className="text-[9px] font-semibold tracking-wider" style={{ color }}>{grade}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* XP ring summary */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid #2a3038' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#6b7280' }}>XP Progress</span>
                <span className="text-xs font-bold" style={{ color: '#18e5f0' }}>{prog.pct}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full" style={{ background: '#2a3038' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${prog.pct}%`, background: 'linear-gradient(90deg,#18e5f0,#35e98b)' }} />
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: '#6b7280' }}>
                {atMax
                  ? 'Grand Master achieved'
                  : `${(prog.needed - prog.current).toLocaleString()} XP to Level ${level + 1}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
