---
name: execute-plan
description: Execute a user-specified implementation plan continuously while keeping its progress resumable for another agent.
disable-model-invocation: true
---

# Execute Plan

Execute one existing implementation plan to completion or a hard stop. The plan is the local source of truth for execution progress; the current user invocation is the authorization to execute it.

## Process

### 1. Load and challenge the plan

Require the user to identify the plan. Read it, every source it points to, the applicable agent instructions, and the current repository state.

Before editing code, confirm:

- the plan belongs to this workspace and branch;
- its review fixed point resolves;
- its files, commands, and assumptions still match the codebase;
- the next task and test seam are unambiguous;
- unrelated working-tree changes can be preserved.
- the index has no pre-existing staged changes (`git diff --cached` is empty).

If the plan has a material gap, a stale core assumption, a path outside the repository's locally ignored `.scratch/` directory, or pre-existing staged changes, checkpoint it as blocked and ask the user. Never unstage or absorb the user's staged work, and do not silently redesign the plan.

### 2. Work one task at a time

Start at `## Resume Here`, or the first unchecked step if the pointer is stale. Continue through tasks without waiting between them until the plan is complete, the user interrupts, or a hard stop occurs.

For behavior changes, run `/tdd` at the plan's pre-agreed seams and follow its loop. If the planned slice cannot enter the loop because its behavior already exists, stop and correct the boundary with the user; never sabotage green code to manufacture a red result. Preserve unrelated user changes.

### 3. Handle deviations by intent

A non-material deviation does not change scope, externally observable behavior, a public contract, architecture responsibility, test seam, or task breakdown. Examples include shifted line numbers, a renamed symbol with the same responsibility, an equivalent supported verification command, or reuse of an existing helper. Verify the equivalence, continue, and record the evidence under `## Deviations`.

Stop before changing code when execution would:

- change scope or externally observable behavior;
- change an API, schema, event contract, architecture boundary, or agreed test seam;
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

### 6. Review before completion

After every planned task and final verification passes, run `/code-review` against the plan's review fixed point.

If review reports any finding:

1. Keep completed tasks completed.
2. Set `**Execution:** blocked`.
3. Record the finding, its evidence, and either a proposed corrective task or an explicit waiver decision under `## Blockers` and `## Resume Here`.
4. Stop and ask the user whether to amend the plan.

Do not add or implement corrective tasks before approval. After approval, append the tasks, execute them, and run `/code-review` again.

Record the fresh final commands, result summaries, and Standards/Spec review outcome under `## Final Verification`. Only when all tasks and verification pass and review has no findings may the plan be set to `**Execution:** completed`. Keep the completed plan in `.scratch/` until the user explicitly asks to remove it. Do not push, create a pull request, or clean up the plan automatically.
