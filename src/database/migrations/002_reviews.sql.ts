export const id = 2;
export const name = 'create_reviews';

export const sql = `
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  quality INTEGER NOT NULL,
  reviewed_at TEXT NOT NULL,
  FOREIGN KEY(note_id) REFERENCES notes(id)
);
`;
