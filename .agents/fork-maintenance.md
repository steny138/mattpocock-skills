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

- Upstream integrated through: `84fdeffd12f2ee307994d1eb6feb48173b6e0502`
- Fork integration commit: `222d28471d4206b5a1a1379122493a44f300bdba`
- Integration date: 2026-08-12
- Upstream package version absorbed: `1.2.3`

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
grill-with-docs → to-spec → to-tickets → to-plan → implement → code-review
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
- `skills/engineering/ask-matt/SKILL.md`

Required supporting surfaces:

- `.claude-plugin/plugin.json`
- `README.md`
- `skills/engineering/README.md`
- `docs/engineering/to-plan.md`
- `docs/engineering/implement.md`
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

- The plan path remains under the current repository's `.scratch/` directory.
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

The 2026-08-12 integration produced textual conflicts in these files:

- `.claude-plugin/plugin.json`
- `README.md`
- `docs/engineering/ask-matt.md`
- `docs/engineering/code-review.md`
- `docs/engineering/implement.md`
- `docs/engineering/tdd.md`
- `docs/engineering/to-spec.md`
- `docs/engineering/to-tickets.md`
- `skills/engineering/ask-matt/SKILL.md`
- `skills/engineering/to-tickets/SKILL.md`

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

### 2026-07-17 — Add resumable per-work-item planning

Fork PR #1 introduced `to-plan` and deepened `implement` into a resumable plan
executor. The originating commits are `37c1d10`, `6e08be5`, and `2ab6905`, with
terminology follow-ups `64359cb` and `399813c`.

### 2026-07-19 — Make fork identity explicit

Fork PR #2 kept the `mattpocock-skills` plugin name while changing maintainer,
repository, marketplace, install commands, and user-facing description to the
`steny138` distribution. The originating commit is `c0f52cb`.

### 2026-08-12 — Integrate upstream through 1.2.3

Merge commit `222d284` integrated upstream `84fdeff`. The integration accepted
upstream's 1.2.3 release, skill promotions and retirements, docs rewrite, router
improvements, and release tooling. It retained the fork distribution identity
and adapted the new upstream docs and routing surfaces to preserve the mandatory
`to-plan → implement` boundary.

### 2026-08-12 — Keep specs and plans local-only

`to-spec` was changed from publishing a `ready-for-agent` issue to writing
`.scratch/<feature>/spec.md`. `to-plan` retained its fixed
`.scratch/<feature>/plans/<work-item>-plan.md` destination and gained an explicit
no-publication invariant. Issue tracker configuration remains available to
`to-tickets`, `triage`, and `wayfinder`, but no longer controls spec or plan
output.
