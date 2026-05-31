export const id = 3;
export const name = 'create_scheduling';

export const sql = `
CREATE TABLE IF NOT EXISTS scheduling (
  note_id TEXT PRIMARY KEY,
  ease_factor REAL NOT NULL,
  repetitions INTEGER NOT NULL,
  interval_days INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  last_reviewed TEXT,
  FOREIGN KEY(note_id) REFERENCES notes(id)
);
`;
