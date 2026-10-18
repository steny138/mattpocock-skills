---
name: to-spec
description: "Turn the current conversation into a local spec: synthesize what is already known, confirm test seams before writing, and check the written spec for omissions."
disable-model-invocation: true
---

This skill takes the current conversation context and codebase understanding and produces a spec. Do not reopen requirements discovery or interview the user for new product decisions. Synthesize what you already know. The only user exchanges are confirming the proposed test seams before writing, and answering any open questions the omission check in step 4 surfaces.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.

Check with the user that these seams match their expectations.

3. Write the spec using the template below, inside the worktree that has the current branch checked out (`git rev-parse --show-toplevel`; in a linked worktree that is the linked worktree, not the main one), at:

```text
.scratch/<feature>/spec.md
```

If no unambiguous feature slug is available, ask the user instead of inventing one. The destination is fixed: do not publish the spec to GitHub, GitLab, Linear, or any other issue tracker, even when the repository has one configured.

Resolve the repository-local exclude file with:

```bash
git rev-parse --git-path info/exclude
```

Ensure it contains `/.scratch/`, then verify the spec is ignored with `git check-ignore`. Do not add `.scratch/` to the version-controlled `.gitignore`, and never stage or commit the spec.

<spec-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts, not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this spec.

## Further Notes

Any further notes about the feature.

</spec-template>

4. Check the spec for omissions. You wrote it having seen the whole conversation, so anything that lives only in the conversation is invisible to you. Run both checks every time, even when the spec looks complete.

   **Decisions not written down.** List every decision the conversation settled, one line each, and find the spec section that records it. Add each decision with no home to the spec. These were already agreed, so adding them is synthesis, not a new product decision.

   **Questions never asked.** Spawn a sub-agent with the spec path and repository access, and none of the conversation. Ask it for the questions it would need answered before it could plan the implementation. Sort each one:

   - Answered in the conversation: the spec missed it. Add the answer to the spec.
   - Unanswered, and the answer would change scope, externally observable behavior, architecture, or a test seam: an open question. Ask the user, then write the answer into the spec.
   - Anything else: drop it.

5. Show the user the spec path, the confirmed test seams, and the omission check's result: how many decisions you added, and each open question with its answer. Do not create, edit, label, or comment on an issue as part of this skill.
