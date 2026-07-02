'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Zap, Clock, ChevronRight } from 'lucide-react'
import { videoLesson } from '@/data/mockData'
import trickData from '@/data/videos.json'
import type { Screen } from '@/data/mockData'

const TABS = ['Description', 'Materials', 'Instructions', 'Community Notes'] as const
type Tab = typeof TABS[number]

interface Props {
  youtubeId?: string   // overrides videoLesson.youtubeId when navigating from library
  onNavigate?: (s: Screen) => void
}

// Build a map of youtubeId → trick name for trick-specific related videos
const trickByYoutubeId = new Map<string, string>(
  trickData.trickVideos.map(tv => [tv.youtubeId, tv.trick]),
)

export default function VideoLessonScreen({ youtubeId: propYoutubeId, onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>('Description')
  const v         = videoLesson
  const embedId   = propYoutubeId || v.youtubeId || ''
  const trickName = trickByYoutubeId.get(embedId)

  // Related videos: other entries for the same trick, or default relatedLessons
  const relatedTrickVideos = trickName
    ? trickData.trickVideos.filter(tv => tv.trick === trickName && tv.youtubeId !== embedId)
    : []

  return (
    <div className="flex gap-6 p-8" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Main ── */}
      <div className="flex-1 min-w-0">
        {/* YouTube embed */}
        <div
          className="relative rounded-2xl overflow-hidden mb-6"
          style={{ aspectRatio: '16/9', background: '#0a0d11' }}
        >
          {embedId ? (
            <iframe
              src={`https://www.youtube.com/embed/${embedId}?rel=0&modestbranding=1`}
              title={v.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none' }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm" style={{ color: '#6b7280' }}>No video selected</p>
            </div>
          )}
        </div>

        {/* Tags + title */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {(trickName ? [trickName, 'TUTORIAL'] : v.tags).map(t => (
            <span
              key={t}
              className="px-3 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: 'rgba(184,108,255,0.15)', color: '#b86cff', border: '1px solid rgba(184,108,255,0.25)' }}
            >
              {t}
            </span>
          ))}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {trickName ? `${trickName} Tutorial` : v.title}
        </h1>
        <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>{v.description}</p>

        {/* Tab bar */}
        <div className="flex" style={{ borderBottom: '1px solid #2a3038', marginBottom: 24 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative px-5 py-3 text-sm font-medium transition-colors"
              style={{ color: tab === t ? '#18e5f0' : '#6b7280' }}
            >
              {t}
              {tab === t && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: '#18e5f0' }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'Description' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl p-5" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white">
                <Zap size={14} style={{ color: '#18e5f0' }} /> Overview
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>{v.overview}</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white">
                <Clock size={14} style={{ color: '#b86cff' }} /> Required Materials
              </div>
              {v.materials.map((m, i) => (
                <div key={i} className={i < v.materials.length - 1 ? 'mb-4' : ''}>
                  <div className="text-sm font-semibold text-white">{m.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{m.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Materials' && (
          <div className="rounded-2xl p-5" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
            {v.materials.map((m, i) => (
              <div key={i} className="flex items-start gap-3 mb-4 last:mb-0">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: '#b86cff' }} />
                <div>
                  <div className="text-sm font-semibold text-white">{m.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{m.note}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Instructions' && (
          <div className="rounded-2xl p-5" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
            <ol className="space-y-4">
              {v.instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm" style={{ color: '#d1d5db' }}>
                  <span className="font-bold text-[11px] pt-0.5 shrink-0 tabular-nums" style={{ color: '#18e5f0' }}>
                    {String(i + 1).padStart(2, '0')}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {tab === 'Community Notes' && (
          <div className="rounded-2xl p-10 text-center" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
            <p className="text-sm" style={{ color: '#6b7280' }}>Community notes coming soon.</p>
          </div>
        )}
      </div>

      {/* ── Sidebar ── */}
      <div style={{ width: 280, flexShrink: 0 }}>
        {/* Master This Move CTA */}
        <div className="rounded-2xl p-5 mb-4" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
          <h3 className="text-sm font-bold text-white mb-2">Master This Move</h3>
          <p className="text-xs mb-4 leading-relaxed" style={{ color: '#9ca3af' }}>
            Ready to put your skills to the test? Start the practice AI-module to get real-time feedback.
          </p>
          <button
            onClick={() => onNavigate?.('practice')}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#18e5f0,#b86cff)' }}
          >
            <Zap size={15} /> Start Practice Exercises
          </button>
          <div className="flex items-center justify-between mt-3 text-xs" style={{ color: '#6b7280' }}>
            <span className="flex items-center gap-1"><Zap size={11} /> XP potential: {v.xpPotential}</span>
            <span className="flex items-center gap-1"><Clock size={11} /> {v.estimatedMins}m</span>
          </div>
        </div>

        {/* Related videos for same trick (from videos.json) */}
        {relatedTrickVideos.length > 0 && (
          <>
            <h3 className="text-sm font-bold text-white mb-3">More {trickName} Videos</h3>
            {relatedTrickVideos.map(rl => (
              <div
                key={rl.youtubeId}
                className="flex items-center gap-3 p-3 rounded-xl mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: '#171c24', border: '1px solid #2a3038' }}
                onClick={() => onNavigate && (window as Window & { __setYoutubeId?: (id: string) => void }).__setYoutubeId?.(rl.youtubeId)}
              >
                <div className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0">
                  <Image src={rl.thumbnail} alt={rl.trick} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white leading-snug truncate">{rl.trick} Tutorial</div>
                  <div className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>YouTube</div>
                </div>
                <ChevronRight size={13} style={{ color: '#6b7280' }} />
              </div>
            ))}
          </>
        )}

        {/* Default related lessons */}
        {relatedTrickVideos.length === 0 && (
          <>
            <h3 className="text-sm font-bold text-white mb-3">Related Lessons</h3>
            {v.relatedLessons.map(rl => (
              <div
                key={rl.id}
                className="flex items-center gap-3 p-3 rounded-xl mb-2 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: '#171c24', border: '1px solid #2a3038' }}
              >
                <div className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0">
                  <Image
                    src={`https://picsum.photos/seed/${rl.thumbnailSeed}/80/56`}
                    alt={rl.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white leading-snug truncate">{rl.title}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>{rl.meta}</div>
                </div>
                <ChevronRight size={13} style={{ color: '#6b7280' }} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
