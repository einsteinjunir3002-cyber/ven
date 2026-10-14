import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseAdmin = createAdminClient();

    const { data: material, error: matErr } = await supabaseAdmin
      .from('materials')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (matErr || !material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const { data: pages } = await supabaseAdmin
      .from('material_pages')
      .select('*')
      .eq('material_id', id)
      .order('page_number', { ascending: true });

    const { data: concepts } = await supabaseAdmin
      .from('concepts')
      .select('*')
      .eq('material_id', id);

    return NextResponse.json({
      material,
      pages: pages || [],
      concepts: concepts || [],
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
