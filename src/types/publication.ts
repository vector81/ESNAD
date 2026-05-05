export type AppLanguage = 'ar' | 'en'

export type PublicationKind = 'article' | 'research-paper' | 'book'
export type AccessTier = 'free' | 'paid'
export type PublicationStatus = 'draft' | 'published'
export type PublicationType = 'article' | 'book'
export type WorkflowStage = 'draft' | 'in_review' | 'needs_revision' | 'approved' | 'published'

export type PublicationCategory =
  | 'studies'
  | 'policy-paper'
  | 'economic-paper'
  | 'analytical-paper'
  | 'reports'
  | 'strategic-estimate'
  | 'situation-assessment'
  | 'legal-paper'
  | 'opinion-article'
  | 'foresight'
  | 'position-analysis'
  | 'expert-survey'
  | 'periodic-reports'
  | 'case-monitoring'
  | 'media-analysis'
  | 'policy-analysis'
  | 'psychological-studies'
  | 'analysis-summary'
  | 'information-file'
  | 'documents'
  | 'translations'
  | 'profile'
  | 'concept'
  | 'infographic'

export interface TocItem {
  id: string
  title: string
  level: number
}

export interface Publication {
  id: string
  slug: string
  // Legacy 'kind' is preserved for backward compatibility
  kind: PublicationKind
  // New 'type' drives studio behavior (article vs book)
  type: PublicationType
  status: PublicationStatus
  workflow_stage: WorkflowStage
  access_tier: AccessTier
  price_aud: number
  category: PublicationCategory
  topic_ar: string
  topic_en: string
  title_ar: string
  title_en: string
  // Short headline (≤80 chars) used for cards, social previews, browser title.
  // Falls back to the full title when empty.
  headline_ar: string
  headline_en: string
  abstract_ar: string
  abstract_en: string
  description_ar: string
  description_en: string
  author_ar: string
  author_en: string
  cover_image: string
  cover_position_x: number
  cover_position_y: number
  pdf_url: string
  featured: boolean
  language_mode: 'ar' | 'en' | 'both'
  pages: number
  tags_ar: string[]
  tags_en: string[]
  published_at: string
  created_at: string
  updated_at: string
  // Studio fields
  content_json?: Record<string, unknown> | null
  toc?: TocItem[]
}

export type PublicationInput = Omit<Publication, 'id' | 'created_at' | 'updated_at'> &
  Partial<Pick<Publication, 'created_at' | 'updated_at'>>

export interface LibrarySnapshot {
  saved_item_ids: string[]
  purchased_item_ids: string[]
}

export interface SessionUser {
  uid: string
  email: string
  displayName: string
}

export const EMPTY_LIBRARY_SNAPSHOT: LibrarySnapshot = {
  saved_item_ids: [],
  purchased_item_ids: [],
}

export const EMPTY_PUBLICATION_INPUT: PublicationInput = {
  slug: '',
  kind: 'research-paper',
  type: 'article',
  status: 'draft',
  workflow_stage: 'draft',
  access_tier: 'free',
  price_aud: 0,
  category: 'studies',
  topic_ar: '',
  topic_en: '',
  title_ar: '',
  title_en: '',
  headline_ar: '',
  headline_en: '',
  abstract_ar: '',
  abstract_en: '',
  description_ar: '',
  description_en: '',
  author_ar: '',
  author_en: '',
  cover_image: '',
  cover_position_x: 50,
  cover_position_y: 50,
  pdf_url: '',
  featured: false,
  language_mode: 'both',
  pages: 1,
  tags_ar: [],
  tags_en: [],
  published_at: new Date().toISOString(),
  content_json: null,
  toc: [],
}
