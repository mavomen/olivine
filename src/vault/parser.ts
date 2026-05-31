import matter from 'gray-matter';

export interface ParsedNote {
  title: string;
  content: string;
  wordCount: number;
}

export function parseMarkdown(raw: string): ParsedNote {
  const { data, content } = matter(raw);
  let title = typeof data.title === 'string' ? data.title : '';
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  if (!title) {
    // Fallback: extract first H1 heading from content
    const match = content.match(/^#\s+(.+)$/m);
    title = match ? match[1]!.trim() : 'Untitled';
  }

  return { title, content, wordCount };
}
