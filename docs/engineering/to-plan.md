## What it does

`to-plan` turns one selected work item into a disposable local implementation plan at `.scratch/<feature>/plans/<work-item>-plan.md` that another agent in the same workspace can execute and resume.

It plans exactly one work item and stops before implementation. Each plan belongs to exactly one repository: a work item that changes several repositories gets one plan per repository, written together and approved together. It does not replace the feature-level spec or split work across tickets; [to-spec](https://aihero.dev/skills-to-spec) and [to-tickets](https://aihero.dev/skills-to-tickets) retain those responsibilities.

It never publishes the plan to GitHub or another issue tracker. An issue may be an input source, but the plan output is always local.

## When to reach for it

You invoke this by typing `/to-plan` yourself, and the agent won't reach for it on its own.

Reach for it after selecting one frontier ticket from [to-tickets](https://aihero.dev/skills-to-tickets), once per ticket when you want the whole spec run by [implement-spec](https://aihero.dev/skills-implement-spec), or whenever one small work item is understood but still needs implementation detail before code changes. If requirements are not settled, use [to-spec](https://aihero.dev/skills-to-spec); if the work still needs slicing, use `to-tickets` first.

## Prerequisites

Run it inside the worktree that has the branch you will implement on checked out. The skill writes, inside that worktree (a linked worktree, not the main one, when you are in one), `.scratch/<feature>/plans/<work-item>-plan.md` and ensures `.scratch` is ignored through the repository-local `.git/info/exclude`, so the plan remains available to agents sharing that workspace without entering version control.

## One work item, one resumable plan

The implementation plan is the seam between deciding how to build and executing the build. It pins the workspace, branch, review fixed point, constraints, pre-agreed test seams, exact files, verification commands, independently green tasks, evidence, blockers, and `Resume Here` pointer.

Every plan also names its target `Repository`. A plan for a repository other than the one you planned in is written unbound, with no workspace or branch yet, because [implement](https://aihero.dev/skills-implement) will dispatch it into a worktree of that repository and the session there binds it. For such a target, `to-plan` checks only that the path is a git main checkout; the session inside that repository challenges the rest under its own rules.

The plan owns **how** one work item will be implemented. A workspace-readable spec or ticket continues to own **what** must be delivered. When the source exists only in conversation, `to-plan` captures the agreed contract so a later agent does not need hidden context.

That contract is written by an agent that has seen the whole conversation, so a missing decision reads as present to it. For a conversation source, `to-plan` therefore runs the same omission check as [to-spec](https://aihero.dev/skills-to-spec): it maps every settled decision to the contract and adds the missing ones, and a [subagent](https://www.aihero.dev/ai-coding-dictionary/subagent) given the plan but not the conversation lists what it would need to ask before implementing. Only a question that would change scope, behavior, architecture, or a test seam reaches you, and its answer goes into the contract and any task it affects. When the source is a spec or ticket, the plan points at it instead, and the check does not run.

## Common questions

**Does this replace `to-spec` or `to-tickets`?**

No. Those skills own feature decisions and tracer-bullet decomposition. `to-plan` owns the implementation detail for one selected work item only.

**My change spans two repositories. Do I run it twice?**

No. One invocation writes a plan per repository into the `.scratch/` of the worktree you planned in, with any ordering between them in each plan's constraints. You approve them together, then run `/implement` on each; a plan for the other repository is dispatched there instead of executed beside you.

**Why is the plan under `.scratch/` instead of committed?**

It is a disposable coordination artifact tied to one workspace, branch, and review fixed point. The durable requirements stay in the spec or ticket; the local plan carries execution state another agent in that workspace can resume.

**Can it start implementation after I approve the plan?**

Not in the same invocation. The stop is the phase boundary: review the plan first, then invoke [implement](https://aihero.dev/skills-implement) separately against its path, or, once every ticket of a spec has an approved plan, [implement-spec](https://aihero.dev/skills-implement-spec).

**What happens if the codebase changes before execution?**

`implement`, and each `implement-spec` implementer, revalidates the plan's paths, assumptions, branch, fixed point, and test seams before editing. A material stale assumption blocks execution and comes back to you instead of being silently redesigned.

## It's working if

- The plan covers one work item only, and each plan names exactly one repository.
- Every behavior task has an agreed test seam.
- When you planned from the conversation, it tells you how many decisions its omission check added to the contract.
- Another agent can start from `Resume Here`.
- No product code changes during planning.
- The plan stays outside Git.

## Where it fits

`to-plan` is the per-work-item planning step in the main chain:

```txt
grill-with-docs → to-spec → to-tickets → to-plan → implement → code-review → retro
```

Its upstream neighbour is [to-tickets](https://aihero.dev/skills-to-tickets), which owns tracer-bullet tickets and blocking edges. Its downstream neighbour is [implement](https://aihero.dev/skills-implement), which executes the approved plan while recording progress and evidence; [implement-spec](https://aihero.dev/skills-implement-spec) executes every approved plan for a spec in parallel. When you're unsure which skill or flow fits, [ask-matt](https://aihero.dev/skills-ask-matt) routes you.
