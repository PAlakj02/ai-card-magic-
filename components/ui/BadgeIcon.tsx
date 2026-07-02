import type { Badge } from '@/data/mockData'

interface Props {
  badge: Badge
  size?: 'sm' | 'md'
}

export default function BadgeIcon({ badge, size = 'md' }: Props) {
  const dim = size === 'sm' ? 56 : 72
  const emojiSize = size === 'sm' ? 'text-xl' : 'text-2xl'
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-2xl flex items-center justify-center transition-transform hover:scale-105"
        style={{
          width: dim,
          height: dim,
          background: badge.unlocked ? badge.bgColor : 'rgba(107,114,128,0.08)',
          border: `1px solid ${badge.unlocked ? badge.color + '40' : '#2a3038'}`,
          opacity: badge.unlocked ? 1 : 0.45,
          filter: badge.unlocked ? `drop-shadow(0 0 8px ${badge.color}50)` : 'none',
        }}
      >
        <span className={emojiSize}>{badge.emoji}</span>
      </div>
      <span className="text-[11px] font-medium text-center leading-tight" style={{ color: badge.unlocked ? '#d1d5db' : '#4b5563' }}>
        {badge.name}
      </span>
    </div>
  )
}
