import { Eye, MoreVertical } from 'lucide-react'
import { formatDuration } from '@/data/mockData'

// Unified type — covers both mockData Videos and YouTube playlist items
export interface VideoCardItem {
  id:              string | number
  title:           string
  thumbnail:       string        // YouTube thumbnail URL (preferred)
  youtubeId:       string        // used by VideoLessonScreen for embed
  difficulty?:     'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  tags:            string[]
  durationSeconds: number
  views:           number
  postedAt:        string
  trick?:          string        // for trick-specific grouping
}

const difficultyStyle: Record<string, { bg: string; text: string }> = {
  ADVANCED:     { bg: '#ef444420', text: '#ef4444' },
  INTERMEDIATE: { bg: '#f9731620', text: '#f97316' },
  BEGINNER:     { bg: '#22c55e20', text: '#22c55e' },
}

interface Props {
  video:    VideoCardItem
  onClick?: () => void
}

export default function VideoCard({ video, onClick }: Props) {
  const style = video.difficulty ? (difficultyStyle[video.difficulty] ?? difficultyStyle.BEGINNER) : null

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer group transition-transform duration-200 hover:-translate-y-1"
      style={{ background: '#171c24', border: '1px solid #2a3038' }}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative" style={{ paddingTop: '56.25%' }}>
        <img
          src={video.thumbnail}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg` }}
        />
        {/* Duration */}
        {video.durationSeconds > 0 && (
          <div
            className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-bold text-white"
            style={{ background: 'rgba(0,0,0,0.75)' }}
          >
            {formatDuration(video.durationSeconds)}
          </div>
        )}
        {/* Difficulty badge */}
        {style && video.difficulty && (
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
            style={{ background: style.bg, color: style.text, border: `1px solid ${style.text}40` }}
          >
            {video.difficulty}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-white leading-snug group-hover:text-[#18e5f0] transition-colors">
            {video.title}
          </h3>
          <button className="shrink-0 text-gray-600 hover:text-gray-400 mt-0.5" onClick={e => e.stopPropagation()}>
            <MoreVertical size={15} />
          </button>
        </div>
        {video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {video.tags.map(t => (
              <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#2a3038', color: '#9ca3af' }}>
                {t}
              </span>
            ))}
          </div>
        )}
        {(video.views > 0 || video.postedAt) && (
          <div className="flex items-center gap-1 mt-2.5 text-[11px]" style={{ color: '#6b7280' }}>
            {video.views > 0 && (
              <>
                <Eye size={12} />
                <span>{(video.views / 1000).toFixed(1)}k views</span>
                {video.postedAt && <span className="mx-1">·</span>}
              </>
            )}
            {video.postedAt && <span>{video.postedAt}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
