# Olivine

A local-first CLI spaced repetition tool for Obsidian vaults.

## Status

Early development. Core tooling is being built.

## Development

```bash
npm install
npm run build
npm test
```

## License
MIT

## Usage

### Initialize a vault

```bash
olivine init /path/to/obsidian-vault
```

### Scan vault for notes

```bash
olivine scan /path/to/obsidian-vault
```

## SM-2 Algorithm

Olivine uses the SM-2 spaced repetition algorithm with the following defaults:

- Initial ease factor: 2.5
- Minimum ease factor: 1.3
- Quality scores: 0–5 (0=complete blackout, 3=hard, 4=good, 5=easy)
- Failing a review (score < 3) resets repetitions and sets interval to 1 day

## Reviewing

Start an interactive review session:

```bash
olivine review /path/to/vault
```

The session will:

1. Load due notes

2. Prompt you to reveal each note

3. Ask for a quality score (0-5)

4. Update scheduling automatically

5. Show session statistics
