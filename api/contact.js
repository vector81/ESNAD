import { readJsonBody, sendJson, setCorsHeaders } from './_lib/http.js'
import { rateLimit } from './_lib/rate-limit.js'

const RESEND_API_URL = 'https://api.resend.com/emails'

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function sendContactEmail({ name, email, message }) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to =
    process.env.RESEND_CONTACT_TO?.trim() ||
    process.env.RESEND_TO_EMAIL?.trim() ||
    process.env.VITE_ADMIN_EMAIL?.trim()

  if (!apiKey || !to) {
    console.info('[esnad/contact] missing Resend configuration, logging message only', {
      name,
      email,
    })
    return null
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Esnad Contact <noreply@esnads.net>',
      to: [to],
      subject: `رسالة جديدة من نموذج التواصل: ${name}`,
      reply_to: email,
      html: `
        <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#0f172a">
          <h2 style="margin:0 0 12px;color:#b5312b">رسالة جديدة من موقع إسناد</h2>
          <p><strong>الاسم:</strong> ${escapeHtml(name)}</p>
          <p><strong>البريد:</strong> ${escapeHtml(email)}</p>
          <p><strong>الرسالة:</strong></p>
          <div style="padding:12px;border:1px solid #e2e8f0;background:#f8fafc">${escapeHtml(message)}</div>
        </div>
      `,
      text: `رسالة جديدة من موقع إسناد\nالاسم: ${name}\nالبريد: ${email}\n\n${message}`,
    }),
  })

  if (!response.ok) {
    const payload = await response.text().catch(() => '')
    throw new Error(`Resend request failed with status ${response.status}${payload ? `: ${payload}` : ''}`)
  }

  return response.json().catch(() => null)
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

  const limited = rateLimit(request, { maxRequests: 3 })
  if (limited) {
    response.setHeader('Retry-After', String(limited.retryAfter))
    sendJson(response, 429, { error: 'عدد الطلبات تجاوز الحد المسموح. يرجى المحاولة لاحقاً.' })
    return
  }

  try {
    const body = await readJsonBody(request)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''

    if (!name || !email || !message) {
      throw new Error('الاسم والبريد والرسالة مطلوبة.')
    }

    await sendContactEmail({ name, email, message })
    sendJson(response, 200, { sent: true })
  } catch (error) {
    console.error('[esnad/contact] failed to process message', error)
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'تعذر إرسال الرسالة حالياً.',
    })
  }
}
