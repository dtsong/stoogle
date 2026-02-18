import { Flag } from 'lucide-react'
import type { ReactNode } from 'react'
import type { SearchResult } from '@/lib/search/types'

export const RESULT_SNIPPET_MAX_LENGTH = 300

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightText(text: string, query: string): ReactNode {
  const token = query.trim()
  if (!token) return text

  const regex = new RegExp(`(${escapeRegExp(token)})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) => {
    if (part.toLowerCase() === token.toLowerCase()) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold text-foreground">
          {part}
        </strong>
      )
    }

    return part
  })
}

export function truncateSnippet(snippet: string | null): string {
  if (!snippet) return ''
  if (snippet.length <= RESULT_SNIPPET_MAX_LENGTH) return snippet
  return `${snippet.slice(0, RESULT_SNIPPET_MAX_LENGTH - 3)}...`
}

type ResultCardProps = {
  result: SearchResult
  query: string
}

export function ResultCard({ result, query }: ResultCardProps) {
  const snippet = truncateSnippet(result.snippet)

  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <a href={result.url} target="_blank" rel="noreferrer" className="text-lg font-semibold text-foreground hover:underline">
        {highlightText(result.title, query)}
      </a>
      <p className="mt-2 text-sm text-muted-foreground">{highlightText(snippet, query)}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="min-w-0 text-xs text-muted-foreground">
          {result.siteName} - {result.url}
        </p>
        <button
          type="button"
          aria-label="Report result"
          className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-40 transition-opacity hover:opacity-70"
        >
          <Flag className="size-3.5" />
        </button>
      </div>
    </article>
  )
}
