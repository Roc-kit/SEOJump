# SEOJump Workflow V1 — Minimal Data Model

Date: 2026-09-13

## Scope

This document defines only the minimum persistent structure required by the first Guided Workflow prototype.

It does **not** define a Workflow Engine, Side Panel UI, third-party page scraping, Notes, screenshots, AI Agent behavior, MCP/API execution, or official launch workflows.

The current product split remains:

```text
Toolbar / Quick Jump
= existing Context -> Action experience

Side Panel
= Guided Workflow experience
```

## Model

```text
Workflow
├── id
├── title
├── description
└── steps[]
    └── Step
        ├── id
        ├── title
        ├── description
        ├── order
        └── tools[]
            └── WorkflowTool
                ├── id
                ├── name
                └── url
```

Minimal JSON shape:

```json
{
  "id": "example-workflow",
  "title": "Example Workflow",
  "description": "A neutral example used only to document the schema.",
  "steps": [
    {
      "id": "example-step",
      "title": "Inspect the result",
      "description": "Open the selected tool and inspect the information relevant to this step.",
      "order": 10,
      "tools": [
        {
          "id": "workflow-tool:example",
          "name": "Google Search",
          "url": "https://www.google.com/search?q=%selectedText%"
        }
      ]
    }
  ]
}
```

## Field rules

### Workflow

- `id`: stable local identifier. It must not depend on the display title.
- `title`: user-visible name.
- `description`: short user-visible explanation. May be an empty string.
- `steps`: ordered collection of Step objects.

### Step

- `id`: stable identifier inside the Workflow. It must not depend on the display title.
- `title`: short step label.
- `description`: tells the user why the step exists and/or what to observe after opening a Tool.
- `order`: integer used for explicit user-controlled ordering. Gaps such as `10, 20, 30` are allowed.
- `tools`: zero or more Workflow Tool copies. Their array order is the button/display order inside the Step.

### WorkflowTool

- `id`: internal identifier used only inside Workflow runtime state and tab tracking.
- `name`: user-visible Tool name stored in the Workflow itself.
- `url`: URL template stored in the Workflow itself. It may use `%selectedText%`, `%currentUrl%`, and `%currentDomain%`.
- Search Tools and Workflow Tools are deliberately independent. Importing from Search Tools copies `name + url`; later edits on either side do not synchronize.
- A Workflow may also contain a custom Tool that never appears in Search Tools, the selection toolbar, or the right-click Tool menu.

## Customization requirements

The model must support the following operations without changing its shape:

```text
Create Workflow   -> add Workflow object
Rename Workflow   -> change title
Delete Workflow   -> remove Workflow object
Add Step          -> add Step object
Delete Step       -> remove Step object
Reorder Step      -> change order
Edit guidance     -> change title / description
Add Tool          -> copy from Search Tools or create WorkflowTool
Edit Tool         -> edit WorkflowTool name / url
Remove Tool       -> remove WorkflowTool
Reorder Tools     -> reorder tools[]
```

No separate node graph, transition table, condition language, executor type, or state machine is needed for V1.

## Runtime state is separate

Workflow definition and Workflow session state must not be mixed.

The definition above describes what the Workflow **is**. The Side Panel stores session state separately under `workflowSessions`:

```text
workflowSessions[workflowId]
├── runId
├── context
│   ├── selectedText
│   ├── currentUrl
│   ├── currentDomain
│   ├── sourceTabId
│   └── title
├── currentStepId
├── completedStepIds[]
├── stepOpenedTools
│   └── stepId -> toolId[]
└── stepTabs
    └── stepId
        └── toolId -> tabId
```

`runId` identifies one concrete Workflow run. Starting a Workflow again from a source page creates a new `runId` and freezes a new Context snapshot. The Workflow definition is reused; progress from the previous run is not treated as the new run's progress.

All Tool placeholders during that run resolve from this frozen snapshot. Opening Google, Ahrefs, Semrush, or another Tool must not replace the run Context with the newly active Tool tab.

`stepTabs` is keyed by both Step and Tool because one Step may expose more than one Tool button. If the recorded tab still exists, the Side Panel focuses it instead of opening a duplicate. If it has been closed, the Tool can be opened again from the original Workflow context.

`stepOpenedTools` records only whether each Tool was manually opened in the current run. When every Tool referenced by a Step has been opened at least once, the Step is automatically marked complete and the next Step becomes current. V1 does not attempt to inspect third-party page content to decide whether research was actually completed.

The session remains local and contains no scraped third-party page data, screenshots, notes, or SEO metrics.

## Launch context

Workflow Context is captured when the user starts the Workflow, not by following whichever Tool tab happens to be active later.

V1 launch paths are:

```text
Selected text -> right-click -> SEOJump -> Open Workflow Panel
Extension popup -> Open Workflow Panel
Chrome command -> Open Workflow Panel
```

The right-click path uses Chrome's `selectionText` plus the source tab URL. Popup and command launches use the live selection when available and can fall back to the most recently cached selection from the same source tab/page. The Chrome command is intentionally left without a default key so the user can assign one in `chrome://extensions/shortcuts` without SEOJump taking over another common shortcut.

## Search Tools are not a dependency

Search Tools are the user's Quick Jump configuration. Workflows are self-contained task templates. A Workflow can import a Search Tool as a convenience, but import is a copy operation rather than a reference.

```text
Search Tools                       Workflow
Google + URL  ── import/copy ──>  Google + URL

later edit Search Tools URL       no automatic change
later edit Workflow URL           no automatic change
```

This keeps Workflow installation from polluting the Quick Jump toolbar and prevents a later toolbar edit from silently changing a previously tested Workflow.

Existing V1 `toolId` references are migrated to embedded Workflow Tools when the Options page can resolve the old Tool from Search Tools. The Side Panel retains a small legacy lookup fallback only so an older stored Workflow can still run before that migration occurs.

## Explicitly deferred

- Official Starter Workflow contents and names;
- Workflow import/install from the website;
- Guide URLs or screenshots;
- Notes and structured research fields;
- DOM/data extraction from third-party pages;
- AI/MCP/API executors;
- branching, conditions, loops, variables, retries, scheduling, or a general Workflow Engine.

