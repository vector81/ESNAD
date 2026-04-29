import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Publication } from '../../types/publication'
import type { Chapter } from '../../types/studio'

interface StudioNavProps {
  publications: Publication[]
  currentId?: string
  isLoading: boolean
  chapters?: Chapter[]
  currentChapterId?: string
  onSelectChapter?: (chapterId: string) => void
  onAddChapter?: () => void
  onReorderChapters?: (orderedIds: string[]) => void
  publicationType?: Publication['type']
}

export function StudioNav({
  publications,
  currentId,
  isLoading,
  chapters = [],
  currentChapterId,
  onSelectChapter,
  onAddChapter,
  onReorderChapters,
  publicationType,
}: StudioNavProps) {
  const navigate = useNavigate()
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const handleDragStart = (id: string) => {
    setDraggedId(id)
  }

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId || !onReorderChapters) return
    const ordered = [...chapters]
    const fromIndex = ordered.findIndex((c) => c.id === draggedId)
    const toIndex = ordered.findIndex((c) => c.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const [moved] = ordered.splice(fromIndex, 1)
    ordered.splice(toIndex, 0, moved)
    onReorderChapters(ordered.map((c) => c.id))
    setDraggedId(null)
  }

  return (
    <div className="studio-nav">
      <div className="studio-nav__header">
        <h2 className="studio-nav__title">المشاريع</h2>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => navigate('/admin/publications/new')}
        >
          + جديد
        </button>
      </div>

      {isLoading ? (
        <div className="studio-nav__loading">جارٍ التحميل…</div>
      ) : (
        <>
          <ul className="studio-nav__list">
            {publications.map((pub) => (
              <li
                key={pub.id}
                className={`studio-nav__item${pub.id === currentId ? ' studio-nav__item--active' : ''}`}
                onClick={() => navigate(`/admin/publications/${pub.id}/edit`)}
              >
                <div className="studio-nav__item-title">{pub.title_ar || 'بلا عنوان'}</div>
                <div className="studio-nav__item-meta">
                  <span className={`studio-nav__item-type kind-badge kind-badge--${pub.kind}`}>
                    {pub.kind === 'book' ? 'كتاب' : pub.kind === 'article' ? 'مقال' : 'ورقة بحثية'}
                  </span>
                  <span className={`studio-badge studio-badge--${pub.status}`}>{pub.status === 'published' ? 'منشور' : 'مسودة'}</span>
                </div>
              </li>
            ))}
          </ul>

          {currentId && publicationType === 'book' && (
            <div className="studio-nav__chapters">
              <div className="studio-nav__chapters-header">
                <h3 className="studio-nav__chapters-title">الفصول</h3>
                {onAddChapter && (
                  <button type="button" className="btn btn--ghost btn--xs" onClick={onAddChapter}>
                    + إضافة
                  </button>
                )}
              </div>
              {chapters.length === 0 ? (
                <div className="studio-nav__empty">لا توجد فصول بعد.</div>
              ) : (
                <ul className="studio-nav__chapters-list">
                  {chapters.map((chapter) => (
                    <li
                      key={chapter.id}
                      draggable={Boolean(onReorderChapters)}
                      onDragStart={() => handleDragStart(chapter.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDrop(chapter.id)}
                      className={`studio-nav__chapter${chapter.id === currentChapterId ? ' studio-nav__chapter--active' : ''}`}
                      onClick={() => onSelectChapter?.(chapter.id)}
                    >
                      <span className="studio-nav__chapter-number">{chapter.order}.</span>
                      <span className="studio-nav__chapter-title">{chapter.title_ar || 'بلا عنوان'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
