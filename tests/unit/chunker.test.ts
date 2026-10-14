import { describe, it, expect } from 'vitest';
import { chunkDocumentPages } from '@/server/documents/chunker';

describe('Document Chunker', () => {
  it('chunks large text into 500-800 token slices with overlap', () => {
    const pages = [
      {
        pageNumber: 1,
        label: 'Page 1',
        content: '# Biology Notes\n\n' + 'Photosynthesis converts light energy into chemical energy. '.repeat(100),
      },
    ];

    const chunks = chunkDocumentPages(pages, 300, 50);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
    expect(chunks[0].content).toContain('Biology Notes');
  });

  it('handles empty or low text pages gracefully', () => {
    const pages = [{ pageNumber: 1, label: 'Page 1', content: '   ' }];
    const chunks = chunkDocumentPages(pages);
    expect(chunks).toEqual([]);
  });
});
