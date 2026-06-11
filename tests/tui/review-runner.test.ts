jest.mock('blessed', () => ({
  screen: jest.fn(() => ({
    on: jest.fn(),
    key: jest.fn(),
    append: jest.fn(),
    destroy: jest.fn(),
    render: jest.fn(),
    children: [],
  })),
  box: jest.fn(() => ({
    on: jest.fn(),
    focus: jest.fn(),
    detach: jest.fn(),
    setContent: jest.fn(),
    style: {},
    key: jest.fn(),
    parent: null,
  })),
  list: jest.fn(() => ({
    on: jest.fn(),
    focus: jest.fn(),
  })),
  prompt: jest.fn(() => ({ input: jest.fn(), destroy: jest.fn() })),
}));

jest.mock('../../src/tui/review/card', () => ({
  createCardBox: jest.fn(() => ({
    on: jest.fn(),
    focus: jest.fn(),
    detach: jest.fn(),
    key: jest.fn(),
    style: {},
  })),
}));

jest.mock('../../src/models/review', () => ({
  insertReview: jest.fn(),
}));

jest.mock('../../src/scheduling/service', () => ({
  applyReview: jest.fn(),
}));

import { Database } from 'sql.js';
import { createSession } from '../../src/review/session';
import type { NoteRow } from '../../src/models/note';
import { insertReview } from '../../src/models/review';
import { applyReview } from '../../src/scheduling/service';

// Import the module to trigger the blessed TTY check
import { runTuiSession, TuiOptions } from '../../src/tui/review/runner';

function makeNote(id: string, title: string): NoteRow {
  return {
    id,
    path: `${title.toLowerCase().replace(/\s+/g, '-')}.md`,
    title,
    content: `# ${title}\n\nContent for ${title}`,
    tags: '',
    word_count: 10,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };
}

describe('runFallback (non-TTY path)', () => {
  let db: Database;

  beforeAll(async () => {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    db = new SQL.Database();
    db.run('CREATE TABLE reviews (id TEXT, note_id TEXT, quality INTEGER, reviewed_at TEXT)');
    db.run('CREATE TABLE scheduling (note_id TEXT, ease_factor REAL, repetitions INTEGER, interval_days INTEGER, due_date TEXT, last_reviewed TEXT, box INTEGER, archived INTEGER, algorithm TEXT)');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should auto-review all notes with quality 4 in non-TTY mode', async () => {
    process.stdout.isTTY = false;
    const notes = [makeNote('a', 'Note A'), makeNote('b', 'Note B')];
    const session = createSession(notes);

    await runTuiSession(db, session, {});

    expect(session.phase).toBe('summary');
    expect(session.notes.every((n) => n.reviewed)).toBe(true);
    expect(session.notes.every((n) => n.quality === 4)).toBe(true);
    expect(insertReview).toHaveBeenCalledTimes(2);
    expect(applyReview).toHaveBeenCalledTimes(2);
  });

  it('should skip already-reviewed notes', async () => {
    process.stdout.isTTY = false;
    const notes = [makeNote('a', 'A'), makeNote('b', 'B'), makeNote('c', 'C')];
    const session = createSession(notes);
    session.notes[0]!.reviewed = true;
    session.notes[0]!.quality = 3;

    await runTuiSession(db, session, {});

    expect(insertReview).toHaveBeenCalledTimes(2);
    expect(session.currentIndex).toBe(2);
  });

  it('should not call insertReview/applyReview in dryRun mode', async () => {
    process.stdout.isTTY = false;
    const notes = [makeNote('a', 'A')];
    const session = createSession(notes);

    await runTuiSession(db, session, { dryRun: true });

    expect(insertReview).not.toHaveBeenCalled();
    expect(applyReview).not.toHaveBeenCalled();
    expect(session.notes[0]!.reviewed).toBe(true);
    expect(session.notes[0]!.quality).toBe(4);
  });

  it('should pass algorithmOverride to applyReview', async () => {
    process.stdout.isTTY = false;
    const notes = [makeNote('a', 'A')];
    const session = createSession(notes);

    await runTuiSession(db, session, { algorithmOverride: 'sm2' });

    expect(applyReview).toHaveBeenCalledWith(db, 'a', 4, expect.any(String), 'sm2');
  });
});
