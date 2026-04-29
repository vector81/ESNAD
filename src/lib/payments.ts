export async function createCheckoutSession(
  publicationId: string,
  token: string,
  language: 'ar' | 'en',
) {
  const response = await fetch('/api/checkout-session', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ publicationId, language }),
  })

  const payload = (await response.json().catch(() => null)) as
    | { url?: string; mode?: 'stripe' | 'fallback'; error?: string }
    | null

  if (!response.ok) {
    throw new Error(payload?.error || 'تعذر بدء عملية الشراء حالياً.')
  }

  return payload
}

export async function confirmCheckoutSession(
  publicationId: string,
  sessionId: string,
  token: string,
) {
  const response = await fetch('/api/confirm-purchase', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ publicationId, sessionId }),
  })

  const payload = (await response.json().catch(() => null)) as
    | { confirmed?: boolean; error?: string }
    | null

  if (!response.ok) {
    throw new Error(payload?.error || 'تعذر تأكيد الشراء.')
  }

  return payload
}
