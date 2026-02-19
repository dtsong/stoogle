'use server'

import { redirect } from 'next/navigation'
import { requireAdminUserOrRedirect } from '@/lib/admin/auth'
import { normalizeSiteUrl } from '@/lib/admin/sites'
import { createAdminClient } from '@/lib/supabase/admin'

function messageUrl(message: string, level: 'notice' | 'error' = 'notice') {
  return `/admin?${level}=${encodeURIComponent(message)}`
}

export async function addSiteAction(formData: FormData) {
  await requireAdminUserOrRedirect()

  const urlInput = String(formData.get('url') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const categoryIds = formData
    .getAll('categories')
    .map((value) => String(value))
    .filter(Boolean)

  if (!name || categoryIds.length === 0) {
    redirect(messageUrl('Name and at least one category are required.', 'error'))
  }

  let normalizedUrl: string
  try {
    normalizedUrl = normalizeSiteUrl(urlInput)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid site URL'
    redirect(messageUrl(message, 'error'))
  }

  const client = createAdminClient()
  const { error: upsertError } = await client.from('sites').upsert(
    {
      url: normalizedUrl,
      name,
      is_active: true,
    },
    { onConflict: 'url' }
  )

  if (upsertError) {
    redirect(messageUrl(`Failed to save site: ${upsertError.message}`, 'error'))
  }

  const { data: site, error: siteLookupError } = await client
    .from('sites')
    .select('id')
    .eq('url', normalizedUrl)
    .single()

  if (siteLookupError || !site) {
    redirect(messageUrl('Failed to load saved site row.', 'error'))
  }

  const { error: clearError } = await client.from('site_categories').delete().eq('site_id', site.id)
  if (clearError) {
    redirect(messageUrl(`Failed to update categories: ${clearError.message}`, 'error'))
  }

  const { error: categoriesError } = await client.from('site_categories').insert(
    categoryIds.map((categoryId) => ({
      site_id: site.id,
      category_id: categoryId,
    }))
  )

  if (categoriesError) {
    redirect(messageUrl(`Failed to assign categories: ${categoriesError.message}`, 'error'))
  }

  redirect(messageUrl('Site saved successfully.'))
}

export async function removeSiteAction(formData: FormData) {
  await requireAdminUserOrRedirect()
  const siteId = String(formData.get('siteId') ?? '')

  if (!siteId) {
    redirect(messageUrl('Missing site id.', 'error'))
  }

  const client = createAdminClient()
  const { error } = await client.from('sites').delete().eq('id', siteId)

  if (error) {
    redirect(messageUrl(`Failed to remove site: ${error.message}`, 'error'))
  }

  redirect(messageUrl('Site removed from curated list.'))
}

export async function recrawlSiteAction(formData: FormData) {
  await requireAdminUserOrRedirect()

  const siteId = String(formData.get('siteId') ?? '')
  const siteUrl = String(formData.get('siteUrl') ?? '')

  if (!siteId || !siteUrl) {
    redirect(messageUrl('Missing site details for re-crawl.', 'error'))
  }

  const client = createAdminClient()

  const { data: existing, error: existingError } = await client
    .from('crawl_queue')
    .select('id, status')
    .eq('site_id', siteId)
    .eq('url', siteUrl)
    .maybeSingle()

  if (existingError) {
    redirect(messageUrl(`Failed to inspect crawl queue: ${existingError.message}`, 'error'))
  }

  if (existing && (existing.status === 'pending' || existing.status === 'processing')) {
    redirect(messageUrl('A crawl is already active for this site.', 'error'))
  }

  if (existing) {
    const { error: updateError } = await client
      .from('crawl_queue')
      .update({
        status: 'pending',
        error: null,
        attempted_at: null,
      })
      .eq('id', existing.id)

    if (updateError) {
      redirect(messageUrl(`Failed to queue re-crawl: ${updateError.message}`, 'error'))
    }
  } else {
    const { error: insertError } = await client.from('crawl_queue').insert({
      site_id: siteId,
      url: siteUrl,
      status: 'pending',
      priority: 5,
    })

    if (insertError) {
      redirect(messageUrl(`Failed to queue re-crawl: ${insertError.message}`, 'error'))
    }
  }

  redirect(messageUrl('Re-crawl queued.'))
}
