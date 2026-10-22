import { useEffect, useRef, useState } from 'react'
import type { AppLanguage } from '../../types/publication'

interface TurnstileApi {
  render: (container: HTMLElement, options: {
    sitekey: string
    action: string
    language: string
    size: string
    callback: (token: string) => void
    'expired-callback': () => void
    'error-callback': () => void
  }) => string
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: TurnstileApi } }

let scriptPromise: Promise<TurnstileApi> | undefined
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!scriptPromise) {
    scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Verification unavailable'))
      script.onerror = () => { script.remove(); reject(new Error('Verification unavailable')) }
      document.head.appendChild(script)
    }).catch(error => { scriptPromise = undefined; throw error })
  }
  return scriptPromise
}

export function NewsletterChallenge({ language, onToken }: { language: AppLanguage; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY

  useEffect(() => {
    let cancelled = false
    let widgetId: string | undefined
    let api: TurnstileApi | undefined
    if (!sitekey) return
    void loadTurnstile().then(loaded => {
      if (cancelled || !container.current) return
      api = loaded
      widgetId = loaded.render(container.current, {
        sitekey, action: 'newsletter', language, size: 'flexible',
        callback: token => { if (!cancelled) { setFailed(false); onToken(token) } },
        'expired-callback': () => { if (!cancelled) onToken('') },
        'error-callback': () => { if (!cancelled) { onToken(''); setFailed(true) } },
      })
    }).catch(() => { if (!cancelled) { onToken(''); setFailed(true) } })
    return () => { cancelled = true; if (api && widgetId !== undefined) api.remove(widgetId) }
  }, [sitekey, language, onToken, attempt])

  return <div style={{ width: '100%', maxWidth: 360, margin: '1rem auto' }}>
    <div ref={container} />
    {(!sitekey || failed) && <p role="alert">
      {language === 'ar' ? 'تعذر تحميل التحقق الأمني. يرجى المحاولة مجدداً.' : 'The security check could not load. Please try again.'}
      {sitekey && <button type="button" className="btn btn--brand" onClick={() => { setFailed(false); onToken(''); setAttempt(value => value + 1) }}>
        {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
      </button>}
    </p>}
  </div>
}
