---
"mattpocock-skills": minor
---

Add a promoted, user-invoked **`to-plan`** step for one selected work item and deepen **`implement`** into its resumable executor.

The feature-level flow remains `to-spec → to-tickets`: the new plan does not duplicate the spec or split work across Issues. Instead, each selected frontier Issue gets a disposable `.scratch/<feature>/plans/<work-item>-plan.md` that records exact implementation tasks, test seams, evidence, deviations, blockers, commits, and the next resume point. After user confirmation, `implement` executes that local plan task by task, drives TDD, protects pre-staged work, commits independently green tasks, and blocks completion on any unresolved code-review finding.
