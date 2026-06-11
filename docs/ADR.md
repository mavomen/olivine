# Architecture Decision Record

Olivine is a local‑first CLI spaced repetition tool for Obsidian vaults
or an independent directory of markdown cards. This document records the
major architectural decisions, their context, and their consequences.

---

## 1. SQLite via sql.js

**Context:** The project initially used `better-sqlite3`, a native SQLite
binding. Node 26 removed V8 APIs that the native module relied on, causing
compilation failures. We needed a reliable, cross‑platform SQLite driver
that works without native build steps.

**Decision:** Replace `better-sqlite3` with `sql.js` – a pure‑JavaScript
SQLite implementation compiled to WASM. All database access goes through a
connection manager that handles manual persistence (writing to disk after
writes).

**Consequences:**
- The project builds and runs on any platform that supports Node.js, with
  zero native dependencies. That keeps installation simple and CI pipelines
  fast.
- Memory usage and bundle size are slightly higher because of the WASM
  module, but for a CLI tool the trade‑off is well worth the portability.
- The database must be explicitly flushed to disk after mutations. This
  requirement is encapsulated inside `database/connection.ts` so the rest of
  the code never has to think about it.
- Future Node.js upgrades won’t break the database layer – a problem we
  would have faced repeatedly with a native binding.

---

## 2. Blessed for Terminal UI

**Context:** The review session and card creation/editing needed a
full‑screen, keyboard‑driven terminal interface. Options like Ink (React)
would pull in a heavy dependency tree; other TUI libraries were either
unmaintained or lacked the widgets we required.

**Decision:** Use `blessed` as the TUI framework. Custom widgets (virtual
list, vim‑modal form) are built directly on `blessed`'s low‑level screen
and box elements.

**Consequences:**
- `blessed` provides a lightweight, imperative API that feels natural for
  terminal interfaces. We avoided the complexity of reconciling a reactive
  framework with a text‑based display.
- On Node 26 the built‑in `textarea` and `textbox` widgets exhibited bugs
  (double characters, crashes). That pushed us to implement our own key
  handling and cursor rendering, which in the end gave us finer control
  over the user experience.
- The library is no longer actively maintained, so future Node.js releases
  may require us to fork or replace it. For the current feature set,
  however, it meets every requirement and has been stable in practice.

---

## 3. Commander + Inquirer for CLI

**Context:** The CLI needs command parsing, help text, and interactive
prompts. Commander is the de facto standard for Node.js CLIs; Inquirer
provides rich interactive prompts.

**Decision:** Use Commander for command registration and Inquirer for
prompts. Both are lazy‑loaded (`await import()`) so that simple commands
(`stats`, `due`) don’t pay the startup cost of the UI libraries.

**Consequences:**
- Both libraries are well‑documented and familiar to most Node.js
  developers, which makes onboarding easier.
- Lazy loading keeps cold‑start time low even as the number of commands
  grows. When a user runs `olivine due`, the code never touches the UI
  modules.
- Inquirer’s prompt types (list, input, editor) cover all our interactive
  needs; we use the `editor` type for multi‑line answer input in the
  non‑TUI fallback path.

---

## 4. Leitner Box Algorithm (Current, Extensible)

**Context:** Olivine originally implemented SM‑2, but the Leitner Box
system (7 physical boxes, simple promotion/demotion) maps better to the
mental model of a “digital Leitner box”. It’s intuitive and gives users
clear feedback about where each card stands. We also want to support
multiple scheduling algorithms in the future.

**Decision:** Use the Leitner Box algorithm as the default and only
scheduler for now. The scheduling service (`scheduling/service.ts`) is a
thin wrapper that calls the algorithm and persists the result. The database
schema tracks `box` and `archived` columns that are algorithm‑agnostic.
Future algorithms (SM‑2, FSRS) will reuse the same service interface and
storage.

**Consequences:**
- Users get a scheduling system that is easy to understand and reason about
  – a card is always in a specific box, and the rules for moving between
  boxes are straightforward.
- The code is structured so that adding a new algorithm does not require
  changing the data model or the rest of the system.
- The old SM‑2 implementation remains in `scheduling/algorithms/sm2.ts` as
  a reference, so it can be reactivated or compared later.

---

## 5. Markdown Files as Source of Truth

**Context:** Olivine is designed to work with Obsidian vaults. Notes are
markdown files with YAML frontmatter (title, tags, created date). The
database should reflect the filesystem, not the other way around.

**Decision:** The filesystem is the primary store. `olivine scan` reads all
markdown files, parses them, and upserts them into SQLite. Scheduling
changes (reviews) are written only to the database, not back to the
markdown files. Deleted files are removed from the database on the next
scan.

**Consequences:**
- The tool works side‑by‑side with Obsidian and any other markdown editor
  without conflict. You can create a card in Obsidian, run `olivine scan`,
  and review it immediately.
- There is no risk of the CLI corrupting your notes – the source markdown
  files are never modified by Olivine.
- The SQLite database functions as a cache; it can be deleted and rebuilt
  from the filesystem at any time. This also makes backups trivial.
- Scheduling metadata is kept out of the markdown files, which keeps them
  clean for other tools that only care about the content.

---

## 6. Single Package (No Monorepo)

**Context:** Early planning documents suggested a monorepo. In practice, a
single developer is building a CLI‑only tool, and the overhead of multiple
packages was unnecessary.

**Decision:** Keep the project as a single Node.js package. Logical
separation is achieved through directory structure (`src/cli`, `src/tui`,
`src/review`, etc.).

**Consequences:**
- The build, test, and CI pipeline is straightforward – a single `tsc`
  invocation, a single `jest` run. No orchestration between packages.
- We avoided the tooling complexity of workspaces, lerna, or similar
  solutions, which would have been overkill for the scale of the project.
- Module boundaries are enforced by convention rather than by the compiler.
  For a focused codebase maintained by a small number of people, this
  discipline has held up well.

---

## 7. Squash‑Merge Workflow with Conventional Commits

**Context:** The project needs a clean Git history that is easy to read,
bisect, and revert. Feature branches should be isolated but their merges
should be visible.

**Decision:** All commits use the [Conventional
Commits](https://www.conventionalcommits.org) format (`feat:`, `fix:`,
`refactor:`, etc.). Feature branches are squashed into a single commit,
then merged into `develop` with `--no‑ff`. `develop` is merged into `main`
for releases.

**Consequences:**
- The history tells a clear story: each commit represents one complete
  feature or change, making it easy to understand the evolution of the
  project.
- The `--no‑ff` merges preserve the branch topology, so you can see which
  features were developed in parallel and when they landed.
- Reverts are straightforward because each squashed commit is atomic – you
  revert the entire feature, not a fragment of it.

---

## 8. Gray‑Matter for Markdown Parsing

**Context:** Cards are markdown files with YAML frontmatter. We needed a
robust parser that extracts metadata and content, with fallback logic for
missing fields.

**Decision:** Use `gray-matter` to parse markdown files. The parser wrapper
(`vault/parser.ts`) adds title extraction from the first H1 if no
frontmatter title exists, and counts words.

**Consequences:**
- `gray-matter` is a lightweight, well‑tested library with zero runtime
  dependencies. It handles edge cases (empty files, missing frontmatter)
  gracefully without us having to write our own YAML parser.
- The wrapper keeps all parsing logic in one place, which makes it easy to
  extend or replace if our needs change.
- The fallback behaviour (extracting a title from the first H1) makes the
  tool more forgiving for users who don’t want to write frontmatter.

---

## 9. WAL Mode for SQLite

**Context:** SQLite defaults to a rollback journal, but Write‑Ahead Logging
(WAL) provides better write performance and crash safety, especially for
the frequent small writes of a review session.

**Decision:** Enable WAL mode on all databases via
`PRAGMA journal_mode = WAL;` at connection time.

**Consequences:**
- Writes are faster and the risk of database corruption during a crash is
  significantly lower – important when the user might close the terminal
  abruptly.
- WAL and SHM files are created alongside the database; they are
  automatically cleaned up on graceful exit.
- The connection manager handles this transparently, so the rest of the
  code never needs to worry about journal modes.

---

## 10. FSRS Algorithm Implementation

**Context:** The Leitner Box system, while intuitive, does not model
individual card difficulty or user memory patterns. We wanted a modern,
adaptive algorithm that learns from each review to optimize scheduling.
SM-2 was already implemented as a reference but uses fixed ease factors.

**Decision:** Implement FSRS v6 (Free Spaced Repetition Scheduler) with
the standard 21-parameter weight vector. FSRS models the probability of
recall using a exponential decay function and adjusts intervals to hit a
target retention rate. The implementation follows the FSRS v6 specification
and uses the default weights from the reference Python implementation.

**Consequences:**
- Users get a scheduling algorithm that adapts to their actual memory
  patterns rather than assuming fixed difficulty.
- The algorithm interface (`src/scheduling/types.ts`) made adding FSRS a
  matter of implementing `schedule()`, `initialState()`, and `name()`
  without changing any other code.
- FSRS needs at least a few reviews per card to converge. Initial
  scheduling uses conservative defaults until enough data accumulates.
- The default weights work well for most users; advanced users can tweak
  them via configuration in the future.

---

## 11. Export / Import as JSON

**Context:** Users needed a way to back up their scheduling data, transfer
between machines, or restore after a reinstall. The database is a binary
SQLite file that is not portable across architectures or easy to inspect.

**Decision:** Implement `export` and `import` commands that serialize the
entire vault state (notes, scheduling, reviews) as a single JSON file. The
export format uses arrays of flat objects that map directly to the database
tables, making it human-readable and machine-parseable.

**Consequences:**
- Backups are plain JSON — inspectable, diffable, and storable in version
  control alongside markdown notes.
- Import is idempotent: running it twice on the same file produces the
  same database state. This makes restore workflows safe.
- The JSON format is intentionally simple (no nesting, no compression) to
  make it easy for users to write custom scripts that generate or process
  Olivine data.

---

## 12. Non-TTY Fallback and isTTY Guards

**Context:** Olivine's review, browse, and edit commands used interactive
prompts (Inquirer) and TUI screens (blessed) that hang or crash when
run in a non-TTY environment (CI pipelines, SSH pipes, cron jobs). We
needed a graceful degradation path.

**Decision:** Add `process.stdout.isTTY` guards to all TUI entrypoints
(`openBrowseTui`, `openStatsTui`, `runTuiSession`). When stdout is not a
TTY, these functions throw a clear error instructing the user to use
non-interactive flags instead. For the review command, the `--quality`
flag provides a fixed rating that bypasses all prompts. For browse, the
`--id` flag shows a single card (optionally as JSON with `--json`). For
edit, the `--title`, `--content`, and `--tags` flags enable direct edits
without the TUI form.

**Consequences:**
- All commands now work in non-TTY environments without hanging, as long
  as the user supplies the required flags.
- Interactive-only commands (`add`, `init --interactive`) still require a
  TTY, but the error message is clear and actionable.
- The `--tui` flag no longer acts as a "non-TTY fallback" — it explicitly
  requires a TTY and errors if one is not available.
- The test suite can run all commands in "pipe" mode without hanging,
  making CI more reliable.
