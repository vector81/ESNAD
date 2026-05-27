import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getAnalyticsConsentStatus, identifyAnalyticsUser, subscribeAnalyticsConsent, trackPageView } from '../../lib/analytics'
import type { SessionUser } from '../../types/publication'

function useAnalyticsConsentSignal() {
  const [status, setStatus] = useState(() => getAnalyticsConsentStatus())

  useEffect(() => subscribeAnalyticsConsent(setStatus), [])

  return status
}

export function AnalyticsPageViewTracker() {
  const location = useLocation()
  const consentStatus = useAnalyticsConsentSignal()

  useEffect(() => {
    if (consentStatus !== 'accepted') return
    trackPageView(`${location.pathname}${location.search}${location.hash}`)
  }, [consentStatus, location.hash, location.pathname, location.search])

  return null
}

export function AnalyticsIdentityTracker({ user }: { user: SessionUser | null }) {
  const consentStatus = useAnalyticsConsentSignal()

  useEffect(() => {
    if (consentStatus !== 'accepted') return
    identifyAnalyticsUser(user)
  }, [consentStatus, user])

  return null
}
