import { NextResponse } from 'next/server';
import { and, isNull, lt } from 'drizzle-orm';
import { db } from '@/db';
import { carts, passwordResets, rateLimits, sessions } from '@/db/schema';
import { cleanupExpiredOrders } from '@/lib/orders';
import { safeEqual } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/* Vercel Cron her gün çağırır. Authorization: Bearer CRON_SECRET */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const now = new Date();
  const checked = await cleanupExpiredOrders(50);
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.delete(passwordResets).where(lt(passwordResets.expiresAt, now));
  await db.delete(rateLimits).where(lt(rateLimits.resetAt, now));
  await db.delete(carts).where(and(isNull(carts.userId), lt(carts.updatedAt, new Date(now.getTime() - 60 * 86400000))));
  return NextResponse.json({ ok: true, checkedOrders: checked });
}
