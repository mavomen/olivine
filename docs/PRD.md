# Olivine — Product Specification

A local-first, terminal-based spaced repetition tool for Obsidian vaults
and standalone markdown note directories.

---

## Overview

Olivine is a **TUI-first CLI application** that turns a directory of
markdown files into a digital Leitner box. Cards are plain markdown files
with optional YAML frontmatter. The tool schedules reviews using a 7-box
Leitner system, tracks progress in SQLite, and provides a full‑screen
keyboard‑driven terminal interface for review and card management.

There is no web interface, no cloud sync, no AI, and no mobile app.
Everything happens in the terminal, offline, against your local files.

---

## Core Features

### Leitner Box Scheduling

Cards live in one of 7 boxes. A correct answer promotes the card to the
next box; a wrong answer sends it back to Box 1. Cards that pass Box 7
are archived. Box intervals double each level: Box 1 is every day,
Box 7 is every 64 days.

### Terminal Review (TUI)

Full‑screen card flipping with `blessed`. Press `Space` to reveal the
answer, `Backspace` to hide it, `0`–`4` to rate recall. Shows current
box number, progress through the session, and a summary at the end.

### Vim‑Modal Card Editor

Create and edit cards in a keyboard‑driven form with INSERT and NORMAL
modes. Supports `h`/`l`/`w`/`b` movement, `dd`/`dw`/`ciw` deletion,
`yy`/`p` yank/paste, `o`/`O` open line, and `u` undo. Tags can be added
as comma‑separated values.

### Tag System

Tags are extracted from YAML frontmatter (`tags: [math, cs]`) and stored
in the database. All major commands accept `--tag` to filter: review,
stats, due, and browse.

### Browse TUI

A two‑panel full‑screen browser with a scrollable card list on the left
and a detail view on the right. Supports real‑time filtering by text,
tag, or box. Inline actions: edit, add, delete, and view review history.

### Practice Mode

Flip through due cards without recording any reviews. Ideal for warm‑ups
or exploring a topic without affecting your schedule.

### Statistics

Box distribution, streak, due counts, total reviews, and archived card
count — all available via `olivine stats`, optionally filtered by tag.

### Card Search

`olivine grep <pattern>` searches all cards by question or answer content
with highlighting.

---

## Architecture

```

src/
├── cli/ Command definitions (Commander)
├── tui/ Terminal UI components (blessed)
│ ├── browse/ Full‑screen card browser
│ ├── review/ Review session card rendering
│ └── card-form.ts Vim‑modal add/edit form
├── review/ Review session logic (state, loader, runner)
├── scheduling/ Scheduling service + Leitner algorithm
├── database/ SQLite connection, migrations, bootstrap
├── models/ Note, Review, Scheduling repositories
├── vault/ Markdown scanner, parser, sync
├── stats/ Calculator and formatter
├── config/ Constants, loader, initializer
└── utils/ Date, error, fs, logger, validation

```

- **Database:** SQLite via `sql.js` (WASM, no native dependencies)
- **CLI framework:** Commander + Inquirer (lazy‑loaded)
- **TUI framework:** Blessed (custom widgets built on low‑level elements)
- **Markdown parsing:** gray‑matter with H1 fallback for titles
- **Testing:** Jest (52 suites, 463 tests)
- **CI/CD:** GitHub Actions (Node 20/22/24 matrix)

---

## Technology Stack

| Layer    | Choice               | Reason                             |
| -------- | -------------------- | ---------------------------------- |
| Runtime  | Node.js ≥ 20         | Stable LTS                         |
| Language | TypeScript (strict)  | Type safety, maintainability       |
| Database | SQLite via sql.js    | WASM portability, Node 26 compat   |
| CLI      | Commander + Inquirer | Standard, lazy‑loaded              |
| TUI      | Blessed              | Lightweight, keyboard‑first        |
| Parsing  | gray‑matter          | Robust YAML frontmatter extraction |
| Testing  | Jest + ts‑jest       | Fast, familiar                     |

---

## What's Not Included

- No web dashboard or browser interface
- No Electron or desktop app
- No cloud sync or multi‑machine sync
- No AI categorization or auto‑tagging
- No plugin system
- No mobile support
- No REST API or Express backend

These are intentionally out of scope. Olivine is a terminal tool, and it
stays a terminal tool.

---

## Scheduling Algorithms

| Algorithm | Status | Description |
|-----------|--------|-------------|
| Leitner | **Shipped** | 7 boxes, promote/demote, archive on graduation |
| SM‑2 | **Shipped** | Ease-factor based scheduling (classic SuperMemo) |
| FSRS | **Shipped** | Adaptive algorithm with 21 configurable weights |

Switch between algorithms per session with `--algo <name>` or permanently
with `olivine migrate <vault> --algo <name>`.

---

## Commands (Quick Reference)

| Command                      | Description                                 |
| ---------------------------- | ------------------------------------------- |
| `init [vault]`                 | Bootstrap `.olivine` directory and database |
| `add <vault>`                  | Create a card (TUI form with vim motions)   |
| `scan <vault>`                 | Sync markdown files into the database       |
| `review <vault>`               | Start a review session (prompts or TUI)     |
| `review <vault> --tui`         | TUI review session                          |
| `review <vault> --tag <tag>`   | Review filtered by tag                      |
| `review <vault> --algo <name>` | Algorithm override per session              |
| `review <vault> --shuffle`     | Randomize card order                        |
| `review <vault> --limit <n>`   | Cap session size                            |
| `review <vault> --quality <n>` | Fixed rating (non-interactive)              |
| `practice <vault>`             | Practice without saving results             |
| `practice <vault> --tag <tag>` | Practice filtered by tag                    |
| `practice <vault> --algo <n>`  | Algorithm override for practice             |
| `practice <vault> --shuffle`   | Randomize practice order                    |
| `practice <vault> --limit <n>` | Cap practice session                        |
| `stats <vault>`                | Show box distribution, streak, etc.         |
| `stats <vault> --tui`          | Full-screen TUI stats dashboard             |
| `stats <vault> --tag <tag>`    | Stats filtered by tag                       |
| `stats <vault> --json`         | Output statistics as JSON                   |
| `tag <vault>`                  | List all tags with card counts              |
| `tag <vault> <tagname>`        | List cards with a specific tag              |
| `tag <vault> --json`           | Output tags as JSON                         |
| `tag <vault> --rename <old>:<new>` | Rename a tag across all cards           |
| `tag <vault> --delete <tag>`   | Remove a tag from all cards                 |
| `due <vault>`                  | Count due cards                             |
| `due <vault> --json`           | Output due count as JSON                    |
| `browse <vault>`               | Browse cards (interactive list)             |
| `browse <vault> --tui`         | Full‑screen card browser                    |
| `browse <vault> --tag <tag>`   | Filter by tag                               |
| `browse <vault> --all`         | Include archived cards                      |
| `browse <vault> --id <id>`     | View a single card                          |
| `browse <vault> --id <id> --json` | Output as JSON                          |
| `grep <vault> <pattern>`       | Search cards by content                     |
| `edit <vault>`                 | Edit an existing card (interactive)         |
| `edit <vault> --id <id>`       | Edit a specific card                        |
| `edit <vault> --id --title --content` | Non-interactive edit                  |
| `edit <vault> --id --title --content --tags` | Edit with tags                 |
| `config <vault>`               | View or update settings (`--set`)           |
| `unarchive <vault> --id <id>`  | Unarchive a specific card                   |
| `unarchive <vault> --all`      | Unarchive all cards                         |
| `log <vault> <note-id>`        | Show review history and scheduling for a card |
| `suspend <vault> [--id <id>]`  | Suspend a card (excludes from reviews)      |
| `unsuspend <vault> [--id <id>\|--all]` | Unsuspend a card back into rotation    |
| `migrate <vault> --algo <n>`   | Migrate all cards to a new algorithm        |
| `export <vault>`               | Export all data as JSON                     |
| `export <vault> --output <f>`  | Export to file                              |
| `import <vault> <file>`        | Import from JSON backup                     |

---

## Version History

- **v0.4.0** — FSRS algorithm, export/import, migrate, non-TTY fallback
- **v0.3.1** — Codebase refactor for clarity; documentation
- **v0.3.0** — TUI browse, tags, grep, practice mode, Leitner algorithm
- **v0.2.0** — Inquirer review, stats, due, config, edit, browse commands
- **v0.1.0** — Foundation: SQLite, vault scanner, SM‑2 scheduling

---

## Documentation

- [README.md](../README.md) — project overview
- [GUIDE.md](GUIDE.md) — installation and usage
- [ADR.md](ADR.md) — architecture decisions
- [CONTRIBUTING.md](../CONTRIBUTING.md) — workflow and conventions
- [CHANGELOG.md](../CHANGELOG.md) — release notes
