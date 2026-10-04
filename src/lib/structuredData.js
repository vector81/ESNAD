import { ARTICLE_COVER_FALLBACKS } from './articleCoverFallbacks.js'
import { publicationSeo } from './seoMetadata.js'
import { cleanAuthor } from './cleanAuthor.js'

export const SEO_SITE_URL = 'https://esnads.net'
export const SEO_SITE_NAME = 'مركز إسناد للدراسات والأبحاث'
export const SEO_ALTERNATE_NAMES = ['اسناد', 'مركز اسناد', 'مركز إسناد', 'Esnads', 'Esnad', 'esnads.net']

export function createOrganizationStructuredData() {
  return {
    '@type': 'Organization',
    '@id': `${SEO_SITE_URL}/#organization`,
    name: SEO_SITE_NAME,
    alternateName: [...SEO_ALTERNATE_NAMES],
    url: SEO_SITE_URL,
    logo: `${SEO_SITE_URL}/newlogo.png`,
    sameAs: [], // TODO: Add the verified social profile URLs supplied by the owner.
  }
}

export function createWebsiteStructuredData() {
  return {
    '@type': 'WebSite',
    '@id': `${SEO_SITE_URL}/#website`,
    name: 'إسناد',
    alternateName: [...SEO_ALTERNATE_NAMES],
    url: SEO_SITE_URL,
    publisher: { '@id': `${SEO_SITE_URL}/#organization` },
    inLanguage: ['ar', 'en'],
  }
}

export function getPublicationImage(pub) {
  const image = pub.cover_image || ARTICLE_COVER_FALLBACKS[pub.id] || ''
  return image ? new URL(image, SEO_SITE_URL).href : ''
}

function isoDate(value) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}

export function createArticleStructuredData(pub, { url, image = getPublicationImage(pub) }) {
  const organization = createOrganizationStructuredData()
  const author = cleanAuthor(pub.author_ar?.trim() || pub.author_en?.trim())
  const datePublished = isoDate(pub.published_at) || isoDate(pub.created_at)
  const dateModified = isoDate(pub.updated_at) || datePublished
  const publicationImage = image || getPublicationImage(pub)
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: pub.headline_ar?.trim() || pub.title_ar?.trim() || '',
    name: pub.title_ar?.trim() || '',
    description: publicationSeo(pub).description,
    inLanguage: 'ar',
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    publisher: organization,
    author: !author || ['مركز إسناد', SEO_SITE_NAME].includes(author)
      ? { '@type': 'Organization', '@id': organization['@id'], name: author || SEO_SITE_NAME }
      : { '@type': 'Person', name: author },
    image: publicationImage ? [new URL(publicationImage, SEO_SITE_URL).href] : [],
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
  }
}

export function serializeStructuredData(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
