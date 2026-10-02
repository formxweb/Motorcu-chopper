import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as { __mcSql?: postgres.Sql; __mcDb?: Db };

function isLocal(url: string) {
  return /@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(url);
}

export function getSql(): postgres.Sql {
  if (!g.__mcSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL tanımlı değil. .env dosyasına veya Vercel ortam değişkenlerine ekleyin.');
    const sslOff = process.env.DATABASE_SSL === 'false' || isLocal(url);
    g.__mcSql = postgres(url, {
      prepare: false,
      max: process.env.NODE_ENV === 'production' ? 4 : 6,
      idle_timeout: 20,
      connect_timeout: 15,
      ssl: sslOff ? false : 'require',
      onnotice: () => {},
    });
  }
  return g.__mcSql;
}

export function getDb(): Db {
  if (!g.__mcDb) g.__mcDb = drizzle(getSql(), { schema });
  return g.__mcDb;
}

/** İlk kullanımda bağlanan veritabanı nesnesi. */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});
