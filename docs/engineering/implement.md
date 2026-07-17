Quickstart:

```bash
npx skills add mattpocock/skills --skill=implement
```

```bash
npx skills update implement
```

[Source](https://github.com/mattpocock/skills/tree/main/skills/engineering/implement)

## What it does

`implement` executes one approved local implementation plan task by task. It drives each behavior change through test-driven development, commits independently green tasks, and leaves progress evidence another agent in the same workspace can resume.

It does not decide what to build or silently redesign a stale plan. Material deviations and every unresolved review finding stop execution and return the decision to you.

## When to reach for it

You invoke this by typing `/implement` — the agent won't reach for it on its own.

Reach for it after [to-plan](https://aihero.dev/skills-to-plan) has written an approved plan for one work item. If you only have a feature-level spec, use [to-tickets](https://aihero.dev/skills-to-tickets) to produce tracer-bullet issues, then plan the selected frontier issue before implementation.

## The resumable plan

The local plan document is the seam between planning and execution. It records the review fixed point, tasks, test seams, evidence, commits, deviations, blockers, final verification, and the next concrete action under `Resume Here`.

`implement` protects that seam while it works. It refuses pre-staged changes, stages only the current green task, never commits the locally ignored plan, and checkpoints an interruption before yielding. Non-material deviations continue only after their equivalence is verified and recorded; changes to scope, behavior, architecture responsibility, or test seams stop for approval.

## It's working if

- Every behavior change enters red first.
- Every completed task has evidence and a commit.
- Another agent can resume at `Resume Here`.
- Review findings block completion.
- `.scratch` never enters Git.

## Where it fits

`implement` is the execution step near the end of the main chain:

```txt
grill-with-docs → to-spec → to-tickets → to-plan → implement → code-review
```

Its upstream neighbour is [to-plan](https://aihero.dev/skills-to-plan), which owns implementation detail for one frontier issue. Its internal disciplines are [tdd](https://aihero.dev/skills-tdd), which supplies the red-green loop at pre-agreed seams, and [code-review](https://aihero.dev/skills-code-review), which gates completion against the plan's fixed point. When you're unsure which skill or flow fits, [ask-matt](https://aihero.dev/skills-ask-matt) routes you.
