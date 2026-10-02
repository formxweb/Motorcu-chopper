import { sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { db } from '@/db';

/** Sabit pencereli sayaç. Sınır aşıldıysa false döner. */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const rows = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    on conflict (key) do update set
      count = case when rate_limits.reset_at < now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at < now() then excluded.reset_at else rate_limits.reset_at end
    returning count
  `);
  const first = (rows as unknown as { count: number }[])[0];
  return (first?.count ?? 0) <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip') || '127.0.0.1';
}

export async function userAgent(): Promise<string> {
  const h = await headers();
  return (h.get('user-agent') || '').slice(0, 300);
}
