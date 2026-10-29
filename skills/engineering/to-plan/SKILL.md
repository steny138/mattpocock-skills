---
name: to-plan
description: Create a disposable, resumable implementation plan for one work item, then stop before implementation.
disable-model-invocation: true
---

# To Plan

Turn a conversation, local spec, issue, or other single work item into an implementation plan. The plan owns **how** the work will be done; a workspace-readable source normally owns **what** must be delivered.

The plan is a local coordination artifact for agents sharing one workspace. Write it, present it, and stop. Never publish it to an issue tracker or implement from the same invocation.

## Process

### 1. Pin the work item

Read the source the user supplied in full. If the source is the conversation or anything another agent cannot read from the workspace, capture the agreed work-item contract and acceptance criteria in the plan. Resolve any interpretation that would change scope, public behavior, architecture, or test seams with the user before writing the plan.

Plan one work item only. For a set of tracer-bullet tickets, plan only the selected ticket rather than the whole feature: usually a frontier ticket for `/implement`, or each ticket in turn when every plan must be approved before `/implement-spec`. A plan for a ticket whose blockers have not landed yet may go stale; the executor re-validates it before editing. This is not the cross-ticket planner removed when planning was unified into `/to-spec` and `/to-tickets`.

A plan belongs to exactly one repository, because `/implement` runs it in a session started inside that repository, under its own agent instructions, hooks, and rules. When the work item changes several repositories, write one plan per target repository in this invocation and present them together for one approval. Put the target repository's folder name in each work-item slug, and record any ordering between them (one repository's change landing before another's) in each affected plan's `## Constraints`.

### 2. Inspect the workspace

Read the applicable agent instructions, domain glossary, ADRs, and code around the change. Record facts from the repository rather than guessing:

- the repository root, current branch, and current `HEAD` as the review fixed point;
- the public interfaces and pre-agreed test seams;
- the exact files likely to change;
- the narrow verification commands the repository supports;
- relevant constraints, including sandbox or no-network rules.

If a behavior-changing plan has no agreed test seam, stop and ask the user to confirm one before writing test steps.

For a target repository other than the current one, verify only that its path is a git main checkout (`git -C <path> rev-parse --path-format=absolute --git-common-dir` is `<path>/.git`). The session that executes the plan inside that repository challenges the rest against its own code and rules.

### 3. Keep the plan local

Write inside the worktree that has the current branch checked out (`git rev-parse --show-toplevel`; in a linked worktree that is the linked worktree, not the main one) at:

```text
.scratch/<feature>/plans/<work-item>-plan.md
```

If the user supplies a path, require it to stay under that worktree's `.scratch/` directory. If no unambiguous feature or work-item slug is available, ask the user instead of inventing one.

Resolve the repository-local exclude file with:

```bash
git rev-parse --git-path info/exclude
```

Ensure it contains `/.scratch/`, then verify the rule with `git check-ignore`. Do not add `.scratch/` to the version-controlled `.gitignore`.
Never stage or commit the plan.

### 4. Write the plan

Use this structure:

```markdown
# <Work Item> Implementation Plan

**Source:** <conversation, local spec path, or issue reference>
**Goal:** <one externally observable outcome>
**Execution:** not-started
**Last updated:** <timestamp>
**Repository:** <absolute path of the target repository's main checkout>
**Workspace:** <root of the worktree that has the branch checked out>
**Branch:** <branch>
**Review fixed point:** <commit SHA or ref>

## Work Item Contract

<For a conversation or non-readable source, capture the agreed behavior and acceptance criteria. Otherwise point to the workspace-readable source without restating it.>

## Constraints

- <verified scope or repository constraint>

## Test Seams

- <confirmed public boundary and behavior observed there>

## Tasks

### Task 1: <independently verifiable slice> (pending)

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

For a plan whose target is not the current repository, write `**Workspace:**`, `**Branch:**`, and `**Review fixed point:**` as `unbound (dispatch)`; `/implement` dispatches it and the session in the target binds them. Add `**Base:** <ref>` after `**Repository:**` only when the target's worktree must start from something other than its default base.

Keep each task heading exactly `### Task <n>: <title> (<status>)`, with `<status>` one of `pending`, `in-progress`, `completed`, or `blocked` inside ASCII parentheses, even when the plan is written in another language: `(pending)`, never `（pending）`. Tools that track `/implement` read task progress from this line.

Prefer vertical tracer-bullet tasks. Each task must be independently verifiable and committable. For behavior changes, call the Skill tool with `tdd` and order the slices so each task can enter its loop against behavior genuinely missing from the state left by the previous task. If it cannot, combine or move the slice rather than planning artificial sabotage.

Do not repeat requirements from a workspace-readable source. Point to it and include only the implementation detail needed to execute reliably.

### 5. Check the contract for omissions

Run this step only when the work item's source is the conversation or anything else another agent cannot read from the workspace, since only then does the plan carry the contract itself. You wrote that contract having seen the whole conversation, so anything that lives only in the conversation is invisible to you.

**Decisions not written down.** List every decision the conversation settled about this work item, one line each, and find where `## Work Item Contract` records it. Add each decision with no home. These were already agreed, so adding them is synthesis, not a new decision.

**Questions never asked.** Spawn a sub-agent with the plan path and repository access, and none of the conversation. Ask it for the questions it would need answered before it could implement the plan. Sort each one:

- Answered in the conversation: the contract missed it. Add the answer.
- Unanswered, and the answer would change scope, externally observable behavior, architecture, or a test seam: an open question. Ask the user, write the answer into the contract, and update any task it affects.
- Anything else: drop it.

### 6. Stop at the boundary

Show the user each plan's path and target repository, task list, test seams, and any remaining risks. When step 5 ran, also show how many decisions you added and each open question with its answer. Ask for confirmation. Do not publish the plan to an issue tracker, edit product code, stage files, commit, push, or invoke `/implement` in this invocation.
