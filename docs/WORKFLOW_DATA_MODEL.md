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
            └── ToolReference
                └── toolId
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
          "toolId": "example-tool"
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
- `tools`: one or more Tool references. Their array order is the button/display order inside the Step.

### ToolReference

- `toolId`: stable reference to a Tool already available in SEOJump.
- Do not copy Tool name, URL, favicon, category, selector, or other Tool implementation fields into a Workflow.
- Replacing a Tool means replacing `toolId`; the Step itself does not need to change.

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
Add Tool          -> add ToolReference
Remove Tool       -> remove ToolReference
Replace Tool      -> replace toolId
Reorder Tools     -> reorder tools[]
```

No separate node graph, transition table, condition language, executor type, or state machine is needed for V1.

## Runtime state is separate

Workflow definition and Workflow session state must not be mixed.

The definition above describes what the Workflow **is**. The Side Panel stores session state separately under `workflowSessions`:

```text
workflowSessions[workflowId]
├── context
│   ├── selectedText
│   ├── currentUrl
│   ├── currentDomain
│   └── title
├── currentStepId
├── completedStepIds[]
└── stepTabs
    └── stepId
        └── toolId -> tabId
```

`stepTabs` is keyed by both Step and Tool because one Step may expose more than one Tool button. If the recorded tab still exists, the Side Panel focuses it instead of opening a duplicate. If it has been closed, the Tool can be opened again from the original Workflow context.

The session remains local and contains no scraped third-party page data, screenshots, notes, or SEO metrics.

## Tool ID prerequisite

Current SEOJump Tool objects do not yet have stable IDs; they are effectively identified by mutable names/URLs and array positions.

Workflows must **not** reference a Tool by:

- category index;
- tool index;
- display name;
- URL template.

Before a Workflow is executed in the extension, Tools need a stable `id` field so `ToolReference.toolId` remains valid after rename, reorder, URL edits, or category moves.

Step 3 only fixes this contract. It intentionally does not perform a bulk Tool-ID migration or change existing toolbar behavior.

## Explicitly deferred

- Official Starter Workflow contents and names;
- Workflow import/install from the website;
- Tool ID migration/generation implementation;
- Guide URLs or screenshots;
- Notes and structured research fields;
- DOM/data extraction from third-party pages;
- AI/MCP/API executors;
- branching, conditions, loops, variables, retries, scheduling, or a general Workflow Engine.

