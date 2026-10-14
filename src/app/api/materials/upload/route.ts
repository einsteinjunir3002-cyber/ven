import { NextResponse } from 'next/server';
import { createAdminClient, DEFAULT_GUEST_USER_ID } from '@/lib/supabase/admin';
import { parsePdfBuffer, parseDocxBuffer, parsePptxBuffer, parseTextContent, ParsedDocument } from '@/server/documents/parser';
import { chunkDocumentPages } from '@/server/documents/chunker';
import { generateEmbedding, generateStructured } from '@/server/ai/provider';
import { z } from 'zod';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const pastedText = formData.get('text') as string | null;
    const customTitle = formData.get('title') as string | null;
    const rawUserId = formData.get('userId') as string | null;
    const userId = (!rawUserId || rawUserId === '00000000-0000-0000-0000-000000000000')
      ? DEFAULT_GUEST_USER_ID
      : rawUserId;

    let parsed: ParsedDocument;
    let sourceType: 'pdf' | 'docx' | 'pptx' | 'images' | 'text' = 'text';

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File size exceeds 25MB limit.' }, { status: 400 });
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
      return NextResponse.json({ error: 'No file or text provided' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

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

    // 2. Insert Pages
    for (const p of parsed.pages) {
      await supabaseAdmin.from('material_pages').insert({
        material_id: material.id,
        user_id: userId,
        page_number: p.pageNumber,
        label: p.label,
        content: p.content,
      });
    }

    // 3. Chunk Document
    const chunks = chunkDocumentPages(parsed.pages);

    for (const chunk of chunks) {
      // Generate vector embedding per chunk
      const vector = await generateEmbedding(chunk.content);

      await supabaseAdmin.from('chunks').insert({
        material_id: material.id,
        user_id: userId,
        chunk_index: chunk.chunkIndex,
        page_number: chunk.pageNumber,
        page_label: chunk.pageLabel,
        heading: chunk.heading,
        content: chunk.content,
        token_count: chunk.tokenCount,
        embedding: vector,
      });
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
