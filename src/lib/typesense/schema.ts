import pagesCollectionSchema from '../../../infra/typesense/schema/pages.collection.json'

export type TypesenseCollectionSchemaField = {
  name: string
  type: string
  facet?: boolean
}

export type TypesenseCollectionSchema = {
  name: string
  fields: TypesenseCollectionSchemaField[]
}

export const TYPESENSE_PAGES_COLLECTION =
  pagesCollectionSchema as TypesenseCollectionSchema
