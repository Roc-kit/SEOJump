# SEOJump Growth System

This directory stores the durable operating system for SEOJump growth. It covers both the Chrome extension and `SEOJumpSite`.

## Files

- `PLAYBOOK.md` — stable principles, gates, AI/human boundaries and cadence.
- `opportunities.json` — current machine-readable opportunity queue.
- `evidence/` — dated evidence reports. Evidence may upgrade or reject an opportunity.
- `reports/` — future daily/weekly execution reports.
- `templates/` — reusable research/output formats.

## State flow

```text
INBOX
-> RESEARCHING
-> PROMISING | VALIDATED | HOLD | REJECTED
-> PLANNED
-> BUILDING
-> PUBLISHED
-> MEASURING
-> ITERATING
```

`PROMISING` is not permission to build. Product development normally starts only after `VALIDATED`, unless a tiny reversible experiment is explicitly justified as the cheapest way to obtain missing evidence.

## Repositories

- Extension: `/home/cislunar/App/SEOJump/SEOJump`
- Website: `/home/cislunar/App/SEOJump/SEOJumpSite`

Growth research belongs here so product decisions are not silently driven by either repository's implementation details.

