import { Eye, Clock, Award, Target, type LucideProps } from 'lucide-react'

const iconMap: Record<string, React.FC<LucideProps>> = {
  Eye, Clock, Award, Target,
}

interface Props {
  label: string
  value: string
  icon: string
}

export default function StatCard({ label, value, icon }: Props) {
  const Icon = iconMap[icon] ?? Target
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: '#171c24', border: '1px solid #2a3038' }}
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(24,229,240,0.1)' }}>
          <Icon size={17} style={{ color: '#18e5f0' }} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-[11px] font-semibold tracking-widest mt-0.5" style={{ color: '#6b7280' }}>
          {label}
        </div>
      </div>
    </div>
  )
}
