import type { AppLanguage, Publication } from '../../types/publication'
import { homeHeroInnerHtml } from '../../lib/initialPageHtml.js'
export function HomeHero({publication, language}: {publication?: Publication; language: AppLanguage}) {
  return <section className="home-hero" dangerouslySetInnerHTML={{__html:homeHeroInnerHtml(publication, language)}} />
}
