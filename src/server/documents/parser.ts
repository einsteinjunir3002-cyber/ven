import 'server-only';
import { extractText } from 'unpdf';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export interface ExtractedPage {
  pageNumber: number;
  label: string;
  content: string;
}

export interface ParsedDocument {
  title: string;
  pageCount: number;
  pages: ExtractedPage[];
  lowText: boolean;
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const uint8 = new Uint8Array(buffer);
    const { text: pagesText, totalPages } = await extractText(uint8, { mergePages: false });

    const pages: ExtractedPage[] = [];
    let totalTextLength = 0;

    const pageArray = Array.isArray(pagesText) ? pagesText : [pagesText];

    pageArray.forEach((pageContent, idx) => {
      const pageNumber = idx + 1;
      const cleanContent = (pageContent || '').trim();
      totalTextLength += cleanContent.length;

      pages.push({
        pageNumber,
        label: `Page ${pageNumber}`,
        content: cleanContent,
      });
    });

    const lowText = totalTextLength < 50;

    return {
      title: 'PDF Document',
      pageCount: totalPages || pages.length || 1,
      pages: pages.length > 0 ? pages : [{ pageNumber: 1, label: 'Page 1', content: '' }],
      lowText,
    };
  } catch (err) {
    throw new Error(`Failed to extract text from PDF: ${(err as Error).message}`);
  }
}

export async function parseDocxBuffer(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const fullText = (result.value || '').trim();

    // Split paragraphs into pseudo-pages (~500 words per page)
    const paragraphs = fullText.split(/\n\s*\n/);
    const pages: ExtractedPage[] = [];
    let currentPageContent = '';
    let currentPageNum = 1;

    for (const p of paragraphs) {
      if ((currentPageContent + '\n' + p).split(/\s+/).length > 400 && currentPageContent) {
        pages.push({
          pageNumber: currentPageNum,
          label: `Section ${currentPageNum}`,
          content: currentPageContent.trim(),
        });
        currentPageNum++;
        currentPageContent = p;
      } else {
        currentPageContent += (currentPageContent ? '\n\n' : '') + p;
      }
    }

    if (currentPageContent.trim() || pages.length === 0) {
      pages.push({
        pageNumber: currentPageNum,
        label: `Section ${currentPageNum}`,
        content: currentPageContent.trim(),
      });
    }

    return {
      title: 'Word Document',
      pageCount: pages.length,
      pages,
      lowText: fullText.length < 50,
    };
  } catch (err) {
    throw new Error(`Failed to extract text from DOCX: ${(err as Error).message}`);
  }
}

export async function parsePptxBuffer(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const xmlParser = new XMLParser({ ignoreAttributes: false });

    const slideFiles = Object.keys(zip.files).filter((filename) =>
      filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')
    );

    // Sort slides numerically slide1.xml, slide2.xml ...
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

    const pages: ExtractedPage[] = [];
    let totalLength = 0;

    for (let i = 0; i < slideFiles.length; i++) {
      const slideXml = await zip.files[slideFiles[i]].async('string');
      const parsedXml = xmlParser.parse(slideXml);
      
      // Extract all text nodes in slide XML
      const textMatches: string[] = [];
      const extractTextRecursive = (obj: unknown) => {
        if (!obj) return;
        if (typeof obj === 'string') {
          textMatches.push(obj);
        } else if (typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            if (key === 'a:t' || key === 't') {
              const val = (obj as Record<string, unknown>)[key];
              if (typeof val === 'string') textMatches.push(val);
              else if (typeof val === 'object' && val !== null) extractTextRecursive(val);
            } else {
              extractTextRecursive((obj as Record<string, unknown>)[key]);
            }
          }
        }
      };
      extractTextRecursive(parsedXml);

      const slideText = textMatches.join(' ').replace(/\s+/g, ' ').trim();
      totalLength += slideText.length;
      pages.push({
        pageNumber: i + 1,
        label: `Slide ${i + 1}`,
        content: slideText,
      });
    }

    return {
      title: 'Presentation',
      pageCount: pages.length || 1,
      pages: pages.length > 0 ? pages : [{ pageNumber: 1, label: 'Slide 1', content: '' }],
      lowText: totalLength < 30,
    };
  } catch (err) {
    throw new Error(`Failed to extract text from PPTX: ${(err as Error).message}`);
  }
}

export function parseTextContent(text: string, title?: string): ParsedDocument {
  const clean = text.trim();
  return {
    title: title || 'Pasted Notes',
    pageCount: 1,
    pages: [{ pageNumber: 1, label: 'Page 1', content: clean }],
    lowText: clean.length < 10,
  };
}
