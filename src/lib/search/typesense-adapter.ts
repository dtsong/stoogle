import type { SearchAdapter } from '@/lib/search/adapter'
import { SearchAdapterError } from '@/lib/search/adapter'
import type { SearchOptions, SearchResponse } from '@/lib/search/types'
import { createTypesenseSearchClient } from '@/lib/typesense/client'

type TypesenseHitDocument = {
  id: string
  url: string
  title?: string
  content?: string
  site_name?: string
  site_domain?: string
  category_slugs?: string[]
}

type TypesenseHit = {
  document: TypesenseHitDocument
  text_match?: number
}

type TypesenseSearchResult = {
  found: number
  page: number
  hits?: TypesenseHit[]
}

type SearchCollection = {
  documents(): {
    search(params: Record<string, unknown>): Promise<TypesenseSearchResult>
  }
}

function toFilterBy(options: SearchOptions): string | undefined {
  const filters: string[] = []

  if (options.siteDomains && options.siteDomains.length > 0) {
    const domains = options.siteDomains.map((domain) => `\"${domain}\"`).join(',')
    filters.push(`site_domain:[${domains}]`)
  }

  if (options.categorySlugs && options.categorySlugs.length > 0) {
    const categories = options.categorySlugs.map((slug) => `\"${slug}\"`).join(',')
    filters.push(`category_slugs:[${categories}]`)
  }

  return filters.length > 0 ? filters.join(' && ') : undefined
}

function makeSnippet(content?: string): string | null {
  if (!content) return null
  return content.length > 300 ? `${content.slice(0, 300).trimEnd()}...` : content
}

export class TypesenseAdapter implements SearchAdapter {
  private readonly collection: SearchCollection

  constructor(collection?: SearchCollection) {
    if (collection) {
      this.collection = collection
      return
    }

    const client = createTypesenseSearchClient()
    this.collection = client.collections('pages') as unknown as SearchCollection
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const page = options.page ?? 1
    const limit = options.limit ?? 10
    const sanitizedQuery = query.trim()

    if (!sanitizedQuery) {
      return {
        query: sanitizedQuery,
        page,
        limit,
        found: 0,
        results: [],
      }
    }

    try {
      const result = await this.collection.documents().search({
        q: sanitizedQuery,
        query_by: 'title,content',
        query_by_weights: '4,1',
        page,
        per_page: limit,
        filter_by: toFilterBy(options),
      })

      return {
        query: sanitizedQuery,
        page: result.page,
        limit,
        found: result.found,
        results: (result.hits ?? []).map((hit) => ({
          id: hit.document.id,
          url: hit.document.url,
          title: hit.document.title ?? hit.document.url,
          snippet: makeSnippet(hit.document.content),
          siteName: hit.document.site_name ?? 'Unknown Source',
          siteDomain: hit.document.site_domain ?? 'unknown',
          categorySlugs: hit.document.category_slugs ?? [],
          score: typeof hit.text_match === 'number' ? hit.text_match : null,
        })),
      }
    } catch (error) {
      throw new SearchAdapterError('Typesense search failed', error)
    }
  }
}
