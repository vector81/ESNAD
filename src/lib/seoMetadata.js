// Metadata only: editorial titles and article bodies remain in the publication store.
export const SEO_UPDATED_AT = '2026-10-04T07:30:00.000Z'
export const HOME_DESCRIPTION = 'مركز إسناد للدراسات والأبحاث، المعروف أيضاً باسم مركز اسناد: مكتبة عربية للدراسات السياسية والقانونية والمقالات والكتب.'
export const PAGE_SEO = {
  '/': { title: 'مركز إسناد للدراسات والأبحاث', description: HOME_DESCRIPTION },
  '/about': { title: 'مركز اسناد الإلكتروني للدراسات والأبحاث | إسناد', description: 'تعرّف إلى مركز إسناد للدراسات والأبحاث، المعروف باسم مركز اسناد الالكتروني، ورسالته في نشر الدراسات والأوراق البحثية والمقالات باللغة العربية.' },
}
export const PUBLICATION_SEO = {
  '9928005': { title: 'موقف الكنيسة الكاثوليكية من إسرائيل والصهيونية | إسناد', description: 'دراسة في موقف الكنيسة الكاثوليكية من اليهودية والصهيونية وإسرائيل، والمصالحة اللاهوتية والنقد السياسي، مع مراجع بينها أعمال ماسيمو فاجيولي.' },
  '7230859': { title: 'رماة ماهرون: المسيّرات وتغيّر معادلات حرب لبنان | إسناد', description: 'رماة ماهرون على جبهة لبنان: دراسة في دور مشغّلي المسيّرات وكيف تتحول الأداة الصغيرة إلى سلاح استراتيجي يغيّر معادلات الحرب.' },
}
export function publicationPublicId(pub) {
  const numeric = [pub.public_id, pub.publicId, pub.numeric_id, pub.numericId, pub.article_id, pub.articleId, pub.id].find(v => /^\d+$/.test(String(v || '')))
  if (numeric) return String(numeric)
  let hash = 2166136261
  for (const char of pub.id || '') { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619) }
  return String(1000000 + ((hash >>> 0) % 9000000))
}
export function publicationPath(pub) { return `/${pub.kind === 'book' ? 'books' : 'library'}/${publicationPublicId(pub)}` }
export function shortText(value, limit) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text
  const cut = text.slice(0, limit - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > limit / 2 ? cut.lastIndexOf(' ') : cut.length)}…`
}
function contentText(node) { return node?.text || (node?.content || []).map(contentText).join(' ') }
export function publicationSeo(pub) {
  const override = PUBLICATION_SEO[publicationPublicId(pub)]
  return override || {
    title: `${shortText(pub.headline_ar || pub.title_ar, 50)} | إسناد`,
    description: shortText(pub.abstract_ar || pub.description_ar || contentText(pub.content_json) || `قراءة ${pub.title_ar}، من إصدارات مركز إسناد للدراسات والأبحاث.`, 154),
  }
}
export function breadcrumbs(items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name, item: `https://esnads.net${path === '/' ? '' : path}` })) }
}
export function publicationBreadcrumbs(pub) { return breadcrumbs([['الرئيسية', '/'], ['المكتبة البحثية', '/library'], [pub.title_ar, publicationPath(pub)]]) }
function normalize(text) { return String(text || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[\u064b-\u065f\u0670\u0640]/g, '').toLowerCase() }
const topicPatterns = [/لبنان|لبناني|سلاح|مقاوم|مسيرات|رماة|نعيم قاسم/, /اسراييل|اسرائيل|ايران|حرب|عدوان|سنتكوم|اباده|تجريم الصمت|هيمنه/, /دين|ديني|كنيس|كاثوليك|لاهوت|يهود|ابراهيم|حج|خامني|خامنئي|قيم/, /قياد|ثقه|نفسي|نرجسي|كذب|وعي/, /تعليم|امتحان|تقييم/, /مطر|هطول|سحب/, /يمن|سعود|قطر|عراق|سوري|واشنطن|خليج|اردن/]
export function relatedPublications(pub, items, limit = 4) {
  const text = normalize(`${pub.title_ar} ${pub.topic_ar || ''}`)
  const topics = topicPatterns.map(pattern => pattern.test(text))
  return items.filter(item => item.id !== pub.id && item.kind !== 'book').map(item => {
    const candidate = normalize(`${item.title_ar} ${item.topic_ar || ''}`)
    const sameTopic = topics.reduce((score, yes, i) => score + (yes && topicPatterns[i].test(candidate) ? 10 : 0), 0)
    const words = text.split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 4)
    return { item, score: sameTopic + words.filter(word => candidate.includes(word)).length + (item.category === pub.category ? 1 : 0) }
  }).filter(entry => entry.score > 1).sort((a, b) => b.score - a.score || String(b.item.published_at).localeCompare(String(a.item.published_at))).slice(0, limit).map(entry => entry.item)
}
