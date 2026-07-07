'use client'
import { navItems } from '@/lib/navItems'
import type { Screen } from '@/data/mockData'

interface Props {
  active: Screen
  onNavigate: (s: Screen) => void
}

export default function MobileBottomNav({ active, onNavigate }: Props) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6"
      style={{ background: '#0d1014', borderTop: '1px solid #2a3038', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {navItems.map(({ id, label, Icon }) => {
        const isActive = active === id || (active === 'video-lesson' && id === 'videos')
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className="flex flex-col items-center justify-center gap-1 py-2.5"
            style={{ color: isActive ? '#18e5f0' : '#6b7280' }}
          >
            <Icon size={18} />
            <span className="text-[9px] font-medium leading-none">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
