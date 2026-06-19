import Stripe from 'stripe'
import { FieldValue, getAdminDb } from './_lib/firebase-admin.js'
import { requireUser } from './_lib/admin-auth.js'
import { readJsonBody, sendJson, setCorsHeaders } from './_lib/http.js'
import { rateLimit } from './_lib/rate-limit.js'

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

  const limited = rateLimit(request, { maxRequests: 20, keyPrefix: 'confirm-purchase' })
  if (limited) {
    response.setHeader('Retry-After', String(limited.retryAfter))
    sendJson(response, 429, { error: 'عدد الطلبات تجاوز الحد المسموح. يرجى المحاولة لاحقاً.' })
    return
  }

  try {
    const decoded = await requireUser(request)
    const body = await readJsonBody(request, { maxBytes: 4096 })
    const publicationId = typeof body?.publicationId === 'string' ? body.publicationId.trim() : ''
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : ''

    if (!publicationId) {
      throw new Error('missing_publication')
    }

    if (!sessionId) {
      throw new Error('missing_session')
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
    if (!stripeSecret) {
      throw new Error('stripe_not_configured')
    }

    const publicationSnapshot = await getAdminDb().collection('publications').doc(publicationId).get()
    const publication = publicationSnapshot.exists ? publicationSnapshot.data() : null
    const amount = Number(publication?.price_aud ?? 0)
    const expectedAmount = Math.round(amount * 100)
    const isPublished = publication?.status === 'published' || publication?.workflow_stage === 'published'

    if (!publication || !isPublished || publication.access_tier !== 'paid' || expectedAmount <= 0) {
      throw new Error('publication_not_found')
    }

    const stripe = new Stripe(stripeSecret)
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.mode !== 'payment' || session.payment_status !== 'paid') {
      throw new Error('payment_not_complete')
    }

    if (session.metadata?.publicationId !== publicationId) {
      throw new Error('publication_mismatch')
    }

    if (session.metadata?.uid !== decoded.uid) {
      throw new Error('buyer_mismatch')
    }

    if (session.currency?.toLowerCase() !== 'aud' || Number(session.amount_total ?? 0) < expectedAmount) {
      throw new Error('amount_mismatch')
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
      .doc(sessionId)
      .set({
        uid: decoded.uid,
        email: decoded.email ?? '',
        publication_id: publicationId,
        stripe_session_id: sessionId,
        amount_total: session.amount_total ?? null,
        currency: session.currency ?? '',
        created_at: FieldValue.serverTimestamp(),
      }, { merge: true })

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

    if (error instanceof Error && error.message === 'missing_session') {
      sendJson(response, 400, { error: 'معرّف جلسة الدفع مفقود.' })
      return
    }

    if (error instanceof Error && error.message === 'stripe_not_configured') {
      sendJson(response, 503, { error: 'الدفع غير مفعّل حالياً.' })
      return
    }

    if (error instanceof Error && error.message === 'publication_not_found') {
      sendJson(response, 404, { error: 'الإصدار المطلوب غير موجود.' })
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

    if (error instanceof Error && error.message === 'buyer_mismatch') {
      sendJson(response, 403, { error: 'جلسة الدفع لا تخص هذا الحساب.' })
      return
    }

    if (error instanceof Error && error.message === 'amount_mismatch') {
      sendJson(response, 400, { error: 'قيمة عملية الدفع لا تطابق سعر الإصدار.' })
      return
    }

    console.error('[esnad/confirm-purchase] failed to confirm purchase', error)
    sendJson(response, 500, { error: 'تعذر تأكيد الشراء حالياً.' })
  }
}
