import { auth } from './firebase'

export type EditorAnalyticsSummary = {
  total_page_views: number
  publication_views: number
  unique_visitors: number
  page_views_24h: number
}

export type EditorAnalyticsPublication = {
  publication_id: string
  title: string
  kind: string
  category: string
  views: number
  visitors: number
  last_seen: string
  locations: EditorAnalyticsLocation[]
  read_sessions: EditorAnalyticsReadSession[]
  total_reading_seconds: number
  avg_reading_seconds: number
}

export type EditorAnalyticsLocation = {
  country: string
  city: string
  views: number
  visitors: number
}

export type EditorAnalyticsReadSession = {
  visitor: string
  read_session_id: string
  reading_seconds: number
  max_scroll_depth: number
  last_seen: string
  country: string
  city: string
}

export type EditorAnalyticsResponse =
  | {
      configured: false
      project_id: string
      host: string
      message: string
    }
  | {
      configured: true
      project_id: string
      host: string
      generated_at: string
      summary: EditorAnalyticsSummary
      top_publications: EditorAnalyticsPublication[]
    }

function getErrorMessage(payload: unknown) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }

  return 'تعذر تحميل التحليلات.'
}

export async function getEditorAnalytics(): Promise<EditorAnalyticsResponse> {
  const token = await auth?.currentUser?.getIdToken()

  if (!token) {
    throw new Error('يجب تسجيل الدخول بصلاحية مدير لعرض التحليلات.')
  }

  const response = await fetch('/api/posthog-summary', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = (await response.json().catch(() => null)) as EditorAnalyticsResponse | { message?: string } | null

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  return payload as EditorAnalyticsResponse
}
