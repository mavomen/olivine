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
- **Testing:** Jest (22 suites, 98 tests)
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

**Current:** Leitner Box (7 boxes, promote/demote, archive on graduation).

**Planned (future):**

- SM‑2 — ease‑factor based scheduling
- FSRS — adaptive algorithm that models memory decay

The codebase is structured to support multiple algorithms. Switching
between them will be possible per vault or per tag.

---

## Commands (Quick Reference)

| Command                      | Description                                 |
| ---------------------------- | ------------------------------------------- |
| `init <vault>`               | Bootstrap `.olivine` directory and database |
| `add <vault>`                | Create a card (TUI form with vim motions)   |
| `scan <vault>`               | Sync markdown files into the database       |
| `review <vault> --tui`       | Start a TUI review session                  |
| `review --tag <tag> <vault>` | Review only cards with a tag                |
| `practice <vault>`           | Practice without saving results             |
| `stats <vault>`              | Show box distribution, streak, etc.         |
| `due <vault>`                | Count due cards                             |
| `browse <vault> --tui`       | Full‑screen card browser                    |
| `grep <vault> <pattern>`     | Search cards by content                     |
| `edit <vault>`               | Edit an existing card                       |
| `config <vault>`             | View or update settings                     |
| `unarchive <vault>`          | Return an archived card to Box 1            |

---

## Version History

- **v0.3.1** — Codebase refactor for clarity; documentation
- **v0.3.0** — TUI browse, tags, grep, practice mode, Leitner algorithm
- **v0.2.0** — Inquirer review, stats, due, config, edit, browse commands
- **v0.1.0** — Foundation: SQLite, vault scanner, SM‑2 scheduling

---

## Documentation

- [README.md](README.md) — installation and usage
- [docs/ADR.md](docs/ADR.md) — architecture decisions
- [CONTRIBUTING.md](CONTRIBUTING.md) — workflow and conventions
- [CHANGELOG.md](CHANGELOG.md) — release notes
