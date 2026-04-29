function normalizeUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, '') ?? ''
}

function joinPath(baseUrl: string, path: string) {
  if (!baseUrl) {
    return ''
  }

  if (!path || path === '/') {
    return baseUrl
  }

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

function runtimeOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeUrl(window.location.origin)
  }
  return ''
}

export const publicSiteUrl = normalizeUrl(import.meta.env.VITE_PUBLIC_SITE_URL)
export const editorSiteUrl = normalizeUrl(import.meta.env.VITE_EDITOR_SITE_URL)

export function getPublicSiteUrl(path = '/') {
  return joinPath(publicSiteUrl || runtimeOrigin() || 'https://esnads.net', path)
}

export function getEditorSiteUrl(path = '/') {
  return joinPath(editorSiteUrl || runtimeOrigin() || 'https://editor.esnads.net', path)
}
