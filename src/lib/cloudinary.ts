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

  return payload.secure_url
}
