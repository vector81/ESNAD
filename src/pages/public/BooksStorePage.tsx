import { useEffect, useState } from 'react'
import { PublicationCard } from '../../components/public/PublicationCard'
import { PublicSiteShell } from '../../components/public/PublicSiteShell'
import { listPublications } from '../../lib/publications'
import type { AppLanguage, Publication } from '../../types/publication'

export function BooksStorePage({ language }: { language: AppLanguage }) {
  const [books, setBooks] = useState<Publication[]>([])

  useEffect(() => {
    listPublications({ kind: 'book' }).then(setBooks).catch(() => setBooks([]))
  }, [])

  return (
    <PublicSiteShell language={language}>
      <section className="panel">
        <div className="panel__head">
          <div>
            <span className="eyebrow">{language === 'ar' ? 'الكتب' : 'Books'}</span>
            <h1 className="title-2">{language === 'ar' ? 'إصدارات الكتب' : 'Book releases'}</h1>
          </div>
        </div>

        {books.length === 0 ? (
          <div className="empty">
            {language === 'ar' ? 'لا توجد كتب منشورة بعد.' : 'No books published yet.'}
          </div>
        ) : (
          <div className="grid-3">
            {books.map((book) => (
              <PublicationCard key={book.id} language={language} publication={book} />
            ))}
          </div>
        )}
      </section>
    </PublicSiteShell>
  )
}
