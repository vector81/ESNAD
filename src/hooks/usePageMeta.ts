import { useEffect } from 'react'
import type { AppLanguage } from '../types/publication'

const SITE_NAME = 'إسناد'
const SITE_URL = 'https://esnads.net'
const DEFAULT_TITLE_AR = 'مركز إسناد للدراسات والأبحاث'
const DEFAULT_TITLE_EN = 'Esnad Center for Studies and Research'
const DEFAULT_DESCRIPTION_AR = 'منصة عربية لنشر وأرشفة وبيع الدراسات والأوراق البحثية والكتب.'
const DEFAULT_DESCRIPTION_EN =
  'A bilingual platform for studies, research papers, books, and analytical articles.'

export interface PageMeta {
  title?: string
  description?: string
  path?: string
  image?: string
  noindex?: boolean
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export function getRouteMeta(pathname: string, language: AppLanguage): PageMeta {
  const isEnglish = language === 'en'
  const base = pathname.replace(/^\/en(?=\/|$)/, '') || '/'
  const meta: PageMeta = { path: pathname }

  if (base.startsWith('/library')) {
    meta.title = isEnglish ? 'Research library' : 'المكتبة البحثية'
    meta.description = isEnglish
      ? 'Published Esnad research papers, studies, reports, and articles.'
      : 'أرشيف إسناد المنشور من الدراسات والأوراق البحثية والتقارير والمقالات.'
  } else if (base.startsWith('/articles')) {
    meta.title = isEnglish ? 'Articles' : 'المقالات'
    meta.description = isEnglish
      ? 'Latest Esnad analytical and opinion articles.'
      : 'أحدث مقالات إسناد التحليلية ومقالات الرأي.'
  } else if (base.startsWith('/books')) {
    meta.title = isEnglish ? 'Books' : 'الكتب'
    meta.description = isEnglish
      ? 'Published Esnad books with metadata and summaries.'
      : 'كتب إسناد المنشورة مع البيانات التعريفية والملخصات.'
  } else if (base.startsWith('/about')) {
    meta.title = isEnglish ? 'About the center' : 'من نحن'
  } else if (base.startsWith('/contact')) {
    meta.title = isEnglish ? 'Contact us' : 'تواصل معنا'
  } else if (
    base.startsWith('/auth') ||
    base.startsWith('/login') ||
    base.startsWith('/register') ||
    base.startsWith('/dashboard')
  ) {
    meta.title = base.startsWith('/dashboard')
      ? isEnglish
        ? 'My account'
        : 'حسابي'
      : isEnglish
        ? 'Sign in'
        : 'الدخول'
    meta.noindex = true
  }

  return meta
}

export function usePageMeta(language: AppLanguage, meta: PageMeta | null) {
  const { title, description, path, image, noindex } = meta ?? {}
  const hasMeta = meta !== null

  useEffect(() => {
    if (!hasMeta) return
    const defaultTitle = language === 'en' ? DEFAULT_TITLE_EN : DEFAULT_TITLE_AR
    const pageTitle = title ? `${title} | ${SITE_NAME}` : defaultTitle
    const pageDescription =
      description || (language === 'en' ? DEFAULT_DESCRIPTION_EN : DEFAULT_DESCRIPTION_AR)

    document.title = pageTitle
    upsertMeta('name', 'description', pageDescription)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertMeta('property', 'og:title', title || defaultTitle)
    upsertMeta('property', 'og:description', pageDescription)
    upsertMeta('name', 'twitter:title', title || defaultTitle)
    upsertMeta('name', 'twitter:description', pageDescription)

    if (path) {
      const url = path === '/' ? SITE_URL : `${SITE_URL}${path}`
      upsertLink('canonical', url)
      upsertMeta('property', 'og:url', url)
    }
    if (image) {
      upsertMeta('property', 'og:image', image)
      upsertMeta('name', 'twitter:image', image)
    }
  }, [language, title, description, path, image, noindex, hasMeta])
}
