export {}

interface AnimeTimeline {
  add(params: Record<string, unknown>, offset?: number): AnimeTimeline
  finished: Promise<unknown>
}

interface AnimeJs {
  remove(targets: unknown): void
  timeline(params?: Record<string, unknown>): AnimeTimeline
}

declare global {
  interface Window {
    anime: AnimeJs
  }
  const anime: AnimeJs
}