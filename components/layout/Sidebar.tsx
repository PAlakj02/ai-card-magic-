'use client'
import { navItems } from '@/lib/navItems'
import type { Screen } from '@/data/mockData'

interface Props {
  active: Screen
  onNavigate: (s: Screen) => void
  onStartDailyPractice: () => void
}

export default function Sidebar({ active, onNavigate, onStartDailyPractice }: Props) {
  return (
    <aside
      className="hidden md:flex flex-col shrink-0 h-screen w-16 lg:w-60"
      style={{ background: '#0d1014', borderRight: '1px solid #2a3038' }}
    >
      {/* Brand */}
      <div className="px-3 lg:px-6 pt-7 pb-6" style={{ borderBottom: '1px solid #2a3038' }}>
        <div className="text-xl font-bold tracking-wide text-white leading-tight hidden lg:block">AI Card Magic</div>
        <div className="text-xl font-bold text-center text-white lg:hidden">🃏</div>
        <div className="mt-1 text-[10px] font-semibold tracking-widest hidden lg:block" style={{ color: '#6b7280' }}>
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
              title={label}
              className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-5 py-3 text-sm font-medium transition-all duration-150 relative"
              style={{
                color: isActive ? '#18e5f0' : '#9ca3af',
                background: isActive ? 'rgba(24,229,240,0.07)' : 'transparent',
                borderLeft: isActive ? '2px solid #18e5f0' : '2px solid transparent',
                boxShadow: isActive ? 'inset 0 0 20px rgba(24,229,240,0.05)' : 'none',
              }}
            >
              <Icon size={17} />
              <span className="hidden lg:inline">{label}</span>
            </button>
          )
        })}
      </nav>

      {/* CTA */}
      <div className="p-2 lg:p-4" style={{ borderTop: '1px solid #2a3038' }}>
        <button
          onClick={onStartDailyPractice}
          title="Start Daily Practice"
          className="w-full py-3 rounded-xl text-sm font-bold text-white tracking-wide transition-opacity hover:opacity-90 active:opacity-80"
          style={{ background: 'linear-gradient(135deg, #18e5f0 0%, #b86cff 100%)' }}
        >
          <span className="hidden lg:inline">Start Daily Practice</span>
          <span className="lg:hidden">⚡</span>
        </button>
      </div>
    </aside>
  )
}
