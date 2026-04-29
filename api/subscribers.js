import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { getBearerToken, sendJson, setCorsHeaders } from './_lib/http.js'

function getAllowedAdminEmail() {
  return (
    process.env.ADMIN_EMAIL?.trim().toLowerCase() ||
    process.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() ||
    ''
  )
}

async function verifyAdminRequest(request) {
  const token = getBearerToken(request)

  if (!token) {
    throw new Error('missing_token')
  }

  const decodedToken = await getAdminAuth().verifyIdToken(token)
  const allowedAdminEmail = getAllowedAdminEmail()
  const currentEmail = decodedToken.email?.trim().toLowerCase() || ''

  if (allowedAdminEmail && currentEmail !== allowedAdminEmail) {
    throw new Error('forbidden')
  }

  return decodedToken
}

function toIsoString(value) {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string') {
    return new Date(value).toISOString()
  }

  return new Date(0).toISOString()
}

export default async function handler(request, response) {
  setCorsHeaders(response, request)

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'الطريقة غير مدعومة.' })
    return
  }

  try {
    await verifyAdminRequest(request)

    const snapshot = await getAdminDb()
      .collection('subscribers')
      .orderBy('created_at', 'desc')
      .get()

    const subscribers = snapshot.docs.map((document) => {
      const data = document.data()

      return {
        id: document.id,
        name: typeof data.name === 'string' ? data.name : 'بدون اسم',
        email: typeof data.email === 'string' ? data.email : '',
        createdAt: toIsoString(data.created_at),
      }
    })

    sendJson(response, 200, { subscribers })
  } catch (error) {
    if (error instanceof Error && error.message === 'missing_token') {
      sendJson(response, 401, { error: 'تعذر التحقق من جلسة التحرير.' })
      return
    }

    if (error instanceof Error && error.message === 'forbidden') {
      sendJson(response, 403, { error: 'هذا الحساب غير مصرح له بالوصول إلى المشتركين.' })
      return
    }

    console.error('[esnad/subscribers] failed to load subscribers', error)
    sendJson(response, 500, { error: 'تعذر تحميل قائمة المشتركين حالياً.' })
  }
}
