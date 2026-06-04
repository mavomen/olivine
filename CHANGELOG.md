# Changelog

## v0.3.1 – 2026-06-04

### Changed

- Refactored the entire codebase for clarity and maintainability.
  The source tree now uses `cli/`, `tui/`, `review/`, `scheduling/`,
  `database/`, `models/`, `vault/`, `stats/`, `config/`, and `utils/`.

### Fixed

- Fixed leftover import paths after the refactor.

---

## v0.3.0 – 2026-06-03

### Added

- Full‑screen TUI browse (`olivine browse --tui`) with virtual list,
  real‑time filtering (text, tag, box), and inline card actions
  (add, edit, delete, history).
- Tag system: tags are extracted from frontmatter, stored in the database,
  and used for filtering in review, stats, due, and browse.
- Card search (`olivine grep`) with content highlighting.
- Review history visible in browse.
- Unarchive command to bring graduated cards back to Box 1.
- Vim‑modal card creation and editing (INSERT / NORMAL modes with
  `h`, `l`, `w`, `b`, `dd`, `dw`, `ciw`, `yy`, `p`, `o`, `O`, `u`).
- Practice mode (`olivine practice`) for reviewing without scheduling.

### Changed

- Switched from SM‑2 to the **Leitner Box** algorithm (7 boxes,
  promote on correct, demote to Box 1 on wrong, archive after Box 7).

---

## v0.2.0 – 2026-05-31

### Added

- Interactive review sessions in the terminal (Inquirer fallback).
- Statistics command (`olivine stats`): total notes, due notes,
  reviewed today, average ease factor, total reviews, streak.
- Due count command (`olivine due`).
- Configuration system (`olivine config`) for cards directory.
- Edit command (`olivine edit`) for existing cards.
- Browse command (`olivine browse`) with search and inline history.

---

## v0.1.0 – 2026-05-31

### Added

- Project foundation: Node.js, TypeScript, ESLint, Prettier, Jest,
  Commander.
- SQLite database layer with schema migrations.
- Vault scanner and markdown parser (gray‑matter).
- SM‑2 scheduling engine and review session logic.
- Initial CLI commands: `init`, `scan`, `review`.
