'use client'
import { Home, BookOpen, Video, Target, BarChart2, User } from 'lucide-react'
import type { Screen } from '@/data/mockData'

const navItems: { id: Screen; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'home',     label: 'Home',     Icon: Home },
  { id: 'courses',  label: 'Courses',  Icon: BookOpen },
  { id: 'videos',   label: 'Videos',   Icon: Video },
  { id: 'practice', label: 'Practice', Icon: Target },
  { id: 'feedback', label: 'Feedback', Icon: BarChart2 },
  { id: 'profile',  label: 'Profile',  Icon: User },
]

interface Props {
  active: Screen
  onNavigate: (s: Screen) => void
}

export default function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside
      className="flex flex-col shrink-0 h-screen"
      style={{ width: 240, background: '#0d1014', borderRight: '1px solid #2a3038' }}
    >
      {/* Brand */}
      <div className="px-6 pt-7 pb-6" style={{ borderBottom: '1px solid #2a3038' }}>
        <div className="text-xl font-bold tracking-wide text-white leading-tight">AI Card Magic</div>
        <div className="mt-1 text-[10px] font-semibold tracking-widest" style={{ color: '#6b7280' }}>
          GRANDMASTER LEVEL
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ id, label, Icon }) => {
          const isActive = active === id || (active === 'video-lesson' && id === 'videos')
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-150 relative"
              style={{
                color: isActive ? '#18e5f0' : '#9ca3af',
                background: isActive ? 'rgba(24,229,240,0.07)' : 'transparent',
                borderLeft: isActive ? '2px solid #18e5f0' : '2px solid transparent',
                boxShadow: isActive ? 'inset 0 0 20px rgba(24,229,240,0.05)' : 'none',
              }}
            >
              <Icon size={17} className={isActive ? '' : ''} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      {/* CTA */}
      <div className="p-4" style={{ borderTop: '1px solid #2a3038' }}>
        <button
          className="w-full py-3 rounded-xl text-sm font-bold text-white tracking-wide transition-opacity hover:opacity-90 active:opacity-80"
          style={{ background: 'linear-gradient(135deg, #18e5f0 0%, #b86cff 100%)' }}
        >
          Start Daily Practice
        </button>
      </div>
    </aside>
  )
}
