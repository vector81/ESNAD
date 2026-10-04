# Esnad SEO full pass — 4 October 2026

Arabic audience first. Arabic page titles contain no Latin words. Original publication titles, abstracts, descriptions and article bodies in Firestore were not edited. Technical rendering, title tags, meta descriptions and generated schema were updated.

## Search evidence and targeting

Native Search Console export: 30 June–29 September 2026, 23 clicks, 745 impressions, average position 10.3. The export discloses 11 queries and 50 pages; it is a sparse sample, not a complete estimate of search demand. Query filters were used to establish matching pages and their query-specific positions.

[Arabic keyword report](keywords.md) contains query, matching URL, position, old/new title and descriptions. [Arabic content ideas for the author](content-ideas.md) distinguishes real gaps from weak or incidental queries. About targets مركز اسناد الالكتروني; the drone article targets رماة ماهرون. The Church article mentions ماسيمو فاجيولي naturally in Arabic metadata. Incidental wording such as دقيق الأول was not forced into a title. In total, 28 article title tags and the About title changed; all 34 article titles remain unique and below 60 characters; descriptions are below 155 characters.

## Schema and discovery

- Home WebSite and Organization alternateName: ["اسناد","مركز اسناد","مركز إسناد","Esnads","Esnad","esnads.net"]. Organization has https://esnads.net/newlogo.png and sameAs [], with an owner-social-links TODO in source.
- All 34 published articles/research items have Arabic Article schema with headline, description, publication/modification dates, author, publisher linked to #organization and an absolute image URL. Original article H1 titles are retained. Breadcrumbs cover articles and archives.
- Full Arabic og:site_name is present across checked public pages. Images have Arabic alt text and dimensions. Fifteen missing covers received Arabic title cards (seven articles and eight research papers).
- Related blocks contain 3–4 links. Ranking uses topics, categories and Arabic terms. Thin education/weather clusters require broader research/category matches because the archive lacks three exact-topic alternatives; new articles require the author.
- All 34 items are linked from the library archive, within two clicks from the homepage. Eight non-empty category pages have unique Arabic titles/intros and are indexable.
- The sitemap has 50 URLs, image tags, stable publication/SEO modification dates, and reciprocal Arabic/English homepage alternates. The unchanged llms.txt uses its known last file modification date (26 September), rather than the SEO release date.
- Arabic RSS contains 34 entries and is discoverable in the head/footer. / and /en have reciprocal ar/en/x-default hreflang. Duplicate English article routes canonicalize to the original Arabic article and do not advertise a nonexistent translation.

Live snapshots: [homepage JSON-LD](full-pass/homepage-live.jsonld.json), [article JSON-LD](full-pass/article-live.jsonld.json).

## Mobile performance

Navigation Lighthouse 13 mobile, cold storage and simulated throttling, on the homepage and /library/9547512. Reports are retained, including intermediate runs; results vary with network/server timing.

| Page | Performance before → after | LCP | CLS | TBT |
|---|---:|---:|---:|---:|
| home | 35 → 98 | 12.64 → 2.08 s | 1.204 → 0.000 | 6 → 0 ms |
| article | 53 → 99 | 12.46 → 1.82 s | 0.183 → 0.000 | 11 → 0 ms |

Final accessibility / best-practices / SEO scores: home 100 / 100 / 100; article 100 / 100 / 100.

Changes include complete React SSR/hydration, reserved image sizes, 17 above-fold article images plus three homepage covers served as 80 responsive WebP variants on the Esnad CDN, lazy loading for lower images/covers, self-hosted Arabic fonts, deferred authentication/database imports and analytics loaded after consent. The unused mobile popup-auth iframe was removed; email/password authentication retains its persistence order. Arabic rendering dates use UTC to avoid server/browser hydration differences.

Lighthouse navigation does not establish real-user INP. TBT is reported as a laboratory measure; there was insufficient field data to claim an INP result. [Chrome TBT documentation](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time), [Firebase auth dependencies](https://firebase.google.com/docs/auth/web/custom-dependencies).

[Homepage before](full-pass/home-before.report.html) / [after](full-pass/home-after.report.html); [article before](full-pass/article-before.report.html) / [after](full-pass/article-after.report.html).

## Bing, IndexNow and Google

Bing import from Search Console completed with the approved ongoing read-only Google permission. Only Esnad was selected for this import; other sites already exist in the Bing account. The sitemap submission succeeded, with zero errors/warnings, and is processing. This is submission evidence, not a claim of completed indexing. [Bing proof](full-pass/bing-sitemap-submitted.png).

IndexNow root key file is live. Public deployments notify all 50 sitemap URLs, and successful publication writes trigger an authenticated, non-blocking notification. Unauthenticated publish notifications return 403. Latest public deployment notification: HTTP 200, 50 URLs. No test article was published.

Five known indexing requests were accepted today: homepage, /library, /library/9547512, /library/1306259, and /about. Google then rejected /library/9928005 because of its daily request quota. The remaining five priorities are recorded in [pending-indexing.md](pending-indexing.md). No additional requests were attempted after the quota warning. [Accepted About request](full-pass/indexing-about.png), [quota proof](full-pass/indexing-quota.png).

## Verification and actual blockers

Build and SEO regression checks pass. Final public verification at 2026-10-04T09:07:22.708Z: 54 page checks, 50 sitemap URLs, 34 Article items, 34 RSS entries. All 34 served article bodies/descriptions equal the original captured content. Browser hydration and console checks are saved separately.

Firebase returned HTTP 429 RESOURCE_EXHAUSTED / Quota exceeded during the final audit. Its admin fallback also exposed an incompatible uuid override, now fixed. Numeric mappings were completed for all 34 current items; 60-second in-memory caching deduplicates concurrent backend reads.

A bounded emergency snapshot serves only the 34 previously verified public/free items during this quota outage. Live reads always take priority. Captured 4 October 07:27 UTC; expires 5 October 07:27 UTC (18:27 Sydney). It contains no paid article bodies. The final served-body comparison is against those verified originals; a fresh database-wide comparison was unavailable while Firebase was returning 429. Publishing still requires the live database. Firebase quota/billing needs attention if it has not reset before this fallback expires. Billing changes were not made. [Quota evidence and mitigation](full-pass/firebase-quota.json), [Firebase quota/reset documentation](https://firebase.google.com/docs/firestore/quotas).

## What needs the owner and the author

- Owner: send verified social profile URLs for sameAs; review Firebase quota/billing if the database remains unavailable; retry the five listed indexing priorities once Google resets its quota.
- Author: review the Arabic content-ideas report and decide whether the weak search gaps and thin related-topic clusters warrant new content. Existing article text is untouched.

Full artifacts and native exports are under full-pass/. Audit material is excluded from production uploads.
