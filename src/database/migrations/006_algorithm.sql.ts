export const id = 6;
export const name = 'add_algorithm_column';

export const sql = `
ALTER TABLE scheduling ADD COLUMN algorithm TEXT NOT NULL DEFAULT 'leitner';
`;
