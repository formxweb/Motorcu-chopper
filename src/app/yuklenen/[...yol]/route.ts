import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { storageMode } from '@/lib/env';
import { LOCAL_UPLOAD_DIR } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };

/* Yalnızca yerel geliştirme ve testte: yüklenen görselleri diskten sunar. */
export async function GET(_req: Request, { params }: { params: Promise<{ yol: string[] }> }) {
  if (storageMode() !== 'local') return new Response('Bulunamadı', { status: 404 });
  const { yol } = await params;
  const file = path.join(LOCAL_UPLOAD_DIR, ...yol);
  if (!file.startsWith(LOCAL_UPLOAD_DIR + path.sep)) return new Response('Bulunamadı', { status: 404 });
  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), {
      headers: { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    return new Response('Bulunamadı', { status: 404 });
  }
}
