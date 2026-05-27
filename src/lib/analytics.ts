import posthog from 'posthog-js'
import type { PostHogConfig } from 'posthog-js'
import type { AppLanguage, Publication, SessionUser } from '../types/publication'
import { getPublicationAuthor, getPublicationTitle, getShareSlug } from './publications'

const POSTHOG_TOKEN = import.meta.env.VITE_POSTHOG_TOKEN?.trim()
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com'

const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'icloud.com',
  'live.com',
  'me.com',
  'msn.com',
  'outlook.com',
  'proton.me',
  'protonmail.com',
  'yahoo.com',
])

export const isPostHogEnabled = Boolean(POSTHOG_TOKEN)
const ANONYMOUS_ID_KEY = 'esnad_analytics_distinct_id'
const CONSENT_KEY = 'esnad_analytics_consent_v2'
const CONSENT_EVENT = 'esnad:analytics-consent'
let currentDistinctId = ''
let currentCompanyDomain: string | null = null
let isPostHogStarted = false

export type AnalyticsConsentStatus = 'accepted'

export function getAnalyticsConsentStatus(): AnalyticsConsentStatus | null {
  if (typeof window === 'undefined') return null

  try {
    const status = window.localStorage.getItem(CONSENT_KEY)
    return status === 'accepted' ? status : null
  } catch {
    return null
  }
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsentStatus() === 'accepted'
}

function startPostHog() {
  if (!isPostHogEnabled || isPostHogStarted || !hasAnalyticsConsent()) return

  posthog.init(POSTHOG_TOKEN, {
    api_host: POSTHOG_HOST,
    autocapture: true,
    capture_pageview: false,
    capture_pageleave: true,
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
  } satisfies Partial<PostHogConfig>)

  isPostHogStarted = true
}

export function setAnalyticsConsentStatus(status: AnalyticsConsentStatus) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(CONSENT_KEY, status)
  } catch {
    return
  }

  startPostHog()
  if (isPostHogEnabled) posthog.opt_in_capturing()

  window.dispatchEvent(new CustomEvent<AnalyticsConsentStatus>(CONSENT_EVENT, { detail: status }))
}

export function subscribeAnalyticsConsent(listener: (status: AnalyticsConsentStatus) => void) {
  if (typeof window === 'undefined') return () => undefined

  const handler = (event: Event) => {
    listener((event as CustomEvent<AnalyticsConsentStatus>).detail)
  }

  window.addEventListener(CONSENT_EVENT, handler)
  return () => window.removeEventListener(CONSENT_EVENT, handler)
}

function getCompanyDomain(email: string) {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) return null
  return domain
}

function capture(event: string, properties: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (!hasAnalyticsConsent()) return
  startPostHog()

  void sendServerEvent(event, properties)
}

function getAnonymousDistinctId() {
  if (typeof window === 'undefined') return `anon_${Date.now()}`

  const stored = window.localStorage.getItem(ANONYMOUS_ID_KEY)
  if (stored) return stored

  const generated = `anon_${crypto.randomUUID()}`
  window.localStorage.setItem(ANONYMOUS_ID_KEY, generated)
  return generated
}

async function sendServerEvent(event: string, properties: Record<string, unknown>) {
  const distinctId = currentDistinctId || getAnonymousDistinctId()

  await fetch('/api/track-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      event,
      distinct_id: distinctId,
      properties: {
        ...properties,
        visitor_company_domain: currentCompanyDomain,
        $current_url: window.location.href,
        $host: window.location.host,
        $pathname: window.location.pathname,
        $referrer: document.referrer || null,
      },
    }),
  }).catch(() => {
    if (isPostHogEnabled) {
      posthog.capture(event, properties)
    }
  })
}

export function identifyAnalyticsUser(user: SessionUser | null) {
  if (!hasAnalyticsConsent()) return
  startPostHog()

  if (!user) {
    currentDistinctId = getAnonymousDistinctId()
    currentCompanyDomain = null
    if (isPostHogEnabled) {
      posthog.unregister('visitor_company_domain')
      posthog.reset()
    }
    return
  }

  currentDistinctId = user.uid

  const companyDomain = getCompanyDomain(user.email)
  currentCompanyDomain = companyDomain

  if (isPostHogEnabled) {
    posthog.identify(user.uid, {
      email: user.email,
      name: user.displayName,
    })

    if (companyDomain) {
      posthog.register({ visitor_company_domain: companyDomain })
      posthog.group('company', companyDomain, {
        domain: companyDomain,
        name: companyDomain,
      })
    } else {
      posthog.unregister('visitor_company_domain')
    }
  }
}

export function trackPageView(path: string) {
  capture('$pageview', {
    $current_url: window.location.href,
    path,
    title: document.title,
  })
}

export function trackPublicationView(publication: Publication, language: AppLanguage) {
  const eventName = publication.kind === 'article' ? 'article_viewed' : 'publication_viewed'

  capture(eventName, {
    publication_id: publication.id,
    publication_slug: getShareSlug(publication),
    publication_kind: publication.kind,
    publication_type: publication.type,
    publication_category: publication.category,
    publication_title: getPublicationTitle(publication, language),
    publication_title_ar: publication.title_ar,
    publication_title_en: publication.title_en,
    publication_author: getPublicationAuthor(publication, language),
    publication_author_ar: publication.author_ar,
    publication_author_en: publication.author_en,
    publication_access_tier: publication.access_tier,
    publication_published_at: publication.published_at,
    has_pdf: Boolean(publication.pdf_url),
    language,
    path: window.location.pathname,
    url: window.location.href,
  })
}

export function trackPublicationReadTime(
  publication: Publication,
  language: AppLanguage,
  readingSeconds: number,
  maxScrollDepth: number,
  readSessionId: string,
) {
  const eventName = publication.kind === 'article' ? 'article_read_time' : 'publication_read_time'

  capture(eventName, {
    publication_id: publication.id,
    publication_slug: getShareSlug(publication),
    publication_kind: publication.kind,
    publication_type: publication.type,
    publication_category: publication.category,
    publication_title: getPublicationTitle(publication, language),
    publication_author: getPublicationAuthor(publication, language),
    publication_access_tier: publication.access_tier,
    reading_seconds: Math.max(0, Math.round(readingSeconds)),
    max_scroll_depth: Math.max(0, Math.min(100, Math.round(maxScrollDepth))),
    read_session_id: readSessionId,
    language,
    path: window.location.pathname,
    url: window.location.href,
  })
}

export { posthog }

startPostHog()
