## What it does

`implement-spec` takes a local [spec](https://www.aihero.dev/ai-coding-dictionary/spec), its [tickets](https://www.aihero.dev/ai-coding-dictionary/ticket), and one approved [to-plan](https://aihero.dev/skills-to-plan) plan per ticket, and executes every plan in one run. The orchestrating [agent](https://www.aihero.dev/ai-coding-dictionary/agent) hands each plan to an implementer [subagent](https://www.aihero.dev/ai-coding-dictionary/subagent) working in its own git worktree, merges each finished branch into a single **integration branch**, and runs [code-review](https://aihero.dev/skills-code-review) over the result.

It never plans. Every ticket needs an approved plan before the run starts, and each implementer executes its plan under the same rules as [implement](https://aihero.dev/skills-implement): one committed task at a time, evidence recorded in the plan, and a stop for you on any material deviation. The one difference is review: implementers skip the per-plan `code-review`, and the run reviews the integration branch once at the end.

It reads the tickets as a **task graph**, not a list. Blocking edges decide what can start, so at any moment there is a **frontier** of tickets whose blockers have all landed, and every ticket on the frontier runs at once. That is the difference from working the plans one by one.

## When to reach for it

You invoke this by typing `/implement-spec`, and the agent won't reach for it on its own.

| Your situation | Reach for |
| --- | --- |
| A spec split into tickets, every ticket with an approved plan, and you want them executed in one run | `/implement-spec` |
| One ticket at a time, in your own [context window](https://www.aihero.dev/ai-coding-dictionary/context-window), [clearing](https://www.aihero.dev/ai-coding-dictionary/clearing) between tickets | [to-plan](https://aihero.dev/skills-to-plan), then [implement](https://aihero.dev/skills-implement) |
| Tickets without plans yet | [to-plan](https://aihero.dev/skills-to-plan) once per ticket first |
| A spec that isn't split into tickets yet | [to-tickets](https://aihero.dev/skills-to-tickets) first |
| A small piece of work with no real graph to it | [to-plan](https://aihero.dev/skills-to-plan), then [implement](https://aihero.dev/skills-implement) |

## Prerequisites

- **A local spec** at `.scratch/<feature>/spec.md`, written by [to-spec](https://aihero.dev/skills-to-spec).
- **Tickets with blocking edges**, as [to-tickets](https://aihero.dev/skills-to-tickets) writes them. Without edges the graph is flat and every ticket starts at once.
- **An approved, not-started plan per ticket** at `.scratch/<feature>/plans/<ticket>-plan.md`. The run stops and lists the missing ones otherwise.
- **A [harness](https://www.aihero.dev/ai-coding-dictionary/harness) that runs subagents in the background and gives each one a git worktree.** On a harness that runs subagents one at a time, it is only a slower `implement`.

## The integration branch

Everything lands on one branch. Before dispatching a ticket, the orchestrator creates its worktree from the integration branch tip and rebinds the plan's workspace, branch, and review fixed point to it, recording that under the plan's deviations. The plans themselves stay in the main worktree, and each implementer gets the absolute path to its own, because `.scratch/` is untracked and a new worktree does not contain it.

Each implementer then:

1. confirms its worktree, branch, fixed point, and empty index match the plan,
2. executes the plan task by task with [tdd](https://aihero.dev/skills-tdd) at the plan's seams, committing each green task and recording its SHA,
3. records its final verification, leaving the review to the end of the run,
4. merges the integration branch tip into its own branch before reporting done, so landing it is a fast-forward.

The orchestrator keeps a run record at `.scratch/<feature>/implement-spec.md` with the integration branch, each ticket's worktree and status, and a `Resume Here`, so an interrupted run can be picked up again. When everything has merged, it runs one `code-review` over the integration branch and records the outcome in every plan. The run ends there: it does not push, open a pull request, or close tickets.

## Common questions

**How is this different from running `/implement` on each plan myself?**

With `implement` you are the dispatcher: one [session](https://www.aihero.dev/ai-coding-dictionary/session) per plan, clearing in between, and keeping track yourself of which tickets are unblocked. `implement-spec` hands that job to one orchestrating session. The rules for each plan are the same. The price is that you approve every plan up front instead of just before each ticket, and you review the integration branch at the end rather than each ticket as it lands.

**Why does it need every plan before it starts?**

So the run never waits on you for a planning decision while subagents sit idle, and so no implementer ever designs its own work. The cost is that a plan for a ticket deep in the graph is written before its blockers exist. Each implementer re-validates its plan against the integration branch before editing, so a plan that went stale stops for you instead of being silently redesigned.

**One implementer stopped for a decision. Does the whole run stop?**

No. That ticket is marked blocked, the decision is relayed to you, and the tickets it doesn't block keep going. Its dependents stay off the frontier until you resolve it.

**Its review found problems. Why didn't it fix them?**

Because every review finding stops for your approval, the same as in `implement`. Approve a corrective task or a waiver, and it executes the fix and reviews again. This also prevents an unattended review and fix loop from running for hours.

**Two implementers running in parallel collided on the same file, or picked different names for the same thing.**

Worktrees don't remove collisions; they postpone them to merge time. Each implementer sees only its own plan and the shared notes, never the other's work in progress. When two frontier tickets touch one shared file, either add a blocking edge between them so they run one after the other, or have their plans fix the exact names each adds.

**Blocked tickets never start, even after their blocker has merged.**

The orchestrator computes the frontier from what has merged onto the integration branch, not from tracker state. A tracker's blocked-by count usually only drops when a blocker closes, and this run never closes tickets.

**A ticket's key test was skipped inside its worktree, and it reported green.**

A worktree holds only what git tracks. Tests that read gitignored fixtures, local databases, or credentials can silently skip there. For a ticket whose verification depends on untracked material, tell the orchestrator to run it in the main checkout instead.

## It's working if

- It refuses to start while any ticket is missing an approved plan.
- Several implementers are running at once whenever the graph allows, not one after another.
- Every plan ends with each task's commit SHA and evidence recorded.
- Merges into the integration branch are fast-forwards, not conflict resolutions.
- Any deviation or review finding comes back to you as a decision, not a silent fix.
- The run ends on one branch with nothing pushed and no tickets closed.

## Where it fits

`implement-spec` is the parallel alternative to running [implement](https://aihero.dev/skills-implement) once per plan:

```txt
grill-with-docs → to-spec → to-tickets → to-plan (every ticket) → implement-spec → retro
```

Its neighbours are [to-plan](https://aihero.dev/skills-to-plan), which writes the plans it executes; [to-tickets](https://aihero.dev/skills-to-tickets), which declares the blocking edges it reads as a task graph; and [code-review](https://aihero.dev/skills-code-review), which gates the integration branch. [ask-matt](https://aihero.dev/skills-ask-matt) is the router over the whole set when you are not sure which flow you are in.
