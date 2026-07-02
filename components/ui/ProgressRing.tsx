interface Props {
  pct: number          // 0–100
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  label?: React.ReactNode
}

export default function ProgressRing({
  pct,
  size = 120,
  stroke = 8,
  color = '#18e5f0',
  trackColor = '#2a3038',
  label,
}: Props) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - dash}
          style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{label}</div>
    </div>
  )
}
