# Olivine User Guide

## Installation

```bash
git clone https://github.com/mavomen/olivine
cd olivine
npm install
npm run build
```

Optionally link the executable globally:

```bash
npm link
```

**Requirements:** Node.js ≥ 20, npm ≥ 9

---

## Quick Start

```bash
# 1. Initialize a vault
olivine init ~/my-vault

# 2. Add cards (TUI form with vim motions)
olivine add ~/my-vault

# 3. Scan existing markdown files
olivine scan ~/my-vault

# 4. Review due cards
olivine review ~/my-vault --tui

# 5. Check your stats
olivine stats ~/my-vault
```

---

## How Olivine Works

Olivine is a spaced repetition system that runs entirely in your terminal. Your cards are plain markdown files — one file per card — optionally with YAML frontmatter for metadata (title, tags, creation date). The tool scans your vault, loads the cards into a local SQLite database, and schedules reviews using one of three algorithms:

- **Leitner Box** — 7 boxes with doubling intervals. Correct answers promote a card; wrong answers demote it to Box 1. Cards that pass Box 7 are archived.
- **SM-2** — The classic SuperMemo algorithm. Each card has an ease factor and interval that adjusts based on recall quality.
- **FSRS** — A modern, adaptive algorithm that models your memory retention using a set of 21 configurable weights. Requires a short learning period to converge.

The filesystem is the source of truth. Olivine never modifies your markdown files — scheduling data lives only in the database.

---

## Command Reference

### `init`

Bootstrap an Obsidian vault or directory with the `.olivine` database and config.

```bash
olivine init <vaultPath>
```

### `add`

Create a new card using the TUI vim-modal form.

```bash
olivine add <vaultPath>
```

### `archive`

Manually archive a card before it reaches Box 7. Archived cards are excluded from reviews.

```bash
olivine archive <vaultPath>                # Interactive picker (requires TTY)
olivine archive <vaultPath> --id <noteId>  # Archive by ID
```

### `scan`

Import all markdown files from the vault into the database. Idempotent — safe to run repeatedly.

```bash
olivine scan <vaultPath>
```

### `review`

Start a review session for cards that are due today.

```bash
olivine review <vaultPath> --tui          # Full-screen blessed TUI
olivine review <vaultPath>                # Inquirer-based prompts
olivine review <vaultPath> --tag math     # Only cards with a specific tag
olivine review <vaultPath> --algo fsrs    # Override algorithm for this session
olivine review <vaultPath> --shuffle      # Randomize card order
olivine review <vaultPath> --limit 10     # Maximum cards to review
olivine review <vaultPath> --quality 4    # Fixed rating (non-interactive, skips prompts)
```

### `practice`

Flip through due cards without saving any reviews. No scheduling changes.

```bash
olivine practice <vaultPath> --tui
olivine practice <vaultPath> --tag math
olivine practice <vaultPath> --limit 10
olivine practice <vaultPath> --algo fsrs
olivine practice <vaultPath> --shuffle
```

### `browse`

Browse all cards in the vault.

```bash
olivine browse <vaultPath>                   # Interactive list (requires TTY)
olivine browse <vaultPath> --tui             # Full-screen TUI browser
olivine browse <vaultPath> --id <noteId>     # View a single card
olivine browse <vaultPath> --id <noteId> --json  # Single card as JSON
olivine browse <vaultPath> --tag math        # Filter by tag
olivine browse <vaultPath> --all             # Include archived cards
olivine browse <vaultPath> --sort box        # Sort by box, title, created, or due
```

### `edit`

Edit an existing card.

```bash
olivine edit <vaultPath>                          # Interactive (requires TTY)
olivine edit <vaultPath> --id <noteId>            # Select card by ID (TTY form)
olivine edit <vaultPath> --id <noteId> --title "New Q" --content "New A"       # Non-TTY
olivine edit <vaultPath> --id <noteId> --title "Q" --content "A" --tags "math,cs"  # With tags
```

### `stats`

Show learning statistics.

```bash
olivine stats <vaultPath>              # Box distribution, streak, due counts
olivine stats <vaultPath> --tui        # Full-screen TUI dashboard
olivine stats <vaultPath> --tag math   # Filter by tag
```

### `due`

Show the number of cards due for review today.

```bash
olivine due <vaultPath>
olivine due <vaultPath> --json              # Machine-readable JSON output
```

### `tag`

List tags and manage them across cards.

```bash
olivine tag <vaultPath>                         # List all tags with card counts
olivine tag <vaultPath> <tagname>               # List cards with a specific tag
olivine tag <vaultPath> --json                  # Output tags as JSON
olivine tag <vaultPath> --rename "old:new"      # Rename a tag across all cards
olivine tag <vaultPath> --delete math           # Remove a tag from all cards
```

### `tui`

Open the landing dashboard with due count, stats, and quick-access menu.

```bash
olivine tui <vaultPath>                         # Full-screen dashboard (requires TTY)
```

### `suspend`

Exclude a card from reviews without archiving it. Suspended cards stay in the database but won't appear in due counts, review sessions, or stats.

```bash
olivine suspend <vaultPath>                     # Interactive picker (requires TTY)
olivine suspend <vaultPath> --id <noteId>       # Suspend by ID
```

### `unsuspend`

Bring a suspended card back into review rotation. The card is reset to Box 1.

```bash
olivine unsuspend <vaultPath> --id <noteId>     # Unsuspend a specific card
olivine unsuspend <vaultPath> --all             # Unsuspend all suspended cards
```

### `log`

Show the full review history and current scheduling state for a card.

```bash
olivine log <vaultPath> <noteId>
```

Displays: review timestamps with quality ratings, current box, interval, ease factor, stability, difficulty, and algorithm.

### `grep`

Search cards by question or answer content. Case-insensitive.

```bash
olivine grep <vaultPath> <pattern>
```

### `config`

View or update configuration.

```bash
olivine config <vaultPath>                      # View current config
olivine config <vaultPath> --set cardsDir=foo   # Set cards directory
olivine config <vaultPath> --set algorithm=sm2  # Set default algorithm
```

### `unarchive`

Return an archived card to Box 1.

```bash
olivine unarchive <vaultPath> --id <noteId>
olivine unarchive <vaultPath> --all
```

### `migrate`

Change the scheduling algorithm for all cards in the database.

```bash
olivine migrate <vaultPath> --algo sm2    # Migrate to SM-2
olivine migrate <vaultPath> --algo fsrs   # Migrate to FSRS
olivine migrate <vaultPath> --algo leitner
```

### `export`

Export all cards and review data to a JSON file.

```bash
olivine export <vaultPath>                         # Prints to stdout
olivine export <vaultPath> --output backup.json   # Writes to file
```

### `import`

Import cards and review data from a JSON file.

```bash
olivine import <vaultPath> <file>
```

---

## Tag System

Tags are stored in the YAML frontmatter of your markdown files:

```yaml
---
title: My Card
tags: [math, algebra]
---
```

All major commands accept `--tag <tag>` to filter: review, practice, stats, due, and browse. The filter is a simple substring match against the JSON-serialized tag array.

---

## Practice Mode

`olivine practice` works identically to `olivine review` but **never writes to the database**. Quality ratings are simulated in memory for the session duration — your schedule stays unchanged. Useful for warm-ups, testing, or studying topics without pressure.

---

## Export & Import

Export creates a portable JSON snapshot of your entire vault:

```bash
olivine export ~/my-vault --output backup.json
```

The JSON includes all notes, scheduling state, and review history. Import restores it into any initialized vault:

```bash
olivine import ~/my-vault backup.json
```

This is useful for backups, transferring between machines, or restoring after a reinstall.

---

## Algorithm Migration

Switch all cards from one scheduling algorithm to another:

```bash
olivine migrate ~/my-vault --algo fsrs
```

Migration recalculates intervals based on each card's existing review history. It's a one-way operation — the old algorithm's state is replaced. Export before migrating if you want a fallback.

---

## TUI Controls

### Review

| Key | Action |
|-----|--------|
| `Space` | Reveal answer |
| `Backspace` | Hide answer (back to question) |
| `0`–`4` | Rate recall quality |
| `q` | Quit |

### Add / Edit (vim-modal)

| Mode | Key | Action |
|------|-----|--------|
| INSERT | `Tab` | Switch fields |
| INSERT | `Ctrl+S` | Save |
| INSERT | `Ctrl+Q` | Cancel |
| — | `Esc` | Enter NORMAL mode |
| NORMAL | `h`/`l`/`w`/`b`/`0`/`$` | Move cursor |
| NORMAL | `i`/`a`/`I`/`A` | Enter INSERT mode |
| NORMAL | `x` | Delete character |
| NORMAL | `dd`/`dw`/`de` | Delete line/word |
| NORMAL | `yy`/`p` | Yank/put |
| NORMAL | `ciw` | Change inner word |
| NORMAL | `o`/`O` | Open new line |
| NORMAL | `u` | Undo |
| NORMAL | `q` | Cancel |

### Browse TUI

| Key | Action |
|-----|--------|
| `j`/`k` or arrows | Navigate list |
| `/` | Filter by text |
| `b` | Filter by box number |
| `Enter` | Edit selected card |
| `a` | Add new card |
| `d` | Delete selected card |
| `h` | View review history |
| `q` | Quit |
