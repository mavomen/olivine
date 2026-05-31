# Olivine

A local-first CLI spaced repetition tool for Obsidian vaults.

## Features

- Scan Obsidian vaults for markdown notes
- Schedule reviews using the SM-2 algorithm
- Interactive terminal review sessions
- Track review history in SQLite
- View statistics and daily streaks

## Installation

```bash
git clone https://github.com/yourusername/olivine
cd olivine
npm install
npm run build
```

## Usage

### Initialize a vault

```bash
node dist/index.js init /path/to/obsidian-vault
```

### Scan vault for notes

```bash
node dist/index.js scan /path/to/vault
```

### Start a review session

```bash
node dist/index.js review /path/to/vault
```

### View statistics

```bash
node dist/index.js stats /path/to/vault
node dist/index.js due /path/to/vault
```

## Architecture

```
olivine/
├── src/
│   ├── commands/       CLI command implementations
│   ├── database/       SQLite connection, migrations
│   ├── models/         Note, Review, Scheduling repositories
│   ├── vault/          Markdown scanner and parser
│   ├── algorithms/     SM-2 implementation
│   ├── session/        Interactive review loop
│   ├── scheduling/     Scheduling service
│   ├── stats/          Statistics calculator
│   ├── config/         Configuration management
│   └── utils/          Shared utilities
└── tests/              Unit and integration tests
```

## SM-2 Algorithm

Olivine uses SM-2 with:

- Initial ease factor: 2.5
- Minimum ease factor: 1.3
- Quality scores: 0–5 (0=complete blackout, 5=perfect recall)
- Failing a review resets repetitions and sets interval to 1 day

## License

MIT
