# Olivine

A local-first CLI spaced repetition tool for Obsidian vaults.

## Scheduling Algorithms

**Current:**

- **Leitner Box** (7 boxes) — cards are promoted on correct answers and demoted to Box 1 on wrong answers. Cards that pass Box 7 are automatically archived.

**Planned (future):**

- SM‑2 — ease‑factor based scheduling (the classic SuperMemo algorithm)
- FSRS — a modern, adaptive algorithm that learns your memory patterns

You’ll be able to switch between them per vault or even per tag.

---

## Features

- **Leitner Box scheduling** — cards progress through 7 boxes
- **TUI review** — full‑screen terminal card flipping (blessed)
- **Vim‑modal card editor** — create / edit cards with INSERT / NORMAL modes
- **Tag system** — filter reviews, stats, and browsing by tag
- **Browse TUI** — two‑panel card browser with search, filter, and inline actions
- **Practice mode** — flip through cards without affecting scheduling
- **Stats** — box distribution, streak, due counts
- **Export** — all data stored as plain Markdown + SQLite

## Requirements

- **Node.js** ≥ 20
- **npm** ≥ 9

## Installation

```bash
git clone https://github.com/mavomen/olivine
cd olivine
npm install
npm run build
```

Optionally, link the executable globally:

```bash
npm link
```

## Quick Start

```bash
# 1. Initialize a vault
olivine init ~/my-vault

# 2. Add some cards (TUI form with vim motions)
olivine add ~/my-vault

# 3. Scan existing markdown files (optional)
olivine scan ~/my-vault

# 4. Review due cards (TUI)
olivine review ~/my-vault --tui

# 5. Check your stats
olivine stats ~/my-vault
```

## Commands

| Command                      | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `init <vault>`               | Create `.olivine` directory, database, and config |
| `add <vault>`                | Create a new card (TUI form)                      |
| `scan <vault>`               | Sync all markdown files into the database         |
| `review <vault>`             | Start an interactive review session               |
| `review --tui <vault>`       | Full‑screen TUI review (keyboard‑driven)          |
| `review --tag <tag> <vault>` | Review only cards with a specific tag             |
| `practice <vault>`           | Practice cards without affecting scheduling       |
| `stats <vault>`              | Show learning statistics                          |
| `stats --tag <tag> <vault>`  | Statistics filtered by tag                        |
| `due <vault>`                | Show number of due cards                          |
| `browse <vault>`             | Browse all cards (Inquirer list)                  |
| `browse --tui <vault>`       | Full‑screen TUI browser with search               |
| `browse --tag <tag> <vault>` | Filter by tag                                     |
| `browse --all <vault>`       | Include archived cards                            |
| `grep <vault> <pattern>`     | Search cards by content                           |
| `edit <vault>`               | Edit an existing card                             |
| `config <vault>`             | View or update config (`--set cardsDir=foo`)      |
| `unarchive <vault>`          | Bring an archived card back to Box 1              |

## TUI Controls

### Review

- `Space` — reveal answer
- `Backspace` — hide answer (go back to question)
- `0`–`4` — rate recall quality
- `q` — quit

### Add / Edit (vim‑modal)

- **INSERT mode:** type normally, `Tab` to switch fields
- `Esc` — enter NORMAL mode
- **NORMAL mode:** `h/l/w/b/0/$` move, `i/a/I/A` edit, `x` delete, `dd/dw/de` delete, `yy/p` yank/paste, `ciw` change word, `o/O` open line, `u` undo
- `Ctrl+S` — save
- `Ctrl+Q` or `q` (NORMAL) — cancel

### Browse TUI

- `j/k` or arrows — navigate
- `/` — filter by text
- `b` — filter by box
- `Enter` — edit selected card
- `a` — add new card
- `d` — delete selected card
- `h` — view review history
- `q` — quit

## Documentation

Architecture decisions are documented in [docs/ADR.md].

## Architecture

```
src/
├── cli/              CLI command definitions
├── tui/              Blessed terminal UI components
│   ├── browse/       Full‑screen card browser
│   └── review/       Review session card rendering
├── review/           Review session logic (state, loader)
├── scheduling/       Scheduling service + Leitner algorithm
├── database/         SQLite connection, migrations
├── models/           Note, Review, Scheduling repositories
├── vault/            Markdown scanner, parser, sync
├── stats/            Statistics calculator and formatter
├── config/           Configuration management
└── utils/            Shared utilities
```

## License

MIT
