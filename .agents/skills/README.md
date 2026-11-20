# Project skills

Store reusable, project-specific agent skills here. Follow the repository's
[AGENTS.md](../../AGENTS.md) when creating or using skills.

Give each skill its own directory:

```text
.agents/
  skills/
    README.md
    <skill-name>/
      SKILL.md
      scripts/       # Optional executable helpers
      references/    # Optional supporting documentation
      assets/        # Optional templates and other resources
```

Each `SKILL.md` should include YAML frontmatter with a `name` and `description`,
followed by the skill's instructions. Describe when the skill applies and keep
its workflow focused. Add supporting directories only when needed.

Do not store credentials, environment files, private customer data, or generated
runtime output in skills.

## One set of skills for every provider

This directory is the only copy. Skills follow the
[Agent Skills](https://agentskills.io/) open standard, so each tool reads the same
files:

- **Codex** reads `.agents/skills/` natively.
- **Claude Code** reads `.claude/skills/`, which is a symlink to this directory
  (`.claude/skills -> ../.agents/skills`). Do not put skills in `.claude/skills/`
  directly, and do not replace the symlink with a copy.

Keep each skill portable:

- Use only `name` and `description` in the frontmatter. Leave out
  provider-specific fields such as `allowed-tools`.
- Describe actions, not one product's tool names: write "edit the file" or "run
  `npm run check` in EnsuredAPI", not `Edit` or `apply_patch`.
- Put helpers in `scripts/` and call them from the shell, which every provider
  can do.

## Workspace skills and repository skills

Skills live at two levels:

- **Workspace skills** (this directory) apply across the platform: delivery
  rules, product principles, and work that spans several services.
- **Repository skills** apply to one service. Each code submodule (`EnsuredAPI`,
  `EnsuredUI`, `EnsuredAuth` and the rest) has its own `.agents/skills/`, with
  the same `.claude/skills` symlink and the same portability rules.

Put a skill at the narrowest level that covers it, and never copy one skill into
both levels.

Which skills an agent sees depends on where it starts. Each submodule is its own
repository, and agents stop searching at the repository root:

- **Started in this workspace root:** both providers load workspace skills.
  Claude Code also finds a submodule's skills when it works on files in that
  submodule. Codex searches upward only, so it does not load submodule skills.
- **Started inside a submodule:** both providers load that repository's skills
  but not workspace skills.

To use a workspace skill and a repository skill together with Codex, start Codex
in the workspace root and tell it to read the repository skill's `SKILL.md`.
