import { ARTICLE_COVER_FALLBACKS } from './articleCoverFallbacks.js'
import { publicationSeo } from './seoMetadata.js'
import { cleanAuthor } from './cleanAuthor.js'

export const SEO_SITE_URL = 'https://esnads.net'
export const SEO_SITE_NAME = 'مركز إسناد للدراسات والأبحاث'
export const SEO_ALTERNATE_NAMES = ['اسناد', 'مركز اسناد', 'مركز إسناد', 'مكتبة اسناد', 'مكتبة إسناد', 'مركز اسناد الالكتروني', 'مركز إسناد الإلكتروني', 'Esnad Center for Studies and Research', 'Esnads', 'Esnad', 'esnads.net']
export const SEO_ORGANIZATION_DESCRIPTION = 'مركز إسناد للدراسات والأبحاث منصة بحثية عربية متخصصة في إنتاج ونشر وأرشفة الدراسات والأوراق السياسية والاقتصادية والتحليلية، ومكتبة رقمية تجمع بين الإتاحة المجانية والإصدارات المدفوعة.'

export function createOrganizationStructuredData() {
  return {
    '@type': 'Organization',
    '@id': `${SEO_SITE_URL}/#organization`,
    name: SEO_SITE_NAME,
    alternateName: [...SEO_ALTERNATE_NAMES],
    url: SEO_SITE_URL,
    logo: `${SEO_SITE_URL}/newlogo.png`,
    description: SEO_ORGANIZATION_DESCRIPTION,
    knowsAbout: ['الدراسات السياسية', 'الدراسات القانونية', 'تحليل السياسات', 'الأوراق البحثية', 'Policy research', 'Political studies'],
    sameAs: [], // TODO: Add the verified social profile URLs supplied by the owner.
  }
}

// About/contact pages: entity facts mirror the visible page copy only.
export function createStaticPageStructuredData(path) {
  const organization = createOrganizationStructuredData()
  const isContact = path === '/contact'
  const url = `${SEO_SITE_URL}${path}`
  const name = isContact ? 'تواصل مع مركز إسناد للدراسات والأبحاث' : 'من نحن: مركز إسناد للدراسات والأبحاث'
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': isContact ? 'ContactPage' : 'AboutPage',
        '@id': `${url}#webpage`,
        name,
        url,
        inLanguage: 'ar',
        description: isContact ? 'للاستفسارات البحثية، التعاون المؤسسي، أو طلبات الاشتراك.' : SEO_ORGANIZATION_DESCRIPTION,
        about: { '@id': organization['@id'] },
        mainEntity: { '@id': organization['@id'] },
        isPartOf: { '@id': `${SEO_SITE_URL}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: SEO_SITE_URL },
          { '@type': 'ListItem', position: 2, name: isContact ? 'تواصل معنا' : 'من نحن', item: url },
        ],
      },
    ],
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
