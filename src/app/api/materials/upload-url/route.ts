import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const filename = (body.filename as string) || 'document.pdf';

    const ext = filename.split('.').pop()?.toLowerCase() || 'pdf';
    const cleanBase = filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 50);

    const storagePath = `uploads/${Date.now()}-${cleanBase}.${ext}`;

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.storage
      .from('materials')
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Failed to generate signed upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
