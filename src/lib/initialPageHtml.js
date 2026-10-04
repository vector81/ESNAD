import { getPublicationImage, SEO_SITE_NAME } from './structuredData.js'
import { publicationPath } from './seoMetadata.js'
import { SEO_TOPICS } from './seoTopics.js'
import { ARTICLE_IMAGE_ASSETS } from './articleImageAssets.js'
import { articleImageSrcSet } from './articleImages.js'
export const escapeHtml = value => String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
export function displayImage(pub, width) {
  const image = getPublicationImage(pub)
  if (ARTICLE_IMAGE_ASSETS[image]) return ARTICLE_IMAGE_ASSETS[image][width] || ARTICLE_IMAGE_ASSETS[image][900]
  if (!/res\.cloudinary\.com\/.+?\/image\/upload\//.test(image)) return image
  return /\/image\/upload\/[^/]*[fq]_[^/]*\//.test(image) ? image.replace(/\/image\/upload\/([^/]+)\//, `/image/upload/$1/w_${width},c_limit/`) : image.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`)
}
const categoryLabels = { studies:'دراسات', 'opinion-article':'مقالات رأي', 'legal-paper':'ورقة قانونية', 'strategic-estimate':'تقدير موقف', 'policy-paper':'ورقة سياسية', 'position-analysis':'تحليل موقف', documents:'وثائق', 'situation-assessment':'تقييم وضعية' }
export function homeHeroInnerHtml(pub, language = 'ar') {
  const ar = language === 'ar', prefix = ar ? '' : '/en'
  const title = pub ? (ar ? pub.title_ar : pub.title_en || pub.title_ar) : ''
  return `<div class="home-hero__copy"><span class="home-badge">${ar ? SEO_SITE_NAME : 'Esnad Center for Studies and Research'}</span><h1 class="home-hero__title">${ar ? 'مكتبة بحثية عربية للدراسات والأوراق والكتب' : 'An Arabic research library for studies, papers, and books'}</h1><p class="home-hero__sub">${ar ? 'منصة متخصصة في نشر وأرشفة وبيع الإصدارات البحثية. تجمع بين الوصول المفتوح والمحتوى المدفوع في تجربة تصفح نظيفة ومركزة.' : 'A specialized platform for publishing, archiving, and selling research publications.'}</p><div class="home-hero__actions"><a class="btn btn--brand" href="${prefix}/library">${ar ? 'تصفح المكتبة' : 'Browse library'}</a><a class="btn btn--brand-outline" href="${prefix}/articles">${ar ? 'استكشف المقالات' : 'Explore articles'}</a></div></div>${pub ? `<a class="home-hero__card" href="${prefix}${publicationPath(pub)}"><div class="home-hero__card-media">${getPublicationImage(pub) ? `<img alt="${escapeHtml(pub.title_ar)}" src="${escapeHtml(displayImage(pub,800))}" srcset="${escapeHtml(articleImageSrcSet(getPublicationImage(pub)))}" sizes="(max-width: 800px) calc(100vw - 58px), 480px" width="800" height="450" decoding="async" fetchpriority="high" style="object-position:center top"/>` : '<div class="home-hero__card-media-placeholder"></div>'}</div><div class="home-hero__card-body"><span class="home-tag">${escapeHtml(categoryLabels[pub.category] || SEO_TOPICS[pub.category]?.title || pub.category)}</span><h2 class="home-hero__card-title">${escapeHtml(title)}</h2></div></a>` : '<div class="home-hero__card home-hero__card--empty"></div>'}`
}
