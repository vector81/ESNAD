import { readFile, writeFile } from 'node:fs/promises'
import { PAGE_SEO, PUBLICATION_SEO, publicationSeo, publicationPath } from '../../../src/lib/seoMetadata.js'
const before = JSON.parse(await readFile('audit/search-2026-10-04/full-pass/metadata-before.json'))
const publications = JSON.parse(await readFile('audit/search-2026-10-04/full-pass/publications-before.json'))
const escape = value => String(value || '').replaceAll('|', '\\|').replaceAll('\n', ' ')
const old = path => before.find(page => page.path === path)?.title || 'غير متاح'
const candidates = [
  ['مركز اسناد', '/', '22.4', '12', PAGE_SEO['/']],
  ['مركز اسناد', '/about', '6.0', '6', PAGE_SEO['/about']],
  ['مركز اسناد الالكتروني', '/about', '6.6', '5', PAGE_SEO['/about']],
  ['مركز إسناد', '/about', '11.0', '1', PAGE_SEO['/about']],
  ['رماة ماهرون', '/library/7230859', '9.0', '1', PUBLICATION_SEO['7230859']],
  ['massimo faggioli', '/library/9928005', '16.0', '1', PUBLICATION_SEO['9928005']],
]
let report = `# استهداف الكلمات المفتاحية — ٤ أكتوبر ٢٠٢٦

المصدر: تصدير Google Search Console الأصلي، آخر ٣ أشهر (٣٠ يونيو–٢٩ سبتمبر ٢٠٢٦)، بحث الويب. الأرقام الإجمالية: ٢٣ نقرة، ٧٤٥ ظهوراً، ومتوسط ترتيب ١٠٫٣. التصدير يعرض ١١ عبارة بحث و٥٠ عنوان صفحة؛ هذه قائمة العبارات التي أتاحتها المنصة، وليست تقديراً للطلب العام.

التصدير: [Queries.csv](full-pass/export/Queries.csv)، [Pages.csv](full-pass/export/Pages.csv)، [الملف الأصلي](full-pass/search-console.zip). مطابقة كل عبارة مع الصفحات من جدول Pages بعد تطبيق فلتر Query: [الدليل](full-pass/query-page-mappings.json).

## فرص الترتيب بين ٥ و٣٠

الترتيب أدناه خاص بالصفحة عند البحث بالعبارة، وليس متوسط الصفحة لكل العبارات. عنوان المقال ومتن المقال في المخزن لم يتغيرا؛ التغيير يقتصر على عنوان الصفحة والوصف التعريفي.

| العبارة | الصفحة الأساسية | الترتيب | الظهور | العنوان القديم في HTML | العنوان الجديد |
|---|---|---:|---:|---|---|
`
for (const [query,path,position,impressions,meta] of candidates) report += `| ${escape(query)} | https://esnads.net${path === '/' ? '/' : path} | ${position} | ${impressions} | ${escape(old(path))} | ${escape(meta.title)} |\n`
report += `
عبارة «رماة ماهرون» ظهرت على /en/library/7230859. محتوى هذا الإصدار عربي، لذا استُهدف أصله العربي /library/7230859 وبقيت النسخة ذات الواجهة الإنجليزية تشير إليه بوسم canonical. اسم الكاتب الأجنبي ظهر مرة واحدة؛ استُخدم اسمه بالعربية في الوصف، دون إدخال الإنجليزية في عنوان الصفحة.

عنوان الرئيسية العربي مناسب بالفعل لاسم المركز، لذلك احتُفظ به وأعيدت صياغة الوصف ليشمل «مركز اسناد» بصورة طبيعية. وُضعت الصيغ إسناد/اسناد في أوصاف المركز وalternateName؛ لم تُكدّس تهجئات ة/ه المصطنعة في الأوصاف. بقيت أسماء الدراسات ومتنها بتهجئة المؤلف.

## العبارات المستبعدة وأسبابها

- «دقيق الأول»: ٦ مرات ظهور، ترتيب ١٦، مطابق للصفحة /library/9928005. فحص النص وجد «غير دقيقين: أولهما»؛ ليست عبارة موضوعية أو اسم شخص. لم يُحشر هذا التطابق العرضي في العنوان أو الوصف.
- عبارة البحث المطولة عن «ياسا طاهر»: ٣ مرات ظهور وترتيب ٣٫٦٧؛ خارج نطاق ٥–٣٠، ولا مقال مخصص للشخص في الأرشيف الحالي.
- «نعم»: ظهور واحد وترتيب ١؛ عبارة عامة لا تحدد موضوعاً يمكن استهدافه.
- «المجالات التقليدية الموجهة مكانيًا» مع فلاتر الملفات: ظهور واحد وترتيب ٦٧؛ خارج النطاق، وأُحيلت للمراجعة التحريرية في تقرير الأفكار.
- «الإسناد» و«الاسناد»: ظهور واحد لكل منهما وترتيب ٧٦ و٩٠؛ تغطية اسم المركز موجودة في الوصف والبيانات المنظمة، ولا دليل كافٍ لاقتراح مقال لغوي.

## الأوصاف الجديدة

| الصفحة | الوصف العربي | طول العنوان | طول الوصف |
|---|---|---:|---:|
`
for (const path of ['/', '/about', '/library/7230859', '/library/9928005']) {
  const meta = PAGE_SEO[path] || PUBLICATION_SEO[path.split('/').at(-1)]
  report += `| ${path} | ${escape(meta.description)} | ${meta.title.length} | ${meta.description.length} |\n`
}
report += '\n## تحسين بقية عناوين المقالات تقنياً\n\nعناوين HTML التي تجاوزت الحد أصبحت عناوين عربية مختصرة، والأوصاف أقل من ١٥٥ حرفاً. العناوين الكاملة ظلت كما هي داخل H1، ولم يعدّل أي متن. هذه تحسينات طول واتساق، وليست ادعاء بأن Search Console كشف عبارة مستهدفة لكل مقال.\n\n| الصفحة | العنوان القديم | العنوان الجديد |\n|---|---|---|\n'
for (const pub of publications) { const path = publicationPath(pub), meta = publicationSeo(pub); if (old(path) !== meta.title) report += `| ${path} | ${escape(old(path))} | ${escape(meta.title)} |\n` }
await writeFile('audit/search-2026-10-04/keywords.md', report)
