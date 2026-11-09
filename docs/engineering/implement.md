## What it does

`implement` executes one approved local implementation plan task by task. It drives each behavior change through test-driven development, commits independently green tasks, and leaves progress evidence another agent in the same workspace can resume.

It does not decide what to build or silently redesign a stale plan. Material deviations and every review finding stop execution and return the decision to you.

It also never executes a plan for a different repository from the session you are in. That session loaded only its own repository's `CLAUDE.md`, hooks, and rules, so `implement` dispatches the plan to a worktree of the repository the plan names instead, where those guardrails load.

## When to reach for it

You invoke this by typing `/implement` yourself, and the agent won't reach for it on its own. It ships with `disable-model-invocation: true`, so no other skill can call it either. When [ask-matt](https://aihero.dev/skills-ask-matt) or [to-tickets](https://aihero.dev/skills-to-tickets) routes a ticket toward implementation, you first approve its local plan and then invoke `/implement` explicitly against that plan.

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

`implement` first checks which branch is checked out and in which worktree. The approved plan must name that branch and worktree, and normally lives under that worktree's locally ignored `.scratch/`. A plan in another worktree's `.scratch/` is accepted only when it already names this worktree, as [implement-spec](https://aihero.dev/skills-implement-spec) leaves it. The plan stays where it is; `implement` never moves it. A plan dispatched from another repository arrives unbound, and the session in its new worktree binds it to that worktree, branch, and `HEAD` without asking, unless that branch is the repository's default branch. It must also identify the workspace, branch, review fixed point, tasks, and test seams. `implement` commits to the branch named by that plan; it does not create or switch branches for you.

The Git index must be empty before execution begins. Pre-existing staged changes are a hard stop because each completed task stages and commits only its own green diff.

## What one run does

The plan's `Repository` decides whether the run executes or dispatches:

| The plan targets… | What happens |
| --- | --- |
| The repository you are in (or names none) | The run executes the plan, below |
| Another repository, and you are inside Orca with that repository registered | A new Orca worktree of it starts its own Claude session running `/implement` on the plan, without asking |
| Another repository, outside Orca or not registered in Orca | A git worktree is created beside it at `<repo>.worktrees/<slug>`, and the run stops with the `/implement` command to run there |

Before either kind of dispatch, the run reads the plan for waits: a step that stops for your reply or action, or one that needs a repository or tool outside the plan. A dispatched session meets those alone, in a terminal you may not be watching, so the dispatching session asks you about each one first. It writes your answer into the plan's planning decisions, moves human-only steps under `After Completion`, and records the edit as a deviation. That edit is the only file it changes. The report then tells you the new session will ask any question in its own terminal, and inside Orca will post its status to the worktree's comment.

An executing run follows the approved plan in order:

1. Validate the plan against the current workspace and resume pointer.
2. Drive [tdd](https://aihero.dev/skills-tdd) at each pre-agreed seam.
3. Verify and commit each independently green task, recording its evidence and commit SHA in the plan.
4. Run the plan's final verification.
5. Run [code-review](https://aihero.dev/skills-code-review) once against the recorded fixed point. If it reports findings, you approve a corrective task or a waiver for each; the corrective tasks run, final verification reruns, and the plan completes without a second review.

One run covers one plan. If the source came from [to-tickets](https://aihero.dev/skills-to-tickets), that means one frontier ticket per fresh [context window](https://www.aihero.dev/ai-coding-dictionary/context-window).

## The resumable plan

The local plan document is the seam between planning and execution. It records the review fixed point, tasks, test seams, evidence, commits, deviations, blockers, final verification, and the next concrete action under `Resume Here`.

`implement` protects that seam while it works. It refuses pre-staged changes, stages only the current green task, never commits the locally ignored plan, and checkpoints an interruption before yielding. Non-material deviations continue only after their equivalence is verified and recorded; changes to scope, behavior, architecture responsibility, or test seams stop for approval.

## Common questions

**My plan changes another repository. Why didn't it just make the edits?**

Because the edits would run under the wrong rules. A session only loads the `CLAUDE.md`, hooks, and rules of the repository it started in, so editing a second repository from it silently bypasses that repository's guardrails. Dispatching costs one extra session and buys the right ones. When the change spans repositories, [to-plan](https://aihero.dev/skills-to-plan) writes one plan per repository, and each is dispatched on its own.

**I asked it to dispatch a plan, but it asked me questions first. Why?**

The plan still had a wait: a decision left for execution, a step only you can do, or data from a repository outside the plan. Dispatched, that session would stop mid-run and ask you in a terminal you are not watching. Answering here, while you are in front of it, lets the dispatched session run without stopping.

**It refused to bind a dispatched plan on `main`. Why?**

Binding there would commit every task straight onto the default branch. Switch to a feature branch (or let dispatch create the worktree) and run it again.

**It stopped instead of adapting the plan. Is that expected?**

Yes when the deviation changes scope, externally observable behaviour, a public contract, architecture responsibility, a test seam, or the task breakdown. Equivalent path, symbol, and command changes can continue only after their equivalence is verified and recorded. Material changes return to you because `/to-plan`, not `/implement`, owns implementation design.

**Can I run several plans in parallel in one checkout?**

Not with `/implement`: one invocation, one plan. Each run uses the same working directory, index, and `HEAD`, and commits after every green task. For a whole spec at once, approve a plan for every ticket and use [implement-spec](https://aihero.dev/skills-implement-spec), which gives each ready ticket's plan to a [subagent](https://www.aihero.dev/ai-coding-dictionary/subagent) in its own worktree and merges the results onto one integration branch.

**Can it open a pull request or push when it finishes?**

Only when the plan asks for it. A plan with a `Pull request` base gets its branch pushed and a ready pull request opened against that base, after code review and final verification pass, with [pr](https://aihero.dev/skills-pr) shaping the body. If the push or the pull request fails, the plan stays blocked with the exact command, and a resumed run picks up there. Without that field the run stops after local completion. It never removes the completed plan unless you ask.

**How do I know a run in another worktree needs me?**

Inside Orca, the run posts its status to the worktree's comment and marks the worktree unread whenever the plan turns blocked or completed, so the sidebar shows what it needs. It asks the question itself in that worktree's terminal. When it completes, its report ends with the `After Completion` steps left for you, such as deploying.

**Will `code-review` see the changes?**

Yes. Every green task is committed before the final review, and the plan records the fixed point that `code-review` diffs against. This avoids the upstream workflow's known failure mode where review ran before the uncommitted changes were visible.

**Why doesn't it review the corrective tasks again?**

Because an open-ended review always finds something new. Re-reviewing every round of fixes once turned one plan into five review rounds, the last of them about hypothetical future usage. Each corrective task instead makes the smallest change that resolves its finding, enters red first like any other task, and is followed by a rerun of final verification. Run [code-review](https://aihero.dev/skills-code-review) yourself afterwards if you want another look.

**Does completing the plan close the originating ticket?**

No. Completion updates the local plan and commits the implementation; tracker state remains a separate operation.

## It's working if

- Every behavior change enters red first.
- Every completed task has evidence and a commit.
- Another agent can resume at `Resume Here`.
- Review runs once, and every finding is fixed or waived before completion.
- A plan for another repository shows up as a new worktree of that repository once its waits are settled with you, and nothing but that plan changes in the one you ran it from.
- A dispatched run reaches completion without stopping for you, and in Orca its worktree comment says when it is blocked or done.
- A pull request appears only for a plan that names a `Pull request` base, and only after review.
- `.scratch` never enters Git.

## Where it fits

`implement` is the execution step near the end of the main chain:

```txt
grill-with-docs → to-spec → to-tickets → to-plan → implement → code-review → retro
```

Its upstream neighbour is [to-plan](https://aihero.dev/skills-to-plan), which owns implementation detail for one frontier ticket. Its internal disciplines are [tdd](https://aihero.dev/skills-tdd), which supplies the red-green loop at pre-agreed seams, and [code-review](https://aihero.dev/skills-code-review), which reviews the plan's fixed point once before completion. [implement-spec](https://aihero.dev/skills-implement-spec) is the parallel alternative: it runs every approved plan for a spec at once, each under these same rules. Afterwards, [retro](https://aihero.dev/skills-retro) looks back over the session. When you're unsure which skill or flow fits, [ask-matt](https://aihero.dev/skills-ask-matt) routes you.
