# The canonical install block

One install story, one wording. `README.md`, `.changeset/*`, and every page under `docs/` must say **this** and nothing else. Change it here first, then propagate.

The upstream `mattpocock-skills` is listed in Claude Code's official marketplace, but that listing points to `mattpocock/skills`, not this fork. Install this fork from its repository marketplace so the fork's `to-plan` and resumable `implement` workflow are present.

## Claude Code — the plugin

<canonical-block name="claude-code">

```bash
claude plugin marketplace add steny138/mattpocock-skills
claude plugin install mattpocock-skills@steny138
```

Or, from inside a session:

```
/plugin marketplace add steny138/mattpocock-skills
/plugin install mattpocock-skills@steny138
```

This installs the fork's managed plugin rather than the separate upstream listing.

</canonical-block>

## Codex, and other agents — skills.sh

The plugin is Claude Code only. Everywhere else, [skills.sh](https://skills.sh/steny138/mattpocock-skills) copies editable skill files into the project. Use the whole-set form on `README.md`:

<canonical-block name="skills-sh-whole-set">

```bash
npx skills@latest add steny138/mattpocock-skills
```

Pick the skills you want, and which coding agents to install them on. **The installer lets you choose which skills to take — make sure `setup-matt-pocock-skills` is one of them.**

</canonical-block>

…and the single-skill form wherever one skill is named on its own. Note that **`docs/` pages are not a consumer of this block**: ai-hero renders the install widget above the body, so a page that writes the commands out duplicates it. See [writing-docs.md](./writing-docs.md).

<canonical-block name="skills-sh-one-skill">

```bash
npx skills@latest add steny138/mattpocock-skills --skill=<name>
```

```bash
npx skills@latest update <name>
```

</canonical-block>

`skills@latest` is the pinned spelling in all three. The pages under `docs/` used to carry their own copy of these commands; those blocks are now deleted rather than corrected, because the site renders the install commands itself.

## The two routes are exclusive

The plugin is a managed, read-only bundle you subscribe to. skills.sh writes files you own and edit. Installing both leaves the user with every skill twice — always say "pick one".

## Upstream is a separate distribution

`claude plugins install mattpocock-skills` installs the official-marketplace package sourced from `mattpocock/skills`. Do not present it as an installation route for this fork.
