# Keyword Research Workflow — Product Gate Experiment

Status: READY TO RUN

## Goal

Determine whether an ordered SEOJump Keyword Research Workflow creates meaningful value beyond the current direct-template toolbar/context-menu experience.

This experiment is about product utility, not whether keyword research itself is a valid SEO process. The methodology gate has already passed.

## Hypotheses

### H1 — sequencing value

Users benefit from being told the next research stage/action instead of remembering which tool to open next.

### H2 — state value

Keeping lightweight decisions such as intent, page type, feasibility and keep/reject reduces repeated mental work.

### H3 — batch value

Opening 2-3 relevant actions for a stage can save time, but opening the full workflow at once creates tab overload.

### H4 — Guide conversion value

A methodology Guide can naturally hand off to SEOJump for execution without feeling like unrelated extension promotion.

## Baseline

Use the current extension only:

- select keyword;
- toolbar/category/dropdown;
- open individual destination;
- `Ctrl` background-open where useful;
- no workflow-specific UI/state.

## Test cases

Run at least these four patterns:

1. **New-site / tool intent:** `square foot calculator`
2. **Commercial tool intent:** `free backlink checker`
3. **Informational Guide intent:** `how to use google trends for seo`
4. **Existing-site quick win:** choose a real site/query from GSC when access is available; do not fabricate this case.

Additional cases may be added if they expose a materially different research path.

## Canonical stages used in the test

1. Demand / Seed
2. Expand
3. Trend + volume sanity check
4. Intent + live SERP
5. Winnability / competition
6. Business relevance
7. Cluster + page mapping
8. Priority / action decision

## Metrics

For each case record:

```text
total elapsed time
number of destination launches
number of foreground tab switches
number of background launches
number of repeated keyword/context entries
number of times user has to remember "what next"
number of tools opened but not useful
number of decisions that must be carried mentally
final decision confidence (low/medium/high)
```

Do not optimize only for raw seconds. A Workflow that is 20 seconds faster but creates more cognitive noise is not necessarily better.

## Baseline success/failure observations

During each run explicitly note:

- where current SEOJump already feels sufficient;
- where Ctrl/background open already solves the problem;
- where the keyword context is lost between tabs;
- where the user must return to the source page and reselect/reorient;
- where a stage can be skipped because the SERP already answered the question;
- where a decision should stop the workflow early.

## Prototype concepts to compare later

Do not build all of these. The baseline run should identify which one is worth prototyping.

### A. Step mode

One stage at a time with 1-3 recommended actions and a simple Next/Skip.

### B. Stage batch mode

Open only the useful destinations for one stage in background tabs.

### C. Persistent research card

Keep keyword + lightweight decisions:

```text
keyword
intent
page type
demand status
winnability
keep/reject
notes
```

### D. Guide handoff

Website Guide explains the process; relevant steps expose `Run in SEOJump`. If a full official Workflow later passes validation, the Guide may expose `Add Workflow to SEOJump`.

## Decision thresholds

### PASS — build a minimal Workflow V1

Proceed only if testing shows at least two of the following repeatedly across cases:

- materially fewer context/reorientation actions;
- fewer foreground tab switches;
- clear reduction in "what next" cognitive load;
- useful retained decision state;
- stage batching is consistently useful without tab overload;
- Guide -> SEOJump handoff feels like part of the task rather than promotion.

### HOLD — improve direct templates instead

If most friction is solved by current templates, better category/order/default actions may deliver more value than a new Workflow model.

### REJECT — no Workflow feature

Reject if a staged UI adds ceremony, users naturally know their preferred tools, or most research occurs inside one integrated suite.

## Human involvement

AI should run the experiment through browser automation where possible and produce logs/screenshots. Human review is only required for:

- confirming that observed interaction feels representative rather than automation-specific;
- third-party account/CAPTCHA steps automation cannot access;
- final product trade-off when evidence remains ambiguous.

## Current execution note

The available CDP browser did not expose the SEOJump content toolbar on the test page, and a temporary headless Chrome loaded the extension service worker but did not inject the toolbar content script. Therefore no timed interaction result is claimed yet. Code inspection and desk execution are recorded separately in the Evidence Report; the real UI timing test remains open rather than being simulated.

