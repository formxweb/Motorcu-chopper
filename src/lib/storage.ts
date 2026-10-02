import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { storageMode, supabaseStorage } from './env';

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), '.yuklenen');

const EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

/** Görseli depoya yükler ve herkese açık adresini döner. */
export async function uploadImage(bytes: Uint8Array, contentType: string): Promise<string> {
  const ext = EXT[contentType];
  if (!ext) throw new Error('Yalnızca WEBP, JPG veya PNG yüklenebilir.');
  const now = new Date();
  const key = `urunler/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${ext}`;
  const mode = storageMode();

  if (mode === 'supabase') {
    const s = supabaseStorage();
    const headers: Record<string, string> = {
      apikey: s.key,
      'Content-Type': contentType,
      'x-upsert': 'true',
      'cache-control': 'max-age=31536000',
    };
    if (s.key.startsWith('eyJ')) headers.Authorization = `Bearer ${s.key}`;
    const res = await fetch(`${s.url}/storage/v1/object/${s.bucket}/${key}`, {
      method: 'POST',
      headers,
      body: Buffer.from(bytes),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Görsel depoya yüklenemedi (${res.status}). ${text.slice(0, 200)}`);
    }
    return `${s.url}/storage/v1/object/public/${s.bucket}/${key}`;
  }

  if (mode === 'local') {
    const file = path.join(LOCAL_UPLOAD_DIR, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    return `/yuklenen/${key}`;
  }

  throw new Error('Görsel depolama ayarlanmadı. SUPABASE_URL ve SUPABASE_SECRET_KEY ortam değişkenlerini ekleyin.');
}

/** Supabase'de herkese açık "urunler" kovasını oluşturur (varsa dokunmaz). */
export async function ensureBucket(): Promise<string> {
  const s = supabaseStorage();
  if (!s.url || !s.key) return 'Supabase depolama ayarlı değil, atlandı.';
  const headers: Record<string, string> = { apikey: s.key, 'Content-Type': 'application/json' };
  if (s.key.startsWith('eyJ')) headers.Authorization = `Bearer ${s.key}`;
  const res = await fetch(`${s.url}/storage/v1/bucket`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: s.bucket, name: s.bucket, public: true, file_size_limit: 5 * 1024 * 1024 }),
  });
  if (res.ok) return `"${s.bucket}" kovası oluşturuldu.`;
  const text = await res.text().catch(() => '');
  if (res.status === 409 || /already exists|Duplicate/i.test(text)) return `"${s.bucket}" kovası zaten var.`;
  return `Kova oluşturulamadı (${res.status}): ${text.slice(0, 200)}`;
}
