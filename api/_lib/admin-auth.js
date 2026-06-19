import { getAdminAuth } from './firebase-admin.js'
import { getBearerToken } from './http.js'

const BASELINE_ADMIN_EMAILS = ['abuali882005@gmail.com', 'info@esnad.com.lb']

export function parseAdminEmails(value) {
  if (!value) return []
  return String(value)
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function getAllowedAdminEmails() {
  return new Set([
    ...BASELINE_ADMIN_EMAILS,
    ...parseAdminEmails(process.env.ADMIN_EMAIL),
    ...parseAdminEmails(process.env.ADMIN_EMAILS),
    ...parseAdminEmails(process.env.VITE_ADMIN_EMAIL),
  ])
}

export function isAllowedAdminEmail(email) {
  return Boolean(email && getAllowedAdminEmails().has(String(email).trim().toLowerCase()))
}

export async function requireUser(request) {
  const token = getBearerToken(request)
  if (!token) {
    throw new Error('missing_token')
  }

  return getAdminAuth().verifyIdToken(token)
}

export async function verifyAdminRequest(request) {
  const decodedToken = await requireUser(request)
  return isAllowedAdminEmail(decodedToken.email) ? decodedToken : null
}

