# Requested P1 fixes — production verification

Production deployment: [dpl_AWAPTVrADuuDTREnPBVvUcsUjMK8](https://vercel.com/vector81s-projects/esnad/AWAPTVrADuuDTREnPBVvUcsUjMK8). Vercel reported READY, target production. All HTTP checks below used `https://esnads.net`, not the deployment preview hostname.

| Finding | Result | Commit | Evidence |
| --- | --- | --- | --- |
| 01 | PASS | `f99dcc5` (additional regression coverage; implementation already deployed previously) | English publication views return 200 without Location or noindex; canonical and og:url resolve to the Arabic publication. Sitemap has 41 URLs, zero `/en` URLs and zero English hreflang entries. |
| 02 | PASS | `6daa97c` | Missing publications, missing readers, and unknown routes return 404 with noindex in HTML and response headers for both browser and Googlebot requests. Friendly error page confirmed in browser. Backend failure paths return 503 with noindex in automated fault simulations. No production outage was induced. |
| 03 | PASS | `65152ab` | `/books/9547512` returns 301 with Location `/library/9547512` for browser and Googlebot. Article/book and conflicting legacy type fixtures exercise data-derived sections. English wrong-section views remain 200 and canonicalize to the correct Arabic publication. |
| 04 | PASS | `399e6a9` | Static homepage hreflang tags removed from the entry HTML. Rendered English reader contains no hreflang tags; sitemap retains ar and x-default annotations. |
| 07 | PASS | `64abbfb` | Both `/reader/9547512` and `/en/reader/9547512` emit canonical and og:url `https://esnads.net/library/9547512` in initial HTML. English reader's post-React DOM matches and remains indexable. Book reader canonicals use the book's data-derived publication section. |

## Checks completed

- `npm run build:public`: pass, including TypeScript checks.
- ESLint on changed TypeScript/React files: pass.
- `node scripts/test-seo-canonical.mjs`: pass. Includes publication/catalog backend-failure simulations, 404 routing, noindex headers, redirects, reader canonicals, and English-view preservation.
- 30 production HTTP checks across browser and Googlebot user agents: pass for the requested assertions. Vercel normalizes the redirect Location to a relative path, which resolves to the required Arabic URL.
- `node audit/seo-2026-09-26/crawl.mjs`: completed with 41 sitemap URLs and 64 total responses; 59 HTTP 200, five expected HTTP 404, zero fetch errors. This crawler follows redirects; separate manual-redirect checks establish the 301 status.
- Browser checks: English reader renders the article, retains its `/en/reader/` address, canonicalizes to `/library/9547512`, and has no static hreflang tags. Unknown route renders a friendly not-found page with a home link.

Evidence: [production checks](p1-production-checks.json), [rerun crawl](crawl.json), [sitemap](sitemap.xml), [production-check script](verify-p1.mjs), [build log](p1-build.log), [deployment log](p1-deploy.log).

These are application and production-response verification results. They do not claim that Google has already recrawled the changes or updated Search Console.
