import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicationBySlug } from '../../lib/publications'
import { listReadableChapters } from '../../studio/lib/chapters'
import { ArticleReader } from '../components/ArticleReader'
import { BookReader } from '../components/BookReader'
import type { Publication } from '../../types/publication'
import type { Chapter } from '../../types/studio'

export function ReaderPage() {
  const { slug } = useParams<{ slug: string }>()
  const currentSlug = slug ?? ''
  const [readerState, setReaderState] = useState<{
    slug: string
    publication: Publication | null
    chapters: Chapter[]
    error: string
  }>({
    slug: '',
    publication: null,
    chapters: [],
    error: '',
  })

  useEffect(() => {
    if (!currentSlug) return undefined

    let cancelled = false
    getPublicationBySlug(currentSlug)
      .then(async (pub) => {
        if (cancelled) return
        if (!pub) {
          setReaderState({
            slug: currentSlug,
            publication: null,
            chapters: [],
            error: 'الإصدار غير موجود.',
          })
          return
        }
        let nextChapters: Chapter[] = []
        if (pub.type === 'book') {
          nextChapters = await listReadableChapters(pub.id)
        }
        if (!cancelled) {
          setReaderState({
            slug: currentSlug,
            publication: pub,
            chapters: nextChapters,
            error: '',
          })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReaderState({
            slug: currentSlug,
            publication: null,
            chapters: [],
            error: 'تعذر تحميل الإصدار.',
          })
        }
      })
    return () => { cancelled = true }
  }, [currentSlug])

  const loading = Boolean(currentSlug) && readerState.slug !== currentSlug
  const publication = readerState.slug === currentSlug ? readerState.publication : null
  const chapters = readerState.slug === currentSlug ? readerState.chapters : []
  const error = currentSlug ? readerState.error : 'الإصدار غير موجود.'

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
