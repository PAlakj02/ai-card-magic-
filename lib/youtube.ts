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

  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()

    return (data.items ?? [])
      .filter((item: any) => item.snippet?.resourceId?.videoId)
      .map((item: any) => {
        const vid = item.snippet.resourceId.videoId as string
        return {
          youtubeId:    vid,
          title:        item.snippet.title as string,
          thumbnail:
            item.snippet.thumbnails?.maxres?.url ??
            item.snippet.thumbnails?.high?.url ??
            `https://img.youtube.com/vi/${vid}/maxresdefault.jpg`,
          channelTitle: (item.snippet.channelTitle ?? '') as string,
          publishedAt:  new Date(item.snippet.publishedAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          }),
        }
      })
  } catch {
    return []
  }
}
