## What it does

`implement` executes one approved local implementation plan task by task. It drives each behavior change through test-driven development, commits independently green tasks, and leaves progress evidence another agent in the same workspace can resume.

It does not decide what to build or silently redesign a stale plan. Material deviations and every unresolved review finding stop execution and return the decision to you.

## When to reach for it

You invoke this by typing `/implement` — the agent won't reach for it on its own. It ships with `disable-model-invocation: true`, so no other skill can call it either. When [ask-matt](https://aihero.dev/skills-ask-matt) or [to-tickets](https://aihero.dev/skills-to-tickets) routes a ticket toward implementation, you first approve its local plan and then invoke `/implement` explicitly against that plan.

Reach for it after [to-plan](https://aihero.dev/skills-to-plan) has written an approved plan for one work item. If you only have a feature-level spec, use [to-tickets](https://aihero.dev/skills-to-tickets) to produce tracer-bullet tickets, then plan the selected frontier ticket before implementation.
Where the work currently lives decides the step before it:

| The work is… | Reach for |
| --- | --- |
| An approved local plan | `/implement <plan-path>` |
| A ticket, spec, or settled conversation with no local plan | [to-plan](https://aihero.dev/skills-to-plan) first |
| A feature-level spec whose build spans sessions | [to-tickets](https://aihero.dev/skills-to-tickets), then `/to-plan` for one frontier ticket |
| Not written down anywhere yet | [grill-with-docs](https://aihero.dev/skills-grill-with-docs), or [grill-me](https://aihero.dev/skills-grill-me) if there's no codebase |
| One concrete behaviour you want test-first, with no spec | [tdd](https://aihero.dev/skills-tdd) directly |
| Already built, and you want it checked | [code-review](https://aihero.dev/skills-code-review) directly |

## Prerequisites

The approved plan must live under the repository's locally ignored `.scratch/` directory and identify the workspace, branch, review fixed point, tasks, and test seams. `implement` commits to the branch named by that plan; it does not create or switch branches for you.

The Git index must be empty before execution begins. Pre-existing staged changes are a hard stop because each completed task stages and commits only its own green diff.

## What one run does

A run follows the approved plan in order:

1. Validate the plan against the current workspace and resume pointer.
2. Drive [tdd](https://aihero.dev/skills-tdd) at each pre-agreed seam.
3. Verify and commit each independently green task, recording its evidence and commit SHA in the plan.
4. Run the plan's final verification.
5. Run [code-review](https://aihero.dev/skills-code-review) against the recorded fixed point and complete only when it reports no findings.

One run covers one plan. If the source came from [to-tickets](https://aihero.dev/skills-to-tickets), that means one frontier ticket per fresh [context window](https://www.aihero.dev/ai-coding-dictionary/context-window).

## The resumable plan

The local plan document is the seam between planning and execution. It records the review fixed point, tasks, test seams, evidence, commits, deviations, blockers, final verification, and the next concrete action under `Resume Here`.

`implement` protects that seam while it works. It refuses pre-staged changes, stages only the current green task, never commits the locally ignored plan, and checkpoints an interruption before yielding. Non-material deviations continue only after their equivalence is verified and recorded; changes to scope, behavior, architecture responsibility, or test seams stop for approval.

## Common questions

**It stopped instead of adapting the plan. Is that expected?**

Yes when the deviation changes scope, externally observable behaviour, a public contract, architecture responsibility, a test seam, or the task breakdown. Equivalent path, symbol, and command changes can continue only after their equivalence is verified and recorded. Material changes return to you because `/to-plan`, not `/implement`, owns implementation design.

**Can I run several plans in parallel in one checkout?**

No. Each run uses the same working directory, index, and `HEAD`, and commits after every green task. Use isolated worktrees if you intentionally coordinate parallel runs, and keep each plan bound to its own workspace and branch.

**Can it open a pull request or push when it finishes?**

No. The skill explicitly stops after local completion. It does not push, create a pull request, or remove the completed plan unless you ask separately.

**Will `code-review` see the changes?**

Yes. Every green task is committed before the final review, and the plan records the fixed point that `code-review` diffs against. This avoids the upstream workflow's known failure mode where review ran before the uncommitted changes were visible.

**Does completing the plan close the originating ticket?**

No. Completion updates the local plan and commits the implementation; tracker state remains a separate operation.

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

Its upstream neighbour is [to-plan](https://aihero.dev/skills-to-plan), which owns implementation detail for one frontier ticket. Its internal disciplines are [tdd](https://aihero.dev/skills-tdd), which supplies the red-green loop at pre-agreed seams, and [code-review](https://aihero.dev/skills-code-review), which gates completion against the plan's fixed point. When you're unsure which skill or flow fits, [ask-matt](https://aihero.dev/skills-ask-matt) routes you.
