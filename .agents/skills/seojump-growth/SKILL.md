---
name: seojump-growth
description: Run SEOJump's evidence-first growth system. Use for daily/weekly demand research, opportunity validation, Tool Radar, product/content/distribution prioritization, and evidence reports for SEOJump. Do not assume a Workflow or article should be built before passing the evidence gate.
---

# SEOJump Growth Skill

## Required context

Before acting, read:

1. `growth/PLAYBOOK.md`
2. `growth/opportunities.json`
3. the newest relevant file under `growth/evidence/`

SEOJump extension is in this repository. The website is the sibling repository `../SEOJumpSite`.

Current first target user: **SEO beginners**.

## Operating rule

Evidence before build.

Never turn an interesting keyword, product, Reddit post, or easy implementation into a feature/article automatically.

The goal is to find the highest-value real user problem where SEOJump can reduce Context -> Action friction.

Near-term research priority is **Beginner Journey Research**: how beginners actually move among AI assistants, Google, tutorials, communities and SEO tools; where they become unsure about the next step; and where SEOJump can guide them without owning third-party data.

## Daily run

### 1. Radar

Research fresh signals from several independent source types where available:

- search/SERP,
- Reddit and practitioner communities,
- Chrome Web Store and competing extensions,
- Product Hunt / new SEO and GEO tools,
- GitHub/tool ecosystems,
- current SEO expert/vendor guidance,
- SEOJump's own GSC/site/product signals when available.

Do not rely on one vendor's content as proof of demand.

### 2. Normalize demand

Merge similar wording into one user intent. Record the underlying job, not merely keywords.

Example:

```text
free backlink checker
check backlinks without ahrefs
how to see competitor backlinks free
```

may share some intent, but do not merge if SERP/task evidence shows different jobs.

### 3. Evidence test

For each material opportunity, answer the seven questions in `growth/PLAYBOOK.md`.

Assign A/B/C/D evidence grade and update status.

### 4. Product fit

Identify:

- context: selectedText/currentUrl/currentDomain;
- repeated manual actions;
- existing SEOJump templates;
- missing product capability;
- whether SEOJump removes meaningful steps;
- privacy/API/account constraints.

### 5. Decide asset type

Choose Template / Workflow / Guide / Workflow+Guide / landing/tool page / product feature / distribution / none.

For an official Workflow, require a Guide/methodology companion unless the workflow is self-evident and trivial.

For any proposed Workflow, validate two separate claims:

1. the task has a credible repeatable methodology;
2. SEOJump's packaging is materially better than the current direct-template experience.

Do not treat a validated methodology as proof that a Workflow UI should exist. Avoid default designs that simply open many tabs at once; explicitly test for tab overload and cognitive cost.

For Workflow V1, use the product model:

```text
Guide -> Open -> Observe -> Done -> Next
```

SEOJump may explain the step, open the right tool, track progress and return to the tab opened for a previous step. Do not require scraping or parsing third-party pages.

Keep extension surfaces separate:

- existing toolbar / Quick Jump: keep the current fast Context -> Action interaction;
- Side Panel: workflow-centric UI for steps, explanations, Tool actions and progress.

Website/extension product loop:

```text
Website = Discover / Learn / Configure
Extension = Execute
Guide -> Workflow -> Tools
```

### 6. Tool Radar

Record notable new tools even when they do not justify immediate templates. Check actual action/deep-link compatibility before recommending ADD.

### 7. Update queues

Update `growth/opportunities.json` conservatively. Do not upgrade to VALIDATED without evidence.

Create or update a dated Evidence Report for substantial findings.

### 8. Human Required

Escalate only actions that truly require human identity, subjective approval, protected account access, trustworthy screenshot/video verification, or privacy/product-policy approval.

Everything else should be completed by AI when tools permit.

## Weekly run

Summarize:

- strongest new evidence,
- opportunities upgraded/downgraded/rejected,
- product backlog implications,
- content implications,
- Tool Radar changes,
- distribution results,
- available GSC/site/product results,
- what to stop doing,
- top three next priorities.

Write the report under `growth/reports/`.

## Guardrails

- Do not optimize for output count.
- Do not treat low SEO difficulty as proof of demand.
- Do not confuse a popular tool with a useful SEOJump integration.
- Do not let "free" define product scope; it is an acquisition/theme dimension.
- Do not recommend telemetry that captures selected text, visited URLs/domains, browsing history or page content for growth analytics.
- Do not develop Workflow/Add-to-SEOJump merely because the prior conversation proposed it; validate it first.
- Do not count "bulk open several tools" as Workflow value unless testing shows it is better than current Ctrl/background-tab usage.
- Do not make third-party DOM scraping, automated KD/Volume/DR extraction, public-tool bot automation, screenshots/Notes, AI Agent behavior, MCP/API execution or a complex Workflow Engine part of Workflow V1.
- Treat AI SEO Agents, MCP and API orchestration as long-term Tool/Market Radar unless new user evidence justifies changing the roadmap.
