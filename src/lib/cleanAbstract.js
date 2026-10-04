// Presentation only. Never mutate the publication or its stored abstract.
export function cleanAbstract(value) {
  let text = String(value || '').trim()
  // Word imports sometimes put the byline before a slash. Limit this to a
  // short name, so slashes inside prose or URLs are preserved.
  text = text.replace(/^[\p{L}\p{M}.\s]{1,60}\/\s*/u, '')
  const lines = text.split(/\r?\n/).filter(line => {
    const label = line.trim().replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    return !/^(?:(?:English\s+)?Abstract|الملخص(?: العربي)?|ملخص|المستخلص|مستخلص)(?:\s*[:/—–-]?\s*(?:[0-9٠-٩]+\s*(?:Words?|كلمة|كلمات)))?\s*[:/]?$/iu.test(label)
      && !/^[0-9٠-٩]+\s*(?:Words?|كلمة|كلمات)\s*$/iu.test(label)
  }).map(line => line.replace(/^\s*(?:المستخلص|مستخلص)\s*:\s*/u, ''))
  const split = lines.findIndex(line => {
    const prose = line.replace(/https?:\/\/\S+/g, '')
    const latin = (prose.match(/\p{Script=Latin}/gu) || []).length
    const arabic = (prose.match(/\p{Script=Arabic}/gu) || []).length
    return latin >= 3 && latin > arabic
  })
  if (split === -1) return { ar: lines.join('\n').trim(), en: '' }
  return { ar: lines.slice(0, split).join('\n').trim(), en: lines.slice(split).join('\n').trim() }
}
