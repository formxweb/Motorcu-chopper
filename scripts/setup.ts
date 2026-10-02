/*
 * Veritabanı kurulumu: tabloları oluşturur/günceller, varsayılan ayarları yazar,
 * boş mağazaya örnek ürünleri ekler ve ADMIN_EMAIL ile ilk yöneticiyi açar.
 * Vercel'de her derlemede otomatik çalışır (package.json > build). Tekrar çalıştırmak güvenlidir.
 */
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { categories, productImages, products, settings, users, variants } from '../src/db/schema';
import { connectionOptions, directDatabaseUrl } from '../src/db/url';
import { DEFAULT_SETTINGS } from '../src/lib/settings-defaults';
import { ensureBucket } from '../src/lib/storage';
import { SEED_CATEGORIES, SEED_PRODUCTS } from './seed-data';

try {
  process.loadEnvFile(path.join(process.cwd(), '.env'));
} catch {
  /* .env yoksa ortam değişkenleri kullanılır */
}

async function main() {
  const found = directDatabaseUrl();
  if (!found) {
    console.warn('[kurulum] DATABASE_URL tanımlı değil, veritabanı kurulumu atlandı.');
    return;
  }
  console.log(`[kurulum] veritabanı adresi ${found.name} değişkeninden alındı.`);
  const { url, ssl } = connectionOptions(found.value);
  const client = postgres(url, { prepare: false, max: 1, ssl, connect_timeout: 20, onnotice: () => {} });
  const db = drizzle(client);

  try {
    console.log('[kurulum] tablolar güncelleniyor…');
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });

    await db
      .insert(settings)
      // İlk kurulumda mağaza ziyaretçilere açık başlar; STORE_START_CLOSED=true ise kapalı.
      .values({ id: 1, data: { ...DEFAULT_SETTINGS, storeOpen: process.env.STORE_START_CLOSED !== 'true' } as unknown as Record<string, unknown> })
      .onConflictDoNothing();

    const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(products);
    if (n === 0 && process.env.SEED_SAMPLE_PRODUCTS !== 'false') {
      console.log('[kurulum] örnek ürünler ekleniyor…');
      const catIds = new Map<string, string>();
      for (const c of SEED_CATEGORIES) {
        const [row] = await db.insert(categories).values(c).onConflictDoNothing().returning({ id: categories.id });
        if (row) catIds.set(c.slug, row.id);
        else {
          const [ex] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, c.slug));
          catIds.set(c.slug, ex.id);
        }
      }
      for (const p of SEED_PRODUCTS) {
        const [row] = await db
          .insert(products)
          .values({
            slug: p.slug,
            name: p.name,
            categoryId: catIds.get(p.category) ?? null,
            summary: p.summary,
            description: p.description,
            details: p.details,
            price: p.price,
            compareAtPrice: p.compareAtPrice ?? null,
            badge: p.badge ?? '',
            colorLabel: p.colorLabel ?? 'Renk',
            sizeLabel: p.sizeLabel ?? 'Beden',
            colors: p.colors.map((c) => ({ name: c.name, hex: c.hex })),
            sizes: p.sizes,
            customFields: p.customFields ?? [],
            isPersonalized: p.isPersonalized ?? false,
            trackStock: p.trackStock ?? true,
            isFeatured: p.isFeatured ?? false,
            sortOrder: p.sortOrder,
          })
          .returning({ id: products.id });
        const cs = p.colors.length ? p.colors.map((c) => c.name) : [''];
        const ss = p.sizes.length ? p.sizes : [''];
        const vrows = cs.flatMap((c) =>
          ss.map((s) => ({
            productId: row.id,
            color: c,
            size: s,
            sku: [p.slug.split('-').map((w) => w[0]).join('').toUpperCase(), c.slice(0, 3).toUpperCase(), s.replace(/\s/g, '').toUpperCase()].filter(Boolean).join('-'),
            stock: p.stock(c, s),
          })),
        );
        await db.insert(variants).values(vrows);
        await db.insert(productImages).values(
          p.images.map((img, i) => ({
            productId: row.id,
            url: `/ornek/${img.file}.webp`,
            thumbUrl: `/ornek/k/${img.file}.webp`,
            alt: img.alt,
            color: img.color,
            sortOrder: i,
          })),
        );
      }
      console.log(`[kurulum] ${SEED_PRODUCTS.length} ürün eklendi.`);
    }

    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    if (email && password) {
      const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!u) {
        if (password.length < 8) {
          console.warn('[kurulum] ADMIN_PASSWORD en az 8 karakter olmalı, yönetici oluşturulmadı.');
        } else {
          await db.insert(users).values({ email, passwordHash: await bcrypt.hash(password, 11), role: 'admin', firstName: 'Yönetici' });
          console.log(`[kurulum] yönetici oluşturuldu: ${email}`);
        }
      } else {
        const patch: Partial<typeof users.$inferInsert> = {};
        if (u.role !== 'admin') patch.role = 'admin';
        if (process.env.ADMIN_RESET_PASSWORD === 'true' && password.length >= 8) patch.passwordHash = await bcrypt.hash(password, 11);
        if (Object.keys(patch).length) {
          await db.update(users).set(patch).where(eq(users.id, u.id));
          console.log(`[kurulum] yönetici güncellendi: ${email}`);
        }
      }
    }

    try {
      console.log(`[kurulum] ${await ensureBucket()}`);
    } catch (e) {
      console.warn('[kurulum] görsel kovası kontrol edilemedi:', e instanceof Error ? e.message : e);
    }
    console.log('[kurulum] tamam.');
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error('[kurulum] HATA:', e);
  process.exit(1);
});
