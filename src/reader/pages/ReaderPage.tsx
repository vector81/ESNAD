import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicationBySlug } from '../../lib/publications'
import { listChapters } from '../../studio/lib/chapters'
import { ArticleReader } from '../components/ArticleReader'
import { BookReader } from '../components/BookReader'
import type { Publication } from '../../types/publication'
import type { Chapter } from '../../types/studio'

export function ReaderPage() {
  const { slug } = useParams<{ slug: string }>()
  const [publication, setPublication] = useState<Publication | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setPublication(null)
    setChapters([])
    setError('')
    getPublicationBySlug(slug)
      .then(async (pub) => {
        if (cancelled) return
        if (!pub) {
          setError('الإصدار غير موجود.')
          setLoading(false)
          return
        }
        setPublication(pub)
        if (pub.type === 'book') {
          const chs = await listChapters(pub.id)
          if (!cancelled) setChapters(chs)
        }
        if (!cancelled) setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError('تعذر تحميل الإصدار.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div className="reader-page">
        <div style={{ textAlign: 'center', padding: 64 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>جارٍ تحميل القارئ…</div>
        </div>
      </div>
    )
  }

  if (error || !publication) {
    return (
      <div className="reader-page">
        <div style={{ textAlign: 'center', padding: 64 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--danger)' }}>{error || 'الإصدار غير موجود.'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="reader-page">
      {publication.type === 'book' ? (
        <BookReader publication={publication} chapters={chapters} />
      ) : (
        <ArticleReader publication={publication} />
      )}
    </div>
  )
}
