---
name: implement
description: Execute an approved local implementation plan task by task while keeping progress resumable for another agent.
disable-model-invocation: true
---

# Implement

Execute one approved implementation plan to completion or a hard stop. The plan is the local source of truth for execution progress; the current user invocation is the authorization to execute it.

## Process

### 1. Load and challenge the plan

Require the user to identify the plan. Read it, every source it points to, the applicable agent instructions, and the current repository state.

First match the plan's repository. Its `**Repository:**` names the main checkout of the repository it changes; a plan without the field targets the current repository. The current repository's main checkout is the parent of `git rev-parse --path-format=absolute --git-common-dir`. When the two differ, dispatch the plan as described below and end the run there: this session leaves every file as it found it, the plan included, because only a session started inside the target repository loads that repository's own agent instructions, hooks, and rules.

#### Dispatch

Create a worktree of the target repository for the plan:

- **Path:** `<parent of Repository>/<Repository folder name>.worktrees/<slug>`, where `<slug>` is the plan's file name without `-plan.md`.
- **Branch:** a new branch named `<slug>`.
- **Base:** the plan's `**Base:**` when present, else the target's `origin/HEAD`, else the branch its main checkout has checked out. Use refs already present locally; dispatch never fetches.

Report the worktree path and the command to run there, `/implement <absolute plan path>`. The session started in that worktree binds the plan.

#### Challenge

When the plan targets the current repository, before editing code, confirm:

- the plan belongs to this workspace and branch;
- its review fixed point resolves;
- its files, commands, and assumptions still match the codebase;
- the next task and test seam are unambiguous;
- unrelated working-tree changes can be preserved;
- the index has no pre-existing staged changes (`git diff --cached` is empty).

Start by locating the current branch: `git branch --show-current` and `git rev-parse --show-toplevel` give the branch and the worktree it is checked out in, and the plan's `**Branch:**` and `**Workspace:**` must name them. The plan normally lives under that worktree's locally ignored `.scratch/`. A plan under another worktree's `.scratch/` is valid only when its `**Workspace:**` already names this worktree, as `/implement-spec` leaves it after rebinding. Work on the plan where it is; never move or copy it. When `**Workspace:**` or `**Branch:**` does not match (a plan written before this rule may name the main repository root), ask the user whether to rebind the plan to this worktree and branch; if they agree, update the fields and record the rebinding under `## Deviations`.

A dispatched plan arrives with `**Workspace:**` set to `unbound (dispatch)` and may live under another repository's `.scratch/`. Bind it without asking: set `**Workspace:**` and `**Branch:**` to this worktree and branch, set `**Review fixed point:**` to the current `HEAD` before any edit, and record the binding under `## Deviations`. On the repository's default branch (`origin/HEAD`, or `main` or `master` without a remote), leave the plan unbound instead: checkpoint it as blocked and ask the user for a feature branch to run it on.

If the plan has a material gap, a stale core assumption, a path that fails those location rules, or pre-existing staged changes, checkpoint it as blocked and ask the user. Never unstage or absorb the user's staged work, and do not silently redesign the plan.

### 2. Work one task at a time

Start at `## Resume Here`, or the first unchecked step if the pointer is stale. Continue through tasks without waiting between them until the plan is complete, the user interrupts, or a hard stop occurs.

For behavior changes, call the Skill tool with `tdd` at the plan's pre-agreed seams and follow its loop. If the planned slice cannot enter the loop because its behavior already exists, stop and correct the seam with the user; never sabotage green code to manufacture a red result. Preserve unrelated user changes.

### 3. Handle deviations by intent

A non-material deviation does not change scope, externally observable behavior, a public contract, architecture responsibility, test seam, or task breakdown. Examples include shifted line numbers, a renamed symbol with the same responsibility, an equivalent supported verification command, or reuse of an existing helper. Verify the equivalence, continue, and record the evidence under `## Deviations`.

Stop before changing code when execution would:

- change scope or externally observable behavior;
- change an interface, schema, event contract, architecture responsibility, or agreed test seam;
- add, remove, merge, or split a task;
- touch another repository or service outside the plan;
- replace a core implementation strategy;
- continue after repeated verification failure without a grounded next step.

Record the evidence and the exact decision needed under `## Blockers`, set `**Execution:** blocked`, update `## Resume Here`, and ask the user.

### 4. Commit each green task

After a task's targeted verification passes:

1. Inspect the diff and confirm it contains only that task's intended changes.
2. Reconfirm the index is empty, then stage only those files.
3. Inspect `git diff --cached` and hard-stop unless every staged hunk belongs to this task; also run the staged diff check supported by the repository.
4. Commit using the repository's commit convention.
5. Mark the task completed and its steps checked.
6. Record the command, result summary, and commit SHA under the task's `**Evidence**`.
7. Set `**Execution:** in-progress`, refresh `**Last updated:**`, and point `## Resume Here` at the next unchecked step.

The plan lives under the locally excluded `.scratch/` directory and must never be staged or committed.

### 5. Leave an interruption checkpoint

When the user interrupts or execution cannot continue, update the plan before yielding:

- leave completed tasks and commits intact;
- keep the current task `in-progress` unless it is blocked;
- record verification already run and the exact observed output;
- record deviations or blockers without speculation;
- make `## Resume Here` name the next concrete action and the files an agent must inspect.

Update progress at task completion or interruption, not after every routine tool call.

### 6. Review once before completion

After every planned task and final verification passes, call the Skill tool with `code-review` against the plan's review fixed point. This is the plan's only review.

If review reports any finding:

1. Keep completed tasks completed.
2. Set `**Execution:** blocked`.
3. Record the finding, its evidence, and either a proposed corrective task or an explicit waiver decision under `## Blockers` and `## Resume Here`.
4. Stop and ask the user which findings to fix and which to waive.

Do not add or implement corrective tasks before approval. After approval, append the approved tasks, execute them under steps 2 to 4, and rerun final verification. Each corrective task makes the smallest change that resolves its finding; record anything else noticed while fixing it in the final report instead of folding it in. Do not call `code-review` again: an open-ended review of the fixes always finds something new, so the corrective tasks' tests and final verification are their check.

Record the fresh final commands, result summaries, Standards/Spec review outcome, and each finding's resolution (the corrective task and its commit SHA, or the waiver and its reason) under `## Final Verification`. Only when all tasks and verification pass and every review finding is fixed or waived may the plan be set to `**Execution:** completed`. Keep the completed plan in `.scratch/` until the user explicitly asks to remove it. Do not push, create a pull request, or clean up the plan automatically.
