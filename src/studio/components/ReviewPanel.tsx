import { useEffect, useState } from 'react'
import { listComments, saveComment, resolveComment } from '../lib/comments'
import type { Comment } from '../../types/studio'

interface ReviewPanelProps {
  publicationId: string
  chapterId?: string | null
  canComment: boolean
}

export function ReviewPanel({ publicationId, chapterId, canComment }: ReviewPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')

  useEffect(() => {
    setLoading(true)
    listComments(publicationId, chapterId)
      .then((list) => setComments(list))
      .catch(() => setComments([]))
      .finally(() => setLoading(false))
  }, [publicationId, chapterId])

  const handleSubmit = async () => {
    if (!text.trim()) return
    try {
      const saved = await saveComment(publicationId, { text, chapter_id: chapterId || null })
      setComments((list) => [...list, saved])
      setText('')
    } catch {
      // ignore
    }
  }

  const toggleResolved = async (comment: Comment) => {
    try {
      await resolveComment(publicationId, comment.id, !comment.resolved)
      setComments((list) =>
        list.map((c) => (c.id === comment.id ? { ...c, resolved: !c.resolved } : c))
      )
    } catch {
      // ignore
    }
  }

  const unresolved = comments.filter((c) => !c.resolved)
  const resolved = comments.filter((c) => c.resolved)

  return (
    <div className="context-panel__section">
      <h3 className="context-panel__section-title">المراجعة والتعليقات</h3>

      {canComment && (
        <div className="review-form">
          <textarea
            className="editor-textarea"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="أضف تعليقاً عاماً…"
          />
          <button type="button" className="btn btn--primary btn--sm" onClick={handleSubmit}>
            إرسال تعليق
          </button>
        </div>
      )}

      {loading ? (
        <p className="context-panel__hint">جارٍ التحميل…</p>
      ) : (
        <>
          {unresolved.length === 0 && resolved.length === 0 && (
            <p className="context-panel__hint">لا توجد تعليقات بعد.</p>
          )}

          {unresolved.length > 0 && (
            <div className="review-group">
              <div className="review-group__title">تعليقات مفتوحة</div>
              <ul className="review-list">
                {unresolved.map((c) => (
                  <li key={c.id} className="review-item">
                    <div className="review-item__header">
                      <span className="review-item__author">{c.author.name}</span>
                      <span className="review-item__date">
                        {new Date(c.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <p className="review-item__text">{c.text}</p>
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      onClick={() => toggleResolved(c)}
                    >
                      تحديد كمحلول
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resolved.length > 0 && (
            <div className="review-group">
              <div className="review-group__title">تعليقات مغلقة</div>
              <ul className="review-list">
                {resolved.map((c) => (
                  <li key={c.id} className="review-item review-item--resolved">
                    <div className="review-item__header">
                      <span className="review-item__author">{c.author.name}</span>
                      <span className="review-item__date">
                        {new Date(c.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <p className="review-item__text">{c.text}</p>
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      onClick={() => toggleResolved(c)}
                    >
                      إعادة فتح
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
