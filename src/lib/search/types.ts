export type SearchOptions = {
  page?: number
  limit?: number
  siteDomains?: string[]
  categorySlugs?: string[]
}

export type SearchResult = {
  id: string
  url: string
  title: string
  snippet: string | null
  siteName: string
  siteDomain: string
  categorySlugs: string[]
  score: number | null
}

export type SearchResponse = {
  query: string
  page: number
  limit: number
  found: number
  results: SearchResult[]
}
