function sanitizeEnvValue(value: string | undefined) {
  const normalized = value?.trim() ?? ''

  if (!normalized) {
    return ''
  }

  const lowered = normalized.toLowerCase()
  const placeholderFragments = [
    'your-',
    'your_',
    'placeholder',
    'example',
    'changeme',
    '<',
    'cloud_name',
    'upload_preset',
  ]

  return placeholderFragments.some((fragment) => lowered.includes(fragment)) ? '' : normalized
}

const cloudName = sanitizeEnvValue(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME)
const uploadPreset = sanitizeEnvValue(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET)
const folder = sanitizeEnvValue(import.meta.env.VITE_CLOUDINARY_FOLDER) || 'esnad'

export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset)

export async function uploadImageToCloudinary(file: Blob) {
  if (!isCloudinaryConfigured) {
    throw new Error('إعدادات Cloudinary غير مكتملة. أضف القيم إلى ملف البيئة أولاً.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  formData.append('folder', folder)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('فشل رفع الصورة إلى Cloudinary.')
  }

  const payload = (await response.json()) as { secure_url?: string }

  if (!payload.secure_url) {
    throw new Error('لم تُرجع Cloudinary رابط الصورة المتوقع.')
  }

  // Bake the safe defaults — auto-format (WebP/AVIF where supported) and
  // auto-quality (visually lossless) — directly into the stored URL. Anywhere
  // the URL is consumed (OG tags, share cards, anything that bypasses the
  // render-time helper) the browser still gets the optimized asset.
  // We also cap width at 2400 so 8K phone uploads can never blow up the page;
  // c_limit only shrinks, never upscales.
  return bakeDefaults(payload.secure_url)
}

function bakeDefaults(url: string) {
  if (!url) return url
  if (!/res\.cloudinary\.com\/.+?\/image\/upload\//.test(url)) return url
  if (/\/image\/upload\/[^/]*[fq]_[^/]*\//.test(url)) return url
  return url.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_2400,c_limit/')
}

// Resize a Cloudinary image at render time. Works on both already-baked URLs
// (uploaded by the new code path) and legacy raw URLs (uploaded before).
//
// - For raw URLs: insert a single transformation segment with all params.
// - For already-baked URLs: chain a second segment (Cloudinary processes
//   transformations left-to-right, so the cap from upload still applies).
export function optimizeCloudinaryUrl(url: string, options: { width?: number } = {}) {
  if (!url) return ''
  if (!/res\.cloudinary\.com\/.+?\/image\/upload\//.test(url)) return url

  const width = options.width && Number.isFinite(options.width) ? Math.round(options.width) : null
  const hasTransform = /\/image\/upload\/[^/]*[fq]_[^/]*\//.test(url)

  if (hasTransform) {
    if (!width) return url
    // Chain a width-only transform after the existing one.
    return url.replace(/\/image\/upload\/([^/]+)\//, `/image/upload/$1/w_${width},c_limit/`)
  }

  const parts = ['f_auto', 'q_auto']
  if (width) parts.push(`w_${width}`, 'c_limit')
  return url.replace('/image/upload/', `/image/upload/${parts.join(',')}/`)
}
