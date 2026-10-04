# Esnad SEO audit

**Site:** https://esnads.net  
**Audit date:** 26 September 2026  
**Scope:** production HTTP responses, rendered browser spot checks, and repository implementation. No production settings or application code changed.

## Executive assessment

Esnad has crawlable research content, a functioning sitemap, and publication structured data. Its main SEO problems are inconsistent language versions, duplicate URL handling, and different metadata implementations for browsers and crawlers. Fix these before investing heavily in new content or link acquisition.

The evidence does **not** establish lost rankings, a Google penalty, or the number of indexed pages. Those require Search Console and historical data. No invented aggregate SEO score is used.

### Measured coverage

| Check | Result |
| --- | --- |
| Sitemap URLs fetched | 81: 68 publication URLs, 12 core pages, 1 text document |
| Publications represented | 34, each advertised in Arabic and English |
| HTTP observations in main crawl | 104 across 94 distinct URL strings, including 11 browser-user-agent samples; apex URLs with and without a trailing slash were recorded separately |
| Main crawl HTTP errors | None; all 104 returned 200, including deliberately nonexistent pages |
| English publication pages with more Arabic than Latin characters | 34 of 34 |
| English publication bodies identical to an Arabic publication | 22 of 34, using normalized extracted body text |
| English publication descriptions matching an Arabic description | 29 of 34 |
| Publication URLs without an OG image | 30 of 68, representing 15 publications |
| Publication URLs with valid JSON-LD syntax | 68 of 68; syntax parsing is not a rich-results eligibility test |
| Arabic publications linked from the crawler library page | 34 of 34 |
| Initial public JavaScript | 1,882,591 decoded bytes; Brotli served over the network |
| Initial stylesheet | 99,449 decoded bytes; Brotli served over the network |

Character counts flag language problems rather than precisely classifying prose. Browser inspection confirmed Arabic article text inside an English interface. Exact-body comparisons include the title and byline but exclude scripts and styles.

## Priority backlog

P1 means fix in the next engineering cycle. P2 means improve after the indexing issues. P3 means conditional cleanup or expansion. Effort is relative and assumes the current architecture.

| ID | Priority | Finding | Impact | Effort |
| --- | --- | --- | --- | --- |
| 01 | P1 | English URLs publish Arabic bodies | Language targeting and duplicate-content consolidation | Medium–large |
| 02 | P1 | Missing pages and server errors return indexable 200 responses | Crawl quality and index hygiene | Medium |
| 03 | P1 | Articles receive a second self-canonical URL under `/books/` | Conflicting canonical signals | Small |
| 04 | P1 | Browser hreflang tags always point to homepages | Incorrect page-language relationships | Medium |
| 05 | P1 | `www` HTTPS certificate does not cover the hostname | Alternate-host access and redirect failure | Small |
| 06 | P1 | About/contact initial canonicals point to the homepage | Conflicting canonical and rendering signals | Medium |
| 07 | P1 | Reader pages retain homepage metadata | Duplicate reading routes misidentified | Small–medium |
| 08 | P2 | Public rendering depends on user-agent classification | Maintenance, content parity, and metadata drift | Large |
| 09 | P2 | API robots block conflicts with client rendering | Rendering dependency risk | Small–medium |
| 10 | P2 | Account noindex is client-only behind robots blocks | Weak index exclusion | Small |
| 11 | P2 | Large initial JS and auth-dependent content loading | Potential mobile loading/interaction cost | Medium |
| 12 | P2 | Missing social images and stale metadata on navigation | Inconsistent previews and page identity | Small–medium |
| 13 | P2 | Authors and publication schema need stronger identity | Attribution and search understanding | Medium |
| 14 | P2 | Topic architecture and institutional evidence are limited | Discovery and reader trust | Medium–large |
| 15 | P2 | Sitemap dates and outage behavior need hardening | Reliability of discovery signals | Small–medium |
| 16 | P3 | Empty book catalogs are indexable | Low-value landing pages | Small |
| 17 | P3 | Legacy story routes lack mapped redirects | Conditional loss of old URL value | Medium |

## Findings and acceptance criteria

### 01 — English publication URLs do not represent English translations

**Confirmed live and in source.** Every English publication in the sitemap contains predominantly Arabic text. For example, `/en/library/9547512` has an English interface and `lang="en"`, but the headline and article are Arabic. Twenty-two English bodies exactly match an Arabic body. The crawler schema labels them `inLanguage: "en"`.

`api/publication-shell.js:451` renders the same `content_json` regardless of language. Title/description functions fall back across languages. `api/sitemap.js:167` treats an unspecified language mode as both languages; catalog generation does not filter by actual translation availability.

**Fix:** track published language availability explicitly, including the body. Publish an English alternate only when it has real English content. For existing untranslated English URLs, choose a consistent migration: redirect to the Arabic original when equivalent, or retain a useful English landing page with a clearly labeled Arabic document and appropriate indexing decisions. Do not automatically cross-canonicalize genuine translations.

**Pass condition:** every URL advertised as English has appropriate English primary content, matching `lang`/schema, and only genuine translated pairs appear in hreflang. Google determines language primarily from visible content; annotations should describe real equivalents. [Google: localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions).

### 02 — Nonexistent URLs and backend failures are served as successful pages

**Confirmed live and in source.** `/library/999999999999` and its English equivalent return 200, `index, follow`, and a generic 90-character site introduction. `/seo-audit-missing-20260926` returns the SPA shell with a homepage canonical. In the browser, the missing publication says it does not exist but remains `index, follow`.

`api/publication-shell.js:832` uses 200 when no publication exists; its catch block at line 881 also uses 200. Catalog exceptions return an empty successful catalog. `src/apps/public/PublicApp.tsx` sends unknown routes to the homepage using a client redirect.

**Fix:** return 404 for missing resources, 410 only for intentional permanent removal where appropriate, and 5xx for temporary service failure. Preserve a useful error UI. Add a real unmatched-route response at the server, with noindex as defense in depth. Do not turn transient failures into permanently missing pages.

**Pass condition:** both browser and crawler requests receive accurate HTTP statuses; invalid pages are absent from sitemap and internal links. These responses risk soft-404 treatment; this audit did not verify Google's classification. [Google: JavaScript SEO and status codes](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

### 03 — A non-book article has two self-canonical detail URLs

**Confirmed live.** `/library/9547512` and `/books/9547512` return the same article. Each crawler response declares its own URL canonical. `getPublicationSection()` at `api/publication-shell.js:503` lets the requested `books` section override the actual publication type. Middleware only resolves nonnumeric references, leaving numeric cross-section variants untouched.

**Fix:** derive canonical section exclusively from normalized publication data. Permanently redirect every wrong-section alias to that canonical URL, including numeric IDs. Share the canonical builder between the sitemap, middleware, API, cards, and page metadata.

**Pass condition:** `/books/9547512` makes one permanent redirect to `/library/9547512`; its final canonical matches internal links and sitemap. Do not change stable numeric URLs merely for keyword appearance.

### 04 — Rendered hreflang tags identify the homepage instead of the current page

**Confirmed in browser.** The rendered publication `/library/9547512` contains Arabic, English, and x-default alternates pointing to `/`, `/en`, and `/`. These originate in `sites/public/index.html:17`; `usePageMeta` never updates them.

Crawler publication HTML has no hreflang links, but the sitemap supplies them. Absence from HTML alone is not a defect because sitemap annotations are supported. The real issue is conflicting browser annotations and language pairs that are not translated. Catalog HTML also omits the self-language member of its alternate set.

**Fix:** generate one consistent set of self-referencing and reciprocal alternates for each real translation group. Either rely on accurate sitemap annotations and remove misleading HTML tags, or implement identical complete sets in both places. Make the language switch a crawlable link to an available equivalent instead of an unconditional button-generated path.

**Pass condition:** inspect initial and rendered HTML for home, catalog, and detail pages in both languages; no detail page advertises a homepage as its translation. [Google: hreflang implementation](https://developers.google.com/search/docs/specialty/international/localized-versions).

### 05 — The `www` host fails TLS validation

**Confirmed from this audit environment.** DNS resolves `www.esnads.net`, but HTTPS fails with `ERR_TLS_CERT_ALTNAME_INVALID`: the presented certificate covers `esnads.net`, not `www.esnads.net`. HTTP on the apex correctly returns a 308 to HTTPS while preserving the tested article path.

**Fix:** configure the www domain and its valid TLS certificate at the hosting provider, then permanently redirect it to the apex with path and query preserved. Verify the actual provider configuration before changing DNS.

**Pass condition:** HTTP/HTTPS requests to both host variants resolve to one HTTPS apex URL without certificate errors or redirect loops. No certificate checks were bypassed during this audit.

### 06 — About and contact pages initially canonicalize to the homepage

**Confirmed live.** `/about`, `/en/about`, `/contact`, and `/en/contact` all return empty-body SPA HTML with the Arabic homepage title and homepage canonical. They are not covered by crawler middleware. React later supplies route metadata, producing different initial and rendered canonicals. The metadata hook also lacks dedicated descriptions for these pages.

**Fix:** render their visible content and route-specific metadata on the server or at build time. Supply accurate localized descriptions, language attributes, and self-canonicals in the original response.

**Pass condition:** initial HTML has the correct title, description, canonical, heading, and substantive content for all four routes. Google can render JavaScript, so an empty initial body does not prove non-indexability; the conflicting canonical is the stronger concern. [Google: canonical handling in JavaScript](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

### 07 — Reader routes remain identified as the homepage after rendering

**Confirmed in browser.** `/reader/9547512` renders approximately 4,701 characters of article text but retains the homepage title, homepage canonical, and `index, follow`; no JSON-LD is present. `src/reader/pages/ReaderPage.tsx` does not call the metadata hook or receive an explicit language prop.

**Fix:** decide whether the reader is an alternate presentation of a publication or a distinct indexable chapter experience. For an equivalent article view, canonicalize to its publication URL and set accurate metadata. For unique chapters, design stable chapter URLs and their own metadata. Do not leave reader canonicals pointing to the homepage.

**Pass condition:** direct navigation and in-app navigation produce the same intended canonical, title, language, and indexing policy.

### 08 — Two rendering implementations need consolidation

**Confirmed in source and HTTP comparisons.** `middleware.ts` distinguishes recognized browsers from bots and unknown clients. Crawlers receive server-rendered catalog/article HTML; browsers receive the React shell. Both crawler templates also load the full application into a hidden root using `createRoot`, rather than hydrating the visible server markup.

This creates competing metadata effects and duplicated implementation. Catalog filtering is another mismatch: `/library?q=seo-audit` returns the full catalog to crawlers because middleware does not forward the filter. React applies it for users. Canonicalizing unimportant filter URLs to the base catalog is sensible, but the rendering behavior should still be deliberate.

**Fix:** move public routes toward shared SSR/static generation with hydration, common metadata, and an explicit filter policy. If retaining dynamic rendering temporarily, check content, links, schema, and post-JavaScript metadata parity in regression tests. No cloaking penalty is asserted here. Google describes dynamic rendering as a workaround and recommends more durable rendering approaches. [Google: dynamic rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering).

### 09 — Robots blocks data endpoints required by the client app

**Confirmed code conflict; crawler rendering impact needs URL Inspection.** `public/robots.txt` disallows `/api/`, while publication retrieval uses `/api/publications`. Reader chapters also depend on an API. Server-rendered crawler article bodies mitigate this for covered routes, but client execution still depends on blocked resources.

**Fix:** allow precisely the public read endpoints needed to render pages, or eliminate those dependencies from indexable initial content. Keep private and transactional routes protected. Do not broadly expose APIs as an SEO shortcut.

**Pass condition:** Search Console's rendered page includes expected content and has no blocked critical data resources. Robots rules control crawling, not authentication. [Google: robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

### 10 — Account pages rely on noindex that blocked crawlers cannot see

**Confirmed configuration issue.** Login/register/dashboard paths are disallowed, while the original shared HTML says `index, follow`. The hook changes this only after JavaScript runs. Editor entry HTML also lacks a robots noindex tag; editor host behavior was not tested.

**Fix:** use route-level `X-Robots-Tag: noindex` or initial HTML noindex, with a crawl policy that permits the directive to be discovered when needed. Authentication remains the access control. Add a blanket noindex header to the editor deployment and verify it on its actual hostname.

**Pass condition:** unauthenticated account/editor responses have server-delivered index exclusion and private data remains authenticated. Robots disallow alone does not guarantee exclusion from search. [Google: robots limitations](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

### 11 — Initial application weight and loading dependencies merit performance work

**Measured asset size; field impact unmeasured.** The live JS entry is 1.88 MB decoded and CSS is 99.4 KB decoded. These are not compressed transfer sizes. Routes are eagerly imported in `PublicApp.tsx`; reading content waits for session initialization in `PublicationPage.tsx:87`. CSS imports four font families with multiple weights through Google Fonts.

**Fix:** lazy-load reader/account and other noncritical routes, reduce public startup dependencies, render public article content independently of auth, and audit font families/subsets. Add responsive image candidates where useful. Preserve existing Cloudinary optimization, image lazy loading, CSS media sizing, and the homepage hero's high fetch priority.

PageSpeed API returned HTTP 429, so no Lighthouse score, LCP, INP, CLS, or mobile pass/fail is claimed. Request field data from Search Console/CrUX and repeat lab tests on home, archive, long article, and reader. Targets at the 75th percentile are LCP ≤2.5 seconds, INP ≤200 ms, and CLS ≤0.1. [Google: Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals).

### 12 — Social images and navigation metadata are incomplete

**Confirmed.** Thirty of 68 publication URLs lack an OG image; catalogs also lack a default share image. `usePageMeta.ts:107` updates images only when one is supplied, so an image can persist when navigating to a page without one. It does not maintain `og:type`, locale, or hreflang. Browser article inspection showed no schema, while crawler HTML includes it.

**Fix:** supply an intentional absolute default share image and write/reset the complete metadata set per route. Use concise editorial headlines while preserving complete academic titles in visible content. Thirty-two publication URLs have titles over 100 characters; this is an editorial review flag, not a ranking failure or fixed Google limit.

**Pass condition:** navigate from an illustrated article to an imageless article and then About; every page has its own correct metadata with no previous-page values.

### 13 — Structured data has a useful baseline but weak author identity

**Confirmed.** All 68 publication responses have parseable Article JSON-LD, author, and publisher metadata. At least two publications combine multiple authors into a single Person name, for example `/library/1306259`. Author URLs and stable person identifiers are absent in the template. It always emits Article, even for future books.

**Fix:** store authors as separate entities and emit an author array with profile URLs. Align publisher identity with visible organization information. Use Book for actual books, and appropriate purchasable-offer/paywall properties only when relevant and supported by visible content. Keep schema consistent between render paths. Do not add ratings, reviews, affiliations, or credentials that do not exist.

**Pass condition:** validate representative pages with Rich Results Test and Schema.org validation, and check visible-data agreement. Syntax success here is not an eligibility guarantee. [Google: Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article).

### 14 — Build topic discovery and evidence of institutional identity

**Source-based opportunity.** About contains a brief mission, vision, values, and form. The route inventory lacks dedicated author profiles, editorial methodology, or corrections pages. Categories/topics are mostly query filters; the metadata hook canonicalizes these to the base catalog, so they are not currently distinct search landing pages. All 34 Arabic publications are already discoverable from the library, which is a strength.

**Fix:** add substantive author biographies, editorial/review process, sourcing and corrections policies, ownership/funding information where appropriate, and clear public contact details. This is especially useful for political, legal, and research material where readers need to assess provenance. It is not a claim about an automated trust score.

Create a small set of curated subject hubs based on actual inventory: regional affairs, political economy, legal research, or other supported subjects. Each should have an original introduction, selected papers, author links, and contextual cross-links. Keep arbitrary search/filter combinations out of the index; promote only valuable hubs to stable self-canonical URLs.

**Pass condition:** every hub answers a distinct reader need, has several relevant publications, and links naturally into and out of the research library. Validate topic demand with Search Console before scaling.

### 15 — Sitemap reliability needs improvement

**Confirmed code risks.** Static `lastmod` is hardcoded to June 14 even for changing catalogs. Missing or invalid publication dates are replaced with the request time. Backend failures silently produce a 200 sitemap containing only static pages, potentially dropping all publication discovery links. Current live sitemap did contain all 34 publication pairs.

**Fix:** use actual meaningful modification dates, omit unknown dates, and retain a known-good sitemap during transient failures or return a suitable error with monitoring. Apply the same language-availability and canonical rules used by pages. Removing `llms.txt` from the search sitemap is optional housekeeping; it is not an indexing blocker. Do not spend effort tuning priority/changefreq or meta keywords before the confirmed issues.

**Pass condition:** repeated unchanged sitemap requests have stable lastmod values; a simulated backend failure cannot silently publish a truncated successful sitemap.

### 16 — Empty books pages need a deliberate indexing policy

**Confirmed live.** `/books` and `/en/books` contain zero publication items and about 150 characters of extracted text, while remaining indexable and listed in the sitemap.

**Fix:** publish useful catalog content when books are available. Until then, either supply genuinely useful explanatory content or temporarily noindex and remove empty pages from the sitemap. Empty catalog status is not automatically a reason to return 404 if the section is intentionally live.

### 17 — Old `/stories/` paths need a migration inventory

**Confirmed routing gap; historical impact unknown.** README documents story routes, but current router and middleware do not map them. The sampled `/stories/9547512` returns a 200 generic shell. This sampled ID is not evidence that this exact URL ever existed historically.

**Fix:** obtain actual former URLs from old sitemaps, Search Console, analytics, and backlink data. Redirect known story URLs to their exact replacements; return proper missing responses for unknown ones. Avoid blanket redirects to home.

## What is already working

- Apex HTTPS is accessible and the tested HTTP article URL redirects correctly to HTTPS.
- Robots advertises a live XML sitemap with valid-looking namespace structure and reciprocal language annotations.
- Crawlers receive substantive article bodies and real anchor links in core catalogs.
- All 34 Arabic publication URLs are linked from the crawler library response; none were orphaned from that listing.
- Current publication crawler pages have one H1, title, description, canonical, byline, and parseable Article schema.
- Cloudinary transforms, Brotli compression, lazy-loaded card images, and a high-priority homepage hero are already implemented.
- Main sitemap publication responses did not fail during this crawl.

## Content and search strategy

Resolve technical duplication first. Then map search intent to the page best able to satisfy it:

| Intent | Suitable page | Work to do |
| --- | --- | --- |
| Branded center searches | Home and About | Explain identity, research focus, named team, and contact options |
| Specific study or report | Publication detail | Clear headline, complete title, abstract, author, dates, sources, citation/download details |
| Subject research | Curated topic hub | Explain scope, group relevant papers, link related subjects and authors |
| Researcher name | Author profile | Verified biography, expertise, affiliation if applicable, publications |
| English-language research | Real English translation or useful English overview | Translate primary content and apply accurate language annotations |

Potential hub names should come from the existing corpus and measured demand; no keyword volumes or competitor gaps were verified. Avoid creating many lightly populated category pages. Retain complete citations and references, and link related work where it helps the argument instead of relying only on a generic related-items block.

## Delivery sequence

### First engineering cycle

1. Fix wrong-section canonical URLs and actual 404/5xx behavior.
2. Correct the www certificate and canonical-host redirects.
3. Stop advertising nonexistent English translations; migrate existing variants deliberately.
4. Correct hreflang, reader metadata, and About/contact initial metadata.
5. Add server-delivered account/editor noindex and review critical API crawl rules.

### Following cycle

1. Consolidate rendering and metadata with regression coverage for initial HTML and client navigation.
2. Improve sitemap resilience and monitoring.
3. Reduce startup JavaScript/auth dependencies; measure real mobile performance.
4. Add default share imagery, author identities, and consistent schema.

### Editorial cycle

1. Publish author and institutional evidence pages.
2. Improve high-impression titles/descriptions using Search Console results.
3. Build a few substantive topic hubs and contextual links.
4. Translate selected high-value publications fully before expanding English discovery.

## Release verification checklist

- Valid publication: 200, one correct canonical, substantive initial body, intended indexing.
- Missing publication: 404; temporary database outage: appropriate 5xx or known-good fallback.
- Wrong section, legacy alias, host variant: permanent redirect to exact canonical.
- Arabic/English pair: real translated content, reciprocal annotations, correct language and schema.
- Reader: intentional relationship to publication canonical; no homepage metadata leak.
- Browser navigation: no stale images, titles, alternates, or robots directives.
- Search filters: deliberate canonical/noindex behavior and consistent visible results.
- Sitemap: only intended canonical indexable pages, reliable dates, stable outage behavior.
- Account/editor: server-delivered noindex plus unchanged authentication protection.
- Structured data: validate real article and any future book/paid examples.
- Performance: mobile lab checks plus field LCP/INP/CLS; asset size alone is not a field score.

## Evidence and limitations

- [Crawl data](crawl.json): per-response URL, user agent, headers, metadata, headings, schema, body metrics, and raw-response filename.
- [Captured sitemap](sitemap.xml).
- [Reproducible crawler](crawl.mjs): three concurrent public GET requests, no login or mutation. The crawler intentionally tests robots-blocked routes for audit purposes; it does not simulate Google's robots enforcement.
- [Supplemental checks](supplemental.json): redirect, asset size, www request failure, and PageSpeed quota error.
- [Browser spot checks](browser-checks.json): rendered article, English article, missing publication, and reader observations.
- [URL inventory](urls.csv): spreadsheet-friendly index of HTTP results.

Raw response artifacts are under `responses/`. The crawler extracts this site's regular HTML with lightweight parsing; it is not a general browser crawler. Browser HTTP samples mean initial responses with a browser user agent, not JavaScript rendering. Rendered observations are separately labeled.

No Search Console, Bing Webmaster Tools, private analytics, backlink database, server logs, full external-link crawl, PDF indexability audit, or editor-host inspection was available in this run. No keyword volume, backlink quality, actual indexing coverage, traffic loss, or rich-result eligibility is claimed. PageSpeed returned 429; no field Core Web Vitals score or full mobile accessibility audit was obtained. Audit findings describe observed behavior on the audit date and source-level risks, not a guarantee of ranking gains.
