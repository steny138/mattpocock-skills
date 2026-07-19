Quickstart:

```bash
npx skills add mattpocock/skills --skill=to-plan
```

```bash
npx skills update to-plan
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-plan)

## What it does

`to-plan` turns one selected work item into a disposable local implementation plan that another agent in the same workspace can execute and resume.

It plans exactly one work item and stops before implementation. It does not replace the feature-level spec or split work across Issues; [to-spec](https://aihero.dev/skills-to-spec) and [to-tickets](https://aihero.dev/skills-to-tickets) retain those responsibilities.

## When to reach for it

You invoke this by typing `/to-plan` — the agent won't reach for it on its own.

Reach for it after selecting one frontier Issue from [to-tickets](https://aihero.dev/skills-to-tickets), or whenever one small work item is understood but still needs implementation detail before code changes. If requirements are not settled, use [to-spec](https://aihero.dev/skills-to-spec); if the work still needs slicing, use `to-tickets` first.

## Prerequisites

Run it inside the repository or worktree where implementation will happen. The skill writes `.scratch/<feature>/plans/<work-item>-plan.md` and ensures `.scratch` is ignored through the repository-local `.git/info/exclude`, so the plan remains available to agents sharing that workspace without entering version control.

## One work item, one resumable plan

The implementation plan is the seam between deciding how to build and executing the build. It pins the workspace, branch, review fixed point, constraints, pre-agreed test seams, exact files, verification commands, independently green tasks, evidence, blockers, and `Resume Here` pointer.

The plan owns **how** one work item will be implemented. A workspace-readable spec or Issue continues to own **what** must be delivered. When the source exists only in conversation, `to-plan` captures the agreed contract so a later agent does not need hidden context.

## It's working if

- The plan covers one work item only.
- Every behavior task has an agreed test seam.
- Another agent can start from `Resume Here`.
- No product code changes during planning.
- The plan stays outside Git.

## Where it fits

`to-plan` is the per-work-item planning step in the main chain:

```txt
grill-with-docs → to-spec → to-tickets → to-plan → implement → code-review
```

Its upstream neighbour is [to-tickets](https://aihero.dev/skills-to-tickets), which owns tracer-bullet Issues and blocking edges. Its downstream neighbour is [implement](https://aihero.dev/skills-implement), which executes the approved plan while recording progress and evidence. When you're unsure which skill or flow fits, [ask-matt](https://aihero.dev/skills-ask-matt) routes you.
