import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { storageMode } from '@/lib/env';
import { LOCAL_UPLOAD_DIR, readStoredImage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };

/* Yüklenen ürün fotoğraflarını sunar: geliştirmede diskten, canlıda (Supabase yoksa) veritabanından. */
export async function GET(_req: Request, { params }: { params: Promise<{ yol: string[] }> }) {
  const { yol } = await params;
  const key = yol.join('/');
  if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes('..')) return new Response('Bulunamadı', { status: 404 });

  if (storageMode() === 'local') {
    const file = path.join(LOCAL_UPLOAD_DIR, ...yol);
    if (!file.startsWith(LOCAL_UPLOAD_DIR + path.sep)) return new Response('Bulunamadı', { status: 404 });
    try {
      const data = await readFile(file);
      return new Response(new Uint8Array(data), {
        headers: { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' },
      });
    } catch {
      /* diskte yoksa veritabanına bakılır */
    }
  }

  try {
    const img = await readStoredImage(key);
    if (!img) return new Response('Bulunamadı', { status: 404 });
    return new Response(new Uint8Array(img.data), {
      headers: {
        'Content-Type': img.contentType,
        // Her yüklemenin adı benzersiz, içerik hiç değişmez.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Bulunamadı', { status: 404 });
  }
}
