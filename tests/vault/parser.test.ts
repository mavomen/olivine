import { parseMarkdown } from '../../src/vault/parser';

describe('markdown parser', () => {
  it('should extract title from frontmatter', () => {
    const md = `---
title: My Note
---

# Heading

Some content.`;
    const result = parseMarkdown(md);
    expect(result.title).toBe('My Note');
  });

  it('should fall back to first H1 if no frontmatter title', () => {
    const md = `# Just a heading\nNo frontmatter.`;
    const result = parseMarkdown(md);
    expect(result.title).toBe('Just a heading');
  });

  it('should default to "Untitled" when there is no title or heading', () => {
    const md = `No headings here.\nJust text.`;
    const result = parseMarkdown(md);
    expect(result.title).toBe('Untitled');
  });

  it('should count words correctly', () => {
    const md = `hello world  test\n\nfoo bar baz`;
    const result = parseMarkdown(md);
    expect(result.wordCount).toBe(6);
  });

  it('should return content without frontmatter', () => {
    const md = `---
title: Test
---
Content here`;
    const result = parseMarkdown(md);
    expect(result.content.trim()).toBe('Content here');
  });

  it('should handle empty files', () => {
    const result = parseMarkdown('');
    expect(result.title).toBe('Untitled');
    expect(result.content).toBe('');
    expect(result.wordCount).toBe(0);
  });
});
