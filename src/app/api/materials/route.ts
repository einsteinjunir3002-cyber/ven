import { NextResponse } from 'next/server';
import { createAdminClient, DEFAULT_GUEST_USER_ID } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || DEFAULT_GUEST_USER_ID;

    const supabaseAdmin = createAdminClient();
    const { data: materials, error } = await supabaseAdmin
      .from('materials')
      .select('*')
      .or(`user_id.eq.${userId},user_id.eq.${DEFAULT_GUEST_USER_ID}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch materials from Supabase:', error);
      return NextResponse.json({ materials: [] });
    }

    return NextResponse.json({ materials: materials || [] });
  } catch (err) {
    return NextResponse.json({ materials: [] });
  }
}
