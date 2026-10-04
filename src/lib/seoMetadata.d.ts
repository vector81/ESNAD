import type { Publication } from '../types/publication'
export const SEO_UPDATED_AT: string
export const HOME_DESCRIPTION: string
export const PAGE_SEO: Record<string, {title:string; description:string}>
export const PUBLICATION_SEO: Record<string, {title:string; description:string}>
export function publicationPublicId(pub: Partial<Publication>): string
export function publicationPath(pub: Partial<Publication>): string
export function shortText(value: unknown, limit: number): string
export function publicationSeo(pub: Partial<Publication>): {title:string; description:string}
export function breadcrumbs(items: string[][]): Record<string, unknown>
export function publicationBreadcrumbs(pub: Partial<Publication>): Record<string, unknown>
export function relatedPublications(pub: Publication, items: Publication[], limit?: number): Publication[]
