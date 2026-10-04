import assert from 'node:assert/strict'
import { publicationSeo, publicationBreadcrumbs, PAGE_SEO, relatedPublications } from '../src/lib/seoMetadata.js'
import { createArticleStructuredData, serializeStructuredData } from '../src/lib/structuredData.js'
import { readFile } from 'node:fs/promises'
import { articleImageSize, articleImageUrl, priorityArticleImage } from '../src/lib/articleImages.js'
const publication = { id: 'd713e358-d198-49fb-8f46-e23c1ee60950', kind: 'article', title_ar: 'عنوان عربي طويل '.repeat(12), description_ar: 'وصف عربي مطول '.repeat(20), author_ar: 'اسم الكاتب', published_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-02T00:00:00.000Z' }
const fixtures = [publication, ...Object.keys(PAGE_SEO).map(path => ({ ...publication, ...PAGE_SEO[path], id: path })), { ...publication, id: '9928005' }, { ...publication, id: '7230859' }]
for (const pub of fixtures) {
  const meta = publicationSeo(pub)
  assert.ok(meta.title.length < 60, meta.title)
  assert.ok(meta.description.length < 155, meta.description)
  assert.doesNotMatch(meta.title, /[a-z]/i)
}
for (const meta of Object.values(PAGE_SEO)) { assert.ok(meta.title.length < 60); assert.ok(meta.description.length < 155) }
const article = createArticleStructuredData(publication, { url: 'https://esnads.net/library/1234567' })
for (const field of ['headline', 'description', 'datePublished', 'dateModified', 'author', 'publisher', 'image']) assert.ok(article[field])
assert.equal(article.inLanguage, 'ar')
assert.equal(article.publisher['@id'], 'https://esnads.net/#organization')
assert.match(article.image[0], /^https:\/\//)
const breadcrumb = publicationBreadcrumbs(publication)
assert.equal(breadcrumb['@type'], 'BreadcrumbList')
assert.equal(breadcrumb.itemListElement.length, 3)
assert.doesNotMatch(serializeStructuredData({title: '</script>'}), /<\/script>/)
const related = relatedPublications({ ...publication, title_ar: 'المسيّرات في حرب لبنان' }, [{...publication, id:'1', title_ar:'دراسة حرب لبنان'}, {...publication, id:'2', title_ar:'المسيّرات والمقاومة'}, {...publication, id:'3', title_ar:'التعليم والنزوح'}])
assert.deepEqual(related.map(pub => pub.id).sort(), ['1', '2'])
const key = 'a76bd284326d4836b7472e30deee31f5'
const { quotaPublications, recordBackendStatus, cachedPublicationRead } = await import('../api/_lib/publication-cache.js')
assert.equal(quotaPublications(), null)
const snapshotTestTime = Date.parse('2026-10-04T08:00:00.000Z')
recordBackendStatus(429, snapshotTestTime)
assert.equal(quotaPublications(snapshotTestTime).length, 34)
assert.ok(quotaPublications(snapshotTestTime).every(pub => pub.access_tier === 'free' && pub.status === 'published'))
assert.equal(quotaPublications(Date.parse('2026-10-05T07:27:27.000Z')), null)
let reads = 0
await Promise.all([1,2,3].map(() => cachedPublicationRead('regression', async () => ++reads)))
assert.equal(reads, 1, 'Concurrent database reads are coalesced')
assert.equal((await readFile(`public/${key}.txt`, 'utf8')).trim(), key)
process.env.NODE_ENV = 'production'
const { renderPublicPage } = await import('../api/_generated/public-render.js')
const homeHtml = renderPublicPage({path:'/',language:'ar',publications:[publication]})
assert.equal((homeHtml.match(/<h1\b/g)||[]).length,1)
assert.match(homeHtml, /class="home-hero"/)
assert.match(homeHtml, /href="\/library"/)
const paidHtml = renderPublicPage({path:'/library/1234567',language:'ar',publication:{...publication,access_tier:'paid',content_json:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'PRIVATE_PAID_BODY'}]}]}}})
assert.doesNotMatch(paidHtml,/PRIVATE_PAID_BODY/)
assert.match(paidHtml,/يرجى تسجيل الدخول/)
const imageSrc = 'https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1790080843/esnad/bshohgf8ggcltzyyerxz.jpg'
const imageContent = {type:'doc',content:[{type:'figure',attrs:{src:imageSrc}}]}
assert.equal(priorityArticleImage(imageContent), imageSrc)
assert.ok(articleImageSize(imageSrc).height > articleImageSize(imageSrc).width)
assert.match(articleImageUrl(imageSrc,true), /(?:w_900,c_limit|900\.webp)/)
process.env.TZ = 'Australia/Sydney'
const imageHtml = renderPublicPage({path:'/library/1234567',language:'ar',publication:{...publication,published_at:'2026-08-02T18:54:05.180Z',access_tier:'free',content_json:imageContent}})
assert.match(imageHtml, /٢ أغسطس ٢٠٢٦/)
assert.match(imageHtml, /loading="eager" fetchPriority="high" width="\d+" height="\d+"/i)
assert.match(homeHtml, /<!--\$-->/)
console.log('Full SEO regression checks passed: Arabic metadata limits, complete schema, breadcrumbs, related topic matching, IndexNow key.')
