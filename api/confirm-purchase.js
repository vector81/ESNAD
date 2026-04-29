import Stripe from 'stripe'
import { FieldValue, getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { getBearerToken, readJsonBody, sendJson, setCorsHeaders } from './_lib/http.js'

async function requireUser(request) {
  const token = getBearerToken(request)

  if (!token) {
    throw new Error('missing_token')
  }

  return getAdminAuth().verifyIdToken(token)
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

  try {
    const decoded = await requireUser(request)
    const body = await readJsonBody(request)
    const publicationId = typeof body?.publicationId === 'string' ? body.publicationId.trim() : ''
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''

    if (!publicationId) {
      throw new Error('missing_publication')
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
    if (stripeSecret && sessionId) {
      const stripe = new Stripe(stripeSecret)
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      if (session.payment_status !== 'paid') {
        throw new Error('payment_not_complete')
      }

      if (session.metadata?.publicationId && session.metadata.publicationId !== publicationId) {
        throw new Error('publication_mismatch')
      }
    }

    await getAdminDb()
      .collection('user_libraries')
      .doc(decoded.uid)
      .set(
        {
          purchased_item_ids: FieldValue.arrayUnion(publicationId),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

    await getAdminDb()
      .collection('purchase_records')
      .add({
        uid: decoded.uid,
        email: decoded.email ?? '',
        publication_id: publicationId,
        stripe_session_id: sessionId || '',
        created_at: FieldValue.serverTimestamp(),
      })

    sendJson(response, 200, { confirmed: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'missing_token') {
      sendJson(response, 401, { error: 'تعذر التحقق من جلسة المستخدم.' })
      return
    }

    if (error instanceof Error && error.message === 'missing_publication') {
      sendJson(response, 400, { error: 'معرّف الإصدار مفقود.' })
      return
    }

    if (error instanceof Error && error.message === 'payment_not_complete') {
      sendJson(response, 400, { error: 'لم تكتمل عملية الدفع بعد.' })
      return
    }

    if (error instanceof Error && error.message === 'publication_mismatch') {
      sendJson(response, 400, { error: 'بيانات الشراء لا تطابق الإصدار المطلوب.' })
      return
    }

    console.error('[esnad/confirm-purchase] failed to confirm purchase', error)
    sendJson(response, 500, { error: 'تعذر تأكيد الشراء حالياً.' })
  }
}
