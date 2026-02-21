import type { SearchAdapter } from '@/lib/search/adapter'
import { SearchAdapterError } from '@/lib/search/adapter'
import type { SearchOptions, SearchResponse } from '@/lib/search/types'
import { TypesenseAdapter } from '@/lib/search/typesense-adapter'
import { createAdminClient } from '@/lib/supabase/admin'

export const SEARCH_QUERY_MAX_LENGTH = 200

export type SearchActionInput = {
  query: string
  options?: SearchOptions
}

export type SearchActionResult = {
  ok: boolean
  data: SearchResponse
  error: string | null
}

type SearchLogClient = {
  from(table: 'search_logs'): {
    insert(payload: { query: string; result_count: number; category_filter: string | null }): Promise<{
      error: { message: string } | null
    }>
  }
}

type SearchActionDeps = {
  adapter: SearchAdapter
  logger: SearchLogClient
}

function sanitizeQuery(input: string): string {
  return input.replace(/\s+/g, ' ').trim().slice(0, SEARCH_QUERY_MAX_LENGTH)
}

function categoryFilterValue(options?: SearchOptions): string | null {
  if (!options?.categorySlugs || options.categorySlugs.length === 0) {
    return null
  }

  return options.categorySlugs.join(',')
}

function emptyResponse(query: string, options?: SearchOptions): SearchResponse {
  return {
    query,
    page: options?.page ?? 1,
    limit: options?.limit ?? 10,
    found: 0,
    results: [],
    facets: {
      siteNames: [],
      categorySlugs: [],
    },
  }
}

function getDefaultDeps(): SearchActionDeps {
  return {
    adapter: new TypesenseAdapter(),
    logger: createAdminClient() as unknown as SearchLogClient,
  }
}

export async function executeSearchAction(
  input: SearchActionInput,
  deps?: SearchActionDeps
): Promise<SearchActionResult> {
  const query = sanitizeQuery(input.query)

  if (!query) {
    return {
      ok: false,
      data: emptyResponse('', input.options),
      error: 'Please enter a search query.',
    }
  }

  try {
    const resolvedDeps = deps ?? getDefaultDeps()
    const response = await resolvedDeps.adapter.search(query, input.options)

    const { error: logError } = await resolvedDeps.logger.from('search_logs').insert({
      query,
      result_count: response.found,
      category_filter: categoryFilterValue(input.options),
    })

    if (logError) {
      console.error('[search-action] Failed to write search log:', logError.message)
    }

    return {
      ok: true,
      data: response,
      error: null,
    }
  } catch (error) {
    console.error('[search-action] executeSearchAction failed:', error)
    return {
      ok: false,
      data: emptyResponse(query, input.options),
      error: 'Search is temporarily unavailable. Please try again.',
    }
  }
}

export async function searchAction(input: SearchActionInput): Promise<SearchActionResult> {
  'use server'
  return executeSearchAction(input)
}
