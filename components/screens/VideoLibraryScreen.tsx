'use client'
import { useEffect, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import VideoCard, { type VideoCardItem } from '@/components/ui/VideoCard'
import { videos } from '@/data/mockData'
import trickData from '@/data/videos.json'
import { fetchPlaylistVideos } from '@/lib/youtube'

type Tab = 'All Tricks' | 'Beginner' | 'Intermediate' | 'Advanced'
const TABS: Tab[] = ['All Tricks', 'Beginner', 'Intermediate', 'Advanced']

const PLAYLIST_IDS: Record<string, string> = {
  Beginner:     'PLtuqXoD-IIwI47n3ZyahEaEj3DLIPHUe5',
  Intermediate: 'PLGpWgwtRb0QRVeRRKAtBaVnp7O9vtv4Nl',
  Advanced:     'PLshVXpV81QkKMz0nm3L2NBmF4jRibCO69',
}

// Convert mockData Video → VideoCardItem
function mockVideoToCard(v: typeof videos[0]): VideoCardItem {
  return {
    id:              v.id,
    title:           v.title,
    thumbnail:       v.youtubeId
      ? `https://img.youtube.com/vi/${v.youtubeId}/maxresdefault.jpg`
      : `https://picsum.photos/seed/${v.thumbnailSeed}/400/225`,
    youtubeId:       v.youtubeId ?? '',
    difficulty:      v.difficulty,
    tags:            v.tags,
    durationSeconds: v.durationSeconds,
    views:           v.views,
    postedAt:        v.postedAt,
  }
}

// Build trick video cards from videos.json
const trickGroups: Array<{ trick: string; vids: VideoCardItem[] }> = (() => {
  const map = new Map<string, VideoCardItem[]>()
  for (const tv of trickData.trickVideos) {
    if (!map.has(tv.trick)) map.set(tv.trick, [])
    map.get(tv.trick)!.push({
      id:              tv.id,
      title:           `${tv.trick} — Tutorial ${map.get(tv.trick)!.length + 1}`,
      thumbnail:       tv.thumbnail,
      youtubeId:       tv.youtubeId,
      difficulty:      undefined,
      tags:            [tv.trick.toUpperCase()],
      durationSeconds: 0,
      views:           0,
      postedAt:        '',
      trick:           tv.trick,
    })
  }
  return Array.from(map.entries()).map(([trick, vids]) => ({ trick, vids }))
})()

interface Props { onSelectVideo?: (youtubeId: string) => void }

export default function VideoLibraryScreen({ onSelectVideo }: Props) {
  const [activeTab, setActiveTab]       = useState<Tab>('All Tricks')
  const [query, setQuery]               = useState('')
  const [fetchState, setFetchState] = useState<{
    tab: Tab | null; items: VideoCardItem[]; error: boolean
  }>({ tab: null, items: [], error: false })

  // Derive loading/error/items from fetchState so no synchronous setState in effect body
  const loading     = activeTab !== 'All Tricks' && fetchState.tab !== activeTab && !fetchState.error
  const apiError    = fetchState.tab === activeTab && fetchState.error
  const playlistItems = fetchState.tab === activeTab ? fetchState.items : []

  // Fetch YouTube playlist when a level tab is selected
  useEffect(() => {
    if (activeTab === 'All Tricks') return
    const playlistId = PLAYLIST_IDS[activeTab]
    if (!playlistId) return
    let cancelled = false

    fetchPlaylistVideos(playlistId).then(items => {
      if (cancelled) return
      setFetchState({
        tab: activeTab,
        items: items.length === 0 ? [] : items.map((item, i) => ({
          id:              `yt-${i}`,
          title:           item.title,
          thumbnail:       item.thumbnail,
          youtubeId:       item.youtubeId,
          difficulty:      activeTab.toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
          tags:            [item.channelTitle].filter(Boolean),
          durationSeconds: 0,
          views:           0,
          postedAt:        item.publishedAt,
        })),
        error: items.length === 0,
      })
    })
    return () => { cancelled = true }
  }, [activeTab])

  // Filter all-tricks by search query
  const allMockCards = videos.map(mockVideoToCard)
  const filteredMock = allMockCards.filter(v =>
    query === '' || v.title.toLowerCase().includes(query.toLowerCase()),
  )
  const filteredTrickGroups = trickGroups.map(g => ({
    ...g,
    vids: g.vids.filter(v =>
      query === '' || v.trick!.toLowerCase().includes(query.toLowerCase()),
    ),
  })).filter(g => g.vids.length > 0)

  const filteredPlaylist = playlistItems.filter(v =>
    query === '' || v.title.toLowerCase().includes(query.toLowerCase()),
  )

  const isLevelTab = activeTab !== 'All Tricks'

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Video Library</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
            Master the art through high-definition visual sorcery.
          </p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Search techniques..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none w-full sm:w-64 text-white placeholder:text-gray-600"
            style={{ background: '#171c24', border: '1px solid #2a3038' }}
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-full sm:w-fit overflow-x-auto" style={{ background: '#171c24', border: '1px solid #2a3038' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0"
            style={
              activeTab === tab
                ? { background: 'linear-gradient(135deg,#18e5f0,#b86cff)', color: 'white' }
                : { color: '#6b7280' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── All Tricks tab ── */}
      {!isLevelTab && (
        <>
          {/* Mock videos (title-searchable overview) */}
          {query === '' && (
            <section className="mb-10">
              <h2 className="text-xs font-bold tracking-widest mb-4" style={{ color: '#6b7280' }}>
                FEATURED LESSONS
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {allMockCards.map(v => (
                  <VideoCard key={v.id} video={v} onClick={() => onSelectVideo?.(v.youtubeId)} />
                ))}
              </div>
            </section>
          )}

          {/* Trick-specific grouped videos */}
          {filteredTrickGroups.map(({ trick, vids }) => (
            <section key={trick} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-bold text-white">{trick}</h2>
                <div className="flex-1 h-px" style={{ background: '#2a3038' }} />
                <span className="text-xs" style={{ color: '#6b7280' }}>{vids.length} videos</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {vids.map(v => (
                  <VideoCard key={v.id} video={v} onClick={() => onSelectVideo?.(v.youtubeId)} />
                ))}
              </div>
            </section>
          ))}

          {query !== '' && filteredTrickGroups.length === 0 && filteredMock.length === 0 && (
            <p className="text-center py-16 text-sm" style={{ color: '#6b7280' }}>
              No videos match your search.
            </p>
          )}
        </>
      )}

      {/* ── Level playlist tabs ── */}
      {isLevelTab && (
        <>
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 size={32} className="animate-spin" style={{ color: '#18e5f0' }} />
              <p className="text-sm" style={{ color: '#6b7280' }}>Loading {activeTab} playlist…</p>
            </div>
          )}

          {!loading && apiError && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: '#171c24', border: '1px solid #2a3038' }}
            >
              <p className="text-sm font-semibold text-white mb-2">YouTube API key not configured</p>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Add your key to <code className="px-1 rounded" style={{ background: '#0d1014', color: '#18e5f0' }}>
                  NEXT_PUBLIC_YOUTUBE_API_KEY
                </code> in <code style={{ color: '#b86cff' }}>.env.local</code> to load live playlist videos.
              </p>
            </div>
          )}

          {!loading && !apiError && filteredPlaylist.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPlaylist.map(v => (
                <VideoCard key={v.id} video={v} onClick={() => onSelectVideo?.(v.youtubeId)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
