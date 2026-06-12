export const id = 8;
export const name = 'add_suspend';

export const sql = `
ALTER TABLE scheduling ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0;
`;
