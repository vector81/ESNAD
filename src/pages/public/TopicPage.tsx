import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PublicSiteShell } from '../../components/public/PublicSiteShell'
import { PublicationCard } from '../../components/public/PublicationCard'
import { listPublications } from '../../lib/publications'
import { SEO_TOPICS } from '../../lib/seoTopics.js'
import { breadcrumbs } from '../../lib/seoMetadata.js'
import { usePageMeta } from '../../hooks/usePageMeta'
import type { Publication } from '../../types/publication'

export function TopicPage() {
  const { category = '' } = useParams()
  const topic = SEO_TOPICS[category]
  const [items, setItems] = useState<Publication[]>([])
  useEffect(() => { let active = true; listPublications().then(pubs => { if (active) setItems(pubs.filter(p => p.category === category)) }); return () => { active = false } }, [category])
  usePageMeta('ar', topic ? { title: topic.title, description: topic.intro, path: `/topics/${category}` } : { noindex: true })
  if (!topic) return <PublicSiteShell language="ar" noindex><h1>التصنيف غير موجود</h1></PublicSiteShell>
  return <PublicSiteShell language="ar">
    <script type="application/ld+json">{JSON.stringify(breadcrumbs([['الرئيسية', '/'], ['المكتبة', '/library'], [topic.title, `/topics/${category}`]]))}</script>
    <nav aria-label="مسار التصفح"><Link to="/">الرئيسية</Link> / <Link to="/library">المكتبة</Link> / {topic.title}</nav>
    <h1 className="title-1">{topic.title}</h1><p>{topic.intro}</p>
    <div className="grid-3">{items.map(item => <PublicationCard key={item.id} publication={item} language="ar" />)}</div>
  </PublicSiteShell>
}
