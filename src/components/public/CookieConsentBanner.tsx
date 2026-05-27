import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  getAnalyticsConsentStatus,
  setAnalyticsConsentStatus,
  subscribeAnalyticsConsent,
  type AnalyticsConsentStatus,
} from '../../lib/analytics'

export function CookieConsentBanner() {
  const location = useLocation()
  const [status, setStatus] = useState<AnalyticsConsentStatus | null>(() => getAnalyticsConsentStatus())
  const isEnglish = location.pathname.startsWith('/en')

  useEffect(() => subscribeAnalyticsConsent(setStatus), [])

  if (status) return null

  const copy = isEnglish
    ? {
        title: 'Analytics cookies',
        body: 'We use analytics cookies to count anonymous visits and understand general location and page performance.',
        accept: 'Accept',
      }
    : {
        title: 'ملفات تعريف الارتباط',
        body: 'نستخدم ملفات التحليلات لقياس الزيارات المجهولة ومعرفة الموقع العام وأداء الصفحات.',
        accept: 'قبول',
      }

  return (
    <div className="cookie-modal" dir={isEnglish ? 'ltr' : 'rtl'} role="presentation">
      <section className="cookie-modal__dialog" aria-labelledby="cookie-modal-title" role="dialog" aria-modal="true">
        <div className="cookie-modal__copy">
          <strong id="cookie-modal-title">{copy.title}</strong>
          <p>{copy.body}</p>
        </div>
        <div className="cookie-modal__actions">
          <button type="button" className="btn btn--primary" onClick={() => setAnalyticsConsentStatus('accepted')}>
            {copy.accept}
          </button>
        </div>
      </section>
    </div>
  )
}
