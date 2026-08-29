# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repository (`Claude---First-Project`) currently contains no application source code, build tooling, or tests — it is a bare skeleton consisting of:

- `README.md` — a one-line project title, no further documentation.
- `skills-lock.json` — a lockfile tracking Claude Code skills installed from external sources (currently just `frontend-design`).
- `.claude/skills/` and `.agents/skills/` — duplicate copies of installed skill packages (see below). Both trees are kept in sync by the skill installer; don't edit one without the other.

There is no package manager manifest (`package.json`, `pyproject.toml`, etc.), no build system, and no test runner configured. There are no commands to build, lint, or test because there is nothing yet to build, lint, or test. When adding the first real code to this repo, also add the corresponding build/lint/test tooling and update this file with the actual commands.

## Installed skills

- **frontend-design** (`.claude/skills/frontend-design/SKILL.md`, mirrored at `.agents/skills/frontend-design/SKILL.md`): sourced from `anthropics/skills` per `skills-lock.json`. It provides guidance for producing distinctive, non-templated visual/UI design (palette, typography, layout, motion) rather than defaulting to generic AI-generated design patterns. This is guidance for Claude Code to follow when doing frontend/design work in this repo, not application code.

Because skill content is externally sourced and hash-pinned in `skills-lock.json`, don't hand-edit the files under `.claude/skills/` or `.agents/skills/` — update via the skill installer so the lockfile hash stays accurate.
