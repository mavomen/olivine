# Contributing to Olivine

These guidelines cover how we work — the rules are intentionally simple, and
they exist to keep the project maintainable.

## Communication

- Be concise and technical. Explain tradeoffs clearly.
- Push back on unnecessary complexity.
- Prioritize correctness over enthusiasm.

## Branch Strategy

| Branch type | Naming pattern    | Purpose                |
| ----------- | ----------------- | ---------------------- |
| Feature     | `feat/<name>`     | New capabilities       |
| Fix         | `fix/<name>`      | Bug fixes              |
| Refactor    | `refactor/<area>` | Internal restructuring |

All work starts from `develop`. Branch names are lowercase and hyphenated.

## Commit Conventions

Every commit must:

1. Build successfully (`npm run build`)
2. Pass all tests (`npm test`)
3. Pass linting (`npm run lint`)
4. Be logically isolated — one concern per commit

We use [Conventional Commits](https://www.conventionalcommits.org):

```bash
feat(leitner): implement 7-box promotion logic
fix(session): prevent duplicate reviews in fallback
refactor(tui): extract virtual-list component
test(stats): verify box distribution calculation
docs(readme): add TUI controls section
chore(ci): configure GitHub Actions matrix
```

## Merge Workflow

1. Create a feature branch from `develop`
2. Commit changes following the conventions above
3. When complete, squash the branch into a single commit:

```bash
git checkout feat/my-feature
git reset --soft develop
git commit -m "feat(scope): complete description of the feature"
```

4. Merge into `develop` with `--no-ff`:

```bash
git checkout develop
git merge --no-ff feat/my-feature
git branch -d feat/my-feature
```

This keeps the history clean — each feature is one atomic commit, but the merge
topology is preserved.

## Before Submitting

Run the full pipeline locally:

```bash
npm run build && npm test && npm run lint
```

All three must pass with zero errors. No exceptions.

## Code Style

- TypeScript strict mode — no `any`, no `@ts-ignore`, no non‑null assertions unless absolutely necessary
- Prefer discriminated unions and `readonly` where appropriate
- Explicit code over clever abstractions
- Small modules with clear responsibilities

## Testing

Every feature must include:

- **Unit tests** for algorithms, utilities, parsers, and pure logic
- **Integration tests** for database flows, vault scanning, and session lifecycle

Tests live in `tests/` and mirror the source structure.

## Architecture Decisions

Significant technical decisions are documented in `docs/ADR.md`. If you're proposing a change that
affects the architecture, update the ADR as part of your contribution.

## Dependencies

Before adding a dependency, ask:

1. Can this be implemented simply ourselves?
2. Is it actively maintained?
3. Does it increase startup cost or bundle size?
4. Does it pull in transitive complexity?

Prefer fewer dependencies. Every dependency becomes future maintenance debt.
