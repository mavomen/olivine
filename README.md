# Olivine

A local-first CLI spaced repetition tool for Obsidian vaults.

## Scheduling Algorithms

| Algorithm | Description |
|-----------|-------------|
| **Leitner** (default) | 7 boxes with doubling intervals. Correct answers promote; wrong answers demote to Box 1. Cards that pass Box 7 are archived. |
| **SM‑2** | Ease-factor based scheduling — the classic SuperMemo algorithm. |
| **FSRS** | Modern adaptive algorithm that models memory decay using 21 configurable weights. |

Switch between algorithms per session with `--algo <name>` or permanently with `olivine migrate`.

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

See **[docs/GUIDE.md](docs/GUIDE.md)** for installation, quick start, and detailed usage for every command.

## Commands

| Command                      | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `init <vault>`                 | Create `.olivine` directory, database, and config |
| `add <vault>`                  | Create a new card (TUI form)                      |
| `scan <vault>`                 | Sync all markdown files into the database         |
| `review <vault>`               | Start an interactive review session               |
| `review <vault> --tui`         | Full‑screen TUI review (keyboard‑driven)          |
| `review <vault> --tag <tag>`   | Review only cards with a specific tag             |
| `review <vault> --algo <name>` | Override scheduling algorithm for this session    |
| `review <vault> --shuffle`     | Randomize card order                              |
| `review <vault> --limit <n>`   | Cap session to at most `n` cards                  |
| `review <vault> --quality <n>` | Fixed quality rating (skips prompts)              |
| `practice <vault>`             | Practice cards without affecting scheduling       |
| `practice <vault> --tag <tag>` | Practice filtered by tag                          |
| `practice <vault> --algo <n>`  | Algorithm override for practice                   |
| `practice <vault> --shuffle`   | Randomize practice order                          |
| `practice <vault> --limit <n>` | Cap practice session size                         |
| `stats <vault>`                | Show learning statistics                          |
| `stats <vault> --tui`          | Full‑screen TUI stats dashboard                   |
| `stats <vault> --tag <tag>`    | Statistics filtered by tag                        |
| `due <vault>`                  | Show number of due cards                          |
| `browse <vault>`               | Browse all cards (interactive list)               |
| `browse <vault> --tui`         | Full‑screen TUI browser with search               |
| `browse <vault> --tag <tag>`   | Filter by tag                                     |
| `browse <vault> --all`         | Include archived cards                            |
| `browse <vault> --id <id>`     | View a single card                                |
| `browse <vault> --id <id> --json` | Output card data as JSON                      |
| `grep <vault> <pattern>`       | Search cards by content                           |
| `edit <vault>`                 | Edit an existing card (interactive)               |
| `edit <vault> --id <id>`       | Edit a specific card by ID                        |
| `edit <vault> --id --title --content` | Non‑interactive edit                      |
| `edit <vault> --id --title --content --tags` | Edit with tags                      |
| `config <vault>`               | View or update config (`--set cardsDir=foo`)      |
| `unarchive <vault> --id <id>`  | Bring an archived card back to Box 1              |
| `unarchive <vault> --all`      | Unarchive all archived cards                      |
| `migrate <vault> --algo <n>`   | Migrate all cards to a different algorithm        |
| `export <vault>`               | Export all data as JSON (stdout)                  |
| `export <vault> --output <f>`  | Export to file                                    |
| `import <vault> <file>`        | Import data from a JSON backup                    |

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

- [GUIDE.md](docs/GUIDE.md) — installation, quick start, and detailed usage
- [ADR.md](docs/ADR.md) — architecture decisions
- [CONTRIBUTING.md](CONTRIBUTING.md) — workflow and conventions

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
