import Stripe from 'stripe'
import { getAdminAuth, getAdminDb } from './_lib/firebase-admin.js'
import { getBearerToken, readJsonBody, sendJson, setCorsHeaders } from './_lib/http.js'

const DEFAULT_SITE_URL = 'https://esnads.net'

function getSiteUrl() {
  return (
    process.env.VITE_PUBLIC_SITE_URL?.trim() ||
    process.env.PUBLIC_SITE_URL?.trim() ||
    DEFAULT_SITE_URL
  ).replace(/\/+$/, '')
}

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
    const language = body?.language === 'en' ? 'en' : 'ar'

    if (!publicationId) {
      throw new Error('missing_publication')
    }

    const publicationRef = getAdminDb().collection('publications').doc(publicationId)
    const publicationSnapshot = await publicationRef.get()

    if (!publicationSnapshot.exists) {
      throw new Error('publication_not_found')
    }

    const publication = publicationSnapshot.data()
    const amount = Number(publication?.price_aud ?? 0)

    if (publication?.access_tier !== 'paid' || amount <= 0) {
      sendJson(response, 200, { mode: 'fallback' })
      return
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
    if (!stripeSecret) {
      sendJson(response, 200, { mode: 'fallback' })
      return
    }

    const stripe = new Stripe(stripeSecret)
    const siteUrl = getSiteUrl()
    const dashboardPath = language === 'en' ? '/en/dashboard' : '/dashboard'
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: decoded.email ?? undefined,
      success_url: `${siteUrl}${dashboardPath}?purchase=${publicationId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}${dashboardPath}`,
      metadata: {
        publicationId,
        uid: decoded.uid,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'aud',
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: publication?.title_ar || publication?.title_en || 'Esnad publication',
              description: publication?.abstract_ar || publication?.abstract_en || '',
            },
          },
        },
      ],
    })

    sendJson(response, 200, { mode: 'stripe', url: session.url })
  } catch (error) {
    if (error instanceof Error && error.message === 'missing_token') {
      sendJson(response, 401, { error: 'تعذر التحقق من جلسة المستخدم.' })
      return
    }

    if (error instanceof Error && error.message === 'missing_publication') {
      sendJson(response, 400, { error: 'معرّف الإصدار مفقود.' })
      return
    }

    if (error instanceof Error && error.message === 'publication_not_found') {
      sendJson(response, 404, { error: 'الإصدار المطلوب غير موجود.' })
      return
    }

    console.error('[esnad/checkout-session] failed to create session', error)
    sendJson(response, 500, { error: 'تعذر بدء عملية الدفع حالياً.' })
  }
}
