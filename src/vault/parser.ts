import matter from 'gray-matter';

export interface ParsedNote {
  title: string;
  content: string;
  wordCount: number;
  tags: string[];
}

export function parseMarkdown(raw: string): ParsedNote {
  const { data, content } = matter(raw);
  let title = typeof data.title === 'string' ? data.title : '';
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  if (!title) {
    const match = content.match(/^#\s+(.+)$/m);
    title = match ? match[1]!.trim() : 'Untitled';
  }

  let tags: string[] = [];
  if (Array.isArray(data.tags)) {
    tags = data.tags.map((t: unknown) => String(t));
  } else if (typeof data.tags === 'string') {
    tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  return { title, content, wordCount, tags };
}
