export function renderPageError(status, language = 'ar') {
  const english = language === 'en'
  const title = status === 404
    ? (english ? 'Page not found' : 'الصفحة غير موجودة')
    : (english ? 'Temporarily unavailable' : 'الخدمة غير متاحة مؤقتاً')
  const message = status === 404
    ? (english ? 'This page or publication could not be found.' : 'تعذر العثور على الصفحة أو الإصدار المطلوب.')
    : (english ? 'We could not load this page. Please try again shortly.' : 'تعذر تحميل الصفحة. يرجى المحاولة مرة أخرى بعد قليل.')
  return `<!doctype html>
<html lang="${english ? 'en' : 'ar'}" dir="${english ? 'ltr' : 'rtl'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | إسناد</title><meta name="robots" content="noindex, follow">
<meta property="og:site_name" content="مركز إسناد للدراسات والأبحاث">
<link rel="stylesheet" href="/assets/index.css"></head>
<body><main class="container"><section class="panel" style="margin-top:48px">
<h1>${title}</h1><p>${message}</p>
<a href="${english ? '/en' : '/'}">${english ? 'Return home' : 'العودة إلى الرئيسية'}</a>
</section></main></body></html>`
}

export function sendPageError(response, status, language) {
  response.setHeader('content-type', 'text/html; charset=utf-8')
  response.setHeader('cache-control', 'no-store')
  response.setHeader('x-robots-tag', 'noindex, follow')
  if (status === 503) response.setHeader('retry-after', '60')
  response.status(status).send(renderPageError(status, language))
}
