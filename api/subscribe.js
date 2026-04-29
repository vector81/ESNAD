import { FieldValue, getAdminDb } from './_lib/firebase-admin.js'
import { readJsonBody, sendJson, setCorsHeaders } from './_lib/http.js'
import { rateLimit } from './_lib/rate-limit.js'
import { sendSubscriberNotification } from './_lib/resend.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeInput(body) {
  return {
    name: typeof body?.name === 'string' ? body.name.trim() : '',
    email: typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '',
  }
}

function validateInput(name, email) {
  if (!name) {
    throw new Error('يرجى إدخال الاسم.')
  }

  if (!email) {
    throw new Error('يرجى إدخال البريد الإلكتروني.')
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('يرجى إدخال بريد إلكتروني صحيح.')
  }
}

export default async function handler(request, response) {
  setCorsHeaders(response, request)

  if (request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }

  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'الطريقة غير مدعومة.' })
    return
  }

  const limited = rateLimit(request, { maxRequests: 5 })
  if (limited) {
    response.setHeader('Retry-After', String(limited.retryAfter))
    sendJson(response, 429, { error: 'عدد الطلبات تجاوز الحد المسموح. يرجى المحاولة لاحقاً.' })
    return
  }

  try {
    const body = await readJsonBody(request)
    const { name, email } = normalizeInput(body)
    validateInput(name, email)

    const createdAt = new Date()
    let storedInFirestore = false
    let storageError = null

    try {
      const db = getAdminDb()
      const existingSnapshot = await db.collection('subscribers').where('email', '==', email).limit(1).get()

      if (!existingSnapshot.empty) {
        sendJson(response, 200, { subscribed: true, alreadySubscribed: true, stored: true })
        return
      }

      await db.collection('subscribers').add({
        name,
        email,
        created_at: FieldValue.serverTimestamp(),
      })

      storedInFirestore = true
    } catch (firestoreError) {
      storageError = firestoreError
      console.error('[esnad/subscribe] failed to store subscriber in Firestore', firestoreError)
    }

    let notificationResult = null

    try {
      notificationResult = await sendSubscriberNotification({
        name,
        email,
        createdAt,
        deliveryMode: storedInFirestore ? 'stored' : 'fallback',
      })
    } catch (notificationError) {
      console.error('[esnad/subscribe] failed to send Resend notification', notificationError)

      if (!storedInFirestore) {
        throw storageError instanceof Error
          ? storageError
          : new Error('تعذر تسجيل الاشتراك حالياً.')
      }
    }

    if (!storedInFirestore && !notificationResult) {
      throw storageError instanceof Error
        ? storageError
        : new Error('تعذر تسجيل الاشتراك حالياً.')
    }

    sendJson(response, 200, {
      subscribed: true,
      stored: storedInFirestore,
      fallback: !storedInFirestore,
    })
  } catch (error) {
    console.error('[esnad/subscribe] failed to create subscriber', error)
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'تعذر تسجيل الاشتراك حالياً.',
    })
  }
}
