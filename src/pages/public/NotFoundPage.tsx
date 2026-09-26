import { Link, useLocation } from 'react-router-dom'
import { PublicSiteShell } from '../../components/public/PublicSiteShell'

export function NotFoundPage() {
  const english = useLocation().pathname.startsWith('/en/')
  return (
    <PublicSiteShell language={english ? 'en' : 'ar'} noindex>
      <section className="panel">
        <h1>{english ? 'Page not found' : 'الصفحة غير موجودة'}</h1>
        <p>{english ? 'This page or publication could not be found.' : 'تعذر العثور على الصفحة أو الإصدار المطلوب.'}</p>
        <Link to={english ? '/en' : '/'}>{english ? 'Return home' : 'العودة إلى الرئيسية'}</Link>
      </section>
    </PublicSiteShell>
  )
}
