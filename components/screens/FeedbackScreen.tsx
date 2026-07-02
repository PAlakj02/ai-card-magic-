'use client'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import { useAuth } from '@/context/AuthContext'
import { fetchRecentScores, type AssessmentScore } from '@/lib/authActions'
import { rankTitle } from '@/lib/xp'

function formatDate(ts: { toDate: () => Date }): string {
  const d    = ts.toDate()
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function tierColor(tier: AssessmentScore['tier']): string {
  return tier === 'excellent' ? '#35e98b' : tier === 'good' ? '#f59e0b' : '#f87171'
}

function tierLabel(tier: AssessmentScore['tier']): string {
  return tier === 'excellent' ? 'EXCELLENT' : tier === 'good' ? 'GOOD' : 'RETRY'
}

export default function FeedbackScreen() {
  const { firebaseUser, userData } = useAuth()
  const [scores, setScores] = useState<AssessmentScore[]>([])
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState(false)
  const loading = !!firebaseUser && !done && !error

  useEffect(() => {
    if (!firebaseUser) return
    fetchRecentScores(firebaseUser.uid, 5)
      .then(s => { setScores(s); setDone(true) })
      .catch(() => setError(true))
  }, [firebaseUser])

  const avgScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
    : 0

  const level = userData?.level ?? 1
  const title = rankTitle(level)

  return (
    <div className="p-8 max-w-[900px]">
      <h1 className="text-3xl font-bold text-white mb-2">Mastery Report</h1>
      <p className="mb-8 text-sm" style={{ color: '#9ca3af' }}>
        Your real-time performance analysis based on the last {scores.length > 0 ? scores.length : 5} assessments.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3" style={{ color: '#18e5f0' }}>
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm">Loading your report…</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
          <p className="text-sm font-semibold text-white mb-1">Could not load scores</p>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            Make sure your Firestore rules allow reading{' '}
            <code style={{ color: '#18e5f0' }}>users/{'{uid}'}/scores</code>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {/* Score ring */}
          <div className="rounded-2xl p-8 flex flex-col items-center justify-center gap-5"
            style={{ background: '#171c24', border: '1px solid #2a3038' }}>
            <div className="text-xs font-semibold tracking-widest" style={{ color: '#6b7280' }}>
              {scores.length === 0 ? 'NO DATA YET' : 'AVERAGE SCORE'}
            </div>

            <ProgressRing
              pct={avgScore}
              size={150}
              stroke={10}
              color={avgScore >= 75 ? '#35e98b' : avgScore >= 50 ? '#f59e0b' : '#18e5f0'}
              trackColor="#2a3038"
              label={
                <div className="text-center">
                  {scores.length === 0 ? (
                    <div className="text-3xl font-bold" style={{ color: '#4b5563' }}>—</div>
                  ) : (
                    <>
                      <div className="text-4xl font-bold text-white">{avgScore}</div>
                      <div className="text-sm mt-0.5" style={{ color: '#6b7280' }}>/ 100</div>
                    </>
                  )}
                </div>
              }
            />

            <div className="px-5 py-2 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(24,229,240,0.1)', color: '#18e5f0', border: '1px solid rgba(24,229,240,0.25)' }}>
              {title}
            </div>

            {scores.length > 0 && (
              <div className="w-full grid grid-cols-3 gap-2 text-center pt-2" style={{ borderTop: '1px solid #2a3038' }}>
                {[
                  { label: 'Best',  value: Math.max(...scores.map(s => s.score)) },
                  { label: 'Attempts', value: scores.length },
                  { label: 'Passed', value: scores.filter(s => s.tier === 'excellent').length },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-lg font-bold text-white">{value}</div>
                    <div className="text-[10px]" style={{ color: '#6b7280' }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent assessments */}
          <div className="rounded-2xl p-6" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
            <h2 className="text-lg font-bold text-white mb-5">Recent Assessments</h2>

            {scores.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="text-4xl">🎴</div>
                <p className="text-sm text-center" style={{ color: '#6b7280' }}>
                  No assessments yet.<br />Complete a practice task to see your report.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {scores.map(s => {
                  const color = tierColor(s.tier)
                  return (
                    <div key={s.id} className="rounded-xl p-4"
                      style={{ background: '#0d1014', border: '1px solid #2a3038' }}>
                      {/* Row 1: trick + score + date */}
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-semibold text-white">{s.trickName}</span>
                          <span className="ml-2 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
                            style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
                            {tierLabel(s.tier)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black" style={{ color }}>{s.score}</span>
                          <span className="text-xs ml-0.5" style={{ color: '#6b7280' }}>/100</span>
                        </div>
                      </div>

                      {/* Score bar */}
                      <div className="h-1 rounded-full mb-2" style={{ background: '#2a3038' }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${s.score}%`, background: color, transition: 'width 0.6s ease' }} />
                      </div>

                      {/* Row 2: feedback + date */}
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[11px] leading-relaxed flex-1" style={{ color: '#6b7280' }}>
                          {s.feedback}
                        </p>
                        <span className="text-[10px] shrink-0 mt-0.5" style={{ color: '#4b5563' }}>
                          {formatDate(s.createdAt)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
