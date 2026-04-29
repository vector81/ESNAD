import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deletePublication, listAdminPublications } from '../../lib/publications'
import { migrateLegacyPublications } from '../../studio/lib/migrate'
import type { Publication } from '../../types/publication'

function formatArabicDate(value: string) {
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Publication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [migrateLoading, setMigrateLoading] = useState(false)
  const [migrateMessage, setMigrateMessage] = useState('')

  const loadItems = async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await listAdminPublications())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الإصدارات.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = 'إسناد | إدارة الإصدارات'
    void loadItems()
  }, [])

  const metrics = useMemo(
    () => [
      { label: 'إجمالي الإصدارات', value: items.length },
      { label: 'المنشور', value: items.filter((item) => item.status === 'published').length },
      { label: 'مقالات', value: items.filter((item) => item.kind === 'article').length },
      { label: 'أوراق بحثية', value: items.filter((item) => item.kind === 'research-paper').length },
      { label: 'كتب', value: items.filter((item) => item.kind === 'book').length },
      { label: 'المدفوع', value: items.filter((item) => item.access_tier === 'paid').length },
    ],
    [items],
  )

  const handleDelete = async (publicationId: string) => {
    if (!window.confirm('هل تريد حذف هذا الإصدار؟')) {
      return
    }
    await deletePublication(publicationId)
    await loadItems()
  }

  const handleMigrate = async () => {
    if (!window.confirm('سيتم تحويل الإصدارات القديمة ذات النصوص البسيطة إلى تنسيق المحرر الجديد. هل تريد المتابعة؟')) {
      return
    }
    setMigrateLoading(true)
    setMigrateMessage('')
    try {
      const result = await migrateLegacyPublications()
      setMigrateMessage(`تم ترحيل ${result.migrated} إصداراً. ${result.errors.length > 0 ? `أخطاء: ${result.errors.length}` : ''}`)
      await loadItems()
    } catch (err) {
      setMigrateMessage(err instanceof Error ? err.message : 'فشل الترحيل.')
    } finally {
      setMigrateLoading(false)
    }
  }

  return (
    <section>
      <div className="admin-header">
        <div>
          <span className="eyebrow">الإدارة</span>
          <h1 className="title-2">إدارة الإصدارات</h1>
          <p>قائمة الأبحاث والكتب المنشورة والمسودات.</p>
        </div>
        <div className="header__actions">
          <button className="btn btn--secondary btn--sm" onClick={() => void loadItems()} type="button">
            تحديث
          </button>
          <button className="btn btn--secondary btn--sm" disabled={migrateLoading} onClick={() => void handleMigrate()} type="button">
            {migrateLoading ? 'جارٍ الترحيل…' : 'ترحيل القديم'}
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => navigate('/admin/publications/new')} type="button">
            إصدار جديد
          </button>
        </div>
      </div>

      {error ? <div className="notice notice--error">{error}</div> : null}
      {migrateMessage ? <div className="notice notice--success">{migrateMessage}</div> : null}

      {!loading && (
        <div className="metrics">
          {metrics.map((metric) => (
            <div className="metric" key={metric.label}>
              <div className="metric__value">{metric.value}</div>
              <div className="metric__label">{metric.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="empty">جار تحميل الإصدارات...</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <strong>لا توجد إصدارات بعد</strong>
          <p className="mt-2">ابدأ بإضافة ورقة أو كتاب جديد.</p>
        </div>
      ) : (
        <div className="admin-list">
          {items.map((item) => (
            <div className="admin-list__item" key={item.id}>
              <div>
                <div className="badge-row">
                  <span className={`badge ${item.status === 'published' ? 'badge--success' : 'badge--warning'}`}>
                    {item.status === 'published' ? 'منشور' : 'مسودة'}
                  </span>
                  <span className={`badge kind-badge kind-badge--${item.kind}`}>
                    {item.kind === 'book' ? 'كتاب' : item.kind === 'article' ? 'مقال' : 'ورقة بحثية'}
                  </span>
                  <span className="badge badge--neutral">{item.access_tier === 'free' ? 'مجاني' : 'مدفوع'}</span>
                </div>
                <h3 className="title-3">{item.title_ar}</h3>
                <p className="list-abstract">{item.abstract_ar}</p>
                <div className="admin-list__meta">
                  <span>{item.author_ar}</span>
                  <span>{formatArabicDate(item.published_at)}</span>
                  <span>{item.pages} صفحة</span>
                </div>
              </div>
              <div className="admin-list__actions">
                <Link className="btn btn--secondary btn--sm" to={`/admin/publications/${item.id}/edit`}>
                  تعديل
                </Link>
                <button className="btn btn--danger btn--sm" onClick={() => void handleDelete(item.id)} type="button">
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
