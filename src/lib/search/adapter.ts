import type { SearchOptions, SearchResponse } from '@/lib/search/types'

export interface SearchAdapter {
  search(query: string, options?: SearchOptions): Promise<SearchResponse>
}

export class SearchAdapterError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'SearchAdapterError'
  }
}
