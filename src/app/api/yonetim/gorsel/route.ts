import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadImage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const MAX = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Yönetici girişi gerekiyor.' }, { status: 401 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Dosya okunamadı.' }, { status: 400 });
  }
  const main = form.get('main');
  const thumb = form.get('thumb');
  if (!(main instanceof File)) return NextResponse.json({ error: 'Görsel seçilmedi.' }, { status: 400 });
  if (main.size > MAX || (thumb instanceof File && thumb.size > MAX)) {
    return NextResponse.json({ error: 'Görsel 4 MB’dan büyük olamaz.' }, { status: 413 });
  }
  try {
    const url = await uploadImage(new Uint8Array(await main.arrayBuffer()), main.type);
    const thumbUrl = thumb instanceof File ? await uploadImage(new Uint8Array(await thumb.arrayBuffer()), thumb.type) : url;
    return NextResponse.json({ url, thumbUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Yükleme başarısız.' }, { status: 500 });
  }
}
