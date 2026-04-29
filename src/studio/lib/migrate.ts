import { savePublication, listAdminPublications } from '../../lib/publications'

export function textToPmJson(text: string): Record<string, unknown> {
  const paragraphs = text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line.trim() }],
    }))

  if (paragraphs.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }

  return { type: 'doc', content: paragraphs }
}

export async function migrateLegacyPublications(): Promise<{ migrated: number; errors: string[] }> {
  const errors: string[] = []
  let migrated = 0
  const publications = await listAdminPublications()

  for (const pub of publications) {
    if (pub.content_json) continue // Already migrated
    const description = pub.description_ar || pub.description_en || ''
    if (!description.trim()) continue

    try {
      const contentJson = textToPmJson(description)
      await savePublication({ ...pub, content_json: contentJson, type: pub.type || 'article' }, pub.id)
      migrated++
    } catch (err) {
      errors.push(`${pub.title_ar}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return { migrated, errors }
}
