# SEOJump Growth Playbook

## 1. Purpose

SEOJump does not replace SEO tools. It makes SEO tools faster to use.

Core product model:

```text
Context -> Action

Context:
- selected text / keyword
- current URL
- current domain

Action:
- search
- analyze
- research
- compare
- inspect
- validate
- archive
```

Product promise: **Select once. Research everywhere.**

Free tools are an important acquisition angle, not the product boundary. Paid tools are equally valid when SEOJump can pass useful context into them. The user's subscription status is outside SEOJump's responsibility.

Current first target user: **SEO beginners**. Near-term research and product decisions should optimize for beginners who do not know the next step, the right tool, or what to look for after opening it. Do not broaden the current roadmap to advanced SEO teams or agent power users without new evidence.

## 2. Growth principle

Do not start from "what should we write?" or "what feature would be cool?".

Start from observed demand:

```text
Signal
-> Demand
-> Evidence
-> Opportunity
-> Best asset type
-> Product/content/distribution work
-> Measurement
-> Next evidence
```

The first user of this growth system is SEOJump itself.

Near-term market research priority: **Beginner Journey Research** — observe how beginners actually move among AI assistants, Google, tutorials, communities and SEO tools, and identify where guidance or Context -> Action routing removes meaningful friction.

## 3. Evidence before build

Every new Workflow, Guide, major Template cluster, or product feature must answer:

1. Who has this problem?
2. What independent evidence shows that people actually have it?
3. How often does the task occur?
4. How do users solve it today?
5. What friction remains in the current solution?
6. Can SEOJump materially reduce that friction?
7. Is the reachable audience large enough to justify the work?

Low competition alone is not evidence of opportunity. It can also mean low demand.

### Evidence grades

- **A — Validated:** repeated direct user signals from multiple independent sources plus a credible audience/market proxy. Safe to enter product/content planning.
- **B — Promising:** multiple useful signals exist, but search demand, workflow frequency, or conversion fit still needs validation.
- **C — Hypothesis:** plausible product fit but weak or narrow external evidence. Do not build yet.
- **D — Rejected:** insufficient demand, tiny reachable audience, poor product fit, or SEOJump saves negligible effort.

No C/D opportunity may enter development merely because implementation is easy.

## 4. Opportunity test

Judge opportunities on five dimensions. Scores guide research; they do not replace evidence.

| Dimension | Question | Weight |
| --- | --- | ---: |
| Real demand | Are real users repeatedly asking/doing this? | 30 |
| Frequency | Is this a recurring SEO task rather than a one-off? | 20 |
| Audience | Is the reachable user group meaningfully large? | 20 |
| SEOJump leverage | Does Context -> Action remove real friction? | 20 |
| Distribution fit | Can we reach these users through search/community/tool ecosystems? | 10 |

Hard gates:

- A Workflow must solve a credible repeatable task and make the next action clearer than using isolated Templates alone. Do not use action count as the main value test.
- A Guide must explain a real task and be paired with reproducible evidence: screenshots, short recordings when useful, and an actual workflow/template where appropriate.
- A new tool/template needs a stable useful destination and a meaningful way to pass `%selectedText%`, `%currentUrl%`, `%currentDomain%`, or another explicitly supported context.
- Popularity alone is not enough. A trendy tool with no useful deep-link/action fit stays in Tool Radar.

## 5. Asset decision

An opportunity does not automatically become an article.

Choose the smallest asset that satisfies the intent:

- **Template** — one repeatable action.
- **Workflow** — several actions form a repeatable task.
- **Guide** — the user needs to learn why/how to perform a task.
- **Workflow + Guide** — preferred for standard SEO processes. The Guide explains; the Workflow executes.
- **Landing/tool page** — the user wants to complete a task rather than read.
- **Product feature** — the main friction is inside SEOJump itself.
- **Distribution-only action** — the product already solves the need; the gap is awareness.

Website and extension should form one loop:

```text
Website = Discover / Learn / Configure
Extension = Execute

Guide -> Workflow -> Tools
```

The long-term content structure should prefer `/guides/` and `/workflows/` over expanding the old generic `/articles/` direction.

## 6. Workflow rule

Official SEOJump Workflows must not be invented from our preferences.

Build them from:

1. current practitioner workflows,
2. reputable SEO methodology,
3. direct community evidence,
4. SEOJump's actual ability to shorten execution.

Every official Workflow should have a corresponding Guide or concise methodology page that explains:

- intended user and skill level,
- task outcome,
- why each step exists,
- which steps are judgment vs mechanical execution,
- screenshots/video where visual instruction materially helps,
- tool alternatives,
- how SEOJump accelerates the repeatable parts.

### Two validation gates for a Workflow

Do not treat "this task has a standard workflow" and "users want SEOJump to package that workflow" as the same claim.

An official Workflow must pass both gates:

1. **Methodology gate** — the task sequence is supported by multiple credible practitioner/expert sources and has a stable shared core.
2. **Product gate** — there is evidence that SEOJump's packaging materially reduces repeated browser friction compared with the user's current process.

A task can pass the methodology gate while the product gate remains unvalidated. In that case, a Guide/checklist may be justified before a full Workflow product feature.

For browser workflows, explicitly test for **tab explosion**. More automation is not automatically more efficient. Prefer the smallest number of actions needed for the current decision stage.

### Workflow V1 interaction model

V1 is a guided browser workflow, not an automation engine:

```text
Guide
-> Open
-> Observe
-> Done
-> Next
```

Each Step may contain a title, short explanation and one or more Tool references. SEOJump tells the user why the step exists, what to look for, opens the right external tool, remembers progress and can return to a still-open tab. The third-party page remains the source of truth for its own data.

Do not make third-party page scraping, DOM parsing, screenshots, Notes, API/MCP execution, AI reasoning, or a complex Workflow Engine prerequisites for V1.

### Extension surfaces

Keep the two extension surfaces distinct:

```text
Existing toolbar / Quick Jump = fast Context -> Action; keep its current interaction model
Side Panel = Guided Workflow; steps, explanations, Tool actions and progress
```

The Side Panel is workflow-centric. It does not replace the existing toolbar, and this split does not require a product rename or a second extension.

## 7. Growth operations AI-first model

AI should perform all work that does not require human identity, subjective brand approval, restricted account access, or trustworthy visual verification.

### AI default responsibilities

- discover signals from search, communities, product directories, Chrome Web Store, GitHub, newsletters and tool ecosystems;
- deduplicate signals into intents;
- collect source evidence;
- inspect SERPs and competing pages;
- maintain Tool Radar;
- score and classify opportunities;
- propose Product / Content / Distribution actions;
- create research briefs and first drafts;
- prepare screenshot/recording shot lists;
- prepare channel-specific distribution drafts;
- measure available website/search/product data;
- write daily and weekly reviews;
- update queues and recommend the next task.

### Human-required only when necessary

- login/permission or CAPTCHA prevents compliant automation;
- a platform requires a real human submission/reply;
- screenshot or video must be checked for factual/visual correctness;
- a public statement carries meaningful brand/reputation risk;
- product strategy remains ambiguous after evidence review;
- privacy-sensitive telemetry or policy changes require approval.

Do not ask for human confirmation for routine research or reversible internal updates.

This section describes how the Growth System itself can use AI to research and maintain evidence. It is **not** a near-term requirement to turn SEOJump into an AI SEO Agent. AI/MCP/API orchestration remains long-term Radar until the beginner browser workflow proves real product value.

## 8. Privacy and product telemetry

Telemetry is not required for V1 of the Growth System.

Prefer existing non-sensitive signals first:

- Search Console queries and pages,
- website visits,
- workflow/template page visits,
- extension-store outbound clicks,
- `Add to SEOJump` clicks when implemented,
- website searches,
- community submissions.

If extension usage telemetry is later introduced:

- it must be user-controlled;
- default should remain conservative unless a future privacy review decides otherwise;
- never collect selected keywords, visited page URLs, current domains, browsing history, or page content for growth analytics;
- prefer local aggregation and upload only coarse event counts such as `tool_used`, `workflow_used`, `workflow_added`, version and locale.

## 9. Tool Radar

Tool discovery is continuous and not limited to Ahrefs/Semrush.

Monitor:

- established SEO platforms,
- browser SEO extensions,
- Search Console / Google ecosystem,
- technical SEO tools,
- competitor intelligence,
- backlink/link research,
- keyword/topic research,
- AI Search / GEO tools,
- new Product Hunt / GitHub / community launches.

AI SEO agents, MCP servers and API-based SEO orchestration belong in this Radar. Track them as market direction; do not promote them into near-term SEOJump architecture merely because the category is growing.

For each candidate record:

```text
Product
Job to be done
Evidence of adoption/interest
Free / paid / freemium (informational only)
Deep-linkability
Supported SEOJump context
Stable action URL?
Overlap with existing templates
Recommendation: ADD / WATCH / REJECT
```

## 10. Daily loop

The daily task is not "publish content". It is "move the highest-evidence growth opportunity forward".

Minimum daily loop:

1. **Radar** — collect new demand and tool signals.
2. **Triage** — merge duplicates and update evidence.
3. **Advance** — move the highest-priority opportunity one meaningful step.
4. **Distribution** — prepare or execute appropriate promotion where a publishable asset exists.
5. **Measure** — inspect available results and anomalies.
6. **Queue** — update next actions and Human Required items.

When no opportunity passes the evidence gate, research more. Do not manufacture output.

## 11. Weekly review

Review:

- new intents found,
- opportunities upgraded/downgraded,
- product changes suggested by demand,
- assets produced,
- distribution actions and results,
- GSC/traffic/conversion changes,
- tool trends,
- work that should stop,
- next week's top 3 priorities.

The weekly review is allowed to recommend **doing less**.

