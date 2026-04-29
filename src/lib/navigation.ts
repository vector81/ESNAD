import { getShareSlug } from './publications'
import type { AppLanguage, Publication } from '../types/publication'

export function buildLocalizedPath(language: AppLanguage, path: string) {
  if (language === 'ar') {
    return path
  }

  if (path === '/') {
    return '/en'
  }

  return `/en${path}`
}

export function buildPublicationPath(publication: Publication, language: AppLanguage) {
  const section = publication.kind === 'book' ? '/books' : '/library'
  return buildLocalizedPath(language, `${section}/${getShareSlug(publication)}`)
}
