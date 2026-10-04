import type { Auth } from 'firebase/auth'
export let auth: Auth | null = null
let ready: Promise<Auth | null> | null = null
export function loadPublicAuth() {
  ready ??= import('./firebase').then(module => { auth = module.auth; return auth })
  return ready
}
