---
name: implement-spec
description: "Execute every ticket's approved local plan for one spec in parallel worktrees, landing them on one integration branch."
disable-model-invocation: true
---

You have been provided a local spec at `.scratch/<feature>/spec.md` in the worktree that has the current branch checked out (`git rev-parse --show-toplevel`), the **orchestrating worktree**. Its tickets came from `/to-tickets`, and every ticket must already have an approved local plan at `.scratch/<feature>/plans/<ticket>-plan.md`, written by `/to-plan`.

The goal is every approved plan executed and merged onto a single **integration branch**, then stopped at a clean `code-review`. You orchestrate execution only: the plans own **how**, and no material decision is yours to make.

The tickets are not a list of steps. They are a **task graph** with blocking relationships between them. This means there is always a **frontier** of tickets which are ready to be grabbed.

Communication to and from subagents should be sparse. Communicate primarily through **context pointers**: to the spec, the ticket, its plan, research notes, and previous commits. Don't duplicate information already available via pointers.

**Implementer subagents** should be run in the background where possible for maximum concurrency.

## Steps

1. Read the spec, the tickets, and every plan. Stop and tell the user which tickets need `/to-plan` if any ticket has no plan, or if any plan has not been approved or is not `**Execution:** not-started` (resuming a run is the exception; see step 10). Read the tickets' blocking edges to build the task graph.

2. Record the run at `.scratch/<feature>/implement-spec.md` in the orchestrating worktree, beside the spec and plans: the integration branch, its base commit, a row per ticket with its plan path, worktree, branch, and status, and a `## Resume Here` naming the next concrete action. Keep it updated as tickets are dispatched, merged, or blocked. Like the plans, it lives under the locally excluded `.scratch/` and is never staged or committed.

3. (optional) Use an **exploration subagent** to conduct any exploration the plans still need: relevant codebase files or external documentation. Ensure the exploration subagent can save files: it should save its markdown notes in a directory outside the repo, accessible by all future subagents.

4. Create the integration branch from the current `HEAD`. Do not open a pull request.

5. For each ticket on the frontier, create a worktree on its own branch from the integration branch tip. Before dispatching, rebind its plan to that worktree: set `**Workspace:**`, `**Branch:**`, and `**Review fixed point:**` (the integration tip the worktree was created from), and record the rebinding under the plan's `## Deviations`. Plans stay in the orchestrating worktree; give each implementer the **absolute path** to its plan, since a new worktree does not contain the untracked `.scratch/`. One plan goes to exactly one implementer.

6. Use **implementer subagents** to execute the plans, each in its own worktree. Each implementer subagent must not spawn subagents of its own, and executes its plan under the same rules as `/implement`:
   - confirm its worktree is based on the integration branch and matches the plan's workspace, branch, and fixed point, and that the index is empty;
   - start at the plan's `## Resume Here` and work one task at a time, calling the Skill tool with `tdd` at the plan's pre-agreed seams for behaviour changes;
   - after each green task, stage only that task's files, commit, and record the command, result, and commit SHA in the plan;
   - continue past a non-material deviation only after verifying and recording its equivalence; stop on any change to scope, observable behaviour, a contract, architecture responsibility, a test seam, the task breakdown, or core strategy;
   - after the last task, run the plan's final verification and record it under `## Final Verification`, with `Code review:` set to deferred to the integration-branch review; do not run `code-review` per plan;
   - on any stop, set `**Execution:** blocked`, record the evidence and the decision needed under `## Blockers`, update `## Resume Here`, and report back;
   - when the plan is complete, merge the integration branch tip into its own branch, then report done.

7. When an implementer reports done, merge its branch to the integration branch with a **merger subagent**. When one reports blocked, mark the ticket blocked in the run record, relay the decision to the user, and keep the rest of the graph moving. A blocked ticket's dependents stay off the frontier.

8. If a merge changes the **frontier** of available tickets, go back to step 5 for the newly ready tickets. Compute the frontier from what has merged onto the integration branch, not from tracker state. This allows for maximum concurrency.

9. Once every ticket has merged, call the Skill tool with `code-review` on the integration branch against its base commit. This is the only review in the run. If it reports any finding, record each one with a proposed corrective task or waiver in the run record, and stop for the user's approval. Do not fix anything before approval. After approval, append the corrective tasks to a plan, execute them in a single **implementer subagent** under step 6's rules, merge, and review again.

10. To resume an interrupted run, read the run record and every plan, verify each worktree and branch still matches, and continue from the run record's `## Resume Here`. Never restart a plan whose tasks are already committed.

11. When review is clean, record the review outcome under each plan's `## Final Verification`, then report the integration branch and the per-ticket commits. Do not push, open a pull request, close or edit the tickets, or delete the spec, plans, or run record. Remove only the implementer worktrees whose branches have merged.
