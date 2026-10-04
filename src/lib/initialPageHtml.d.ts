import type { Publication, AppLanguage } from '../types/publication'
export function escapeHtml(value: unknown): string
export function displayImage(pub: Partial<Publication>, width: number): string
export function homeHeroInnerHtml(pub?: Partial<Publication>, language?: AppLanguage): string
