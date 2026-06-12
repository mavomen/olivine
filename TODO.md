# TODO

## Features

- [ ] 1. **Batch operations** — bulk tag/archive/suspend by tag, box, or grep pattern
- [ ] 2. **Search by metadata** — `grep --box 3`, `grep --tag math`, `grep --due`, `grep --archived`
- [ ] 3. **File watcher** — auto-scan vault when markdown files change (via `fs.watch`)
- [ ] 4. **Review analytics** — retention rate over time, predicted due curve, interval histogram
- [ ] 5. **Session pause/resume** — save session state and resume later
- [ ] 6. **Card sharing** — export/import individual cards (not whole vault)
- [ ] 7. **Quick add from CLI** — pipe input to `olivine add`

## TUI

- [ ] 8. **Review history in TUI** — inline panel showing past ratings during review
- [ ] 9. **Browse multi-select** — select multiple cards for batch actions
- [ ] 10. **Stats dashboard graphs** — box distribution bar chart, retention timeline
- [ ] 11. **Keyboard cheat sheet** — press `?` to overlay keybindings
- [ ] 12. **Card preview popup** — browse card content without leaving the list
- [ ] 13. **TUI theming** — customizable colors (light/dark, accent)
- [ ] 14. **Search-as-you-type in browse** — instant filter while typing
- [ ] 15. **Tab completion in add/edit form** — auto-complete tags from existing ones
- [ ] 16. **Session progress bar** — estimated duration and progress
- [ ] 17. **TUI responsive layout** — handle terminal resize gracefully

## Engineering

- [ ] 18. **Cross-platform path audit** — test Windows paths, symlinks, Unicode filenames
- [ ] 19. **Large vault benchmarks** — profile >10k cards, optimize queries and scan
- [ ] 20. **CLI help polish** — consistent `--help` across all 24 commands
- [ ] 21. **Error message consistency** — unify error format and user guidance
- [ ] 22. **Logger levels** — `--verbose` flag, quiet mode for scripts
- [ ] 23. **Graceful shutdown** — handle SIGINT/SIGTERM in TUI and review
- [ ] 24. **Config validation** — validate all config keys on load
- [ ] 25. **Export schema version** — version field in export JSON
- [ ] 26. **Database vacuum** — `olivine vacuum` to reclaim space
- [ ] 27. **Leaky abstraction audit** — check `saveDb`/`closeDb` discipline in all commands
- [ ] 28. **Eliminate async anti-patterns** — no unhandled promise rejections

## Testing

- [ ] 29. **Integration tests for TUI** — mock blessed, test review and browse flows
- [ ] 30. **Property-based tests for algorithms** — random reviews, verify invariants
- [ ] 31. **Cross-platform CI** — test on Windows and macOS in GitHub Actions
- [ ] 32. **Benchmark regression checks** — alert on scan/session time thresholds
- [ ] 33. **End-to-end workflow test** — init → add → scan → review → stats → export → import
- [ ] 34. **Fuzz testing for markdown parser** — random frontmatter edge cases

## Documentation

- [ ] 35. **Man page** — `man olivine` from help text
- [ ] 36. **Website** — GitHub Pages with quickstart and screenshots
- [ ] 37. **API docs** — typedoc for scheduling and model modules
- [ ] 38. **Contributing guide expansion** — architecture walkthrough

## Performance

- [ ] 39. **Lazy-load algorithms** — only load active algorithm module
- [ ] 40. **SQLite query optimization** — indexes for common queries
- [ ] 41. **Batch review insert** — bulk-insert instead of one-by-one
- [ ] 42. **Reduce WASM startup cost** — lazy-init sql.js until first DB op
- [ ] 43. **Stream large exports** — avoid loading all data into memory

## Release & Infra

- [ ] 44. **Homebrew tap** — formula for macOS
- [ ] 45. **npm publish** — `npx olivine`
- [ ] 46. **Docker image CI** — publish multi-arch images on release
- [ ] 47. **Version check** — `olivine --version` and update notifications
