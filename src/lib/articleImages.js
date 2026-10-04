import { ARTICLE_IMAGE_DIMENSIONS } from './articleImageDimensions.js'
import { ARTICLE_IMAGE_ASSETS } from './articleImageAssets.js'

export function priorityArticleImage(content) {
  const find = node => {
    if (node?.type === 'image' || node?.type === 'figure') return String(node.attrs?.src || '')
    for (const child of node?.content || []) { const image = find(child); if (image) return image }
    return ''
  }
  for (const node of content?.content?.slice(0, 2) || []) { const image = find(node); if (image) return image }
  return ''
}

export function articleImageUrl(src, priority = false, requestedWidth) {
  if (!/res\.cloudinary\.com\/.+?\/image\/upload\//.test(src)) return src
  const width = requestedWidth || (priority ? 900 : 1200)
  if (ARTICLE_IMAGE_ASSETS[src]?.[width]) return ARTICLE_IMAGE_ASSETS[src][width]
  return /\/image\/upload\/[^/]*[fq]_[^/]*\//.test(src)
    ? src.replace(/\/image\/upload\/([^/]+)\//, `/image/upload/$1/w_${width},c_limit/`)
    : src.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`)
}

export const ARTICLE_IMAGE_SIZES = '(max-width: 800px) calc(100vw - 106px), 800px'
export function articleImageSrcSet(src) {
  return /res\.cloudinary\.com\/.+?\/image\/upload\//.test(src)
    ? [480, 640, 900, 1200].map(width => `${articleImageUrl(src, true, width)} ${width}w`).join(', ')
    : ''
}

export function articleImageSize(src) {
  return ARTICLE_IMAGE_DIMENSIONS[src] || { width: 1200, height: 675 }
}
