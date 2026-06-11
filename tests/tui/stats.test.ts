jest.mock('blessed', () => ({
  box: jest.fn(() => ({ on: jest.fn(), focus: jest.fn(), detach: jest.fn() })),
  screen: jest.fn(() => ({
    on: jest.fn(),
    key: jest.fn(),
    append: jest.fn(),
    destroy: jest.fn(),
    render: jest.fn(),
    children: [],
    width: 80,
  })),
  list: jest.fn(() => ({ on: jest.fn(), focus: jest.fn() })),
  prompt: jest.fn(() => ({ input: jest.fn(), destroy: jest.fn() })),
}));

jest.mock('sql.js', () => ({}));

import { renderBar, buildContent } from '../../src/tui/stats/index';

describe('renderBar', () => {
  it('should return empty string when maxVal is 0', () => {
    expect(renderBar(0, 5, 10)).toBe('');
  });

  it('should render at least one bar char when count > 0', () => {
    const result = renderBar(100, 1, 10);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result).toMatch(/^█+$/);
  });

  it('should render full width when count equals maxVal', () => {
    const result = renderBar(100, 100, 10);
    expect(result.length).toBe(10);
  });

  it('should render proportionally', () => {
    const result = renderBar(100, 50, 10);
    expect(result.length).toBe(5);
  });

  it('should return empty when count is 0 and maxVal is non-zero', () => {
    const result = renderBar(100, 0, 10);
    expect(result).toBe('');
  });
});

describe('buildContent', () => {
  const sampleStats = {
    totalNotes: 15,
    dueNotes: 3,
    reviewedToday: 5,
    streak: 7,
    totalReviews: 120,
    archivedCount: 2,
    boxDistribution: { '1': 5, '2': 3, '3': 1, '4': 0 } as Record<string, number>,
  };

  it('should include total notes and due notes', () => {
    const content = buildContent(sampleStats, 80);
    expect(content).toContain('Total notes:  15');
    expect(content).toContain('Due today:  3');
  });

  it('should include streak', () => {
    const content = buildContent(sampleStats, 80);
    expect(content).toContain('Streak:');
    expect(content).toContain('7 day(s)');
  });

  it('should include archived count', () => {
    const content = buildContent(sampleStats, 80);
    expect(content).toContain('Archived:');
    expect(content).toContain('2');
  });

  it('should include box distribution section', () => {
    const content = buildContent(sampleStats, 80);
    expect(content).toContain('Box Distribution:');
  });

  it('should include keybinding hints', () => {
    const content = buildContent(sampleStats, 80);
    expect(content).toContain('[r] refresh');
    expect(content).toContain('[t] filter by tag');
    expect(content).toContain('[q] quit');
  });

  it('should render bars for each box', () => {
    const content = buildContent(sampleStats, 80);
    expect(content).toContain('Box 1');
    expect(content).toContain('Box 2');
    expect(content).toContain('Box 3');
    expect(content).toContain('Box 4');
  });

  it('should use minimum bar width of 10', () => {
    const content = buildContent(sampleStats, 20);
    expect(content).toContain('█');
  });
});
