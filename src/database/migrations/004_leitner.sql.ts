export const id = 4;
export const name = 'add_leitner_boxes';

export const sql = `
ALTER TABLE scheduling ADD COLUMN box INTEGER NOT NULL DEFAULT 1;
ALTER TABLE scheduling ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
`;
