import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './firebase'

export async function uploadFileToFirebaseStorage(file: File, path: string) {
  if (!storage) {
    throw new Error('إعدادات Firebase Storage غير مكتملة. أضف رابط PDF يدوياً أو فعّل التخزين.')
  }

  const uploadRef = ref(storage, path)
  await uploadBytes(uploadRef, file, {
    contentType: file.type || 'application/octet-stream',
  })

  return getDownloadURL(uploadRef)
}
