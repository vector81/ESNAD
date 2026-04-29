import { useState } from 'react'
import { renderPmJson } from '../lib/render-pm-json'
import type { Publication } from '../../types/publication'
import type { Chapter } from '../../types/studio'

interface BookReaderProps {
  publication: Publication
  chapters: Chapter[]
}

export function BookReader({ publication, chapters }: BookReaderProps) {
  const [activeChapterId, setActiveChapterId] = useState<string>(chapters[0]?.id || '')
  const activeChapter = chapters.find((c) => c.id === activeChapterId)

  return (
    <div className="reader-book">
      <aside className="reader-book__toc">
        <div className="reader-book__toc-header">
          <h2 className="reader-book__toc-title">{publication.title_ar}</h2>
          {publication.author_ar && <p className="reader-book__toc-author">{publication.author_ar}</p>}
        </div>
        <nav className="reader-book__toc-nav">
          <ol className="reader-book__toc-list">
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <button
                  type="button"
                  className={`reader-book__toc-link${chapter.id === activeChapterId ? ' reader-book__toc-link--active' : ''}`}
                  onClick={() => setActiveChapterId(chapter.id)}
                >
                  {chapter.title_ar || 'بلا عنوان'}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </aside>

      <article className="reader-book__content">
        {activeChapter ? (
          <>
            <header className="reader-header">
              <h1 className="reader-title">{activeChapter.title_ar}</h1>
              {activeChapter.title_en ? <p className="reader-subtitle">{activeChapter.title_en}</p> : null}
            </header>
            <div className="reader-body">
              {activeChapter.content_json ? (
                renderPmJson(activeChapter.content_json)
              ) : (
                <div className="reader-fallback">
                  <p>لا يتوفر محتوى منسّق لهذا الفصل.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="reader-fallback">
            <p>لا توجد فصول متاحة.</p>
          </div>
        )}
      </article>
    </div>
  )
}
