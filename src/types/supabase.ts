/**
 * Hand-authored Database types derived from supabase/migrations/001_initial_schema.sql.
 * Replace with generated types once the Supabase project is live:
 *   npx supabase gen types typescript --project-id <id> > src/types/supabase.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Database = {
  public: {
    Tables: {
      sites: {
        Row: {
          id: string
          url: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          url: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          url?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      site_categories: {
        Row: {
          site_id: string
          category_id: string
        }
        Insert: {
          site_id: string
          category_id: string
        }
        Update: {
          site_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'site_categories_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'site_categories_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          }
        ]
      }
      crawl_queue: {
        Row: {
          id: string
          site_id: string
          url: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          priority: number
          created_at: string
          updated_at: string
          attempted_at: string | null
          error: string | null
        }
        Insert: {
          id?: string
          site_id: string
          url: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          priority?: number
          created_at?: string
          updated_at?: string
          attempted_at?: string | null
          error?: string | null
        }
        Update: {
          id?: string
          site_id?: string
          url?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          priority?: number
          created_at?: string
          updated_at?: string
          attempted_at?: string | null
          error?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'crawl_queue_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          }
        ]
      }
      crawl_pages: {
        Row: {
          id: string
          site_id: string
          url: string
          title: string | null
          content: string | null
          content_hash: string | null
          typesense_id: string | null
          crawled_at: string
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          site_id: string
          url: string
          title?: string | null
          content?: string | null
          content_hash?: string | null
          typesense_id?: string | null
          crawled_at?: string
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          url?: string
          title?: string | null
          content?: string | null
          content_hash?: string | null
          typesense_id?: string | null
          crawled_at?: string
          deleted_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'crawl_pages_site_id_fkey'
            columns: ['site_id']
            isOneToOne: false
            referencedRelation: 'sites'
            referencedColumns: ['id']
          }
        ]
      }
      search_logs: {
        Row: {
          id: string
          query: string
          result_count: number
          category_filter: string | null
          clicked_url: string | null
          click_position: number | null
          created_at: string
        }
        Insert: {
          id?: string
          query: string
          result_count?: number
          category_filter?: string | null
          clicked_url?: string | null
          click_position?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          query?: string
          result_count?: number
          category_filter?: string | null
          clicked_url?: string | null
          click_position?: number | null
          created_at?: string
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          email: string
          failed_attempts: number
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          email: string
          failed_attempts?: number
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          email?: string
          failed_attempts?: number
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
