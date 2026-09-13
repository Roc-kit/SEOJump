# Detailed SEO Extension — Quick Links / Context Menu Reference

Date checked: 2026-09-12

Source inspected locally: installed **Detailed SEO Extension 2.2.7**.

This is a reference only. It is **not** an approved SEOJump backlog and the templates below should not be added to SEOJump automatically. Re-test each destination before adopting it because third-party deep links can change.

## Why this matters to SEOJump

Detailed has two different productivity models:

1. inspect SEO information directly inside the extension (title, description, headings, canonical, robots, schema, etc.);
2. route the current page/site or selected text into external SEO services.

Only the second model is directly comparable to SEOJump's current `Context -> Action` model.

## Selection-based actions

| Detailed action | Actual behavior | SEOJump-style template/reference |
| --- | --- | --- |
| Check duplicates → On this site | Google exact-text search limited to current hostname | `https://www.google.com/search?q=site:%currentDomain%+"%selectedText%"` |
| Check duplicates → Across the web | Google exact-text search | `https://www.google.com/search?q="%selectedText%"` |

## Current page / site actions

| Detailed action | Actual behavior observed in 2.2.7 | SEOJump-style reference |
| --- | --- | --- |
| Google site search | Searches current host with `site:` | `https://www.google.com/search?q=site:%currentDomain%` |
| Google `-inurl:https` search | Uses registrable domain when possible, then `site:domain -inurl:https` | `https://www.google.com/search?q=site:%currentDomain%+-inurl:https` |
| Ahrefs | Opens Ahrefs v2 Site Explorer; target is built from current hostname + pathname and Detailed UTM parameters | Candidate only: `https://app.ahrefs.com/v2-site-explorer/overview?mode=subdomains&target=%currentDomain%` |
| Archive.org | Opens Wayback for current host | `http://web.archive.org/web/%currentDomain%` |
| Majestic | Opens Site Explorer with current page URL as `q` | `https://majestic.com/reports/site-explorer?folder=&q=%currentUrl%` |
| Moz | Opens Link Explorer with current page URL as `site` | `https://analytics.moz.com/pro/link-explorer/overview?site=%currentUrl%` |
| Semrush | Opens Domain Overview with current page URL as `q` | `https://www.semrush.com/analytics/overview/?searchType=domain&q=%currentUrl%` |
| SimilarWeb | Strips leading `www.` and opens current host | `https://similarweb.com/website/%currentDomain%` |
| PageSpeed Insights | Popup quick link sends current hostname + pathname to PSI | `https://developers.google.com/speed/pagespeed/insights/?url=%currentUrl%` is the safer SEOJump candidate to test |
| Rich Results Test | Popup quick link sends current hostname + pathname | `https://search.google.com/test/rich-results?url=%currentUrl%` is the safer SEOJump candidate to test |
| Whois | Opens Whois for current host | `https://www.whois.com/whois/%currentDomain%` |

## Non-template actions worth remembering

- Highlight Nofollow links directly on the current page.
- Extract Google "People Also Ask" results to CSV.
- Change User-Agent.
- Inspect on-page SEO data directly in the extension.

These are a different product direction from SEOJump's current routing/template model and should not be copied merely because Detailed supports them.

## Product lesson

Detailed validates that sending current browsing context directly into external SEO tools is a real workflow used by SEO professionals. However, its broader promise also includes local page inspection, so its general "save time" positioning should not be treated as identical to SEOJump's value proposition.

For SEOJump, the relevant comparison is specifically:

```text
selectedText / currentUrl / currentDomain
                ->
         external SEO action
```

Future Tool Radar can use this list as one source when evaluating missing templates, but every candidate still passes the normal evidence and deep-link validation gates.
