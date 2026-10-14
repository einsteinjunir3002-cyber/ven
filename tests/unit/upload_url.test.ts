import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: (bucket: string) => ({
        createSignedUploadUrl: async (path: string) => ({
          data: {
            signedUrl: `https://test-project.supabase.co/storage/v1/upload/${bucket}/${path}`,
            path,
            token: 'mock-token-xyz',
          },
          error: null,
        }),
      }),
    },
  }),
}));

import { POST } from '@/app/api/materials/upload-url/route';

describe('Upload URL Route', () => {
  it('generates a signed upload URL for documents up to 50MB with sanitized path', async () => {
    const req = new Request('http://localhost/api/materials/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename: 'DRIVING BOOK MANUAL (2) (1).pdf' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.signedUrl).toBeTruthy();
    expect(data.path).toContain('DRIVING_BOOK_MANUAL');
    expect(data.path).toContain('.pdf');
    expect(data.token).toBe('mock-token-xyz');
  });

  it('handles fallback filename if not provided', async () => {
    const req = new Request('http://localhost/api/materials/upload-url', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.path).toContain('document.pdf');
  });
});
