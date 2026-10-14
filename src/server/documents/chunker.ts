import { ExtractedPage } from './parser';

export interface DocumentChunk {
  chunkIndex: number;
  pageNumber: number;
  pageLabel: string;
  heading?: string;
  content: string;
  tokenCount: number;
}

// Rough estimation: 1 token ≈ 4 characters
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkDocumentPages(pages: ExtractedPage[], maxTokens = 600, overlapTokens = 80): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const text = page.content.trim();
    if (!text) continue;

    // Split page text by headings or double linebreaks
    const paragraphs = text.split(/(?=\n#{1,4}\s|\n\n)/);

    let currentChunkText = '';
    let currentHeading = '';

    for (const p of paragraphs) {
      const headingMatch = p.match(/^\s*(#{1,4}\s+[^\n]+)/);
      if (headingMatch) {
        currentHeading = headingMatch[1].replace(/^#+\s*/, '');
      }

      const pTokens = estimateTokens(p);
      const currentTokens = estimateTokens(currentChunkText);

      if (currentTokens + pTokens > maxTokens && currentChunkText.trim()) {
        chunks.push({
          chunkIndex: chunkIndex++,
          pageNumber: page.pageNumber,
          pageLabel: page.label,
          heading: currentHeading || undefined,
          content: currentChunkText.trim(),
          tokenCount: currentTokens,
        });

        // Compute overlap from end of currentChunkText
        const words = currentChunkText.trim().split(/\s+/);
        const overlapWordCount = Math.min(words.length, Math.ceil(overlapTokens / 1.3));
        const overlapText = words.slice(words.length - overlapWordCount).join(' ');

        currentChunkText = overlapText + '\n\n' + p;
      } else {
        currentChunkText += (currentChunkText ? '\n\n' : '') + p;
      }
    }

    if (currentChunkText.trim()) {
      chunks.push({
        chunkIndex: chunkIndex++,
        pageNumber: page.pageNumber,
        pageLabel: page.label,
        heading: currentHeading || undefined,
        content: currentChunkText.trim(),
        tokenCount: estimateTokens(currentChunkText),
      });
    }
  }

  return chunks;
}
