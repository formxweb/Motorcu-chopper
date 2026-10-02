import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { connectionOptions, pooledDatabaseUrl } from './url';

export type Db = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as { __mcSql?: postgres.Sql; __mcDb?: Db };

export function getSql(): postgres.Sql {
  if (!g.__mcSql) {
    const found = pooledDatabaseUrl();
    if (!found) throw new Error('DATABASE_URL tanımlı değil. .env dosyasına veya Vercel ortam değişkenlerine ekleyin.');
    const { url, ssl } = connectionOptions(found.value);
    g.__mcSql = postgres(url, {
      prepare: false,
      max: process.env.NODE_ENV === 'production' ? 4 : 6,
      idle_timeout: 20,
      connect_timeout: 15,
      ssl,
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
