// Fetches video metadata from a YouTube playlist via YouTube Data API v3
export interface YouTubeVideo {
  youtubeId:    string
  title:        string
  thumbnail:    string
  channelTitle: string
  publishedAt:  string
}

export async function fetchPlaylistVideos(
  playlistId: string,
  maxResults = 24,
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
  if (!apiKey) return []

  const url =
    `https://www.googleapis.com/youtube/v3/playlistItems` +
    `?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`

  interface YTItem {
    snippet?: {
      resourceId?: { videoId: string }
      title: string
      thumbnails?: { maxres?: { url: string }; high?: { url: string } }
      channelTitle?: string
      publishedAt: string
    }
  }
  interface ValidYTItem {
    snippet: {
      resourceId: { videoId: string }
      title: string
      thumbnails?: { maxres?: { url: string }; high?: { url: string } }
      channelTitle?: string
      publishedAt: string
    }
  }

  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()

    return (data.items as YTItem[] ?? [])
      .filter((item): item is ValidYTItem => !!item.snippet?.resourceId?.videoId)
      .map((item) => {
        const vid = item.snippet.resourceId.videoId
        return {
          youtubeId:    vid,
          title:        item.snippet.title,
          thumbnail:
            item.snippet.thumbnails?.maxres?.url ??
            item.snippet.thumbnails?.high?.url ??
            `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
          channelTitle: item.snippet.channelTitle ?? '',
          publishedAt:  new Date(item.snippet.publishedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          }),
        }
      })
  } catch {
    return []
  }
}
