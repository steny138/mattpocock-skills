# Fork maintenance contract

This document is the source of truth for how `steny138/mattpocock-skills`
intentionally differs from `mattpocock/skills`. Read it before comparing or
merging upstream. Update it in the same change whenever the fork adds, removes,
or changes an intentional divergence.

The goal is not to preserve every textual difference. The goal is to preserve
the decisions this fork depends on while continuing to absorb compatible
upstream improvements.

## Repository relationship

- Fork: `https://github.com/steny138/mattpocock-skills.git` (`origin`)
- Upstream: `https://github.com/mattpocock/skills.git` (`upstream`)
- Default integration method: merge `upstream/main` into this fork's `main`
- Pull requests are merged with merge commits, never squash or rebase.

### Current synchronized baseline

The baseline below is a snapshot, not a permanent constant. Refresh it after
every upstream integration.

- Upstream integrated through: `4588b32ecab9ecc9fc8cc6b6c5e7d675b6004b0d`
- Fork integration commit: the merge commit on `chore/merge-upstream-1.3.1`
- Integration date: 2026-10-05
- Upstream package version absorbed: `1.3.1`

Verify the current relationship instead of trusting this snapshot:

```bash
git fetch origin --prune
git fetch upstream --prune
git merge-base --is-ancestor upstream/main main
git log --oneline main..upstream/main
git diff --stat upstream/main..main
```

## Intentional divergences

### 1. Separate feature specification from work-item planning

Upstream's build flow goes from a spec or ticket into `implement`. This fork
inserts a mandatory, user-reviewed planning boundary:

```text
grill-with-docs → to-spec → to-tickets → to-plan → implement → code-review → retro
```

For work small enough to skip a feature spec and ticket decomposition, the
boundary still applies:

```text
grill-with-docs → to-plan → implement → code-review
```

`to-spec` owns the feature-level **what**. `to-tickets` owns tracer-bullet
decomposition and blocking edges. `to-plan` owns the implementation **how** for
exactly one selected work item. `implement` executes that approved plan.

Decision reason: feature requirements and implementation detail have different
lifetimes and review boundaries. A feature spec should remain useful across
multiple work items, while implementation detail is disposable, tied to one
workspace and one current code state. Separating them gives the user an explicit
approval point before code changes and gives another agent a resumable execution
artifact without bloating the durable feature spec.

Primary implementation:

- `skills/engineering/to-plan/SKILL.md`
- `skills/engineering/implement/SKILL.md`
- `skills/engineering/to-tickets/SKILL.md`
- `skills/engineering/implement-spec/SKILL.md`
- `skills/engineering/ask-matt/SKILL.md`

Required supporting surfaces:

- `.claude-plugin/plugin.json`
- `README.md`
- `skills/engineering/README.md`
- `docs/engineering/to-plan.md`
- `docs/engineering/implement.md`
- `docs/engineering/implement-spec.md`
- `mods/plan-progress/hooks/plan.ts` (parses the plan template; see
  divergence 7)
- every promoted docs page that describes the main build flow

### 2. Specs and plans are fixed local artifacts

Unlike upstream, this fork never publishes `to-spec` or `to-plan` output to an
issue tracker. Their destinations are fixed:

```text
.scratch/<feature>/spec.md
.scratch/<feature>/plans/<work-item>-plan.md
```

This remains true when the repository configures GitHub, GitLab, Linear, or
another issue tracker for `to-tickets`, `triage`, or `wayfinder`. Those systems
may still be read as an input when the user supplies a reference, but neither
skill creates, edits, labels, or comments on an issue.

Decision reason: specs and plans are working artifacts for agents sharing one
workspace. Fixed relative paths make them directly addressable across sessions,
avoid external side effects and tracker truncation, and keep their lifecycle
independent from the repository's issue-management policy.

### 3. Plans are disposable workspace coordination artifacts

`to-plan` writes one plan beneath:

```text
.scratch/<feature>/plans/<work-item>-plan.md
```

The plan is excluded through the repository-local Git exclude file, not the
version-controlled `.gitignore`. It must remain readable to agents sharing the
same workspace but must never be staged or committed.

Every plan records at least:

- its source and work-item contract;
- workspace, branch, and review fixed point;
- confirmed test seams and constraints;
- independently verifiable and committable tasks;
- verification evidence and commit SHAs;
- deviations, blockers, final verification, and `Resume Here`.

Decision reason: the plan becomes stale as the work executes and is not a
durable product artifact. Keeping it local avoids preserving obsolete file paths
and task mechanics in Git while retaining enough state for interruption and
agent handoff.

### 4. `implement` is an approved-plan executor

This fork's `implement` must not accept a bare ticket, spec, or conversation as
authorization to design and build. It requires the user to identify an approved
local plan and validates that plan against the current workspace before editing.

The following invariants are mandatory:

- The current branch and the worktree it is checked out in are located first;
  the plan names both and lives under that worktree's `.scratch/`, or under
  another worktree's `.scratch/` only when it already names this worktree. The
  plan is never moved or copied.
- The plan's workspace, branch, review fixed point, files, commands, assumptions,
  next task, and test seam are checked before implementation.
- A pre-existing staged index is a hard stop; user changes are never unstaged or
  absorbed.
- Behaviour changes use `/tdd` at the pre-agreed seams.
- Each independently green task is verified, staged alone, committed, and
  recorded in the plan with evidence and its commit SHA.
- Non-material deviations may continue only after equivalence is verified and
  recorded.
- Scope, observable behaviour, contract, architecture responsibility, test seam,
  task breakdown, repository boundary, or core strategy changes stop for user
  approval.
- Interruptions leave an exact `Resume Here` checkpoint.
- Final `/code-review` runs against the recorded fixed point after task commits
  exist. Any finding blocks completion until the user approves a corrective task
  or waiver.
- Completion does not push, open a pull request, close the source ticket, delete
  the plan, or perform other external cleanup automatically.

Decision reason: execution must be resumable and safe around user-owned working
tree state. Material decisions stay with the user; mechanical execution can
continue autonomously inside the approved boundary. Task commits also ensure
that the final three-dot review can see the implementation, avoiding the
upstream ordering problem where uncommitted work was invisible to review.

### 5. The fork is a distinct distribution

The plugin name remains `mattpocock-skills` to preserve its upstream origin, but
the distribution is explicitly maintained by `steny138`:

- marketplace name and owner: `steny138`;
- plugin author, homepage, and repository: `steny138` fork metadata;
- package repository: `https://github.com/steny138/mattpocock-skills`;
- description: independently maintained fork with spec-first, resumable plans.

The supported installation sources for this fork are:

```bash
claude plugin marketplace add steny138/mattpocock-skills
claude plugin install mattpocock-skills@steny138
```

```bash
npx skills@latest add steny138/mattpocock-skills
```

`claude plugins install mattpocock-skills` resolves the separate official
marketplace listing sourced from `mattpocock/skills`; it must never be presented
as an installation route for this fork.

Decision reason: users must receive the fork's `to-plan` and resumable
`implement` behaviour rather than silently installing upstream. Keeping the
plugin name signals lineage; maintainer, marketplace, repository, description,
badge, links, and install commands distinguish the distribution.

Canonical sources:

- `.agents/install-block.md`
- `.agents/adr/0002-ship-as-a-claude-code-plugin.md`
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `package.json`
- `README.md`

### 6. `implement-spec` is a parallel approved-plan executor

Upstream's `implement-spec` builds a whole spec from its tickets, has each
implementer subagent drive `tdd` straight from a ticket, auto-fixes every final
review finding, and may open a draft PR and close tickets. This fork keeps the
task-graph orchestration (frontier, per-ticket worktrees, one integration
branch, merger subagents) but makes it an executor of approved plans only:

- Every ticket must have an approved, not-started `to-plan` plan before the run
  starts; a missing or unapproved plan is a hard stop.
- The spec, plans, and run record stay in the orchestrating worktree's
  `.scratch/`: the worktree that has the current branch checked out when the
  run starts. Each implementer receives the absolute path to exactly one plan,
  because untracked `.scratch/` is absent from new worktrees. `implement`
  accordingly accepts a plan under another worktree's `.scratch/` once the
  rebinding below names the implementer's worktree.
- Before dispatch, the plan's workspace, branch, and review fixed point are
  rebound to the implementer's worktree and the rebinding is recorded under
  `## Deviations`.
- Each implementer follows `implement`'s rules (per-task commits with recorded
  evidence and SHA, material-deviation stops, `Resume Here`) except review: it
  skips the per-plan `code-review` and defers it to the single
  integration-branch review, whose outcome is then recorded in every plan.
- The orchestrator keeps a run record at `.scratch/<feature>/implement-spec.md`
  with a `Resume Here`, so the whole run is resumable.
- Any final integration-branch review finding stops for user approval.
- Completion does not push, open a pull request, or close tickets.

Decision reason: parallel execution is useful, but a mode that designs work
from bare tickets and closes the loop autonomously would bypass divergences 1,
2, and 4. Requiring every plan up front avoids idle subagents waiting on
planning decisions; implementer re-validation catches plans that went stale
while their blockers landed.

`to-plan` correspondingly allows planning any selected ticket, not only a
frontier ticket, so every plan can be approved before `implement-spec` runs.

### 7. The fork ships a Claude Code mod under `mods/`

Upstream ships skills only. This fork also ships `plan-progress`, a Claude Code
mod (a plugin of function hooks, not a skill) at `mods/plan-progress/`. It is a
separate plugin in the fork's marketplace (`plan-progress@steny138`), not part
of the `mattpocock-skills` plugin, so it does not appear in
`.claude-plugin/plugin.json`'s `skills` array, the bucket READMEs, or `docs/`.

The mod draws the running `implement` plan above the prompt as a stepper. It
binds when the `implement` skill's prompt fires (`skill.prompt`), to the plan
path named in the `/implement` prompt or, failing that, to the first
`.scratch/<feature>/plans/<work-item>-plan.md` the skill reads. It reads, and
never writes, the `to-plan` plan template: `**Execution:**` and
`### Task N: <title> (<status>)`. Task times are measured in the session, not
read from the plan.

Any change to the plan template in `skills/engineering/to-plan/SKILL.md`, or to
how `implement` loads a plan, must re-check the parser in
`mods/plan-progress/hooks/plan.ts` and its tests.

Decision reason: plans are the fork's resumable execution record (divergences
3, 4, and 6), but following one means opening the file. A read-only band makes
progress visible without adding state the skills must maintain. Shipping it as
its own plugin keeps the skills plugin identical in shape to upstream and lets
users take the mod or leave it.

Canonical sources:

- `mods/plan-progress/`
- `.claude-plugin/marketplace.json`
- `.agents/install-block.md`
- `README.md`

## What may follow upstream

Upstream remains authoritative for all behaviour this contract does not
override. In particular, normally accept compatible upstream changes to:

- existing non-fork skills and their supporting files;
- promoted, in-progress, misc, and deprecated bucket membership;
- docs structure and writing conventions;
- invocation metadata conventions;
- release tooling, version synchronization, and changelog history;
- renamed, promoted, or retired upstream skills;
- corrections to upstream flows that still preserve the fork's planning
  boundary.

Do not preserve an old fork line merely because it differs. Preserve it only
when it implements an intentional divergence above or a later decision recorded
in this document.

## Known conflict surface

The 2026-10-05 integration produced textual conflicts in these files:

- `.agents/adr/0001-explicit-setup-pointer-only-for-hard-dependencies.md`
- `.agents/adr/0002-ship-as-a-claude-code-plugin.md`
- `.agents/install-block.md`
- `.agents/writing-docs.md`
- `.claude-plugin/marketplace.json`
- `.claude-plugin/plugin.json`
- `CLAUDE.md`
- `GLOSSARY.md` (renamed upstream from `CONTEXT.md`)
- `README.md`
- `docs/engineering/ask-matt.md`
- `docs/engineering/code-review.md`
- `docs/engineering/grill-with-docs.md`
- `docs/engineering/implement.md`
- `docs/engineering/improve-codebase-architecture.md`
- `docs/engineering/prototype.md`
- `docs/engineering/setup-matt-pocock-skills.md`
- `docs/engineering/tdd.md`
- `docs/engineering/to-spec.md`
- `docs/engineering/to-tickets.md`
- `docs/engineering/triage.md`
- `docs/engineering/wayfinder.md`
- `skills/engineering/README.md`
- `skills/engineering/ask-matt/SKILL.md`
- `skills/engineering/setup-matt-pocock-skills/SKILL.md`
- `skills/engineering/to-spec/SKILL.md`
- `skills/engineering/to-tickets/SKILL.md`

Upstream-added files that carry fork divergences without conflicting are
`skills/engineering/implement-spec/SKILL.md` and
`docs/engineering/implement-spec.md`; an upstream edit to either applies
cleanly and can silently reintroduce ticket-driven building. Diff them against
upstream on every integration. Git also auto-merged a duplicated paragraph in
`docs/engineering/to-tickets.md` after upstream reordered its questions, so
scan resolved docs for duplicated lines.

Textual conflicts are not the full risk. Upstream may automatically merge a
sentence that still routes directly from a spec or ticket to `implement`, or may
introduce a new install surface pointing at `mattpocock/skills`. Always search
the whole repository after resolving Git's conflict markers.

## Upstream update procedure

### Before merging

1. Require a clean working tree and confirm the current branch.
2. Read this document and the upstream commit/PR descriptions.
3. Fetch `origin` and `upstream`.
4. Record the commits unique to each side:

   ```bash
   git rev-list --left-right --count main...upstream/main
   git log --oneline main..upstream/main
   git diff --stat main...upstream/main
   ```

5. Identify changes touching the primary and supporting surfaces listed above.

### During the merge

1. Merge `upstream/main` with a merge commit; do not rebase or squash.
2. Trace conflicting changes to their commits and PRs before resolving them.
3. Prefer upstream's current structure and wording where it is compatible.
4. Reapply the fork invariants rather than restoring obsolete fork prose.
5. Preserve both parents' intent when compatible. When incompatible, the
   intentional divergences in this contract take precedence.

### After resolving conflicts

Search for semantic regressions, not only conflict markers:

```bash
rg -n '^(<<<<<<<|=======|>>>>>>>)' .
rg -n 'to-tickets.*implement|tickets.*implement|spec.*implement' README.md CLAUDE.md .agents docs skills
rg -n 'to-spec.*issue tracker|publish.*spec|ready-for-agent' README.md CLAUDE.md .agents docs skills
rg -n 'mattpocock/skills|official marketplace|claude plugins install mattpocock-skills' README.md CLAUDE.md .agents .claude-plugin package.json skills
```

Review every match in context. References that explicitly identify upstream are
valid; fork installation commands or flows that bypass `to-plan` are not.

Then verify:

```bash
git diff --check
npm run check-plugin-version
claude plugin validate . --strict
```

Also confirm manually that:

- every promoted skill appears in the top-level README, its bucket README, the
  plugin manifest, and a matching docs page;
- user/model invocation metadata agrees between `SKILL.md` and
  `agents/openai.yaml`;
- `ask-matt` routes every user-reachable build path through `to-plan` before
  `implement`;
- `to-spec` and `to-plan` write only to their fixed `.scratch/` paths and never
  publish to an issue tracker;
- README and `.agents/install-block.md` use the fork's installation commands;
- this document's baseline, conflict surface, divergence register, and decision
  history reflect the integration just completed.

## Decision history

### 2026-07-17: Add resumable per-work-item planning

Fork PR #1 introduced `to-plan` and deepened `implement` into a resumable plan
executor. The originating commits are `37c1d10`, `6e08be5`, and `2ab6905`, with
terminology follow-ups `64359cb` and `399813c`.

### 2026-07-19: Make fork identity explicit

Fork PR #2 kept the `mattpocock-skills` plugin name while changing maintainer,
repository, marketplace, install commands, and user-facing description to the
`steny138` distribution. The originating commit is `c0f52cb`.

### 2026-08-12: Integrate upstream through 1.2.3

Merge commit `222d284` integrated upstream `84fdeff`. The integration accepted
upstream's 1.2.3 release, skill promotions and retirements, docs rewrite, router
improvements, and release tooling. It retained the fork distribution identity
and adapted the new upstream docs and routing surfaces to preserve the mandatory
`to-plan → implement` boundary.

### 2026-08-12: Keep specs and plans local-only

`to-spec` was changed from publishing a `ready-for-agent` issue to writing
`.scratch/<feature>/spec.md`. `to-plan` retained its fixed
`.scratch/<feature>/plans/<work-item>-plan.md` destination and gained an explicit
no-publication invariant. Issue tracker configuration remains available to
`to-tickets`, `triage`, and `wayfinder`, but no longer controls spec or plan
output.

### 2026-10-05: Integrate upstream through 1.3.1

The integration merged upstream `4588b32`, absorbing the 1.3.0 and 1.3.1
releases: `implement-spec`, `pr`, and `retro` graduated to engineering,
`resolving-merge-conflicts` was removed, the `CONTEXT.md` convention was
renamed to `GLOSSARY.md`, em-dashes were removed repo-wide, and cross-skill
invocation moved to explicit Skill tool calls. The fork kept its distribution
identity and local spec and plan destinations, inserted `to-plan` into the new
`retro`-terminated main flow, and rewrote `implement-spec` as a parallel
approved-plan executor (divergence 6). The fork's own `implement` and `to-plan`
adopted the Skill tool phrasing for `tdd` and `code-review`, and their prose
dropped em-dashes.

### 2026-10-06: Ship the `plan-progress` mod

The fork added `mods/plan-progress/`, a Claude Code mod that draws the running
`implement` plan above the prompt as a stepper with a running cat, as a second
plugin in the fork's marketplace (divergence 7). Its parser reads the `to-plan`
plan template, so that format now has a consumer outside the skills.

### 2026-10-07: Locate specs and plans by the current branch's worktree

`to-plan` wrote to "the current repository" (read as the linked worktree) while
the installed 1.3.1 `implement` accepted only the main worktree's `.scratch/`,
so a session moved its plan with `mv` instead of asking. `9c3f600` widened
`implement` on main, but no release followed, so installed plugins kept the old
rule. `to-spec`, `to-tickets` (local files), `to-plan`, `implement`, and
`implement-spec` now all locate the current branch and the worktree it is
checked out in first, and keep the spec, local tickets, plans, and run record
there; `implement` accepts a plan in another worktree only once it names this
worktree, asks before rebinding a plan whose workspace or branch differs (as
plans written before this rule may), and never moves or copies one (divergences
4 and 6). `implement-spec` fixes its orchestrating worktree at the start of a
run, records its path, and resumes from it. The fork's release workflow has never run, so its own fixes do not change
the version; the plugin version was bumped by hand to `1.3.2` so installed
copies update, with a hand-written `CHANGELOG.md` entry. The `plan-progress` mod
moved from `0.1.6` to the same `1.3.2` so that entry covers its fix too.
Reconcile both with upstream's next release on integration.
