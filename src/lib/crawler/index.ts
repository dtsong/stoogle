import { createTypesenseAdminClient } from '@/lib/typesense/client'
import type { SearchIndex, SearchIndexDocument } from '@/lib/crawler/pipeline'

export class TypesenseSearchIndex implements SearchIndex {
  private readonly client = createTypesenseAdminClient()

  async upsert(document: SearchIndexDocument): Promise<void> {
    await this.client.collections('pages').documents().upsert(document)
  }

  async removeById(documentId: string): Promise<void> {
    await this.client.collections('pages').documents(documentId).delete()
  }

  async removeBySiteDomain(siteDomain: string): Promise<void> {
    await this.client.collections('pages').documents().delete({
      filter_by: `site_domain:=${siteDomain}`,
    })
  }
}
