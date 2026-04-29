const RESEND_API_URL = 'https://api.resend.com/emails'
const DEFAULT_FROM_EMAIL = 'إسناد <noreply@esnads.net>'
const DEFAULT_SITE_URL = 'https://esnads.net'
const DEFAULT_SITE_NAME = 'إسناد'

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function stripHtml(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeWhitespace(value = '') {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeRecipients(value) {
  const values = Array.isArray(value) ? value : [value]

  return values.map((item) => item?.trim()).filter(Boolean)
}

function createEntityRefId(prefix, seed) {
  const normalizedSeed = String(seed || 'email')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')

  return `${prefix}-${normalizedSeed || 'email'}-${crypto.randomUUID()}`
}

function getDefaultHeaders(entityRefId) {
  return {
    'X-Entity-Ref-ID': entityRefId,
    'X-Auto-Response-Suppress': 'OOF, AutoReply',
    'Auto-Submitted': 'auto-generated',
  }
}

function getArticleLanguage(article) {
  const hasArabic =
    Boolean(article?.title_ar?.trim()) ||
    Boolean(article?.excerpt_ar?.trim()) ||
    Boolean(article?.body_ar?.trim())

  return hasArabic ? 'ar' : 'en'
}

function getArticleTitle(article, language) {
  return language === 'ar'
    ? article?.title_ar?.trim() || article?.title_en?.trim() || 'بدون عنوان'
    : article?.title_en?.trim() || article?.title_ar?.trim() || 'Untitled'
}

function getArticleExcerpt(article, language) {
  const preferred =
    language === 'ar'
      ? article?.excerpt_ar?.trim() || article?.excerpt_en?.trim()
      : article?.excerpt_en?.trim() || article?.excerpt_ar?.trim()

  if (preferred) {
    return preferred
  }

  const body = language === 'ar' ? article?.body_ar || article?.body_en || '' : article?.body_en || article?.body_ar || ''
  return stripHtml(body).slice(0, 220)
}

function getArticleBody(article, language) {
  return language === 'ar' ? article?.body_ar || article?.body_en || '' : article?.body_en || article?.body_ar || ''
}

function getArticleCategory(article, language) {
  return language === 'ar'
    ? article?.category_ar?.trim() || article?.category_en?.trim() || ''
    : article?.category_en?.trim() || article?.category_ar?.trim() || ''
}

function getArticleAuthor(article, language) {
  return language === 'ar'
    ? article?.author_ar?.trim() || article?.author_en?.trim() || DEFAULT_SITE_NAME
    : article?.author_en?.trim() || article?.author_ar?.trim() || 'Esnad'
}

function getArticleSlug(article, language) {
  return (
    (language === 'en' ? article?.slug_en : article?.slug_latin) ||
    article?.slug_latin ||
    article?.slug_en ||
    article?.slug_ar ||
    article?.id ||
    ''
  )
}

function getArticlePath(article, language) {
  const slug = getArticleSlug(article, language)
  const localizedPrefix = language === 'en' ? '/en' : ''

  if (article?.content_type === 'book') {
    return `${localizedPrefix}/books/${slug}`
  }

  if (article?.content_type === 'research') {
    return `${localizedPrefix}/research/${slug}`
  }

  return `${localizedPrefix}/${slug}`
}

function buildAbsoluteSiteUrl(path = '/') {
  if (!path || path === '/') {
    return DEFAULT_SITE_URL
  }

  return `${DEFAULT_SITE_URL}${path}`
}

function formatArticleDate(value, language) {
  if (!value) {
    return language === 'ar' ? 'غير منشور' : 'Unpublished'
  }

  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    dateStyle: 'long',
    timeZone: 'Australia/Sydney',
  }).format(new Date(value))
}

function estimateReadingMinutes(html = '') {
  const wordCount = stripHtml(html).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 200))
}

function extractBodyParagraphs(html = '', limit = 3) {
  const matches = html.match(/<(p|blockquote|h2|h3|li)\b[^>]*>[\s\S]*?<\/\1>/gi) ?? []
  const paragraphs = matches
    .map((entry) => normalizeWhitespace(stripHtml(entry)))
    .filter((entry) => entry.length >= 30)

  if (paragraphs.length > 0) {
    return paragraphs.slice(0, limit)
  }

  const fallback = normalizeWhitespace(stripHtml(html))
  if (!fallback) {
    return []
  }

  return [fallback.slice(0, 700)]
}

function renderArticlePreviewHtml({ article, language, shareUrl, title, excerpt, paragraphs }) {
  const isArabic = language === 'ar'
  const category = getArticleCategory(article, language)
  const author = getArticleAuthor(article, language)
  const publishedAt = formatArticleDate(article?.published_at, language)
  const readMinutes = estimateReadingMinutes(getArticleBody(article, language))
  const ctaLabel = isArabic ? 'اقرأ المادة كاملة' : 'Read the full article'
  const previewLabel = isArabic ? 'معاينة نشرة إسناد' : 'Esnad newsletter preview'
  const siteLabel = isArabic ? 'منصة عربية مستقلة للمقالات والتحقيقات' : 'Independent Arabic journalism and analysis'
  const readTimeLabel = isArabic ? `${readMinutes} دقائق قراءة` : `${readMinutes} min read`
  const footerCopy = isArabic
    ? 'هذه رسالة معاينة لاختبار شكل النشرة البريدية قبل الإرسال الفعلي للمشتركين.'
    : 'This is a preview email used to review the newsletter layout before any real subscriber send.'
  const shellBackground = '#f5f2ec'
  const cardBackground = '#ffffff'
  const cardBorder = '#e8e1d6'
  const headerStart = '#1a1a2e'
  const headerEnd = '#c0392b'
  const accentSoft = '#f7e2df'
  const accentStrong = '#c0392b'
  const titleColor = '#161b2c'
  const bodyColor = '#2f3440'
  const mutedColor = '#667085'
  const footerBackground = '#faf7f2'

  return `
    <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${language}">
      <body style="margin:0;padding:0;background:${shellBackground};font-family:Tahoma,Arial,sans-serif;color:${titleColor};">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${shellBackground};padding:24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:${cardBackground};border:1px solid ${cardBorder};border-radius:20px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 28px;background:linear-gradient(135deg,${headerStart} 0%,${headerEnd} 100%);color:#ffffff;">
                    <div style="font-size:12px;letter-spacing:1.8px;text-transform:uppercase;opacity:.82;">${escapeHtml(previewLabel)}</div>
                    <div style="margin-top:8px;font-size:30px;font-weight:800;line-height:1.2;">${DEFAULT_SITE_NAME}</div>
                    <div style="margin-top:6px;font-size:14px;line-height:1.7;opacity:.9;">${escapeHtml(siteLabel)}</div>
                  </td>
                </tr>
                ${
                  article?.featured_image
                    ? `
                <tr>
                  <td>
                    <img src="${escapeHtml(article.featured_image)}" alt="${escapeHtml(title)}" width="680" style="display:block;width:100%;max-width:680px;height:auto;border:0;" />
                  </td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="padding:28px;">
                    <div style="margin-bottom:14px;">
                      ${
                        category
                          ? `<span style="display:inline-block;background:${accentSoft};color:${accentStrong};border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;">${escapeHtml(category)}</span>`
                          : ''
                      }
                    </div>
                    <h1 style="margin:0 0 14px;font-size:32px;line-height:1.35;color:${titleColor};">${escapeHtml(title)}</h1>
                    <p style="margin:0 0 16px;font-size:17px;line-height:1.9;color:${mutedColor};">${escapeHtml(excerpt)}</p>
                    <div style="margin:0 0 18px;font-size:13px;line-height:1.8;color:${mutedColor};">
                      ${escapeHtml(author)} · ${escapeHtml(publishedAt)} · ${escapeHtml(readTimeLabel)}
                    </div>
                    ${paragraphs
                      .map(
                        (paragraph) =>
                          `<p style="margin:0 0 16px;font-size:16px;line-height:1.95;color:${bodyColor};">${escapeHtml(paragraph)}</p>`,
                      )
                      .join('')}
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                      <tr>
                        <td style="border-radius:999px;background:${accentStrong};">
                          <a href="${escapeHtml(shareUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">${escapeHtml(ctaLabel)}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 28px;border-top:1px solid ${cardBorder};background:${footerBackground};color:${mutedColor};font-size:13px;line-height:1.8;">
                    <div style="margin-bottom:8px;">${escapeHtml(footerCopy)}</div>
                    <div><a href="${escapeHtml(shareUrl)}" target="_blank" rel="noopener noreferrer" style="color:${accentStrong};text-decoration:none;">${escapeHtml(shareUrl)}</a></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

function renderArticlePreviewText({ article, language, shareUrl, title, excerpt, paragraphs }) {
  const category = getArticleCategory(article, language)
  const author = getArticleAuthor(article, language)
  const publishedAt = formatArticleDate(article?.published_at, language)
  const readMinutes = estimateReadingMinutes(getArticleBody(article, language))

  return [
    `${language === 'ar' ? 'معاينة نشرة إسناد' : 'Esnad newsletter preview'}`,
    '',
    title,
    category ? `${language === 'ar' ? 'التصنيف' : 'Category'}: ${category}` : '',
    `${language === 'ar' ? 'الكاتب' : 'Author'}: ${author}`,
    `${language === 'ar' ? 'تاريخ النشر' : 'Published'}: ${publishedAt}`,
    `${language === 'ar' ? 'مدة القراءة' : 'Read time'}: ${readMinutes} ${language === 'ar' ? 'دقائق' : 'minutes'}`,
    '',
    excerpt,
    '',
    ...paragraphs,
    '',
    `${language === 'ar' ? 'رابط المادة' : 'Article link'}: ${shareUrl}`,
  ]
    .filter(Boolean)
    .join('\n')
}

async function sendResendEmail({ to, subject, html, text, replyTo, headers = {} }) {
  const recipients = normalizeRecipients(to)
  const apiKey = process.env.RESEND_API_KEY?.trim()

  if (!apiKey || !recipients.length) {
    return null
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      from: DEFAULT_FROM_EMAIL,
      to: recipients,
      subject,
      html,
      text,
      reply_to: replyTo?.trim() || undefined,
      headers,
    }),
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(`Resend request failed with status ${response.status}${message ? `: ${message}` : ''}`)
  }

  return response.json().catch(() => null)
}

export async function sendSubscriberNotification({
  name,
  email,
  createdAt,
  deliveryMode = 'stored',
}) {
  const to =
    process.env.RESEND_SUBSCRIBERS_TO?.trim() ||
    process.env.RESEND_TO_EMAIL?.trim() ||
    process.env.VITE_ADMIN_EMAIL?.trim()

  if (!to) {
    return null
  }

  const createdAtLabel = new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Australia/Sydney',
  }).format(createdAt)
  const fallbackNotice =
    deliveryMode === 'fallback'
      ? '<p style="margin: 0 0 10px; color: #b42318;"><strong>تنبيه:</strong> تعذر حفظ الاشتراك في Firestore، لكن تم إرسال هذا التنبيه حتى لا تضيع بيانات المشترك.</p>'
      : ''
  const fallbackText =
    deliveryMode === 'fallback'
      ? '\nتنبيه: تعذر حفظ الاشتراك في Firestore، لكن تم إرسال هذا التنبيه حتى لا تضيع بيانات المشترك.'
      : ''

  return sendResendEmail({
    to,
    replyTo: email,
    subject: `${deliveryMode === 'fallback' ? 'تنبيه اشتراك جديد' : 'اشتراك جديد في نشرة إسناد'}: ${name}`,
    html: `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; color: #1a1a2e; line-height: 1.8;">
        <h2 style="margin: 0 0 12px; color: #b92f21;">اشتراك جديد في نشرة إسناد</h2>
        ${fallbackNotice}
        <p style="margin: 0 0 8px;"><strong>الاسم:</strong> ${escapeHtml(name)}</p>
        <p style="margin: 0 0 8px;"><strong>البريد الإلكتروني:</strong> ${escapeHtml(email)}</p>
        <p style="margin: 0;"><strong>وقت الاشتراك:</strong> ${escapeHtml(createdAtLabel)}</p>
      </div>
    `,
    text: `اشتراك جديد في نشرة إسناد${fallbackText}\nالاسم: ${name}\nالبريد الإلكتروني: ${email}\nوقت الاشتراك: ${createdAtLabel}`,
    headers: getDefaultHeaders(createEntityRefId('subscriber', email)),
  })
}

export async function sendTestEmail({ to }) {
  const sentAt = new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: 'Australia/Sydney',
  }).format(new Date())

  return sendResendEmail({
    to,
    subject: 'Esnad Resend integration test',
    html: `
      <div style="font-family: Tahoma, Arial, sans-serif; color: #1a1a2e; line-height: 1.8;">
        <h1 style="margin: 0 0 12px; color: #b92f21;">Esnad email integration test</h1>
        <p style="margin: 0 0 8px;">This is a live verification email from the Esnad Resend integration.</p>
        <p style="margin: 0;">Sent at: ${escapeHtml(sentAt)}</p>
      </div>
    `,
    text: `Esnad email integration test\nThis is a live verification email from the Esnad Resend integration.\nSent at: ${sentAt}`,
    headers: getDefaultHeaders(createEntityRefId('test', to)),
  })
}

export async function sendArticlePreviewEmail({ to, article, language }) {
  const resolvedLanguage = language || getArticleLanguage(article)
  const title = getArticleTitle(article, resolvedLanguage)
  const excerpt = getArticleExcerpt(article, resolvedLanguage)
  const paragraphs = extractBodyParagraphs(getArticleBody(article, resolvedLanguage))
  const shareUrl = buildAbsoluteSiteUrl(getArticlePath(article, resolvedLanguage))
  const subjectPrefix = resolvedLanguage === 'ar' ? 'معاينة نشرة إسناد' : 'Esnad newsletter preview'

  return sendResendEmail({
    to,
    subject: `${subjectPrefix} | ${title}`,
    html: renderArticlePreviewHtml({
      article,
      language: resolvedLanguage,
      shareUrl,
      title,
      excerpt,
      paragraphs,
    }),
    text: renderArticlePreviewText({
      article,
      language: resolvedLanguage,
      shareUrl,
      title,
      excerpt,
      paragraphs,
    }),
    headers: getDefaultHeaders(createEntityRefId('article-preview', article?.id || title)),
  })
}
