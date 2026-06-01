export const id = 5;
export const name = 'add_tags_column';

export const sql = `
ALTER TABLE notes ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
`;
