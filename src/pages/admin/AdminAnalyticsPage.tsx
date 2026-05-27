import { useEffect, useMemo, useState } from 'react'
import {
  getEditorAnalytics,
  type EditorAnalyticsResponse,
  type EditorAnalyticsSummary,
} from '../../lib/editorAnalytics'

function formatNumber(value: number) {
  return new Intl.NumberFormat('ar-EG').format(value)
}

function formatDateTime(value: string) {
  if (!value) return 'غير متوفر'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDuration(value: number) {
  const totalSeconds = Math.max(0, Math.round(value))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (!minutes) return `${formatNumber(seconds)} ث`
  if (!seconds) return `${formatNumber(minutes)} د`
  return `${formatNumber(minutes)} د ${formatNumber(seconds)} ث`
}

function getMetricCards(summary: EditorAnalyticsSummary) {
  return [
    { label: 'زيارات صفحات الموقع', value: summary.total_page_views },
    { label: 'مشاهدات المنشورات', value: summary.publication_views },
    { label: 'زوار صفحات مميزون', value: summary.unique_visitors },
    { label: 'زيارات آخر ٢٤ ساعة', value: summary.page_views_24h },
  ]
}

function getLocationLabel(country: string, city?: string) {
  const cleanCountry = country?.trim() || 'غير محدد'
  const cleanCity = city?.trim()
  return cleanCity ? `${cleanCountry}، ${cleanCity}` : cleanCountry
}

export function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<EditorAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalytics = async () => {
    setLoading(true)
    setError('')

    try {
      setAnalytics(await getEditorAnalytics())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل التحليلات.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = 'إسناد | التحليلات'
    void loadAnalytics()
  }, [])

  const metrics = useMemo(() => {
    if (!analytics?.configured) return []
    return getMetricCards(analytics.summary)
  }, [analytics])

  const projectUrl = analytics?.project_id ? `https://us.posthog.com/project/${analytics.project_id}` : 'https://us.posthog.com'

  return (
    <section>
      <div className="admin-header">
        <div>
          <span className="eyebrow">PostHog</span>
          <h1 className="title-2">تحليلات الزيارات</h1>
          <p>زيارات الموقع منفصلة عن مشاهدات المنشورات حتى تكون الأرقام واضحة.</p>
        </div>
        <div className="header__actions">
          <a className="btn btn--secondary btn--sm" href={projectUrl} rel="noreferrer" target="_blank">
            فتح PostHog
          </a>
          <button className="btn btn--primary btn--sm" disabled={loading} onClick={() => void loadAnalytics()} type="button">
            {loading ? 'جارٍ التحديث...' : 'تحديث'}
          </button>
        </div>
      </div>

      {error ? <div className="notice notice--error">{error}</div> : null}

      {loading ? (
        <div className="empty">جار تحميل التحليلات...</div>
      ) : analytics && !analytics.configured ? (
        <div className="notice notice--error">
          أضف <code>POSTHOG_PERSONAL_API_KEY</code> بصلاحية <code>query:read</code> إلى إعدادات Vercel لمشروع المحرر، ثم
          أعد النشر. رقم المشروع الحالي: <code>{analytics.project_id}</code>.
        </div>
      ) : analytics?.configured ? (
        <div className="analytics-stack">
          <div className="metrics">
            {metrics.map((metric) => (
              <div className="metric" key={metric.label}>
                <div className="metric__value">{formatNumber(metric.value)}</div>
                <div className="metric__label">{metric.label}</div>
              </div>
            ))}
          </div>

          <section className="analytics-panel">
            <div className="analytics-panel__header">
              <h2 className="title-3">المشاهدات حسب المنشور والموقع</h2>
              <span>هذه الأرقام تخص المنشورات فقط، وليست كل صفحات الموقع</span>
            </div>
            {analytics.top_publications.length ? (
              <div className="analytics-table analytics-table--publications" role="table">
                {analytics.top_publications.map((item) => (
                  <div className="analytics-table__row analytics-table__row--publication" key={item.publication_id} role="row">
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {item.kind || item.category || 'منشور'} · آخر مشاهدة {formatDateTime(item.last_seen)} · متوسط القراءة{' '}
                        {formatDuration(item.avg_reading_seconds)}
                      </span>
                      <div className="analytics-location-list">
                        {item.locations.length ? (
                          item.locations.slice(0, 6).map((location) => (
                            <span className="analytics-location-pill" key={`${item.publication_id}-${location.country}-${location.city}`}>
                              {getLocationLabel(location.country, location.city)}: {formatNumber(location.views)}
                            </span>
                          ))
                        ) : (
                          <span className="analytics-location-pill">الموقع غير متوفر بعد</span>
                        )}
                      </div>
                      <div className="analytics-read-list">
                        <div className="analytics-read-list__title">مدة القراءة حسب الزائر</div>
                        {item.read_sessions.length ? (
                          item.read_sessions.map((session) => (
                            <span
                              className="analytics-read-pill"
                              key={`${item.publication_id}-${session.read_session_id}-${session.last_seen}`}
                            >
                              {session.visitor}: {formatDuration(session.reading_seconds)} · عمق{' '}
                              {formatNumber(Math.round(session.max_scroll_depth))}% · {getLocationLabel(session.country, session.city)}
                            </span>
                          ))
                        ) : (
                          <span className="analytics-read-pill">لم تسجل مدة قراءة بعد</span>
                        )}
                      </div>
                    </div>
                    <div>{formatNumber(item.views)} مشاهدة</div>
                    <div>{formatNumber(item.visitors)} زائر</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">لا توجد مشاهدات مقالات/منشورات بعد. افتح منشورا، اقبل ملفات الارتباط، ثم انتظر دقيقة.</div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  )
}
