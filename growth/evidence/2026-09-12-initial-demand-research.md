# Initial Demand Research — SEOJump Workflows

Date: 2026-09-12

## Executive conclusion

The broad market need for browser-based SEO productivity is real. Large Chrome extensions show that hundreds of thousands to more than a million users install browser tools that reduce repetitive SEO analysis work.

The narrower hypothesis — users want SEOJump-style multi-tool Workflows — is **promising but not yet fully validated**. Current evidence supports further research, not immediate implementation.

## 1. Browser SEO productivity: VALIDATED market direction

Current Chrome Web Store evidence found during this research:

- Keywords Everywhere: about 1,000,000 Chrome users; its own listing says the product helps more than 1.6 million users and spans multiple sites/workflows.
- Detailed SEO Extension: about 600,000 Chrome users; explicitly positioned as saving time for daily SEO analysis. Treat Detailed as an adjacent benchmark, not a direct SEOJump competitor: its primary value is in-page/on-page inspection, while its Quick Access / right-click links overlap with SEOJump's Context -> Action model.
- Ahrefs SEO Toolbar: about 400,000 Chrome users; positioned around saving hours and doing SEO analysis without leaving the browser.
- META SEO Inspector: about 200,000 Chrome users.

What this proves:

- SEO browser extensions are not an ultra-small niche.
- "reduce repetitive browser work for SEO" is a validated category-level value proposition.

Competitor interpretation:

- Detailed was independently built by Glen Allsopp and was acquired by Ahrefs in September 2025; it was not originally an Ahrefs-built extension.
- Detailed's main product job is surfacing SEO information about the current page inside an extension panel.
- Its right-click / Quick Access actions (open current page/site in Ahrefs, Semrush, Similarweb, Archive.org, etc.) are the part most comparable to SEOJump.
- Therefore Detailed is best used as evidence that current-page Context -> Action shortcuts save meaningful time, not as evidence that SEOJump's whole product is already directly competed away.

What it does **not** prove:

- users specifically want a cross-tool workflow launcher;
- SEOJump's current UX is the best way to deliver that value;
- any specific Workflow is worth building.

## 2. Keyword Research Workflow: PROMISING (B)

Recent practitioner evidence includes:

- A September 2026 SEO discussion explicitly says the tool matters less than having a good workflow, then lists intent, competition/SERP strength, site fit, existing pages and Search Console opportunities as recurring checks.
- A January 2026 r/SEO discussion asks how practitioners actually handle keyword research. Responses describe combinations of Semrush/Ahrefs, Google Keyword Planner, Google Trends, competitor exports, manual filtering and content planning. One user built a local helper specifically because checking ideas one-by-one in Ahrefs took too much time.
- Current web content is explicitly packaging "free keyword research workflow" around multiple tools (Google data, Trends, Ahrefs/Semrush checks, question mining), indicating the intent exists beyond a single product.

SEOJump fit:

- Strong use of `%selectedText%`.
- Existing templates already cover Google, Google Trends, Ahrefs Keyword Generator, Ahrefs KD, SERP checks, Reddit and advanced Google operators.
- Repetitive context re-entry is plausible friction SEOJump can remove.

Counter-evidence / missing proof:

- We have not yet quantified query demand for workflow-oriented terms.
- We have not compared enough expert processes to define a credible "standard" workflow.
- Some steps are judgment-heavy and should not be reduced to opening many tabs.

Decision: **PROMISING — research next, do not build yet.**

## 3. Competitor Research Workflow: PROMISING (B)

Evidence:

- Practitioners discuss stacking Semrush/Ahrefs/Similarweb because competitor research spans different jobs (rankings/keywords, backlinks, traffic/channel intelligence).
- A current Semrush guide (September 2026) explicitly shows how to build a reusable competitor research workflow/skill using multiple data sources and agents, while recommending manual runs first so the workflow is understood before automation.
- Current competitor-research content repeatedly separates traffic intelligence, keyword gaps and backlinks into distinct tool jobs rather than one universal tool.

SEOJump fit:

- Strong `%currentDomain%` / `%currentUrl%` fit.
- Existing templates cover Similarweb, Ahrefs traffic/backlinks, Google site/operator searches, Whois and Wayback Machine.
- Cross-tool context repetition is likely.

Missing proof:

- "competitor research" is broader than SEO; the SEOJump Workflow must stay focused on repeatable SEO browser actions.
- Need stronger direct evidence about frequency and which 3-6 actions practitioners repeatedly perform together.

Decision: **PROMISING — validate task sequence before product design.**

## 4. Backlink Research Workflow: HOLD (C)

Evidence clearly supports demand for backlink tools and backlink analysis. Recent discussions compare Ahrefs, Semrush, Majestic, GSC and SE Ranking.

However, current evidence does not yet prove that users repeatedly need a cross-tool backlink workflow that SEOJump should package. It may be enough to provide strong individual templates and a Guide.

Decision: **HOLD — find workflow-specific evidence first.**

## 5. SEO Audit Workflow: NEW RESEARCH CANDIDATE

A September 2026 r/SEO discussion explicitly asks what fixed workflow/checklist and tools practitioners use for new-site SEO audits. Responses emphasize ordered execution (crawl/indexation before on-page optimization).

This is worth researching even though it was not in the original three Workflow hypotheses. That is a useful test of the Growth System: outside evidence should be allowed to change our backlog.

Decision: **RESEARCHING.**

## 6. Free-tool / budget angle: useful acquisition theme, not product boundary

Recent discussions continue to ask whether good SEO can be done without expensive tools and which free/budget stacks are actually useful. Users cite combinations such as Search Console, Screaming Frog, Ahrefs Webmaster Tools, Semrush free tools and PageSpeed Insights.

Conclusion:

- "free / budget SEO workflow" is a real acquisition topic;
- SEOJump should remain tool-agnostic — paid tools are equally compatible;
- the product value is efficiency across tools, not free access itself.

## 7. Tool Radar: market is moving beyond classic SEO suites

Product Hunt's SEO category currently lists hundreds of products, while its separate GEO category has dozens. Recent launches skew toward technical audits, AI-search readiness, visibility measurement and workflow automation.

Examples worth **WATCH**, not automatic addition:

- AI Search Console — prompt analytics/citation mapping across AI search engines.
- findable / Writesonic and other GEO platforms — AI visibility and content/action workflows.
- FreeScan.app / CrawlRaven — newer technical audit/monitoring positioning.
- Ansvisor and similar answer-engine visibility products.

Before adding any template, test deep-link stability and whether SEOJump can pass a useful context without private APIs.

## 8. Immediate next research

1. Quantify search intent and SERPs for workflow-adjacent keyword clusters, not just tool names.
2. Compare 3-5 credible current Keyword Research methodologies and identify shared vs optional steps.
3. Observe/collect 10+ direct user discussions for competitor research task sequences.
4. Search specifically for repeated multi-tool backlink analysis behavior before reconsidering Backlink Workflow.
5. Start Tool Radar with recent GEO/AI-search products and test whether they are deep-linkable.

Only after these steps should `Add to SEOJump` + Workflow implementation move from hypothesis to product planning.

