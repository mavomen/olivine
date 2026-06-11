export const id = 7;
export const name = 'add_fsrs_params';

export const sql = `
ALTER TABLE scheduling ADD COLUMN stability REAL NOT NULL DEFAULT 0;
ALTER TABLE scheduling ADD COLUMN difficulty REAL NOT NULL DEFAULT 5;
`;
