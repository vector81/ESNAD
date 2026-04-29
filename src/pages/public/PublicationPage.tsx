import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PublicationCard } from '../../components/public/PublicationCard'
import { PublicSiteShell } from '../../components/public/PublicSiteShell'
import { usePublicSession } from '../../contexts/PublicSessionContext'
import { auth, isFirebaseConfigured } from '../../lib/firebase'
import { grantPurchasedItem, toggleSavedItem } from '../../lib/library'
import { buildLocalizedPath } from '../../lib/navigation'
import { createCheckoutSession } from '../../lib/payments'
import { renderPmJson } from '../../reader/lib/render-pm-json'
import {
  formatCurrency,
  getPublicationAbstract,
  getPublicationAuthor,
  getCoverObjectPosition,
  getPublicationBySlug,
  getPublicationCategoryLabel,
  getPublicationDescription,
  getPublicationKindLabel,
  getPublicationTitle,
  getPublicationTopic,
  getShareSlug,
  listPublications,
} from '../../lib/publications'
import { getPublicSiteUrl } from '../../lib/siteLinks'
import type { AppLanguage, Publication } from '../../types/publication'

export function PublicationPage({ language }: { language: AppLanguage }) {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, library, refreshLibrary } = usePublicSession()
  const [publication, setPublication] = useState<Publication | null>(null)
  const [related, setRelated] = useState<Publication[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setPublication(null)
    setRelated([])
    getPublicationBySlug(slug)
      .then((item) => {
        if (cancelled) return
        setPublication(item)
        return item
      })
      .then((item) => {
        if (cancelled || !item) {
          if (!cancelled) setRelated([])
          return
        }
        return listPublications({
          kind: item.kind,
          category: item.category,
        }).then((items) => {
          if (!cancelled) setRelated(items.filter((entry) => entry.id !== item.id).slice(0, 3))
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [slug])

  const isSaved = publication ? library.saved_item_ids.includes(publication.id) : false
  const isPurchased = publication ? library.purchased_item_ids.includes(publication.id) : false
  // All publications are openly viewable — no login or purchase required to read or download.
  const canAccess = Boolean(publication)

  const publishedDate = useMemo(
    () =>
      publication
        ? new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-AU', {
            dateStyle: 'long',
          }).format(new Date(publication.published_at))
        : '',
    [language, publication],
  )

  const handleSaveToggle = async () => {
    if (!publication) return
    if (!user) {
      navigate(buildLocalizedPath(language, '/login'))
      return
    }
    await toggleSavedItem(user, publication.id, !isSaved)
    await refreshLibrary()
    setMessage(
      !isSaved
        ? language === 'ar'
          ? 'تمت إضافة الإصدار إلى المحفوظات.'
          : 'Saved to your library.'
        : language === 'ar'
          ? 'تمت إزالة الإصدار من المحفوظات.'
          : 'Removed from saved items.',
    )
  }

  const handleGenerateArticlePdf = async () => {
    if (!publication) return
    const [{ jsPDF }, html2canvasMod] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ])
    const html2canvas = html2canvasMod.default

    // PDF is always rendered in Arabic (force ar fields).
    const titleAr = publication.title_ar || publication.title_en
    const abstractAr = publication.abstract_ar || publication.abstract_en
    const contentSource = document.querySelector('.pub-pdf-source')
    const contentHtml = contentSource
      ? contentSource.outerHTML
      : `<p>${escapeHtml(publication.description_ar || publication.description_en || '')}</p>`

    const arabicFontStack =
      "'Noto Naskh Arabic', 'Amiri', 'Cairo', 'Segoe UI', Tahoma, sans-serif"

    const stage = document.createElement('div')
    stage.setAttribute('dir', 'rtl')
    stage.setAttribute('lang', 'ar')
    stage.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: -10000px',
      'width: 794px',
      'padding: 56px 60px',
      'background: #ffffff',
      'color: #111111',
      `font-family: ${arabicFontStack}`,
      'line-height: 1.95',
      'font-size: 16px',
      'box-sizing: border-box',
      'direction: rtl',
      'text-align: right',
    ].join(';')

    stage.innerHTML = `
      <h1 style="font-family:${arabicFontStack};font-size:30px;font-weight:700;line-height:1.4;margin:0 0 16px;color:#000;direction:rtl;text-align:right;">${escapeHtml(titleAr)}</h1>
      ${abstractAr ? `<p style="font-family:${arabicFontStack};font-size:15px;line-height:1.95;color:#333;margin:0 0 22px;direction:rtl;text-align:right;">${escapeHtml(abstractAr)}</p>` : ''}
      <div style="border-top:1px solid #ddd;margin:0 0 22px;"></div>
      <div class="article-print-body" style="font-family:${arabicFontStack};font-size:15px;line-height:2;color:#111;direction:rtl;text-align:right;">${contentHtml}</div>
    `

    // Normalize images and strip noisy background/shadow inside cloned content.
    stage.querySelectorAll('img').forEach((img) => {
      img.style.maxWidth = '100%'
      img.style.height = 'auto'
      img.removeAttribute('loading')
    })
    stage.querySelectorAll<HTMLElement>('.article-print-body *').forEach((el) => {
      el.style.background = 'transparent'
      el.style.boxShadow = 'none'
      if (el.tagName === 'A') el.style.color = '#000'
    })

    document.body.appendChild(stage)

    try {
      // Make sure all webfonts (Noto Naskh Arabic, etc.) are loaded before rasterizing.
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready
      }

      const canvas = await html2canvas(stage, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: stage.scrollWidth,
        windowHeight: stage.scrollHeight,
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
      heightLeft -= pageHeight
      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
        heightLeft -= pageHeight
      }
      const fileName = `${getShareSlug(publication) || 'publication'}.pdf`
      pdf.save(fileName)
    } finally {
      stage.remove()
    }
  }

  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&': return '&amp;'
        case '<': return '&lt;'
        case '>': return '&gt;'
        case '"': return '&quot;'
        default: return '&#39;'
      }
    })

  const handleDownloadPdf = async () => {
    if (!publication?.pdf_url) return
    const baseName =
      getShareSlug(publication) || getPublicationTitle(publication, language) || 'publication'
    const fileName = baseName.endsWith('.pdf') ? baseName : `${baseName}.pdf`
    try {
      const response = await fetch(publication.pdf_url, { credentials: 'omit' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    } catch {
      const anchor = document.createElement('a')
      anchor.href = publication.pdf_url
      anchor.download = fileName
      anchor.target = '_blank'
      anchor.rel = 'noreferrer'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    }
  }

  const handlePurchase = async () => {
    if (!publication) return
    if (!user) {
      navigate(buildLocalizedPath(language, '/login'))
      return
    }
    if (!isFirebaseConfigured || !auth?.currentUser) {
      await grantPurchasedItem(user, publication.id)
      await refreshLibrary()
      setMessage(language === 'ar' ? 'تمت إضافة الإصدار إلى مشترياتك في وضع المعاينة.' : 'Publication added to purchases in demo mode.')
      return
    }
    const token = await auth.currentUser.getIdToken()
    const session = await createCheckoutSession(publication.id, token, language)
    if (session?.mode === 'fallback' || !session?.url) {
      await grantPurchasedItem(user, publication.id)
      await refreshLibrary()
      setMessage(language === 'ar' ? 'تمت إضافة الإصدار إلى مشترياتك.' : 'Publication added to your purchases.')
      return
    }
    window.location.href = session.url
  }

  const shareUrl = useMemo(() => {
    if (!publication) return ''
    const section = publication.kind === 'book' ? 'books' : 'library'
    const latinSlug = getShareSlug(publication)
    const prefix = language === 'en' ? '/en' : ''
    return getPublicSiteUrl(`${prefix}/${section}/${latinSlug}`)
  }, [publication, language])

  const shareText = useMemo(
    () => (publication ? getPublicationTitle(publication, language) : ''),
    [publication, language],
  )

  const shareToWhatsApp = () => {
    if (!shareUrl) return
    const text = encodeURIComponent(`${shareText} ${shareUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const shareToTwitter = () => {
    if (!shareUrl) return
    const params = new URLSearchParams({ url: shareUrl, text: shareText })
    window.open(`https://twitter.com/intent/tweet?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  const shareToFacebook = () => {
    if (!shareUrl) return
    const params = new URLSearchParams({ u: shareUrl })
    window.open(`https://www.facebook.com/sharer/sharer.php?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  const shareToInstagram = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // noop — clipboard may be unavailable
    }
    setMessage(
      language === 'ar'
        ? 'تم نسخ الرابط. افتح إنستغرام والصقه في منشورك أو قصتك.'
        : 'Link copied. Open Instagram and paste it in your post or story.',
    )
  }

  const copyShareLink = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setMessage(language === 'ar' ? 'تم نسخ رابط المشاركة.' : 'Share link copied.')
  }

  if (loading) {
    return (
      <PublicSiteShell language={language}>
        <div className="empty">{language === 'ar' ? 'جار تحميل الإصدار...' : 'Loading publication...'}</div>
      </PublicSiteShell>
    )
  }

  if (!publication) {
    return (
      <PublicSiteShell language={language}>
        <div className="empty">{language === 'ar' ? 'الإصدار غير موجود.' : 'Publication not found.'}</div>
      </PublicSiteShell>
    )
  }

  return (
    <PublicSiteShell language={language}>
      <div className="detail-layout">
        <div className="detail-content">
          <span className={`badge kind-badge kind-badge--${publication.kind}`}>{getPublicationKindLabel(publication.kind, language)}</span>
          <h1 className="title-1">{getPublicationTitle(publication, language)}</h1>
          <p className="body-muted" style={{ fontSize: 17 }}>
            {getPublicationAbstract(publication, language)}
          </p>

          <div className="detail-toolbar">
            <span>{publishedDate}</span>
            <span>
              {publication.access_tier === 'free'
                ? language === 'ar'
                  ? 'وصول مجاني'
                  : 'Free access'
                : formatCurrency(publication.price_aud, language)}
            </span>
            {isPurchased ? <span>{language === 'ar' ? 'تم الشراء' : 'Purchased'}</span> : null}
          </div>

          {message ? <div className="notice notice--success">{message}</div> : null}

          <section className="panel">
            {publication.content_json ? (
              <div className="reader-body detail-prose pub-pdf-source">
                {renderPmJson(publication.content_json)}
              </div>
            ) : (
              <p className="body-muted pub-pdf-source">
                {getPublicationDescription(publication, language)}
              </p>
            )}
          </section>

          <section className="panel pub-pdf-preview">
            <h2 className="title-3 mb-2">{language === 'ar' ? 'معاينة PDF' : 'PDF Preview'}</h2>
            {publication.pdf_url ? (
              <iframe
                className="pdf-frame"
                src={`${publication.pdf_url}#page=1&toolbar=0&navpanes=0`}
                title={getPublicationTitle(publication, language)}
              />
            ) : (
              <div className="empty">
                {language === 'ar' ? 'لا توجد معاينة PDF متاحة.' : 'No PDF preview available.'}
              </div>
            )}
          </section>

          {related.length > 0 && (
            <section className="pub-related">
              <div className="panel__head">
                <div>
                  <span className="eyebrow">{language === 'ar' ? 'ذات صلة' : 'Related'}</span>
                  <h2 className="title-2">{language === 'ar' ? 'مزيد من الإصدارات' : 'More publications'}</h2>
                </div>
                <Link
                  className="btn btn--secondary btn--sm"
                  to={buildLocalizedPath(language, publication.kind === 'book' ? '/books' : '/library')}
                >
                  {language === 'ar' ? 'عرض المزيد' : 'View more'}
                </Link>
              </div>
              <div className="grid-3">
                {related.map((item) => (
                  <PublicationCard key={item.id} language={language} publication={item} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="detail-sidebar">
          {publication.cover_image ? (
            <img
              alt={getPublicationTitle(publication, language)}
              src={publication.cover_image}
              style={{ objectPosition: getCoverObjectPosition(publication) }}
            />
          ) : null}

          <div className="detail-actions">
            {canAccess ? (
              publication.pdf_url ? (
                <>
                  <button
                    className="btn btn--primary"
                    onClick={() => void handleDownloadPdf()}
                    type="button"
                  >
                    {language === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
                  </button>
                  <a
                    className="btn btn--secondary"
                    href={publication.pdf_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {language === 'ar' ? 'قراءة في نافذة جديدة' : 'Open in new tab'}
                  </a>
                </>
              ) : (
                <button
                  className="btn btn--primary"
                  onClick={() => void handleGenerateArticlePdf()}
                  type="button"
                >
                  {language === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
                </button>
              )
            ) : (
              <button className="btn btn--primary" onClick={() => void handlePurchase()} type="button">
                {language === 'ar'
                  ? `شراء ${formatCurrency(publication.price_aud, language)}`
                  : `Buy for ${formatCurrency(publication.price_aud, language)}`}
              </button>
            )}
            {user ? (
              <button className="btn btn--secondary" onClick={() => void handleSaveToggle()} type="button">
                {isSaved
                  ? language === 'ar'
                    ? 'إزالة من المحفوظات'
                    : 'Remove from saved'
                  : language === 'ar'
                    ? 'حفظ الإصدار'
                    : 'Save item'}
              </button>
            ) : null}
            <div className="share-row">
              <span className="share-row__label">
                {language === 'ar' ? 'مشاركة' : 'Share'}
              </span>
              <div className="share-row__buttons">
                <button
                  aria-label="WhatsApp"
                  className="share-btn share-btn--whatsapp"
                  onClick={shareToWhatsApp}
                  title="WhatsApp"
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="currentColor"
                      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488"
                    />
                  </svg>
                </button>
                <button
                  aria-label="X / Twitter"
                  className="share-btn share-btn--twitter"
                  onClick={shareToTwitter}
                  title="X"
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="currentColor"
                      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                    />
                  </svg>
                </button>
                <button
                  aria-label="Facebook"
                  className="share-btn share-btn--facebook"
                  onClick={shareToFacebook}
                  title="Facebook"
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="currentColor"
                      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073"
                    />
                  </svg>
                </button>
                <button
                  aria-label="Instagram"
                  className="share-btn share-btn--instagram"
                  onClick={() => void shareToInstagram()}
                  title="Instagram"
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="currentColor"
                      d="M12 2.163c3.204 0 3.584.012 4.849.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.849.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163m0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881"
                    />
                  </svg>
                </button>
                <button
                  aria-label={language === 'ar' ? 'نسخ الرابط' : 'Copy link'}
                  className="share-btn share-btn--link"
                  onClick={() => void copyShareLink()}
                  title={language === 'ar' ? 'نسخ الرابط' : 'Copy link'}
                  type="button"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07L11.5 5.43M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07L12.5 18.57"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <dl className="detail-meta">
            <div>
              <dt>{language === 'ar' ? 'التصنيف' : 'Category'}</dt>
              <dd>{getPublicationCategoryLabel(publication.category, language)}</dd>
            </div>
            <div>
              <dt>{language === 'ar' ? 'الموضوع' : 'Topic'}</dt>
              <dd>{getPublicationTopic(publication, language) || '—'}</dd>
            </div>
            <div>
              <dt>{language === 'ar' ? 'الكاتب' : 'Author'}</dt>
              <dd>{getPublicationAuthor(publication, language)}</dd>
            </div>
            <div>
              <dt>{language === 'ar' ? 'الصفحات' : 'Pages'}</dt>
              <dd>{publication.pages}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </PublicSiteShell>
  )
}
