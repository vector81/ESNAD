// Metadata only: editorial titles and article bodies remain in the publication store.
import { cleanAbstract } from './cleanAbstract.js'
export const SEO_UPDATED_AT = '2026-10-04T07:30:00.000Z'
export const HOME_DESCRIPTION = 'مركز إسناد للدراسات والأبحاث، المعروف أيضاً باسم مركز اسناد: مكتبة عربية للدراسات السياسية والقانونية والمقالات والكتب.'
export const LIBRARY_TITLE_AR = 'مكتبة إسناد البحثية: دراسات وأوراق بحثية'
export const LIBRARY_HEADING_AR = 'مكتبة إسناد البحثية'
export const LIBRARY_DESCRIPTION_AR = 'مكتبة إسناد (مكتبة اسناد) البحثية من مركز إسناد للدراسات والأبحاث: دراسات وأوراق سياسية وقانونية وتقديرات استراتيجية ومقالات تحليلية عن لبنان والمنطقة.'
export const PAGE_SEO = {
  '/': { title: 'مركز إسناد للدراسات والأبحاث', description: HOME_DESCRIPTION },
  '/about': { title: 'مركز اسناد الإلكتروني للدراسات والأبحاث | إسناد', description: 'تعرّف إلى مركز إسناد للدراسات والأبحاث، المعروف باسم مركز اسناد الالكتروني، ورسالته في نشر الدراسات والأوراق البحثية والمقالات باللغة العربية.' },
  '/library': { title: LIBRARY_TITLE_AR, description: LIBRARY_DESCRIPTION_AR },
  '/contact': { title: 'تواصل مع مركز إسناد للدراسات والأبحاث | إسناد', description: 'راسل مركز إسناد للدراسات والأبحاث للاستفسارات البحثية أو التعاون المؤسسي أو طلبات الاشتراك عبر نموذج التواصل.' },
}
export const PUBLICATION_SEO = {
  '9928005': {
    title: 'موقف الكنيسة الكاثوليكية من اليهودية والصهيونية وإسرائيل | إسناد',
    description: 'موقف الكنيسة الكاثوليكية من إسرائيل: وثيقة «في عصرنا» (1965) صالحت اليهودية لاهوتيًا دون منح الصهيونية أو إسرائيل شرعية دينية، مع تأكيد الحقوق الفلسطينية.',
    seoUpdatedAt: '2026-11-08T00:00:00.000Z',
    about: ['الكنيسة الكاثوليكية', 'الكرسي الرسولي (الفاتيكان)', 'وثيقة في عصرنا (Nostra Aetate)', 'الصهيونية', 'إسرائيل', 'العلاقات الكاثوليكية اليهودية'],
    // Answers are condensed from the paper's own text (sections 1-4 and conclusion); no new claims.
    faq: [
      ['ما موقف الكنيسة الكاثوليكية من اليهودية؟', 'منذ وثيقة «في عصرنا» (Nostra Aetate) سنة 1965 تعترف الكنيسة الكاثوليكية بالجذور اليهودية للمسيحية، وترفض تحميل اليهود جماعيًا مسؤولية موت المسيح، وتدين معاداة السامية، وتدعو إلى الحوار والاحترام بدل منطق الاتهام.'],
      ['هل تمنح الكنيسة الكاثوليكية الصهيونية أو دولة إسرائيل شرعية دينية؟', 'لا. تخلص الورقة إلى أن المصالحة اللاهوتية مع اليهودية لم تمنح الصهيونية أو دولة إسرائيل شرعية دينية مطلقة، ولم تجعل وعد الأرض تفويضًا سياسيًا مطلقًا، فيما تبقى علاقة العهد بالأرض موضوعًا لاجتهادات أكاديمية غير ملزمة.'],
      ['هل يعترف الفاتيكان (الكرسي الرسولي) بإسرائيل؟', 'نعم. أقام الاتفاق الأساسي بين الكرسي الرسولي ودولة إسرائيل سنة 1993 علاقات دبلوماسية، لكنه احتفظ بحق الكرسي الرسولي في أداء رسالته الأخلاقية والروحية وبقائه خارج النزاعات على الأراضي والحدود غير المحسومة، فالاعتراف الدبلوماسي لا يساوي إقرارًا لاهوتيًا بجميع دعاوى الدولة.'],
      ['ما موقف الكرسي الرسولي من الحقوق الفلسطينية والقدس؟', 'دعا الاتفاق الأساسي بين الكرسي الرسولي ومنظمة التحرير الفلسطينية سنة 2000 إلى حل سلمي يحقق الحقوق الوطنية المشروعة للشعب الفلسطيني استنادًا إلى القانون الدولي وقرارات الأمم المتحدة، وعدّ الإجراءات الأحادية التي تغيّر طابع القدس ووضعها غير مقبولة أخلاقيًا وقانونيًا.'],
      ['هل يُعدّ نقد السياسات الإسرائيلية معاداةً للسامية في الموقف الكاثوليكي؟', 'لا. بحسب الورقة يمكن نقد الاستيطان أو التهجير أو انتهاك الحقوق الفلسطينية من غير أن يكون ذلك عداءً لليهود؛ فلا يجوز استخدام القضية الفلسطينية لتبرير كراهية اليهود، ولا استخدام المصالحة الكاثوليكية اليهودية لمنح السياسات الإسرائيلية حصانة من النقد.'],
    ],
  },
  '1532792': {
    title: 'مغادرة جنود كتيبة تسابر قاعدة سديه تيمان: الخيانة القيادية وتآكل الثقة | إسناد',
    description: 'لماذا غادر نحو مئة من جنود كتيبة تسابر (غيفعاتي) قاعدة سديه تيمان في تموز 2026؟ قراءة في ضوء نظرية جوناثان شاي عن الأذى الأخلاقي والثقة القيادية.',
    seoUpdatedAt: '2026-11-15T00:00:00.000Z',
    about: ['كتيبة تسابر (الكتيبة 432)', 'لواء غيفعاتي', 'قاعدة سديه تيمان', 'الأذى الأخلاقي', 'جوناثان شاي', 'الثقة القيادية', 'العدالة التنظيمية'],
    // Answers are condensed from the paper's own text (introduction, findings and conclusion); no new claims.
    faq: [
      ['ماذا حدث في كتيبة تسابر في قاعدة سديه تيمان؟', 'بحسب بيانين للجيش الإسرائيلي نشرتهما القناة 14 في 30 تموز/يوليو 2026، غادر عدد من جنود كتيبة «تسابر» (الكتيبة 432 في لواء غيفعاتي) قاعدة «سديه تيمان» من دون إذن بعد قرار قائد الكتيبة إزالة لوحات ربطها الجيش بممارسات غير معيارية ضمن ثقافة «القدامى والجدد». وبلغ عدد المغادرين في ذروة الحدث نحو مئة، ثم عاد الجميع باستثناء فصيلة واحدة بعد وصول قائد الفرقة 162 وقائد اللواء.'],
      ['ما العقوبة التي تلقاها جنود كتيبة تسابر؟', 'ذكر تقرير للقناة 14 في 31 تموز/يوليو 2026 الحكم على أربعة عشر ممن قادوا الواقعة بالحبس ثلاثين يومًا وإبعادهم عن الخدمة القتالية، مع بقاء اثنين بانتظار المحاكمة وعدم مثول ثالث وقت النشر. وتميّز الدراسة بين الخبر الصحفي والقرار التأديبي الكامل.'],
      ['ما الأذى الأخلاقي عند جوناثان شاي؟', 'يربط الطبيب النفسي الأميركي جوناثان شاي الأذى الأخلاقي بخيانة ما يعتقد الفرد أنه صواب، على يد صاحب سلطة شرعية، في موقف مرتفع المخاطر. وقد نشأ المفهوم من عمله السريري مع محاربي فيتنام، وركز على تفكك رابطة الثقة بين القائد والتابع.'],
      ['هل تفسر نظرية شاي مغادرة جنود تسابر الجماعية؟', 'جزئيًا. تخلص الدراسة إلى أن صيغة شاي تقدم تفسيرًا جزئيًا محتملًا للعلاقة المتضررة بين القيادة والجنود، لكنها تحتاج إلى العدالة التنظيمية والتلاحم الأفقي ودور القادة الميدانيين لتفسير الانتقال إلى فعل جماعي؛ فالنزاع على اللوحات لم يعمل سببًا منفردًا بل تفاعل مع قرائن سابقة على الاستنزاف وعدم الإنصاف وضعف الاستجابة للشكاوى.'],
      ['هل كانت واقعة كتيبة تسابر تمردًا عسكريًا؟', 'لا بحسب المادة المتاحة. التصنيف الأدق في الدراسة هو مغادرة جماعية غير مأذونة ذات سمات عصيان مؤقت، لا تمرد عسكري مكتمل.'],
      ['هل تعني عودة الجنود استعادة الثقة بالقيادة؟', 'لا بالضرورة. تدل عودة معظم الجنود بعد تدخل قادة أعلى على بقاء شرعية المؤسسة الأعلى وتلاحم المهمة، لكنها تثبت استعادة الامتثال أكثر مما تثبت استعادة الثقة بقائد الكتيبة.'],
    ],
  },
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
const PUBLICATION_TITLE_PHRASES = {
  "2630263": "الملف القانوني الدولي الموحّد: الجرائم المرتكبة في جنوب لبنان",
  "2728521": "الحج والوعي السياسي في خطاب السيد مجتبى الخامنئي",
  "3064572": "ترامب وسيكولوجيا الكذب السلطوي",
  "4070119": "إسرائيل: تآكل «عقيدة الحسم» وأزمة «الجيش الصغير»",
  "5143394": "مؤشرات الخراب الثالث في إسرائيل",
  "7193246": "شهادة قائد سنتكوم أمام الكونغرس",
  "8541485": "خطاب الشيخ نعيم قاسم: بين آب 2006 وآب 2026",
  "8629683": "الإحباط يلفّ إسرائيل، وإيران تكرّس مبدأ وحدة الساحات فعلياً",
  "8866951": "الامتحان الموحد في ظروف تعليمية غير متكافئة",
  "9534802": "حين يغدو الوفاء لفلسطين حراسةً للبنان: قراءة في خطاب محمد رعد",
  "9893292": "الشباك لن تنقذهم.. \"الموت بالألياف\" يتسلل من لبنان"
}
function completeTitle(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= 50) return text
  const breakAt = text.search(/:|\s[-–—]\s|\s(?:دراسة|قراءة|تحليل)(?=\s|$)/u)
  return breakAt > 0 ? text.slice(0, breakAt).trim() : text
}
function contentText(node) { return node?.text || (node?.content || []).map(contentText).join(' ') }
// Republished pieces open with a source label and URL ("الأخبار" + al-akhbar link).
// Skip those leading attribution blocks so snippets start with the article's own prose.
const URL_ONLY = /^\s*https?:\/\/\S+\s*$/u
function isAttributionBlock(text, pub) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (!t || URL_ONLY.test(t)) return true
  const title = normalize(String(pub?.title_ar || '').replace(/\s+/g, ' ').trim())
  return t.length <= 40 || Boolean(title && normalize(t) === title)
}
export function publicationLeadText(pub) {
  const blocks = (pub?.content_json?.content || []).map(contentText)
  const start = blocks.findIndex(text => !isAttributionBlock(text, pub))
  return start === -1 ? contentText(pub?.content_json) : blocks.slice(start).join(' ')
}
export function publicationSourceUrl(pub) {
  for (const text of (pub?.content_json?.content || []).slice(0, 4).map(contentText)) {
    const url = String(text || '').trim()
    if (URL_ONLY.test(url) && !/esnads\.net/i.test(url)) return url
    if (!isAttributionBlock(text, pub)) break
  }
  return ''
}
export function publicationSeo(pub) {
  const override = PUBLICATION_SEO[publicationPublicId(pub)]
  return {
    title: override?.title || `${PUBLICATION_TITLE_PHRASES[publicationPublicId(pub)] || completeTitle(pub.headline_ar || pub.title_ar)} | إسناد`,
    description: shortText(override?.description || cleanAbstract(pub.abstract_ar || pub.abstract_en).ar || pub.description_ar || publicationLeadText(pub) || `قراءة ${pub.title_ar}، من إصدارات مركز إسناد للدراسات والأبحاث.`, 154),
  }
}
export function publicationSeoUpdatedAt(pub) { return PUBLICATION_SEO[publicationPublicId(pub)]?.seoUpdatedAt || '' }
export function publicationAbout(pub) { return (PUBLICATION_SEO[publicationPublicId(pub)]?.about || []).map(name => ({ '@type': 'Thing', name })) }
// FAQPage JSON-LD for papers with editor-checked Q&A drawn from the paper itself.
export function publicationFaqStructuredData(pub, url = `https://esnads.net${publicationPath(pub)}`) {
  const faq = PUBLICATION_SEO[publicationPublicId(pub)]?.faq
  if (!faq?.length) return null
  return { '@context': 'https://schema.org', '@type': 'FAQPage', '@id': `${url}#faq`, url, inLanguage: 'ar', isPartOf: { '@id': `${url}#article` }, mainEntity: faq.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }
}
export function breadcrumbs(items) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name, item: `https://esnads.net${path === '/' ? '' : path}` })) }
}
export function publicationBreadcrumbs(pub) { return breadcrumbs([['الرئيسية', '/'], [LIBRARY_HEADING_AR, '/library'], [pub.title_ar, publicationPath(pub)]]) }
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
