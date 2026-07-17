---
name: to-plan
description: Create a disposable, resumable implementation plan for one work item, then stop before implementation.
disable-model-invocation: true
---

# To Plan

Turn a conversation, spec, issue, or other single work item into an implementation plan. The plan owns **how** the work will be done; a workspace-readable source normally owns **what** must be delivered.

The plan is a local coordination artifact for agents sharing one workspace. Write it, present it, and stop. Never implement from the same invocation.

## Process

### 1. Pin the work item

Read the source the user supplied in full. If the source is the conversation or anything another agent cannot read from the workspace, capture the agreed work-item contract and acceptance criteria in the plan. Resolve any interpretation that would change scope, public behavior, architecture, or test seams with the user before writing the plan.

Plan one work item only. For a set of tracer-bullet issues, plan only the selected frontier issue rather than the whole feature.

### 2. Inspect the workspace

Read the applicable agent instructions, domain glossary, ADRs, and code around the change. Record facts from the repository rather than guessing:

- the repository root, current branch, and current `HEAD` as the review fixed point;
- the public interfaces and pre-agreed test seams;
- the exact files likely to change;
- the narrow verification commands the repository supports;
- relevant constraints, including sandbox or no-network rules.

If a behavior-changing plan has no agreed test seam, stop and ask the user to confirm one before writing test steps.

### 3. Keep the plan local

Write inside the current repository at:

```text
.scratch/<feature>/plans/<work-item>-plan.md
```

If the user supplies a path, require it to stay under the repository's `.scratch/` directory. If no unambiguous feature or work-item slug is available, ask the user instead of inventing one.

Resolve the repository-local exclude file with:

```bash
git rev-parse --git-path info/exclude
```

Ensure it contains `/.scratch/`, then verify the rule with `git check-ignore`. Do not add `.scratch/` to the version-controlled `.gitignore`.

### 4. Write the plan

Use this structure:

```markdown
# <Work Item> Implementation Plan

**Source:** <conversation, spec path, or issue reference>
**Goal:** <one externally observable outcome>
**Execution:** not-started
**Last updated:** <timestamp>
**Workspace:** <repository root or worktree>
**Branch:** <branch>
**Review fixed point:** <commit SHA or ref>

## Work Item Contract

<For a conversation or non-readable source, capture the agreed behavior and acceptance criteria. Otherwise point to the workspace-readable source without restating it.>

## Constraints

- <verified scope or repository constraint>

## Test Seams

- <confirmed public boundary and behavior observed there>

## Tasks

### Task 1: <independently verifiable slice> — pending

**Files**

- Create: `<exact path>`
- Modify: `<exact path>`
- Test: `<exact path>`

**Steps**

- [ ] Write one failing behavior test at an agreed seam.
- [ ] Run `<exact command>` and confirm the expected failure.
- [ ] Implement only enough behavior to pass.
- [ ] Run `<exact targeted verification>` and confirm success.
- [ ] Commit the independently green task.

**Evidence**

- Verification: pending
- Commit: pending

## Deviations

- None.

## Blockers

- None.

## Final Verification

- Commands: pending
- Code review: pending

## Resume Here

Plan not started. Begin with Task 1, first unchecked step.
```

Prefer vertical tracer-bullet tasks. Each task must be independently verifiable and committable. For behavior changes, invoke `/tdd` and order the slices so each task can enter its loop against behavior genuinely missing from the state left by the previous task. If it cannot, combine or move the slice rather than planning artificial sabotage.

Do not repeat requirements from a workspace-readable source. Point to it and include only the implementation detail needed to execute reliably.

### 5. Stop at the boundary

Show the user the plan path, task list, test seams, and any remaining risks. Ask for confirmation. Do not edit product code, stage files, commit, push, or invoke `/execute-plan` in this invocation.
