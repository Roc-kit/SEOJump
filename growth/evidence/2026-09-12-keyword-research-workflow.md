# Keyword Research Workflow — Evidence Report V1

Date: 2026-09-12

## Decision

**Overall opportunity: B — PROMISING**

- **Methodology evidence: A — VALIDATED**
- **SEOJump Workflow packaging evidence: B — PROMISING, not yet validated**

Keyword research is clearly a repeatable, multi-stage SEO process. Multiple independent sources converge on a stable core sequence. There is also direct evidence that practitioners bounce between several tools and that this creates time/organization friction.

What is not yet proven is that users specifically want a one-click SEOJump Workflow that opens/packages those steps. That product mechanism must still be tested.

## 1. Sources reviewed

### Practitioner / community

- Reddit r/Agentic_SEO, 2026-09-07: practitioners explicitly say workflow matters more than the specific tool; recurring checks include intent, SERP competition, site fit, existing pages and Search Console data.
- Reddit r/SEO, 2025-04-30: user workflow combines Google Trends, Keyword Planner, Semrush/SE Ranking/Ahrefs, competitor pages and question research; replies add search intent and competitive gap analysis.
- Reddit r/SEO, 2026-01-13: users describe combining competitor keyword exports, Google Keyword Planner, Google Trends and page/site planning.

### Reputable methodology

- Ahrefs Keyword Research guide: seed ideas, current rankings/GSC, competitor keywords, niche/community research, clustering, intent, traffic potential, manual SERP/difficulty analysis and business potential.
- Semrush 2026 Keyword Research guide: existing rankings, discovery, competitor gaps, clustering and content planning; also adds AI/prompt research as a newer optional layer.
- Backlinko Keyword Research Template: seed ideas, multiple discovery sources, metrics and target selection; explicitly frames tab/tool switching as workflow friction.
- Google Search Console documentation: query/page performance is authoritative first-party evidence for existing-site opportunities.
- Google Trends documentation: useful for comparing wording, direction, seasonality and related searches; normalized interest, not absolute search volume.
- 哥飞 SEO 工具箱: demand translation -> keyword expansion/demand mining -> pre-filter -> real-time SERP/difficulty assessment -> value judgment. It explicitly warns that preliminary KD is only for screening and that project decisions require live SERP analysis.

## 2. Shared core vs source-specific preferences

### Shared core — strong consensus

1. Start from the business/user problem, not from a metric.
2. Establish seed terms or real queries.
3. Expand ideas through tools, competitors and/or audience conversations.
4. Check whether demand is real and how it changes over time.
5. Determine search intent by inspecting the SERP, not merely trusting a label.
6. Judge realistic ranking difficulty / competition using the live SERP, not KD alone.
7. Judge relevance/business value for the actual site.
8. Cluster related terms and map them to existing or new pages.
9. Prioritize what to execute first.

This is stable enough to support an SEOJump Guide.

### Source-specific / optional layers

- Ahrefs emphasizes Traffic Potential and Business Potential.
- Semrush emphasizes existing-ranking quick wins, Keyword Gap and newer AI/prompt visibility.
- Backlinko packages the process as a worksheet/checklist and focuses heavily on practical target selection.
- 哥飞 emphasizes whether a new/small site can actually enter the current SERP, homepage-vs-inner-page structure, weak competitors, domain strength/age, and live SERP evidence.
- Google Trends is a supporting trend/wording signal, not a replacement for volume or SERP validation.
- GSC is highly valuable for an existing site but irrelevant for a brand-new domain with no meaningful search history.

These should not all be forced into the mandatory beginner path.

## 3. Proposed canonical workflow

The Guide should teach one core process with two entry branches.

### Entry A — new site / new product / new niche

```text
Need / audience problem
-> translate into seed/search language
-> expand keyword ideas
```

### Entry B — existing site

```text
GSC / existing rankings / current pages
-> identify real queries + quick wins + gaps
-> add new seed ideas where needed
```

Then both branches converge:

```text
1. Demand / Seed
2. Expand
3. Trend + volume sanity check
4. Search intent + live SERP
5. Winnability / competition
6. Business relevance / value
7. Cluster + page mapping
8. Prioritize + decide action
```

### Step 1 — Demand / Seed

Question: **What problem or search language are we actually researching?**

Inputs:

- customer/user language;
- product/service jobs to be done;
- existing GSC queries for established sites;
- competitor/category language;
- community questions.

Do not start with a random low-KD keyword.

### Step 2 — Expand

Question: **What other phrases represent the same or adjacent demand?**

Sources can include:

- Ahrefs Keyword Generator / Keywords Explorer;
- Semrush Keyword Magic;
- Google related searches/autocomplete;
- competitor keywords;
- Reddit/forums/Q&A;
- 哥飞需求翻译器/关键词拓展/需求挖掘机 for the applicable outbound-SEO use case.

Output: candidate keyword/topic set, not a final target list.

### Step 3 — Trend + volume sanity check

Question: **Is the demand material, stable, growing, seasonal or possibly misleading?**

Use volume as an estimate, not truth. Use Google Trends for relative direction/seasonality and wording comparison.

### Step 4 — Search intent + live SERP

Question: **What does Google currently believe the searcher wants?**

Inspect:

- page types: tool / product / category / guide / forum / video;
- dominant and mixed intent;
- SERP features;
- whether the query deserves a new page at all.

This is a judgment step. A tool-provided intent label is only a hint.

### Step 5 — Winnability / competition

Question: **Can this specific site realistically compete?**

Inspect the actual top results. Consider:

- relevance and specialization;
- homepage vs inner-page results;
- strong brands vs focused smaller sites;
- backlinks/domain strength where useful;
- freshness/content quality;
- whether weaker/newer sites already win.

KD is a screening signal, not the final decision. This is where the 哥飞 approach adds the most useful discipline for new/small sites.

### Step 6 — Business relevance / value

Question: **If we rank, does it help the product/site objective?**

Consider:

- user/product fit;
- conversion or product-use potential;
- whether the content can naturally solve the need;
- strategic value even when volume is modest.

### Step 7 — Cluster + page mapping

Question: **Which keywords belong on one page, and does that page already exist?**

Avoid "one keyword = one page" as a mechanical rule. Search-intent/SERP similarity can show that several terms belong on the same page.

Map each kept cluster to:

- improve existing page;
- create new tool/landing page;
- create Guide;
- create comparison/template/workflow page;
- reject/no action.

### Step 8 — Prioritize + decide action

Question: **What should we actually do first?**

Balance:

- real demand / traffic potential;
- realistic winnability;
- business/product value;
- existing authority/page position;
- required effort;
- strategic timing/trend.

The output is an execution queue, not a giant keyword spreadsheet.

## 4. What SEOJump can accelerate today

Existing templates already cover much of the repeated browser execution:

| Research action | Current SEOJump fit |
| --- | --- |
| Google SERP | Strong — `%selectedText%` |
| Google Trends | Strong — `%selectedText%` |
| Ahrefs Keyword Generator | Strong — `%selectedText%` |
| Ahrefs Keyword Difficulty | Strong — `%selectedText%` |
| Ahrefs SERP Checker | Strong — `%selectedText%` |
| Semrush Keyword Magic / Overview | Strong — `%selectedText%` |
| Google Keyword Planner | Experimental browser action exists |
| Google exact phrase / intitle / inurl | Strong — `%selectedText%` |
| Google site + keyword | Strong — `%selectedText%` + `%currentDomain%` |
| Reddit/web community research | Existing search templates can support it |
| GSC existing-site opportunity review | Partial — property/account context makes generic deep-linking harder |
| Clustering / page mapping | Not a URL-launch action; requires judgment/data organization |
| Business relevance | Human/AI reasoning, not a template |

Important: the canonical Workflow must not simply open every available tool. It should expose the *next useful action* and preserve the distinction between mechanical steps and judgment steps.

## 5. Mechanical vs judgment work

### Good candidates for SEOJump / AI acceleration

- pass a selected seed keyword into several research destinations;
- open exact/live SERP and operator searches;
- compare wording in Trends;
- open keyword expansion/overview tools;
- collect candidate evidence into a research record;
- suggest clusters and page mappings;
- summarize what changed between tools/sources.

### Must retain explicit judgment

- whether the underlying demand matters to the business;
- final search-intent interpretation when SERP is mixed;
- whether the site can realistically beat the current SERP;
- whether an existing page should be improved vs a new page created;
- final clustering when SERPs disagree;
- priority/order of investment.

AI can recommend these judgments, but the Workflow Guide must teach the reasoning rather than hide it.

## 6. Direct evidence of workflow friction

The "multiple tools / too many tabs / difficult prioritization" problem is externally visible:

- Backlinko's current keyword research template explicitly says users otherwise bounce among many tabs and lose track of the process.
- Asana's current keyword research template describes teams pulling data from multiple keyword tools, dumping it into spreadsheets and struggling to decide what deserves priority.
- Current practitioner threads describe combinations of Ahrefs/Semrush, Keyword Planner, Trends, competitor exports and manual SERP judgment rather than one universal tool.

This supports SEOJump's general efficiency thesis, but Detailed should be treated as an adjacent benchmark rather than a direct competitor. Its dominant job is on-page inspection; the overlap with SEOJump is specifically its Quick Access/right-click actions that pass the current page/site into external SEO tools.

It still does not prove the optimal UI. A one-click "open 8 tabs" implementation could make the problem worse.

## 7. Product implication

Do **not** build a Workflow as "click once, open all tools".

The product hypothesis worth testing is closer to:

```text
Selected keyword
-> Keyword Research workflow
-> ordered checklist / stages
-> one or a few context-relevant actions per stage
-> preserve completed state / notes where useful
```

Possible execution modes worth testing rather than assuming:

- **Step mode** — open the next recommended action and return to the workflow state;
- **Stage batch mode** — open only the 2-3 actions useful for the current stage, preferably in background tabs;
- **Expert mode** — retain the current direct-template / Ctrl-background pattern without forcing a guided flow.

Possible lightweight V1 test before a full product model:

1. Define the 8-stage methodology in a Guide/checklist.
2. Manually perform it on 3-5 real keywords using current SEOJump templates.
3. Record number of repeated copy/paste, tab switches, re-entry and dead steps.
4. Prototype only the highest-friction transitions.
5. Compare against the existing extension experience.

If SEOJump saves negligible time or creates tab overload, reject or redesign the Workflow product hypothesis even though the methodology itself is valid.

## 8. Guide requirement

If the product gate later passes, the official Workflow must have a matching Guide.

The Guide should include:

- new-site vs existing-site entry branch;
- one real case from seed to final page decision;
- screenshots for every tool-dependent decision that is not obvious;
- short screen recordings for multi-step browser actions;
- "why this step exists" and "what decision you make here";
- free/freemium and paid alternatives where relevant;
- explicit warnings against using search volume or KD as a single decision metric;
- a final downloadable/usable research record rather than just prose.

## 9. 2026 optional layer: AI / prompt research

Semrush now includes prompt/AI-visibility research alongside classic keyword research. Search Engine Land is also treating prompt research as a parallel prioritization signal.

Do not make this mandatory in the beginner Keyword Research Workflow yet.

Recommended treatment:

- core Workflow remains search-demand / SERP based;
- add an optional "AI Search / Prompt Research" branch after the core target cluster is understood;
- let Tool Radar determine which AI/GEO products can accept useful deep links from SEOJump.

## 10. Next validation task

The methodology gate is complete.

Next test the **product gate** with real execution, not more desk research:

1. Pick 3-5 representative keyword cases (new-site low competition, commercial/tool intent, informational intent, existing-site quick win).
2. Execute the canonical workflow manually with current SEOJump.
3. Log time, context re-entry, tab switches, steps skipped and judgment bottlenecks.
4. Determine which transitions deserve product support.
5. Only then specify Workflow UX / `Add to SEOJump` behavior.

## 11. Product-gate desk execution — round 1

This round used three representative keyword types to test the proposed stages against current search results and existing SEOJump templates. It is a desk execution, not yet a timed usability study with the installed extension.

### Case A — `square foot calculator`

Type: new-site / tool intent / opportunity research.

Current SERP observations:

- results are dominated by dedicated interactive calculator pages;
- several focused domains are built specifically around square-foot/square-footage calculators;
- the page-format answer is immediately clearer from the live SERP than from a volume/KD number.

Useful SEOJump actions:

1. Google SERP — essential;
2. Ahrefs Keyword Generator — useful for variants/subtasks;
3. Google Trends — useful for wording/trend sanity check;
4. KD / SERP Checker — useful as supporting competition evidence;
5. Google Exact / intitle — optional supply signal.

What the Workflow should teach:

- do not decide "article vs tool" before looking at the SERP;
- if the SERP is overwhelmingly interactive calculators, creating a generic article is likely the wrong page type;
- focused smaller sites in the SERP matter more to a new-site feasibility judgment than a single aggregate KD number.

### Case B — `free backlink checker`

Type: commercial/tool intent.

Current SERP observations:

- direct interactive tools dominate (including Ahrefs/Backlinko and newer independent tools);
- users clearly want to complete a task, not mainly read an explanatory article;
- "free" is part of acquisition intent, but the underlying job is backlink inspection.

Useful SEOJump actions:

1. Google SERP — essential;
2. Ahrefs KD / SERP Checker — supporting competition evidence;
3. Keyword Generator / Semrush keyword tools — variants such as domain/website/backlink wording;
4. Trends — optional; less decisive than live tool-intent SERP.

Product implication:

- a Keyword Research Workflow must be able to stop early when intent is obvious;
- forcing every keyword through every research tool wastes time;
- the outcome should include `page_type = tool/landing page`, not merely a keyword score.

### Case C — `how to use google trends for seo`

Type: informational / Guide intent.

Current SERP observations:

- established guides/tutorials dominate;
- the intent is learning a process/use case, unlike Case B;
- Google Trends itself is one of the tools the eventual Guide needs to demonstrate visually.

Useful SEOJump actions:

1. Google SERP — essential;
2. Google Trends — useful both as research source and article subject;
3. Keyword Generator / Semrush — adjacent queries and wording;
4. Exact/intitle searches — optional supply/coverage check;
5. SERP/KD — supporting feasibility evidence.

Product/content implication:

- output can legitimately be `page_type = Guide`;
- the corresponding Guide should include screenshots/short recordings because the user's need is procedural;
- the Guide can then offer SEOJump actions/workflow as the execution layer.

### Round-1 friction findings

Current SEOJump already removes the biggest primitive friction: retyping/copying the same selected keyword into individual tools.

The remaining friction is different:

1. the user must remember **which action comes next**;
2. all templates are presented as tools rather than stages in a decision process;
3. there is no shared research state such as intent/page type/keep/reject;
4. there is no stop condition, so a naive Workflow could create tab overload;
5. judgment results are not carried forward to the next stage.

Code inspection adds one important nuance: current SEOJump already opens each destination in a new tab, and holding `Ctrl` can open a destination in the background. An experienced user can therefore fan the same selected keyword out to several tools with relatively little interruption. A future Workflow must deliver more than "multi-open"; otherwise it merely repackages an existing power-user pattern with more UI.

Therefore the strongest Workflow hypothesis is **guided sequencing**, not bulk launching.

### Candidate Workflow UX principle

```text
Keyword / selected text
        ↓
Stage 1: Demand
  [Trends] [Keyword Generator]
  Decision: real / weak / seasonal / unclear
        ↓
Stage 2: Intent + SERP
  [Google] [SERP Checker]
  Decision: tool / guide / product / mixed / reject
        ↓
Stage 3: Winnability
  [KD] [intitle] [competitor checks]
  Decision: feasible / hard / reject
        ↓
Stage 4: Map + Priority
  existing page / new page / no action
```

The full eight-stage methodology can remain in the Guide/research record, while the extension UI can group related stages to avoid excessive complexity.

### Product-gate status after round 1

Still **B — PROMISING**.

Positive evidence:

- the process genuinely crosses several tools;
- SEOJump's existing context passing already removes repeated input;
- the next unmet friction is sequencing and decision-state, which fits the extension/site combination.

Remaining proof needed:

- timed use with the actual extension on 3-5 cases;
- compare individual-template use vs a simple staged prototype;
- verify whether users value retained workflow state enough to justify added UI complexity;
- test whether Guide -> `Add to SEOJump` is a natural conversion path rather than an imposed one.

Do not implement the full Workflow model before that test.

## 12. Competitor product evidence — Context -> Action is validated

The broader SEOJump product thesis is more strongly validated than the staged Workflow thesis.

### Detailed SEO Extension

Detailed positions its right-click menu around speed: open the current page/site directly in Ahrefs, Moz, Majestic, Archive.org, SimilarWeb, Semrush and other destinations. Its public site says this saves seconds dozens or hundreds of times per day, and the extension has grown to hundreds of thousands of weekly users.

This is direct external evidence for SEOJump's core behavior:

```text
current context -> external SEO destination
```

SEOJump extends that pattern with selected text/keywords, configurable templates and potentially ordered Workflows.

### Keywords Everywhere

Keywords Everywhere explicitly sells convenience: instead of bouncing between dashboards, it injects keyword research/validation into places where users already work. It spans Google Search, Search Console, Keyword Planner, Trends and other sites.

This validates the general user desire to reduce tool switching. Its solution is data injection; SEOJump's solution is context-aware routing. They solve adjacent forms of the same friction.

### Ahrefs SEO Toolbar

Ahrefs keeps users in the browser by adding SERP metrics, page reports, keyword ideas and Google Trends metrics. More importantly, Ahrefs documented a historical performance problem in an older toolbar: loading data across many open tabs caused browser freezes, so the newer toolbar limits work to the current/new tabs.

Product lesson for SEOJump:

- convenience is valuable;
- browser context is valuable;
- excessive automatic fan-out is harmful;
- a Workflow should reduce cognitive/tool-switching cost without producing tab explosion.

### Market distinction

Large SEO extensions mostly follow three models:

1. **Inject data into the current page/SERP** — Keywords Everywhere, Ahrefs Toolbar;
2. **Analyze the current page locally/in-extension** — Detailed, Ahrefs Toolbar, SEO Minion;
3. **Route current page/site to external tools** — Detailed right-click integrations.

The research did not find a large established extension whose primary model is an ordered, cross-tool, decision-state Workflow for keyword research.

Interpretation:

- this is potentially an open product position;
- absence is not proof of demand;
- staged Workflow remains a B-grade hypothesis and must be usability-tested before implementation.

### Updated evidence split

| Claim | Grade | Conclusion |
| --- | --- | --- |
| SEOs value browser-based productivity | A | Validated |
| Context -> external SEO action saves real repetitive work | A | Validated |
| Keyword research has a repeatable methodology | A | Validated |
| Users combine multiple tools during keyword research | A/B | Strong evidence |
| Users specifically want an ordered SEOJump Workflow UI | B | Promising, test needed |
| Users want one-click open-all-tools | D as default design | Avoid; likely tab overload |

This means SEOJump does **not** need to prove its entire base product from scratch. The next uncertainty is specifically how much additional value guided Workflow sequencing adds on top of already-valid context routing.

## Primary references

- https://ahrefs.com/seo/keyword-research
- https://ahrefs.com/blog/keyword-difficulty/
- https://www.semrush.com/blog/how-to-use-semrush-keyword-research/
- https://backlinko.com/templates/marketing/keyword-research
- https://support.google.com/webmasters/answer/7576553
- https://support.google.com/trends/answer/17309543
- https://seo.web.cafe/translate/
- https://seo.web.cafe/ideas/
- https://seo.web.cafe/mine/
- https://seo.web.cafe/kd/
- https://www.reddit.com/r/Agentic_SEO/comments/1w9kcfk/whats_your_seo_workflow_for_finding_and/
- https://www.reddit.com/r/SEO/comments/1kbctrf

