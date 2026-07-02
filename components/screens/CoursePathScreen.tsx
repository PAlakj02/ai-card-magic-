'use client'
import { CheckCircle2, Circle, Lock } from 'lucide-react'
import { courseNodes } from '@/data/mockData'
import { useAuth } from '@/context/AuthContext'

export default function CoursePathScreen() {
  const { userData, firebaseUser } = useAuth()
  const totalXP    = userData?.xp ?? 0
  const avatarSeed = firebaseUser?.uid?.slice(0, 8) ?? 'default'

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold text-white">Master&apos;s Journey</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Your path to card mastery</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-semibold tracking-widest" style={{ color: '#6b7280' }}>TOTAL XP</div>
            <div className="font-bold" style={{ color: '#35e98b' }}>{totalXP.toLocaleString()} XP</div>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
            style={{ border: '2px solid #35e98b', boxShadow: '0 0 10px rgba(53,233,139,0.35)' }}
          >
            <img src={`https://picsum.photos/seed/${avatarSeed}/40/40`} alt="avatar" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Stage label */}
      <div className="flex justify-center mb-10">
        <div
          className="px-6 py-2 rounded-full text-xs font-bold tracking-widest text-white"
          style={{ background: '#2a3038', border: '1px solid #3a4048' }}
        >
          STAGE 1: BEGINNER
        </div>
      </div>

      {/* Timeline */}
      <div className="relative flex flex-col items-center">
        {courseNodes.map((node, idx) => {
          const isLast     = idx === courseNodes.length - 1
          const isComplete = node.status === 'complete'
          const isActive   = node.status === 'active'
          const isLocked   = node.status === 'locked'

          return (
            <div key={node.id} className="flex flex-col items-center w-full">
              <div className="relative flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background:  isLocked ? '#171c24' : isActive ? 'rgba(24,229,240,0.12)' : 'rgba(53,233,139,0.1)',
                    border:      `2px solid ${isLocked ? '#2a3038' : isActive ? '#18e5f0' : '#35e98b'}`,
                    boxShadow:   isComplete ? '0 0 20px rgba(53,233,139,0.25)' : isActive ? '0 0 20px rgba(24,229,240,0.25)' : 'none',
                  }}
                >
                  {isLocked   ? <Lock         size={20} style={{ color: '#4b5563' }} /> :
                   isActive   ? <Circle       size={20} style={{ color: '#18e5f0' }} /> :
                                <CheckCircle2 size={22} style={{ color: '#35e98b' }} />}
                </div>
                <div className="mt-3 text-center">
                  <div className="font-semibold text-sm" style={{ color: isLocked ? '#4b5563' : 'white' }}>
                    {node.title}
                  </div>
                  {node.subtitle && (
                    <div className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{node.subtitle}</div>
                  )}
                </div>
              </div>

              {!isLast && (
                <div
                  className="my-3"
                  style={{
                    width:      1,
                    height:     48,
                    background: isComplete ? 'linear-gradient(#35e98b, #18e5f0)' : '#2a3038',
                  }}
                />
              )}
            </div>
          )
        })}
        <div className="mt-3" style={{ width: 1, height: 40, background: '#2a3038' }} />
        <div className="mt-2 text-xs" style={{ color: '#4b5563' }}>More stages coming soon…</div>
      </div>
    </div>
  )
}
