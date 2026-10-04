import type { Publication } from '../types/publication'

export const SEO_SITE_URL: string
export const SEO_SITE_NAME: string
export const SEO_ALTERNATE_NAMES: string[]
export function createOrganizationStructuredData(): Record<string, unknown>
export function createWebsiteStructuredData(): Record<string, unknown>
export function getPublicationImage(pub: Partial<Publication>): string
export function createArticleStructuredData(
  pub: Partial<Publication>, options: { url: string; image?: string },
): Record<string, unknown>
export function serializeStructuredData(data: unknown): string
