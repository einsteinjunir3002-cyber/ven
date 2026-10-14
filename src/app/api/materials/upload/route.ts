import { NextResponse } from 'next/server';
import { createAdminClient, DEFAULT_GUEST_USER_ID } from '@/lib/supabase/admin';
import { parsePdfBuffer, parseDocxBuffer, parsePptxBuffer, parseTextContent, ParsedDocument } from '@/server/documents/parser';
import { chunkDocumentPages } from '@/server/documents/chunker';
import { generateEmbedding, generateStructured } from '@/server/ai/provider';
import { z } from 'zod';

export const maxDuration = 60; // Allow full 60s execution on Vercel for larger documents

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const analysisSchema = z.object({
  title: z.string(),
  subject: z.string(),
  topics: z.array(z.string()),
  summary: z.string(),
  key_concepts: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
      page_number: z.number().optional(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const supabaseAdmin = createAdminClient();

    let file: File | null = null;
    let pastedText: string | null = null;
    let customTitle: string | null = null;
    let storagePath: string | null = null;
    let fileType: string | null = null;
    let fileName: string | null = null;
    let rawUserId: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      storagePath = body.storagePath || null;
      pastedText = body.text || null;
      customTitle = body.title || null;
      fileType = body.fileType || null;
      fileName = body.fileName || null;
      rawUserId = body.userId || null;
    } else {
      const formData = await request.formData();
      file = formData.get('file') as File | null;
      pastedText = formData.get('text') as string | null;
      customTitle = formData.get('title') as string | null;
      rawUserId = formData.get('userId') as string | null;
    }

    const userId = (!rawUserId || rawUserId === '00000000-0000-0000-0000-000000000000')
      ? DEFAULT_GUEST_USER_ID
      : rawUserId;

    let parsed: ParsedDocument;
    let sourceType: 'pdf' | 'docx' | 'pptx' | 'images' | 'text' = 'text';

    if (storagePath) {
      // Download file directly from Supabase Storage (bypasses Vercel incoming body limit)
      const { data: fileBlob, error: dlErr } = await supabaseAdmin.storage
        .from('materials')
        .download(storagePath);

      if (dlErr || !fileBlob) {
        return NextResponse.json(
          { error: `Failed to download file from cloud storage: ${dlErr?.message || 'File not found'}` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await fileBlob.arrayBuffer());
      const lowerPath = storagePath.toLowerCase();
      const detectedType = fileType || (lowerPath.endsWith('.pdf') ? 'application/pdf' : lowerPath.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : lowerPath.endsWith('.pptx') ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'text/plain');

      if (detectedType === 'application/pdf' || lowerPath.endsWith('.pdf')) {
        sourceType = 'pdf';
        parsed = await parsePdfBuffer(buffer);
      } else if (detectedType.includes('wordprocessingml') || lowerPath.endsWith('.docx')) {
        sourceType = 'docx';
        parsed = await parseDocxBuffer(buffer);
      } else if (detectedType.includes('presentationml') || lowerPath.endsWith('.pptx')) {
        sourceType = 'pptx';
        parsed = await parsePptxBuffer(buffer);
      } else {
        sourceType = 'images';
        parsed = parseTextContent(`[Extracted Note]: ${fileName || storagePath}`, customTitle || fileName || 'Uploaded Document');
      }
    } else if (file) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File size exceeds 50MB limit.' }, { status: 400 });
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Unsupported file type. Upload PDF, DOCX, PPTX, or Image.' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      if (file.type === 'application/pdf') {
        sourceType = 'pdf';
        parsed = await parsePdfBuffer(buffer);
      } else if (file.type.includes('wordprocessingml')) {
        sourceType = 'docx';
        parsed = await parseDocxBuffer(buffer);
      } else if (file.type.includes('presentationml')) {
        sourceType = 'pptx';
        parsed = await parsePptxBuffer(buffer);
      } else {
        sourceType = 'images';
        parsed = parseTextContent(`[Extracted Image Note]: ${file.name}`, customTitle || file.name);
      }
    } else if (pastedText) {
      sourceType = 'text';
      parsed = parseTextContent(pastedText, customTitle || 'Pasted Notes');
    } else {
      return NextResponse.json({ error: 'No file, storagePath, or text provided' }, { status: 400 });
    }

    // 1. Insert Material record
    const { data: material, error: matErr } = await supabaseAdmin
      .from('materials')
      .insert({
        user_id: userId,
        title: customTitle || parsed.title,
        source_type: sourceType,
        status: 'processing',
        page_count: parsed.pageCount,
        low_text: parsed.lowText,
      })
      .select()
      .single();

    if (matErr || !material) {
      return NextResponse.json({ error: matErr?.message || 'Failed to create material record' }, { status: 500 });
    }

    // 2. Insert Pages in fast batches
    const pageRows = parsed.pages.map((p) => ({
      material_id: material.id,
      user_id: userId,
      page_number: p.pageNumber,
      label: p.label,
      content: p.content,
    }));

    for (let i = 0; i < pageRows.length; i += 50) {
      await supabaseAdmin.from('material_pages').insert(pageRows.slice(i, i + 50));
    }

    // 3. Chunk Document
    const chunks = chunkDocumentPages(parsed.pages);
    const chunkRows = [];

    // Prioritize embedding up to 40 primary chunks to guarantee speedy processing even on large textbooks
    const chunksToEmbed = chunks.slice(0, 40);
    for (const chunk of chunksToEmbed) {
      let vector: number[] = [];
      try {
        vector = await generateEmbedding(chunk.content);
      } catch {
        // Continue if rate-limited
      }

      chunkRows.push({
        material_id: material.id,
        user_id: userId,
        chunk_index: chunk.chunkIndex,
        page_number: chunk.pageNumber,
        page_label: chunk.pageLabel,
        heading: chunk.heading,
        content: chunk.content,
        token_count: chunk.tokenCount,
        embedding: vector.length > 0 ? vector : null,
      });
    }

    // Remaining chunks inserted with null embeddings to maintain complete index
    for (let i = 40; i < chunks.length; i++) {
      const chunk = chunks[i];
      chunkRows.push({
        material_id: material.id,
        user_id: userId,
        chunk_index: chunk.chunkIndex,
        page_number: chunk.pageNumber,
        page_label: chunk.pageLabel,
        heading: chunk.heading,
        content: chunk.content,
        token_count: chunk.tokenCount,
        embedding: null,
      });
    }

    for (let i = 0; i < chunkRows.length; i += 50) {
      await supabaseAdmin.from('chunks').insert(chunkRows.slice(i, i + 50));
    }

    // 4. Analyze key concepts & topics via AI
    const sampleContent = parsed.pages.slice(0, 5).map((p) => p.content).join('\n\n').slice(0, 3000);
    try {
      const analysis = await generateStructured({
        prompt: `Analyze the following study notes text and extract title, subject, top 3-5 topics, a summary, and key concepts:\n\n${sampleContent}`,
        schema: analysisSchema,
      });

      await supabaseAdmin
        .from('materials')
        .update({
          title: customTitle || analysis.title || parsed.title,
          subject: analysis.subject || 'General Study',
          topics: analysis.topics || [],
          summary: analysis.summary || '',
          key_concepts: analysis.key_concepts || [],
          status: 'ready',
        })
        .eq('id', material.id);

      for (const concept of analysis.key_concepts) {
        await supabaseAdmin.from('concepts').insert({
          user_id: userId,
          material_id: material.id,
          topic: analysis.topics[0] || 'General',
          term: concept.term,
          definition: concept.definition,
          page_number: concept.page_number || 1,
        });
      }
    } catch {
      // If AI analysis fails, mark as ready with baseline metadata
      await supabaseAdmin
        .from('materials')
        .update({ status: 'ready', subject: 'General' })
        .eq('id', material.id);
    }

    return NextResponse.json({ success: true, materialId: material.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
